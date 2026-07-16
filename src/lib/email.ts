import { Resend } from 'resend'
import nodemailer from 'nodemailer'

/* ────────────────────────────────────────────────────────────────
 * Outbound email transport.
 *
 *  1. SMTP (preferred when configured): set SMTP_USER + SMTP_PASS
 *     (e.g. a Gmail address + app password). SMTP_HOST/SMTP_PORT
 *     default to Gmail. EMAIL_FROM should match the SMTP account
 *     (or one of its verified aliases) or Gmail will rewrite it.
 *  2. Resend (fallback): RESEND_API_KEY.
 *  3. Neither set → send calls return {success:false} and log,
 *     so the app keeps working in dev/CI.
 * ────────────────────────────────────────────────────────────── */

const FROM_ADDRESS = process.env.EMAIL_FROM || 'VIBE District 3233 <onboarding@resend.dev>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://vibe-district3233.netlify.app'

function getSmtp() {
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS?.replace(/\s+/g, '') // app passwords are shown with cosmetic spaces
  if (!user || !pass) return null
  const port = Number(process.env.SMTP_PORT || 465)
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure: port === 465,
    auth: { user, pass },
  })
}

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  return new Resend(key)
}

type SendResult = { success: boolean; id?: string; error?: string }

async function send(
  to: string,
  subject: string,
  html: string,
  bcc?: string[],
): Promise<SendResult> {
  const smtp = getSmtp()
  if (smtp) {
    try {
      const info = await smtp.sendMail({ from: FROM_ADDRESS, to, subject, html, ...(bcc?.length ? { bcc } : {}) })
      return { success: true, id: info.messageId }
    } catch (err) {
      console.error('[email] SMTP error:', err)
      return { success: false, error: err instanceof Error ? err.message : 'SMTP send failed' }
    }
  }

  const resend = getResend()
  if (!resend) {
    console.warn(`[email] No SMTP_USER/SMTP_PASS or RESEND_API_KEY set — skipping: "${subject}" → ${to}`)
    return { success: false, error: 'Email transport not configured' }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: [to],
      ...(bcc?.length ? { bcc } : {}),
      subject,
      html,
    })
    if (error) {
      console.error('[email] Resend error:', error)
      return { success: false, error: error.message }
    }
    return { success: true, id: data?.id }
  } catch (err) {
    console.error('[email] Send threw:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown' }
  }
}

/* ────────────────────────────────────────────────────────────────
 * Shared shell — wraps body content in a consistent dark template
 * with VIBE branding. Inline styles (Gmail/Outlook safe).
 * ────────────────────────────────────────────────────────────── */

