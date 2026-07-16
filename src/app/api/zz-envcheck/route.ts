import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/* TEMPORARY diagnostic — reports only whether a var is present, never its
 * value. Used to confirm which env vars reach Netlify production functions.
 * Delete once the env scoping is confirmed. */
export async function GET() {
  const present = (k: string) => Boolean(process.env[k]?.trim())
  return NextResponse.json({
    builtAt: new Date().toISOString(),
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
