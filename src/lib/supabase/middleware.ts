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

  if (pathname.startsWith('/admin') && adminCookie !== '1') {
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
