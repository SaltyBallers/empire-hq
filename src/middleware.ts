import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function middleware(request: NextRequest) {
  const { supabase, response } = createClient(request)

  // Skip middleware for auth routes and static files
  const { pathname } = request.nextUrl
  if (
    pathname.startsWith('/login') || 
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico')
  ) {
    return response
  }

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // If no user and not on login page, redirect to login
    if (!user && pathname !== '/login') {
      const redirectUrl = new URL('/login', request.url)
      return Response.redirect(redirectUrl)
    }

    // Authorization: only allowed emails can access admin dashboard
    const ALLOWED_EMAILS = ['surfballers@gmail.com']
    if (user && !ALLOWED_EMAILS.includes(user.email ?? '')) {
      // Sign them out and redirect to login with error
      await supabase.auth.signOut()
      const redirectUrl = new URL('/login?error=unauthorized', request.url)
      return Response.redirect(redirectUrl)
    }

    // If user exists and on login page, redirect to dashboard
    if (user && pathname === '/login') {
      const redirectUrl = new URL('/', request.url)
      return Response.redirect(redirectUrl)
    }

    return response
  } catch (error) {
    // If error verifying user, redirect to login
    if (pathname !== '/login') {
      const redirectUrl = new URL('/login', request.url)
      return Response.redirect(redirectUrl)
    }
    return response
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}