// Hourly trigger for 24-hour event reminder emails.
// Calls the app's cron endpoint with the shared secret.
// Requires the CRON_SECRET environment variable in Netlify
// (Site settings → Environment variables); `URL` is provided
// by Netlify automatically.

export default async function handler() {
  const base = process.env.URL || process.env.DEPLOY_PRIME_URL
  const secret = process.env.CRON_SECRET
  if (!base || !secret) {
    console.error('[event-reminders] Missing URL or CRON_SECRET env — skipping run')
    return
  }
  const res = await fetch(`${base}/api/cron/event-reminders`, {
    headers: { Authorization: `Bearer ${secret}` },
  })
  const body = await res.text()
  console.log(`[event-reminders] ${res.status}: ${body}`)
}

export const config = {
  schedule: '@hourly',
}
