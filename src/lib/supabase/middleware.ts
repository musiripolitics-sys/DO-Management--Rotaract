import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl
  const memberCookie = request.cookies.get('vibe_member')?.value
  const adminCookie = request.cookies.get('vibe_admin')?.value

  if (
    (pathname.startsWith('/dashboard') ||
      pathname.startsWith('/portal') ||
      pathname.startsWith('/do-portal')) &&
    !memberCookie
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // Presence check only — signature verification happens in the API routes
  // (middleware runs on the Edge runtime, which lacks node:crypto)
  if (pathname.startsWith('/admin') && !adminCookie) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  if (pathname === '/' && memberCookie) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}
