import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const publicRoutes = [
  '/',
  '/search',
  '/categories',
  '/listing',
  '/about',
  '/contact',
  '/terms',
  '/privacy',
  '/admin/debug',
  '/admin/status',
]

const authRoutes = [
  '/auth/login',
  '/auth/register',
  '/auth/logout',
  '/auth/callback',
]

const protectedPatterns = [
  '/sell',
  '/basket',
  '/checkout',
  '/messages',
  '/orders',
  '/sales',
  '/profile/edit',
  '/admin',
]

export async function middleware(request: NextRequest) {
  const res = NextResponse.next()
  // Make Supabase optional in middleware to avoid hard-failing when env is missing locally
  let session: any = null
  try {
    const hasSupabaseEnv = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    if (hasSupabaseEnv) {
      const supabase = createMiddlewareClient({ req: request, res })
      const { data: { session: s } } = await supabase.auth.getSession()
      session = s
    }
  } catch (e) {
    console.error('middleware supabase session error', e)
  }
  
  const path = request.nextUrl.pathname
  const isAsset = path.startsWith('/_next') || path.startsWith('/favicon') || path.startsWith('/robots') || path.startsWith('/sitemap') || path.startsWith('/images')
  const isAccessRoute = path === '/access' || path.startsWith('/api/access')
  const isAuthRoute = authRoutes.some(route => path.startsWith(route))
  const isPublicRoute = publicRoutes.some(route => path === route || path.startsWith(`${route}/`))
  const needsAuth = protectedPatterns.some(pattern => path.startsWith(pattern))
  
  // Password gate: if configured, require a cookie to proceed
  const gateEnabled = Boolean(process.env.SITE_ACCESS_PASSWORD || process.env.NEXT_PUBLIC_SITE_ACCESS_PASSWORD)
  const hasGateCookie = request.cookies.get('site_access')?.value === 'granted'
  if (gateEnabled && !hasGateCookie && !isAsset && !isAccessRoute) {
    const url = new URL('/access', request.url)
    url.searchParams.set('next', path)
    return NextResponse.redirect(url)
  }
  
  // Redirect unauthenticated users trying to access protected routes
  if (!session && needsAuth) {
    const url = new URL('/auth/login', request.url)
    url.searchParams.set('next', path)
    return NextResponse.redirect(url)
  }

  // Allow auth routes regardless of session status
  if (isAuthRoute) {
    return res
  }

  return res
}