import 'server-only';

import type { Firestore } from 'firebase-admin/firestore';
import type { Auth } from 'firebase-admin/auth';
import { getPublicAppUrl } from '@/lib/app-url';
import { escapeHtml, wrapStudioEmail } from '@/lib/server/mail/email-layout';
import { sendStudioEmail, isStudioMailConfigured } from '@/lib/server/mail/mailer';

const RESEND_COOLDOWN_MS = 45_000;

export type SendVerificationEmailResult =
  | { ok: true }
  | { ok: false; error: string; status: number };

/**
 * Build a Firebase email-verification link and deliver it via Resend
 * (AKAsheet branded — not Firebase's *.firebaseapp.com noreply).
 */
export async function sendBrandedVerificationEmail(opts: {
  auth: Auth;
  db: Firestore;
  userId: string;
  email: string;
  displayName?: string | null;
  /** Bypass cooldown (e.g. first signup send). */
  force?: boolean;
}): Promise<SendVerificationEmailResult> {
  const email = opts.email.trim().toLowerCase();
  if (!email.includes('@')) {
    return { ok: false, error: 'No email on this account.', status: 400 };
  }

  if (!isStudioMailConfigured()) {
    return {
      ok: false,
      error: 'Email delivery is not configured. Try again later or contact support.',
      status: 503,
    };
  }

  const userRef = opts.db.collection('users').doc(opts.userId);
  if (!opts.force) {
    const snap = await userRef.get();
    const last = snap.data()?.verificationEmailSentAt;
    if (typeof last === 'string') {
      const elapsed = Date.now() - new Date(last).getTime();
      if (Number.isFinite(elapsed) && elapsed < RESEND_COOLDOWN_MS) {
        const waitSec = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
        return {
          ok: false,
          error: `Wait ${waitSec}s before requesting another verification email.`,
          status: 429,
        };
      }
    }
  }

  let link: string;
  try {
    link = await opts.auth.generateEmailVerificationLink(email, {
      url: `${getPublicAppUrl()}/`,
      handleCodeInApp: false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not create verification link';
    console.error('[verification-email] generateEmailVerificationLink', message);
    return { ok: false, error: message, status: 502 };
  }

  const name = opts.displayName?.trim() || null;
  const greet = name ? `Hey ${escapeHtml(name)},` : 'Hey,';
  const body = wrapStudioEmail({
    preheader: 'Confirm your email to finish setting up AKAsheet.',
    title: 'Verify your email',
    bodyHtml: `
      <p style="margin:0 0 14px">${greet}</p>
      <p style="margin:0 0 14px">Confirm <strong style="color:#fff">${escapeHtml(email)}</strong> so we know it’s really you. This keeps your studio secure and unlocks the full welcome path.</p>
      <p style="margin:0 0 14px">Tap the button below — the link expires after a while, so request a new one from the studio if needed.</p>
    `,
    ctaLabel: 'Verify email',
    ctaUrl: link,
    footerNote: 'If you didn’t create a AKAsheet account, you can ignore this email.',
  });

  const result = await sendStudioEmail({
    to: email,
    subject: 'Verify your AKAsheet email',
    html: body.html,
    text: `${body.text}\n\nVerify: ${link}`,
  });

  if (!result.sent) {
    return {
      ok: false,
      error: result.skipped || 'Could not send verification email',
      status: 502,
    };
  }

  await userRef.set(
    {
      verificationEmailSentAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  return { ok: true };
}
