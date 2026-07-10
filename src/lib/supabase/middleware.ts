import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED = ['/dashboard', '/portal', '/do-portal', '/admin']

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl
  // Single unified cookie. Presence check only — signature verification and
  // role enforcement happen in the API routes / page guards (the Edge runtime
  // lacks node:crypto, so we can't verify the HMAC here).
  const session = request.cookies.get('vibe_session')?.value

  if (PROTECTED.some((p) => pathname.startsWith(p)) && !session) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}
