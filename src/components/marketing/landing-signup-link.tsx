'use client';

import React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { buildLandingSignupUrl, buildLoginUrl } from '@/lib/login-links';

type LinkProps = React.ComponentProps<typeof Link>;

/** Preserves landing ?ref= and opens login on the Sign Up tab. */
export function LandingSignupLink({ href: _href, ...props }: LinkProps) {
  const searchParams = useSearchParams();
  const href = buildLandingSignupUrl(searchParams);
  return <Link href={href} {...props} />;
}

/** Existing users — sign in without forcing signup tab. */
export function LandingSignInLink(props: LinkProps) {
  const searchParams = useSearchParams();
  const href = buildLoginUrl({ marketingRef: searchParams.get('ref') });
  return <Link href={href} {...props} />;
}
