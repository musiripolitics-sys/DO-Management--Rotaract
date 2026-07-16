'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Globe,
  RefreshCw,
  Users,
  Search,
  AlertCircle,
  CheckCircle2,
  Building2,
} from 'lucide-react'

type Club = {
  club_id: string
  nf_id: string | null
  club_name: string
  club_type: string | null
  city: string | null
  state: string | null
  country: string | null
  active_members: number | null
  assistant_governor: string | null
  synced_at: string | null
}

/** Human "2 hours ago" style relative time. `now` is passed in so the
 *  badge can re-render on a timer and stay current. */
function timeAgo(iso: string, now: number): string {
  const secs = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000))
  if (secs < 45) return 'just now'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`
  const years = Math.floor(days / 365)
  return `${years} year${years === 1 ? '' : 's'} ago`
}

/** Colour the badge by how stale the cached data is. */
function freshnessTone(iso: string | null, now: number): { classes: string; dot: string } {
  if (!iso) return { classes: 'bg-[#1A1815]/5 text-[#1A1815]/55', dot: 'bg-[#1A1815]/30' }
  const hours = (now - new Date(iso).getTime()) / 3_600_000
  if (hours < 24) return { classes: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' }
  if (hours < 24 * 7) return { classes: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' }
  return { classes: 'bg-red-50 text-red-700', dot: 'bg-red-500' }
}

export default function RotaryClubsPage() {
  const [clubs, setClubs] = useState<Club[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [syncedAt, setSyncedAt] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [cookie, setCookie] = useState('')
  const [savingCookie, setSavingCookie] = useState(false)
  const [cookieStatus, setCookieStatus] = useState<{ configured: boolean; hasAuthToken: boolean } | null>(null)
  const [now, setNow] = useState(() => Date.now())

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/rotary/clubs')
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Failed to load cached clubs')
      setClubs(d.clubs || [])
      setSyncedAt(d.syncedAt || null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  const loadCookieStatus = async () => {
    try {
      const res = await fetch('/api/rotary/cookie')
      if (res.ok) setCookieStatus(await res.json())
    } catch {
      /* ignore status errors */
    }
  }

  useEffect(() => {
    load()
    loadCookieStatus()
  }, [])

  // Keep the "synced X ago" badge current without a reload.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])

  const doSync = async () => {
    setSyncing(true)
    setError(null)
    setNotice(null)
    try {
      const res = await fetch('/api/rotary/sync', { method: 'POST' })
      const d = await res.json()
      if (!res.ok) {
        if (d.needsFreshCookie) {
          throw new Error(
            'Rotary session expired. Sign in to my.rotary.org, copy a fresh Cookie header from the Network tab, paste it into rotary-session.txt, then sync again.',
          )
        }
        throw new Error(d.error || 'Sync failed')
      }
      setNotice(`Synced ${d.synced} clubs · ${d.totalMembers} members from Rotary.`)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSyncing(false)
    }
  }

  const saveCookie = async () => {
    const value = cookie.trim()
    if (!value) {
      setError('Paste the Cookie header before saving.')
      return
    }
    setSavingCookie(true)
    setError(null)
    setNotice(null)
    try {
      const res = await fetch('/api/rotary/cookie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cookie: value }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Could not save cookie')
      if (d.authValid === true) {
        setNotice(d.message || 'Cookie saved and verified. You can sync now.')
        setCookie('')
      } else {
        // Saved but not verified (expired / analytics-only / network).
        setError(d.message || 'Cookie saved, but could not be verified.')
      }
      await loadCookieStatus()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSavingCookie(false)
    }
  }

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return clubs
    return clubs.filter(
      (c) =>
        c.club_name.toLowerCase().includes(s) ||
        (c.nf_id || '').includes(s) ||
        (c.state || '').toLowerCase().includes(s) ||
        (c.city || '').toLowerCase().includes(s),
    )
  }, [clubs, q])

  const totalMembers = useMemo(
    () => clubs.reduce((sum, c) => sum + (c.active_members || 0), 0),
    [clubs],
  )

  const tone = freshnessTone(syncedAt, now)
  const syncLabel = syncedAt ? `Synced ${timeAgo(syncedAt, now)}` : 'Never synced'

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-[#6D28D9] mb-1">
            <Globe className="w-5 h-5" />
            <h1 className="text-2xl font-bold text-[#1A1815]">Rotary Clubs</h1>
            <span
              title={syncedAt ? `Last synced ${new Date(syncedAt).toLocaleString()}` : 'Never synced'}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${tone.classes}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
              {syncLabel}
            </span>
          </div>
          <p className="text-sm text-[#1A1815]/55">
            Official club data synced from my.rotary.org.
          </p>
        </div>
        <button
          onClick={doSync}
          disabled={syncing}
          className="inline-flex items-center gap-2 rounded-xl bg-[#6D28D9] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#5b21b6] disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing…' : 'Sync from Rotary'}
        </button>
      </div>

      {/* Session cookie */}
      <div className="mb-4 rounded-2xl border border-[#1A1815]/8 bg-white p-4">
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-sm font-semibold text-[#1A1815]">Rotary session cookie</h2>
          {cookieStatus && (
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                cookieStatus.configured && cookieStatus.hasAuthToken
                  ? 'bg-emerald-50 text-emerald-700'
                  : cookieStatus.configured
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-[#1A1815]/5 text-[#1A1815]/55'
              }`}
            >
              {cookieStatus.configured && cookieStatus.hasAuthToken
                ? 'Auth token present'
                : cookieStatus.configured
                  ? 'Analytics-only — no login token'
                  : 'Not set'}
            </span>
          )}
        </div>
        <p className="text-xs text-[#1A1815]/55 mb-2">
          In DevTools → Network, open the authenticated{' '}
          <code className="text-[#6D28D9]">districtClubsSearch</code> request on my.rotary.org, copy
          its full <code className="text-[#6D28D9]">Cookie</code> header, and paste it below. It&apos;s
          saved to a gitignored file and used for the next sync.
        </p>
        <textarea
          value={cookie}
          onChange={(e) => setCookie(e.target.value)}
          placeholder="Paste the full Cookie header here (name=value; name=value; …)"
          rows={3}
          className="w-full rounded-xl border border-[#1A1815]/12 bg-white px-3 py-2 text-xs font-mono outline-none focus:border-[#6D28D9] resize-y"
        />
        <div className="mt-2 flex justify-end">
          <button
            onClick={saveCookie}
            disabled={savingCookie || !cookie.trim()}
            className="inline-flex items-center gap-2 rounded-xl border border-[#6D28D9] px-4 py-2 text-sm font-semibold text-[#6D28D9] hover:bg-[#F5F3FF] disabled:opacity-50"
          >
            {savingCookie ? 'Saving & verifying…' : 'Save cookie'}
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {notice && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Stat tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <StatTile icon={Building2} label="Clubs" value={clubs.length} tint="bg-[#F5F3FF]" color="#6D28D9" />
        <StatTile icon={Users} label="Total members" value={totalMembers} tint="bg-emerald-50" color="#059669" />
        <StatTile
          icon={Users}
          label="Avg / club"
          value={clubs.length ? Math.round(totalMembers / clubs.length) : 0}
          tint="bg-[#EAF2FB]"
          color="#1A468F"
        />
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1A1815]/40" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search club, Rotary ID, city, state…"
          className="w-full rounded-xl border border-[#1A1815]/12 bg-white pl-9 pr-3 py-2.5 text-sm outline-none focus:border-[#6D28D9]"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-[#1A1815]/8 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1A1815]/8 text-left text-xs uppercase tracking-wide text-[#1A1815]/45">
              <th className="px-4 py-3 font-semibold">Club</th>
              <th className="px-4 py-3 font-semibold">Rotary ID</th>
              <th className="px-4 py-3 font-semibold">Location</th>
              <th className="px-4 py-3 font-semibold text-right">Members</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-[#1A1815]/45">
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-[#1A1815]/45">
                  {clubs.length === 0
                    ? 'No clubs cached yet. Click “Sync from Rotary” to pull them in.'
                    : 'No clubs match your search.'}
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.club_id} className="border-b border-[#1A1815]/5 last:border-0 hover:bg-[#FAFAF9]">
                  <td className="px-4 py-3">
                    <div className="font-medium text-[#1A1815]">{c.club_name}</div>
                    {c.club_type && <div className="text-xs text-[#1A1815]/45">{c.club_type}</div>}
                  </td>
                  <td className="px-4 py-3 text-[#1A1815]/70">{c.nf_id || '—'}</td>
                  <td className="px-4 py-3 text-[#1A1815]/70">
                    {[c.city, c.state, c.country].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-[#1A1815]">
                    {c.active_members ?? 0}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatTile({
  icon: Icon,
  label,
  value,
  tint,
  color,
}: {
  icon: React.ElementType
  label: string
  value: number
  tint: string
  color: string
}) {
  return (
    <div className="rounded-2xl border border-[#1A1815]/8 bg-white p-4">
      <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg ${tint} mb-2`}>
        <Icon className="w-4.5 h-4.5" style={{ color }} />
      </div>
      <div className="text-2xl font-bold text-[#1A1815]">{value.toLocaleString()}</div>
      <div className="text-xs text-[#1A1815]/50">{label}</div>
    </div>
  )
}
