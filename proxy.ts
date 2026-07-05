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

  // Admin area uses its own session cookie
  const adminLoggedIn =
    Boolean(request.cookies.get('admin_token')?.value) ||
    request.cookies.get('admin_logged_in')?.value === 'true'
  const isAdminLogin = pathname === '/admin/login'
  const isAdminArea = pathname.startsWith('/admin') && !isAdminLogin

  // Block unauthenticated access to the dashboard — redirect to home
  if (isDashboard && !isAuthenticated) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Keep authenticated users out of the auth pages
  if (isAuthPage && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Block unauthenticated access to the admin area
  if (isAdminArea && !adminLoggedIn) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  // Keep authenticated admins out of the admin login page
  if (isAdminLogin && adminLoggedIn) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/signup', '/admin/:path*'],
}
