import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

/* ────────────────────────────────────────────────────────────────
 * Rotary International club data (my.rotary.org)
 *
 * Server-ONLY. Talks to the district clubs search endpoint using a
 * my.rotary.org session cookie, and normalises the response.
 *
 * The endpoint requires a logged-in my.rotary.org session and appears
 * to reject non-residential IPs — so run the sync from a machine where
 * the cookie works (same network the cookie was minted on). The public
 * site never calls Rotary directly; it reads the Supabase cache that
 * the sync populates.
 *
 * Cookie source (checked in order):
 *   1. process.env.ROTARY_COOKIE_B64  — base64 of the Cookie header
 *      (use on servers/Vercel; base64 avoids `$` expansion in env files)
 *   2. ./rotary-session.txt           — raw Cookie header (local dev;
 *      just paste a fresh cookie and save — gitignored)
 * ────────────────────────────────────────────────────────────── */

const DEFAULT_URL = 'https://my-api.rotary.org/api/domui/memberwf/districtClubsSearch'
const DEFAULT_ORG_ID = '6716e334-1479-4144-8919-fbfb54e00ee1' // this district
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'

export type RotaryClub = {
  clubId: string
  nfId: string | null
  nfKey: string | null
  name: string
  clubType: string | null
  city: string | null
  state: string | null
  country: string | null
  activeMembers: number
  assistantGovernor: string | null
  agId: string | null
}

export type ClubsPage = {
  page: number
  pageSize: number
  totalCount: number
  clubs: RotaryClub[]
}

export type FetchClubsOptions = {
  name?: string
  location?: string
  clubTypes?: string[]
  pageNumber?: number
  pageSize?: number
  timeoutMs?: number
}

/** Custom error so callers can distinguish an expired/missing session
 *  (needs a fresh cookie) from other failures (network/IP block). */
export class RotarySessionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RotarySessionError'
  }
}

function getConfig(): { url: string; orgId: string; cookie: string } {
  const url = process.env.ROTARY_API_URL || DEFAULT_URL
  const orgId = process.env.ROTARY_ORG_ID || DEFAULT_ORG_ID

  let cookie = ''
  if (process.env.ROTARY_COOKIE_B64) {
    cookie = Buffer.from(process.env.ROTARY_COOKIE_B64, 'base64').toString('utf8').trim()
  } else {
    try {
      cookie = readFileSync(join(process.cwd(), 'rotary-session.txt'), 'utf8').trim()
    } catch {
      cookie = ''
    }
  }
  return { url, orgId, cookie: sanitizeCookie(cookie) }
}

function str(v: unknown): string | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s === '' ? null : s
}

function num(v: unknown): number {
  const n = typeof v === 'number' ? v : parseInt(String(v ?? ''), 10)
  return Number.isFinite(n) ? n : 0
}

/** Pure: turn a raw `districtClubsSearch` JSON body into a ClubsPage.
 *  Exported so it can be unit-tested without a live call. */
export function parseClubsResponse(json: unknown): ClubsPage {
  const w = (json as { wfRes?: Record<string, unknown> })?.wfRes ?? {}
  const rawList = Array.isArray(w.districtClubsSearchInfo)
    ? (w.districtClubsSearchInfo as Record<string, unknown>[])
    : []

  const clubs: RotaryClub[] = rawList.map((r) => ({
    clubId: String(r.clubId ?? ''),
    nfId: str(r.nfId),
    nfKey: str(r.nfKey),
    name: String(r.clubName ?? '').trim(),
    clubType: str(r.clubType),
    city: str(r.city),
    state: str(r.state),
    country: str(r.country),
    activeMembers: num(r.activeMembers),
    assistantGovernor: str(r.assistantGovernor),
    agId: str(r.agId),
  }))

  return {
    page: num(w.page) || 1,
    pageSize: num(w.pageSize) || clubs.length,
    totalCount: num(w.totalCount) || clubs.length,
    clubs,
  }
}