function shell(opts: {
  preheader: string
  title: string
  intro: string
  bodyHtml: string
  cta?: { label: string; href: string }
  footerNote?: string
}) {
  const { preheader, title, intro, bodyHtml, cta, footerNote } = opts
  return `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#FAFAF9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1A1815;">
  <span style="display:none;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${escapeHtml(preheader)}</span>
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#FAFAF9;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:560px;background:#fff;border:1px solid #1A18150F;border-radius:20px;overflow:hidden;">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#6D28D9 0%,#1A468F 100%);padding:32px 32px 28px 32px;text-align:center;">
          <div style="color:#fff;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;opacity:0.7;margin-bottom:6px;">Rotaract District 3233</div>
          <div style="color:#fff;font-size:28px;font-weight:800;letter-spacing:-0.5px;">VIBE</div>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:36px 32px 24px 32px;">
          <h1 style="margin:0 0 12px 0;font-size:22px;font-weight:800;color:#1A1815;line-height:1.3;">${escapeHtml(title)}</h1>
          <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#1A1815B3;">${intro}</p>
          ${bodyHtml}
          ${cta ? `
          <div style="margin:28px 0 8px 0;text-align:center;">
            <a href="${escapeAttr(cta.href)}" style="display:inline-block;background:#6D28D9;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:14px 28px;border-radius:12px;box-shadow:0 8px 24px -10px rgba(109,40,217,0.55);">
              ${escapeHtml(cta.label)} →
            </a>
          </div>` : ''}
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#FAFAF9;padding:20px 32px;border-top:1px solid #1A181508;text-align:center;">
          ${footerNote ? `<p style="margin:0 0 8px 0;font-size:12px;color:#1A18157A;">${footerNote}</p>` : ''}
          <p style="margin:0;font-size:11px;color:#1A1815A0;letter-spacing:0.5px;">
            © ${new Date().getFullYear()} Rotaract District 3233 · VIBE Platform
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body></html>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
function escapeAttr(s: string): string { return escapeHtml(s) }

/* ────────────────────────────────────────────────────────────────
 * 1. Welcome email — sent when a president adds a new member.
 *    Contains login credentials and the dashboard link.
 * ────────────────────────────────────────────────────────────── */

export async function sendWelcomeEmail(opts: {
  memberName: string
  memberEmail: string
  tempPassword: string
  referredByName: string
  clubName: string | null
}): Promise<SendResult> {
  const { memberName, memberEmail, tempPassword, referredByName, clubName } = opts

  const bodyHtml = `
    <div style="background:#FAFAF9;border:1px solid #1A18150F;border-radius:14px;padding:20px;margin:0 0 20px 0;">
      <p style="margin:0 0 4px 0;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#1A18157A;">Your login credentials</p>
      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-top:10px;">
        <tr>
          <td style="font-size:12px;color:#1A18157A;padding:6px 0;width:90px;">Email</td>
          <td style="font-size:14px;font-weight:600;color:#1A1815;font-family:ui-monospace,Menlo,monospace;">${escapeHtml(memberEmail)}</td>
        </tr>
        <tr>
          <td style="font-size:12px;color:#1A18157A;padding:6px 0;">Password</td>
          <td style="font-size:14px;font-weight:600;color:#6D28D9;font-family:ui-monospace,Menlo,monospace;">${escapeHtml(tempPassword)}</td>
        </tr>
      </table>
    </div>
    <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#1A1815B3;">
      You were added by <strong style="color:#1A1815;">${escapeHtml(referredByName)}</strong>${clubName ? ` from <strong style="color:#1A1815;">${escapeHtml(clubName)}</strong>` : ''}.
      Use the credentials above to sign in to the VIBE platform.
    </p>
    <p style="margin:0;font-size:13px;line-height:1.55;color:#1A181599;background:#FFFBEB;border-left:3px solid #F2A410;padding:10px 14px;border-radius:6px;">
      💡 <strong>Tip:</strong> Show your QR pass at District events to check in and earn points. Climb the leaderboard!
    </p>`

  return send(
    memberEmail,
    `Welcome to VIBE, ${memberName.split(' ')[0]}!`,
    shell({
      preheader: 'Your VIBE login credentials and getting started.',
      title: `Welcome, ${memberName}!`,
      intro: 'Your VIBE account is ready. Sign in to view your QR pass, track points, and see upcoming district events.',
      bodyHtml,
      cta: { label: 'Sign in to VIBE', href: APP_URL },
      footerNote: 'Please change your password after first login.',
    }),
  )
}

/* ────────────────────────────────────────────────────────────────
 * 2. DRC booking confirmation — sent when a president books or
 *    updates a DRC event booking.
 * ────────────────────────────────────────────────────────────── */

export async function sendBookingConfirmationEmail(opts: {
  presidentName: string
  presidentEmail: string
  eventName: string
  eventDate: string
  eventLocation: string | null
  clubName: string
  attendeeCount: number
  contactName: string | null
  contactPhone: string | null
  isUpdate?: boolean
}): Promise<SendResult> {
  const {
    presidentName,
    presidentEmail,
    eventName,
    eventDate,
    eventLocation,
    clubName,
    attendeeCount,
    contactName,
    contactPhone,
    isUpdate,
  } = opts

  const verb = isUpdate ? 'updated' : 'confirmed'

  const bodyHtml = `
    <div style="background:#F5F3FF;border:1px solid #6D28D922;border-radius:14px;padding:20px;margin:0 0 20px 0;">
      <p style="margin:0 0 8px 0;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#6D28D9;">Booking Details</p>
      <p style="margin:0 0 16px 0;font-size:17px;font-weight:700;color:#1A1815;">${escapeHtml(eventName)}</p>
      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;">
        <tr><td style="font-size:12px;color:#1A18157A;padding:4px 0;width:110px;">📅 When</td>
            <td style="font-size:13px;color:#1A1815;">${escapeHtml(eventDate)}</td></tr>
        ${eventLocation ? `
        <tr><td style="font-size:12px;color:#1A18157A;padding:4px 0;">📍 Where</td>
            <td style="font-size:13px;color:#1A1815;">${escapeHtml(eventLocation)}</td></tr>` : ''}
        <tr><td style="font-size:12px;color:#1A18157A;padding:4px 0;">🏛️ Club</td>
            <td style="font-size:13px;color:#1A1815;font-weight:600;">${escapeHtml(clubName)}</td></tr>
        <tr><td style="font-size:12px;color:#1A18157A;padding:4px 0;">👥 Attendees</td>
            <td style="font-size:13px;color:#1A1815;font-weight:600;">${attendeeCount}</td></tr>
        ${contactName ? `
        <tr><td style="font-size:12px;color:#1A18157A;padding:4px 0;">📞 Contact</td>
            <td style="font-size:13px;color:#1A1815;">${escapeHtml(contactName)}${contactPhone ? ` · ${escapeHtml(contactPhone)}` : ''}</td></tr>` : ''}
      </table>
    </div>
    <p style="margin:0;font-size:13px;line-height:1.55;color:#1A181599;">
      You can manage or cancel this booking anytime from the President Portal.
    </p>`

  return send(
    presidentEmail,
    `${isUpdate ? 'Booking updated' : 'Booking confirmed'} — ${eventName}`,
    shell({
      preheader: `Your booking for ${eventName} is ${verb}.`,
      title: `Booking ${verb}!`,
      intro: `Hi ${escapeHtml(presidentName.split(' ')[0])}, your club's booking for the event below is ${verb}.`,
      bodyHtml,
      cta: { label: 'Manage in President Portal', href: `${APP_URL}/portal` },
    }),
  )
}

