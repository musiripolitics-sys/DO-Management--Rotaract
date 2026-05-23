import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json()

    const validUsername = process.env.ADMIN_USERNAME
    const validPassword = process.env.ADMIN_PASSWORD

    if (!validUsername || !validPassword) {
      return NextResponse.json(
        { error: 'Admin credentials are not configured on the server.' },
        { status: 500 },
      )
    }

    if (username !== validUsername || password !== validPassword) {
      // Constant-time-ish: always do both compares before returning
      const wrongUser = username !== validUsername
      const wrongPass = password !== validPassword
      if (wrongUser || wrongPass) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
      }
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
