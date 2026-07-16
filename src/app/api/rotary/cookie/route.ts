import { NextResponse } from 'next/server'
import { getSession, hasAccess, ADMIN_TIER } from '@/lib/session'
import {
  writeCookieFile,
  readCookieStatus,
  cookieLooksAnalyticsOnly,
  fetchDistrictClubsPage,
  RotarySessionError,
} from '@/lib/rotary'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  if (!hasAccess(session.role, ADMIN_TIER)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return null
}

/** GET /api/rotary/cookie — current cookie status (no secret values). */
export async function GET() {
  const denied = await requireAdmin()
  if (denied) return denied
  return NextResponse.json(readCookieStatus())
}

/**
 * POST /api/rotary/cookie — admin only.
 * Saves a pasted Cookie header to the gitignored session file, then does
 * one tiny live call to confirm it actually authenticates.
 */
export async function POST(req: Request) {
  const denied = await requireAdmin()
  if (denied) return denied

  let body: { cookie?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const cookie = (body.cookie || '').trim()
  if (!cookie || !cookie.includes('=')) {
    return NextResponse.json(
      { error: 'Paste the full Cookie header (name=value; name=value; …).' },
      { status: 400 },
    )
  }

  // Save first so the sync can use it, then validate.
  try {
    writeCookieFile(cookie)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: `Could not save cookie: ${msg}` }, { status: 500 })
  }

  const analyticsOnly = cookieLooksAnalyticsOnly(cookie)

  try {
    const page = await fetchDistrictClubsPage({ pageSize: 1, timeoutMs: 20000 })
    return NextResponse.json({
      ok: true,
      saved: true,
      authValid: true,
      totalCount: page.totalCount,
      message: `Cookie saved and verified — Rotary sees ${page.totalCount} clubs. You can sync now.`,
    })
  } catch (e) {
    if (e instanceof RotarySessionError) {
      return NextResponse.json({
        ok: true,
        saved: true,
        authValid: false,
        analyticsOnly,
        message: analyticsOnly
          ? 'Saved, but this cookie has only analytics cookies — no login session. Copy the Cookie header from the authenticated districtClubsSearch request in DevTools, not a plain page load.'
          : 'Saved, but Rotary rejected it as logged-out. The session likely expired — grab a fresh Cookie header and paste again.',
      })
    }
    // Network / IP block etc.: saved, but couldn't verify right now.
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({
      ok: true,
      saved: true,
      authValid: null,
      message: `Saved, but couldn't verify right now: ${msg}`,
    })
  }
}
