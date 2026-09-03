'use client';

import type { User } from 'firebase/auth';
import { auth } from '@/lib/firebase/client/firebase';

/**
 * Send (or resend) a AKAsheet branded verification email via Resend
 * (From: noreply@akasheet.com) — not Firebase’s *.firebaseapp.com mailer.
 */
export async function sendSignupVerificationEmail(
  user: User,
  options?: { force?: boolean }
): Promise<void> {
  const token = await user.getIdToken();
  const res = await fetch('/api/auth/send-verification', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ force: options?.force === true }),
  });

  const body = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    alreadyVerified?: boolean;
    error?: string;
  };

  if (res.ok && (body.ok || body.alreadyVerified)) return;

  throw new Error(body.error || `Could not send verification email (${res.status})`);
}

/** @deprecated Prefer sendSignupVerificationEmail — kept for call-site clarity. */
export async function resendSignupVerificationEmail(user?: User | null): Promise<void> {
  const u = user ?? auth.currentUser;
  if (!u) throw new Error('Sign in to resend verification.');
  await sendSignupVerificationEmail(u, { force: false });
}
