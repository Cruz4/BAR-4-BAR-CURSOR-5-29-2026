import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_PREFIXES = ['/albums', '/usage', '/admin'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isProtected) {
    return NextResponse.next();
  }

  // Client-side AuthProvider handles auth redirects for all protected routes.
  return NextResponse.next();
}

export const config = {
  matcher: ['/albums/:path*', '/usage/:path*', '/admin/:path*'],
};
