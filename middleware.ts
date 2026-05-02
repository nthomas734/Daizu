import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE, AUTH_COOKIE_VALUE } from './lib/auth';

// This runs on every request. We let through:
//  - the auth page itself (so people can log in)
//  - the auth API endpoint (so the form can POST)
//  - static files (Next.js handles these via the matcher below, but defensive)
//  - the manifest and icons (so the PWA shell can load even before login)
//
// Everything else requires the daizu_auth cookie.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow the auth flow + PWA shell assets
  if (
    pathname.startsWith('/auth') ||
    pathname.startsWith('/api/auth') ||
    pathname === '/manifest.json' ||
    pathname.startsWith('/icon-')
  ) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get(AUTH_COOKIE);
  if (cookie?.value === AUTH_COOKIE_VALUE) {
    return NextResponse.next();
  }

  // Not authenticated — bounce to /auth, preserving where they were going
  const url = req.nextUrl.clone();
  url.pathname = '/auth';
  url.searchParams.set('next', pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // Run on all routes EXCEPT Next.js internals and static files
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
