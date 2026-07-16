'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Download, Printer } from 'lucide-react'
import MomPreview from '@/app/admin/mom/[id]/_components/MomPreview'
import type { Completion, MomMeeting, MomStats, MomUpdate } from '@/lib/mom'

/* ────────────────────────────────────────────────────────────────
 * Public Minutes of Meeting — linked from the homepage and from the
 * presidents' "minutes published" email. Print = PDF download.
 * ────────────────────────────────────────────────────────────── */

type Payload = {
  meeting: MomMeeting
  updates: MomUpdate[]
  completion: Completion
  stats: MomStats
}

export default function PublicMomPage() {
  const params = useParams<{ id: string }>()
  const [data, setData] = useState<Payload | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading')

  useEffect(() => {
    if (!params?.id) return
    let cancelled = false
    fetch(`/api/public/mom/${params.id}`)
      .then(async (r) => (r.ok ? ((await r.json()) as Payload) : null))
      .then((payload) => {
        if (cancelled) return
        if (!payload) setState('missing')
        else {
          setData(payload)
          setState('ready')
        }
      })
      .catch(() => !cancelled && setState('missing'))
    return () => {
      cancelled = true
    }
  }, [params?.id])

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-[#FAF7F0] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#6D28D9] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (state === 'missing' || !data) {
    return (
      <div className="min-h-screen bg-[#FAF7F0] flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-5xl">📋</p>
        <h1 className="text-2xl font-extrabold text-[#1A1815]">These minutes aren&apos;t available.</h1>
        <p className="text-sm text-[#1A1815]/55 max-w-sm">
          They may not be published yet, or the link is off by a character.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-full bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-sm font-semibold px-5 py-2.5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to the district home
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAF7F0]">
      <style>{`@media print { .no-print { display: none !important; } body { background: #fff !important; } }`}</style>

      {/* Top bar */}
      <header className="no-print sticky top-0 z-40 bg-[#FAF7F0]/90 backdrop-blur border-b border-[#1A1815]/8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <Link href="/" className="shrink-0" aria-label="VIBE — district home">
            <Image
              src="/vibe-logo.jpg"
              alt="Rotaract District 3233 — VIBE"
              width={2480}
              height={610}
              className="h-9 w-auto rounded"
            />
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-sm font-semibold rounded-full px-4 py-2 transition-colors"
            >
              <Download className="w-4 h-4" /> Download PDF
            </button>
            <button
              onClick={() => window.print()}
              className="hidden sm:inline-flex items-center gap-2 border border-[#1A1815]/15 hover:bg-[#1A1815]/5 text-[#1A1815] text-sm font-medium rounded-full px-4 py-2 transition-colors"
              aria-label="Print"
            >
              <Printer className="w-4 h-4" /> Print
            </button>
          </div>
        </div>
      </header>

      {/* Document */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="bg-white rounded-2xl border border-[#1A1815]/8 shadow-[0_24px_60px_-40px_rgba(26,24,21,0.4)] p-6 sm:p-10 print:shadow-none print:border-0 print:rounded-none print:p-0">
          <MomPreview
            meeting={data.meeting}
            updates={data.updates}
            completion={data.completion}
            stats={data.stats}
          />
        </div>
        <p className="no-print mt-6 text-center text-xs text-[#1A1815]/45">
          Published by the district secretariat · Rotaract District 3233
        </p>
      </main>
    </div>
  )
}
