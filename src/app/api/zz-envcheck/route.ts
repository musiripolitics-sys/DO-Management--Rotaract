import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/* TEMPORARY diagnostic — reports only whether a var is present, never its
 * value, plus Vercel's own deploy metadata so we can tell which commit and
 * which environment is actually serving. Delete once email is confirmed. */
export async function GET() {
  const present = (k: string) => Boolean(process.env[k]?.trim())
  return NextResponse.json({
    // Vercel injects these itself — they identify the running deployment.
    vercelEnv: process.env.VERCEL_ENV ?? '(not on Vercel)',
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? '(unknown)',
    branch: process.env.VERCEL_GIT_COMMIT_REF ?? '(unknown)',
    respondedAt: new Date().toISOString(),

    // Vars we need for email. Values are never exposed.
    SMTP_HOST: present('SMTP_HOST'),
    SMTP_PORT: present('SMTP_PORT'),
    SMTP_USER: present('SMTP_USER'),
    SMTP_PASS: present('SMTP_PASS'),
    EMAIL_FROM: present('EMAIL_FROM'),
    RESEND_API_KEY: present('RESEND_API_KEY'),
    CRON_SECRET: present('CRON_SECRET'),
    NEXT_PUBLIC_APP_URL: present('NEXT_PUBLIC_APP_URL'),
    SUPABASE_SERVICE_ROLE_KEY: present('SUPABASE_SERVICE_ROLE_KEY'),
  })
}
