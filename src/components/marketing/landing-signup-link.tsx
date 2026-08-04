'use client';

import React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { buildLoginUrl } from '@/lib/login-links';

type LinkProps = React.ComponentProps<typeof Link>;
/** href is computed internally, so callers should never need to supply it. */
type OwnHrefLinkProps = Omit<LinkProps, 'href'> & { href?: LinkProps['href'] };

type SignupLinkProps = OwnHrefLinkProps & {
  /** Optional login intent (e.g. claim_artist_home). */
  intent?: string;
};

/** Preserves landing ?ref= and opens login on the Sign Up tab. */
export function LandingSignupLink({ href: _href, intent, ...props }: SignupLinkProps) {
  const searchParams = useSearchParams();
  const href = buildLoginUrl({
    mode: 'signup',
    marketingRef: searchParams.get('ref'),
    intent: intent || undefined,
  });
  return <Link href={href} {...props} />;
}

/** Existing users — sign in without forcing signup tab. */
export function LandingSignInLink({ href: _href, ...props }: OwnHrefLinkProps) {
  const searchParams = useSearchParams();
  const href = buildLoginUrl({ marketingRef: searchParams.get('ref') });
  return <Link href={href} {...props} />;
}
