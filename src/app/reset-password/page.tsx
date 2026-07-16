'use client'

import { Suspense, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowRight, CheckCircle2, Eye, EyeOff, Loader2, ShieldAlert } from 'lucide-react'

/* ────────────────────────────────────────────────────────────────
 * /reset-password?token=… — lands here from the reset email.
 * Verifies the token, then lets the user set a new password and
 * signs them straight in.
 * ────────────────────────────────────────────────────────────── */

function ResetInner() {
  const params = useSearchParams()
  const token = params.get('token') ?? ''

  const [state, setState] = useState<'checking' | 'invalid' | 'form' | 'done'>('checking')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dashboard, setDashboard] = useState('/')

  useEffect(() => {
    if (!token) {
      setState('invalid')
      return
    }
    let cancelled = false
    fetch('/api/auth/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'verify', token }),
    })
      .then((r) => r.json())
      .then((d) => !cancelled && setState(d.valid ? 'form' : 'invalid'))
      .catch(() => !cancelled && setState('invalid'))
    return () => {
      cancelled = true
    }
  }, [token])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/auth/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset', token, password }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Could not reset your password.')
      setDashboard(d.dashboard || '/')
      setState('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#14121B] text-white flex flex-col items-center justify-center px-5 py-12">
      <Image
        src="/vibe-logo.jpg"
        alt="Rotaract District 3233 — VIBE"
        width={2480}
        height={610}
        priority
        className="h-10 w-auto rounded-lg bg-white p-1 mb-8"
      />

      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-7 sm:p-8">
        {state === 'checking' && (
          <div className="flex flex-col items-center gap-3 py-8 text-white/50">
            <Loader2 className="w-6 h-6 animate-spin" />
            <p className="text-sm">Checking your reset link…</p>
          </div>
        )}

        {state === 'invalid' && (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <ShieldAlert className="w-10 h-10 text-amber-400" />
            <h1 className="text-xl font-extrabold">This link isn&apos;t valid</h1>
            <p className="text-sm text-white/55 max-w-xs">
              Reset links expire after an hour and work only once. Please request a new one from the sign-in screen.
            </p>
            <Link
              href="/"
              className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-sm font-semibold px-5 py-2.5 transition-colors"
            >
              Back to sign in <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {state === 'form' && (
          <>
            <h1 className="text-xl font-extrabold mb-1">Set a new password</h1>
            <p className="text-sm text-white/50 mb-6">Choose a password you&apos;ll remember. Minimum 6 characters.</p>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-[0.18em] text-white/50 font-semibold">
                  New password
                </label>
                <div className="relative">
                  <input
                    type={show ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    autoFocus
                    className="w-full rounded-xl bg-white/[0.06] border border-white/12 px-3.5 py-2.5 pr-10 text-sm outline-none focus:border-[#A78BFA] focus:ring-2 focus:ring-[#6D28D9]/40"
                    placeholder="New password"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                    tabIndex={-1}
                  >
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-[0.18em] text-white/50 font-semibold">
                  Confirm password
                </label>
                <input
                  type={show ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  className="w-full rounded-xl bg-white/[0.06] border border-white/12 px-3.5 py-2.5 text-sm outline-none focus:border-[#A78BFA] focus:ring-2 focus:ring-[#6D28D9]/40"
                  placeholder="Re-enter password"
                />
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-semibold px-5 py-3 transition-colors disabled:opacity-60"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Set password &amp; sign in</>}
              </button>
            </form>
          </>
        )}

        {state === 'done' && (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <CheckCircle2 className="w-11 h-11 text-emerald-400" />
            <h1 className="text-xl font-extrabold">Password updated</h1>
            <p className="text-sm text-white/55 max-w-xs">You&apos;re all set and signed in.</p>
            <Link
              href={dashboard}
              className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-sm font-semibold px-5 py-2.5 transition-colors"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>

      <Link href="/" className="mt-6 text-xs text-white/40 hover:text-white/70 transition-colors">
        ← Back to 3233 VIBE
      </Link>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#14121B] flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-[#A78BFA] animate-spin" />
        </div>
      }
    >
      <ResetInner />
    </Suspense>
  )
}
