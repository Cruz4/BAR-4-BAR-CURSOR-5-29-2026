import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isAppRootSegment } from '@/lib/profile/profile-slug';
import { matchSecurityCanaryPath } from '@/lib/security-canary-paths';
import {
  canonicalPublicUrl,
  hostnameFromHostHeader,
  shouldCanonicalizeLegacyFirebaseHost,
} from '@/lib/app-url';

const PROTECTED_PREFIXES = ['/albums', '/usage', '/admin', '/vault', '/earnings'];

export function middleware(request: NextRequest) {
  const host = hostnameFromHostHeader(
    request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  );
  const proto = request.headers.get('x-forwarded-proto');
  const { pathname, search } = request.nextUrl;

  // Default Firebase Hosting URL only — never akasheet.com, localhost, or firebaseapp.com.
  if (shouldCanonicalizeLegacyFirebaseHost(host, pathname)) {
    return NextResponse.redirect(canonicalPublicUrl(pathname, search), 308);
  }

  if (
    proto === 'http' &&
    host &&
    !host.includes('localhost') &&
    !host.startsWith('127.0.0.1')
  ) {
    const httpsUrl = request.nextUrl.clone();
    httpsUrl.protocol = 'https:';
    httpsUrl.host = host;
    return NextResponse.redirect(httpsUrl, 308);
  }

  const canaryPath = matchSecurityCanaryPath(pathname);
  if (canaryPath) {
    const url = request.nextUrl.clone();
    url.pathname = '/api/security/canary';
    url.search = `?p=${encodeURIComponent(canaryPath)}`;
    return NextResponse.rewrite(url);
  }

  if (pathname.startsWith('/profile/')) {
    if (pathname === '/profile/customize' || pathname.startsWith('/profile/customize/')) {
      return NextResponse.next();
    }
    const rest = pathname.slice('/profile'.length);
    if (rest.length > 1) {
      const url = request.nextUrl.clone();
      url.pathname = rest;
      return NextResponse.redirect(url, 308);
    }
  }

  const parts = pathname.split('/').filter(Boolean);
  if (parts.length >= 1 && !isAppRootSegment(parts[0]) && !parts[0].includes('.')) {
    const url = request.nextUrl.clone();
    url.pathname = `/profile/${parts.join('/')}`;
    return NextResponse.rewrite(url);
  }

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isProtected) {
    return NextResponse.next();
  }

  // Client-side AuthProvider handles auth redirects for all protected routes.
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|__/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|otf|webmanifest)$).*)',
  ],
};
