'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, UserPlus } from 'lucide-react'
import RegisterForm from '@/components/RegisterForm'

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-white text-[#1A1815]">
      {/* Nav */}
      <header className="border-b border-[#1A1815]/8">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/vibe-logo.jpg" alt="Rotaract District 3233 — VIBE" width={2480} height={610} priority className="h-9 w-auto" />
          </Link>
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[#1A1815]/55 hover:text-[#6D28D9] transition">
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 py-12">
        <div className="mb-8">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] bg-[#6D28D9]/10 text-[#6D28D9] px-2.5 py-1 rounded-full mb-3">
            <UserPlus className="w-3 h-3" /> New member
          </span>
          <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight">Register as a member</h1>
          <p className="text-[#1A1815]/55 mt-2 text-sm leading-relaxed">
            Join your Rotaract club on VIBE. Your club's officers approve the registration —
            then you sign in and get your QR identity pass for event attendance.
          </p>
        </div>

        <RegisterForm />

        <p className="text-center text-xs text-[#1A1815]/40 mt-6">
          Already a member? <Link href="/" className="text-[#6D28D9] font-medium hover:underline">Sign in</Link>
        </p>
      </main>
    </div>
  )
}