/* ────────────────────────────────────────────────────────────────
 * 1b. Password reset — one-time link to set a new password.
 * ────────────────────────────────────────────────────────────── */

export async function sendPasswordResetEmail(opts: {
  name: string | null
  email: string
  resetUrl: string
  expiresMinutes: number
}): Promise<SendResult> {
  const { name, email, resetUrl, expiresMinutes } = opts

  const bodyHtml = `
    <p style="margin:0 0 20px 0;font-size:14px;line-height:1.6;color:#1A1815B3;">
      We received a request to reset the password for <strong style="color:#1A1815;">${escapeHtml(email)}</strong>.
      Click the button below to choose a new one.
    </p>
    <p style="margin:0;font-size:13px;line-height:1.55;color:#1A181599;background:#FFFBEB;border-left:3px solid #F2A410;padding:10px 14px;border-radius:6px;">
      This link expires in ${expiresMinutes} minutes and can be used once. If you didn&rsquo;t request this,
      you can safely ignore this email — your password stays unchanged.
    </p>`

  return send(
    email,
    'Reset your VIBE password',
    shell({
      preheader: 'Use this one-time link to set a new VIBE password.',
      title: 'Reset your password',
      intro: `Hi ${escapeHtml((name ?? 'there').split(' ')[0])}, let&rsquo;s get you back in.`,
      bodyHtml,
      cta: { label: 'Set a new password', href: resetUrl },
      footerNote: 'For your security, this link works only once and expires shortly.',
    }),
  )
}

/* ────────────────────────────────────────────────────────────────
 * 2a2. MoM published — sent to every club president (BCC) when a
 *      DRC's Minutes of Meeting go from draft to published.
 * ────────────────────────────────────────────────────────────── */

export async function sendMomPublishedEmail(opts: {
  momId: string
  eventName: string
  eventDate: string | null
  meetingNumber: string | null
  venue: string | null
  presidentEmails: string[]
}): Promise<SendResult> {
  const { momId, eventName, eventDate, meetingNumber, venue, presidentEmails } = opts
  if (presidentEmails.length === 0) return { success: false, error: 'No president emails' }

  const momUrl = `${APP_URL}/mom/${momId}`

  const bodyHtml = `
    <div style="background:#F5F3FF;border:1px solid #6D28D922;border-radius:14px;padding:20px;margin:0 0 20px 0;">
      <p style="margin:0 0 8px 0;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#6D28D9;">Minutes of Meeting</p>
      <p style="margin:0 0 16px 0;font-size:17px;font-weight:700;color:#1A1815;">${escapeHtml(eventName)}</p>
      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;">
        ${meetingNumber ? `
        <tr><td style="font-size:12px;color:#1A18157A;padding:4px 0;width:110px;">📋 Meeting</td>
            <td style="font-size:13px;color:#1A1815;">${escapeHtml(meetingNumber)}</td></tr>` : ''}
        ${eventDate ? `
        <tr><td style="font-size:12px;color:#1A18157A;padding:4px 0;">📅 Held on</td>
            <td style="font-size:13px;color:#1A1815;">${escapeHtml(eventDate)}</td></tr>` : ''}
        ${venue ? `
        <tr><td style="font-size:12px;color:#1A18157A;padding:4px 0;">📍 Venue</td>
            <td style="font-size:13px;color:#1A1815;">${escapeHtml(venue)}</td></tr>` : ''}
      </table>
    </div>
    <p style="margin:0;font-size:13px;line-height:1.55;color:#1A181599;">
      Open the minutes to review district updates, completed and upcoming projects, and the
      action items for your club. You can download a PDF copy from the same page.
    </p>`

  return send(
    FROM_ADDRESS, // self-addressed; presidents receive via BCC
    `Minutes published — ${eventName}`,
    shell({
      preheader: `The minutes of ${eventName} are now available.`,
      title: 'Minutes of Meeting published',
      intro: `Dear President, the official minutes of <b>${escapeHtml(eventName)}</b> have been published for all clubs of Rotaract District 3233.`,
      bodyHtml,
      cta: { label: 'Read & download the minutes', href: momUrl },
      footerNote: 'Sent to all club presidents of Rotaract District 3233.',
    }),
    presidentEmails,
  )
}