/** Fetch a single page of district clubs from the live Rotary API. */
export async function fetchDistrictClubsPage(opts: FetchClubsOptions = {}): Promise<ClubsPage> {
  const { url, orgId, cookie } = getConfig()
  if (!cookie) {
    throw new RotarySessionError(
      'No Rotary session configured. Add a fresh my.rotary.org Cookie header to rotary-session.txt (or set ROTARY_COOKIE_B64).',
    )
  }

  const body = {
    data: {
      pageNumber: opts.pageNumber ?? 1,
      pageSize: opts.pageSize ?? 100,
      searchAndFilterData: {
        orgId,
        filters: {
          name: opts.name ?? '',
          location: opts.location ?? '',
          clubTypes: opts.clubTypes ?? ['Rotaract Club'],
        },
      },
      apiMethod: 'post',
    },
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 30000)

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/plain, */*',
        Origin: 'https://my.rotary.org',
        Referer: 'https://my.rotary.org/',
        'User-Agent': UA,
        Cookie: cookie,
      },
      body: JSON.stringify(body),
    })
  } catch (e) {
    const msg = e instanceof Error && e.name === 'AbortError' ? 'timed out' : String(e)
    throw new Error(
      `Rotary request failed (${msg}). The endpoint often times out from non-residential IPs — run the sync from a network where the cookie works.`,
    )
  } finally {
    clearTimeout(timer)
  }

  const text = await res.text()

  if (res.status === 401 || /UserNotAuthenticated|logged out/i.test(text)) {
    throw new RotarySessionError(
      'Rotary session expired (401). Sign in to my.rotary.org again and paste a fresh cookie into rotary-session.txt.',
    )
  }
  if (!res.ok) {
    throw new Error(`Rotary API returned HTTP ${res.status}: ${text.slice(0, 200)}`)
  }

  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error(`Rotary API returned non-JSON (${text.slice(0, 120)})`)
  }
  return parseClubsResponse(json)
}

/** Page through every Rotaract club in the district (empty name filter). */
export async function fetchAllRotaractClubs(): Promise<RotaryClub[]> {
  const pageSize = 100
  const all: RotaryClub[] = []
  let page = 1
  let total = Infinity

  // Hard cap at 50 pages (5000 clubs) as a safety valve.
  while (all.length < total && page <= 50) {
    const res = await fetchDistrictClubsPage({
      name: '',
      clubTypes: ['Rotaract Club'],
      pageNumber: page,
      pageSize,
    })
    total = res.totalCount
    all.push(...res.clubs)
    if (res.clubs.length === 0) break
    page += 1
  }
  return all
}

/* ────────────────────────────────────────────────────────────────
 * Cookie management — lets an admin paste a fresh Cookie header from
 * the UI instead of hand-editing rotary-session.txt.
 * ────────────────────────────────────────────────────────────── */

/** Normalise a pasted Cookie header into one valid header value.
 *  Browser "copy" often smuggles in newlines (one cookie per line) or
 *  stray control characters, which make fetch throw "invalid header
 *  value". Split on ';' and any newline, drop control chars, rejoin. */
export function sanitizeCookie(raw: string): string {
  return raw
    .split(/[;\r\n]+/)
    .map((p) => p.replace(/[\x00-\x1F\x7F]/g, '').trim())
    .filter(Boolean)
    .join('; ')
}

/** Analytics/tracking cookie name prefixes. Used to warn when a pasted
 *  Cookie header carries no my.rotary.org login token (only trackers) —
 *  the exact mistake that makes the sync 401. */
const ANALYTICS_PREFIXES = [
  '_ga', '_gid', '_gat', '_gcl', '_fbp', '_fbc', '__adroll', '__qca',
  '_twpid', '_uet', 'amcv', 's_cc', 's_sq', 's_fid', 'sc_', 'optanon',
  '__hs', 'hubspotutk', 'mp_', 'ajs_', '_hj', '_clck', '_clsk', 'rid',
  '_scid', '_pin_', '_pk_',
]

/** True when every cookie in the header is a known analytics/tracking
 *  cookie — i.e. there is no login session token in it. */
export function cookieLooksAnalyticsOnly(cookie: string): boolean {
  const names = cookie
    .split(';')
    .map((c) => c.split('=')[0].trim().toLowerCase())
    .filter(Boolean)
  if (names.length === 0) return false
  return names.every((n) => ANALYTICS_PREFIXES.some((p) => n.startsWith(p)))
}

/** Persist a pasted Cookie header so the sync can use it (gitignored file). */
export function writeCookieFile(cookie: string): void {
  writeFileSync(join(process.cwd(), 'rotary-session.txt'), cookie.trim() + '\n', 'utf8')
}

/** Report whether a cookie is configured and whether it carries a login
 *  token. Never returns the secret value itself. */
export function readCookieStatus(): { configured: boolean; hasAuthToken: boolean } {
  const { cookie } = getConfig()
  if (!cookie) return { configured: false, hasAuthToken: false }
  return { configured: true, hasAuthToken: !cookieLooksAnalyticsOnly(cookie) }
}
