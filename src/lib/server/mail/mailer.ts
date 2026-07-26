import 'server-only';

import { Resend } from 'resend';
import type { Firestore } from 'firebase-admin/firestore';
import { getPublicAppUrl } from '@/lib/app-url';
import { SUPPORT_EMAIL } from '@/lib/support';

const DEFAULT_FROM = 'Bar 4 Bar <onboarding@resend.dev>';

function getResendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  return new Resend(key);
}

function getFromAddress(): string {
  return process.env.RESEND_FROM_EMAIL?.trim() || DEFAULT_FROM;
}

/** noreply@ can't receive mail — route replies to the monitored support inbox. */
function getReplyToAddress(): string {
  return process.env.RESEND_REPLY_TO?.trim() || SUPPORT_EMAIL;
}

/** Claim once per idempotency key so webhook retries don't double-send. */
export async function claimEmailSend(
  db: Firestore,
  key: string
): Promise<boolean> {
  const ref = db.collection('studio_emails_sent').doc(key);
  try {
    await ref.create({
      claimedAt: new Date().toISOString(),
    });
    return true;
  } catch (err: unknown) {
    const code = (err as { code?: number | string })?.code;
    if (code === 6 || code === 409 || code === 'already-exists') return false;
    throw err;
  }
}

export type SendStudioEmailResult =
  | { sent: true; id?: string }
  | { sent: false; skipped: string };

export async function sendStudioEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Stable key — e.g. `welcome:uid` or `stripe:evt_xxx` */
  idempotencyKey?: string;
  db?: Firestore;
}): Promise<SendStudioEmailResult> {
  const to = opts.to.trim().toLowerCase();
  if (!to || !to.includes('@')) {
    return { sent: false, skipped: 'invalid_recipient' };
  }

  const client = getResendClient();
  if (!client) {
    console.warn('[mailer] RESEND_API_KEY missing — skipped:', opts.subject);
    return { sent: false, skipped: 'no_api_key' };
  }

  // Claim only after we know we can send — otherwise a missing key burns the key forever.
  if (opts.idempotencyKey && opts.db) {
    const claimed = await claimEmailSend(opts.db, opts.idempotencyKey);
    if (!claimed) return { sent: false, skipped: 'duplicate' };
  }

  try {
    const { data, error } = await client.emails.send({
      from: getFromAddress(),
      to: [to],
      replyTo: getReplyToAddress(),
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });
    if (error) {
      console.error('[mailer] Resend error', opts.subject, error);
      if (opts.idempotencyKey && opts.db) {
        await opts.db.collection('studio_emails_sent').doc(opts.idempotencyKey).delete().catch(() => {});
      }
      return { sent: false, skipped: error.message || 'resend_error' };
    }
    return { sent: true, id: data?.id };
  } catch (err) {
    console.error('[mailer] send failed', opts.subject, err);
    if (opts.idempotencyKey && opts.db) {
      await opts.db.collection('studio_emails_sent').doc(opts.idempotencyKey).delete().catch(() => {});
    }
    return { sent: false, skipped: err instanceof Error ? err.message : 'send_failed' };
  }
}

export function studioEmailCtaUrl(path = '/'): string {
  return `${getPublicAppUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}

export function isStudioMailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}
