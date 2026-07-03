import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Route protection for the EV Showroom SaaS.
// Auth is custom (JWT + cookies), so we gate on the presence of the auth cookie.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const authToken = request.cookies.get('auth_token')?.value
  const loggedIn = request.cookies.get('user_logged_in')?.value === 'true'
  const isAuthenticated = Boolean(authToken) || loggedIn

  const isDashboard = pathname.startsWith('/dashboard')
  const isAuthPage = pathname === '/login' || pathname === '/signup'

  // Block unauthenticated access to the dashboard
  if (isDashboard && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Keep authenticated users out of the auth pages
  if (isAuthPage && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/signup'],
}
