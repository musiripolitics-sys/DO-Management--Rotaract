'use client'

import { useEffect } from 'react'

/**
 * Drop-in guard for member-facing surfaces. If the signed-in member
 * hasn't completed their profile, it redirects them to the wizard.
 * Renders nothing. Super admins and complete profiles pass through.
 */
export default function ProfileGate() {
  useEffect(() => {
    let active = true
    fetch('/api/profile')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!active || !d || d.superAdmin) return
        if (d.completion && !d.completion.isComplete) {
          window.location.href = '/complete-profile'
        }
      })
      .catch(() => {})
    return () => { active = false }
  }, [])
  return null
}
