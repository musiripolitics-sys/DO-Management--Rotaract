import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// ── Admin credentials (server-side only — never reaches the browser) ──
// To change: edit these values and redeploy. To rotate without a deploy,
// set the ADMIN_USERNAME / ADMIN_PASSWORD env vars in Netlify instead.
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'Kumar'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '1234098'

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json()

    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const res = NextResponse.json({ success: true })
    res.cookies.set('vibe_admin', '1', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 86400, // 24 h
    })
    return res
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE() {
  const res = NextResponse.json({ success: true })
  res.cookies.set('vibe_admin', '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return res
}