/* ────────────────────────────────────────────────────────────────
 * 2b. Event reminder — sent ~24 hours before an event starts to
 *     every club officer with a booking (see /api/cron/event-reminders).
 * ────────────────────────────────────────────────────────────── */

export async function sendEventReminderEmail(opts: {
  recipientName: string
  recipientEmail: string
  eventId: string
  eventName: string
  eventDate: string
  eventLocation: string | null
  clubName: string
  attendeeCount: number
}): Promise<SendResult> {
  const { recipientName, recipientEmail, eventId, eventName, eventDate, eventLocation, clubName, attendeeCount } =
    opts

  const bodyHtml = `
    <div style="background:#FFFBEB;border:1px solid #F2A41033;border-radius:14px;padding:20px;margin:0 0 20px 0;">
      <p style="margin:0 0 8px 0;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#9B6A00;">⏰ Starts in about 24 hours</p>
      <p style="margin:0 0 16px 0;font-size:17px;font-weight:700;color:#1A1815;">${escapeHtml(eventName)}</p>
      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;">
        <tr><td style="font-size:12px;color:#1A18157A;padding:4px 0;width:110px;">📅 When</td>
            <td style="font-size:13px;color:#1A1815;">${escapeHtml(eventDate)}</td></tr>
        ${eventLocation ? `
        <tr><td style="font-size:12px;color:#1A18157A;padding:4px 0;">📍 Where</td>
            <td style="font-size:13px;color:#1A1815;">${escapeHtml(eventLocation)}</td></tr>` : ''}
        <tr><td style="font-size:12px;color:#1A18157A;padding:4px 0;">🏛️ Club</td>
            <td style="font-size:13px;color:#1A1815;font-weight:600;">${escapeHtml(clubName)}</td></tr>
        <tr><td style="font-size:12px;color:#1A18157A;padding:4px 0;">👥 Delegation</td>
            <td style="font-size:13px;color:#1A1815;font-weight:600;">${attendeeCount} attendee${attendeeCount === 1 ? '' : 's'}</td></tr>
      </table>
    </div>
    <p style="margin:0;font-size:13px;line-height:1.55;color:#1A181599;background:#F5F3FF;border-left:3px solid #6D28D9;padding:10px 14px;border-radius:6px;">
      💡 Remind your delegation to carry their <strong>QR passes</strong> — scan-in on arrival earns
      points, and arriving early earns the punctuality bonus.
    </p>`

  return send(
    recipientEmail,
    `Reminder: ${eventName} starts tomorrow`,
    shell({
      preheader: `${eventName} starts in about 24 hours — get your delegation ready.`,
      title: 'Your event is tomorrow!',
      intro: `Hi ${escapeHtml(recipientName.split(' ')[0])}, a quick heads-up — <b>${escapeHtml(eventName)}</b> starts in about 24 hours and your club has a confirmed booking.`,
      bodyHtml,
      cta: { label: 'View the event page', href: `${APP_URL}/events/${eventId}` },
      footerNote: 'You are receiving this because you booked this event for your club.',
    }),
  )
}

/* ────────────────────────────────────────────────────────────────
 * 3. Registration approved — sent when a club officer approves a
 *    public registration. No credentials: the member creates their
 *    own password at first sign-in.
 * ────────────────────────────────────────────────────────────── */

export async function sendRegistrationApprovedEmail(opts: {
  memberName: string
  memberEmail: string
  clubName: string
}): Promise<SendResult> {
  const { memberName, memberEmail, clubName } = opts
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://vibe3233.netlify.app'

  const bodyHtml = `
    <div style="background:#F5F3FF;border:1px solid #6D28D91F;border-radius:14px;padding:20px 22px;margin:0 0 8px 0;">
      <p style="margin:0 0 10px 0;font-size:13px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#6D28D9;">Next steps</p>
      <ol style="margin:0;padding-left:18px;font-size:14px;line-height:1.9;color:#1A1815CC;">
        <li>Sign in with this email — you'll create your password on first login.</li>
        <li>Open your member portal to find your personal <b>QR identity pass</b>.</li>
        <li>Show the QR at district events to log attendance and earn VIBE points.</li>
      </ol>
    </div>`

  return send(
    memberEmail,
    `Welcome to ${clubName} — your VIBE registration is approved 🎉`,
    shell({
      preheader: `Your registration for ${clubName} was approved. Sign in to get your QR pass.`,
      title: `You're in, ${memberName}!`,
      intro: `Your membership registration for <b>${escapeHtml(clubName)}</b> has been approved by your club. Welcome to Rotaract District 3233.`,
      bodyHtml,
      cta: { label: 'Sign in to VIBE', href: APP_URL },
      footerNote: 'Use the email this message was sent to when signing in.',
    }),
  )
}
