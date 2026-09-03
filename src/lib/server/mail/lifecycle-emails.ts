import 'server-only';

import type { Firestore } from 'firebase-admin/firestore';
import {
  FREE_ALBUM_LIMIT,
  FREE_TRACK_LIMIT,
  PRO_FEATURE_PREVIEW_DAYS,
  SIGNUP_INK,
} from '@/lib/subscription';
import { PRO_MONTHLY_PRICE, PRO_YEARLY_PRICE } from '@/lib/studio-tiers';
import { escapeHtml, wrapStudioEmail } from '@/lib/server/mail/email-layout';
import { sendStudioEmail, studioEmailCtaUrl } from '@/lib/server/mail/mailer';

async function resolveUserEmail(
  db: Firestore,
  userId: string,
  fallback?: string | null
): Promise<{ email: string | null; displayName: string | null }> {
  if (fallback?.includes('@')) {
    const snap = await db.collection('users').doc(userId).get();
    return {
      email: fallback.trim().toLowerCase(),
      displayName: (snap.data()?.displayName as string) || null,
    };
  }
  const snap = await db.collection('users').doc(userId).get();
  const data = snap.data() || {};
  const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
  return {
    email: email.includes('@') ? email : null,
    displayName: typeof data.displayName === 'string' ? data.displayName : null,
  };
}

function greet(name: string | null): string {
  const n = name?.trim();
  return n ? `Hey ${escapeHtml(n)},` : 'Hey,';
}

/** Branded welcome after verified signup / first Ink grant. */
export async function sendWelcomeEmail(
  db: Firestore,
  opts: { userId: string; email?: string | null; displayName?: string | null }
): Promise<void> {
  const { email, displayName } = await resolveUserEmail(db, opts.userId, opts.email);
  if (!email) return;

  const previewHours = PRO_FEATURE_PREVIEW_DAYS * 24;
  const body = wrapStudioEmail({
    preheader: `Welcome to AKAsheet — ${SIGNUP_INK} Ink and a ${previewHours}-hour Pro preview.`,
    title: 'Welcome to the studio',
    bodyHtml: `
      <p style="margin:0 0 14px">${greet(opts.displayName || displayName)}</p>
      <p style="margin:0 0 14px">Your AKAsheet account is ready. Here’s what’s unlocked:</p>
      <ul style="margin:0 0 14px;padding-left:18px;color:#c8c8d0">
        <li><strong style="color:#fff">${SIGNUP_INK} welcome Ink</strong> for AI co-writing tools</li>
        <li><strong style="color:#fff">${previewHours}-hour Pro feature preview</strong> — export, vault saves, Performance, Freestyle &amp; DNA Drop</li>
        <li>Demo catalog stays at <strong style="color:#fff">${FREE_ALBUM_LIMIT} album / ${FREE_TRACK_LIMIT} tracks</strong> until you Go Pro</li>
      </ul>
      <p style="margin:0 0 14px">If you signed up with email, confirm your address with the verification email from <strong style="color:#fff">noreply@akasheet.com</strong> so Ink and preview unlock fully.</p>
    `,
    ctaLabel: 'Open your vault',
    ctaUrl: studioEmailCtaUrl('/'),
    footerNote: 'Welcome to AKAsheet — write bar by bar.',
  });

  const result = await sendStudioEmail({
    db,
    to: email,
    subject: 'Welcome to AKAsheet',
    html: body.html,
    text: body.text,
    idempotencyKey: `welcome:${opts.userId}`,
  });

  if (result.sent) {
    await db.collection('users').doc(opts.userId).set(
      { welcomeEmailSentAt: new Date().toISOString() },
      { merge: true }
    );
  }
}

/** Returning email after self-delete — welcome Ink already consumed. */
export async function sendWelcomeBackEmail(
  db: Firestore,
  opts: { userId: string; email?: string | null; displayName?: string | null }
): Promise<void> {
  const { email, displayName } = await resolveUserEmail(db, opts.userId, opts.email);
  if (!email) return;

  const body = wrapStudioEmail({
    preheader: 'Welcome back to AKAsheet — your vault is ready for a fresh start.',
    title: 'Welcome back',
    bodyHtml: `
      <p style="margin:0 0 14px">${greet(opts.displayName || displayName)}</p>
      <p style="margin:0 0 14px">Good to see you again. Your new account is ready — welcome Ink and the Pro preview were already used on this email, so this vault starts on the free Visitor tier.</p>
      <p style="margin:0 0 14px">You can still write, use any Ink you buy or earn, and Go Pro anytime for unlimited catalog and full workflow unlocks.</p>
    `,
    ctaLabel: 'Open your vault',
    ctaUrl: studioEmailCtaUrl('/'),
    footerNote: 'Welcome back to AKAsheet.',
  });

  const result = await sendStudioEmail({
    db,
    to: email,
    subject: 'Welcome back to AKAsheet',
    html: body.html,
    text: body.text,
    idempotencyKey: `welcome_back:${opts.userId}`,
  });

  if (result.sent) {
    await db.collection('users').doc(opts.userId).set(
      { welcomeBackEmailSentAt: new Date().toISOString() },
      { merge: true }
    );
  }
}

export async function sendInkPurchaseEmail(
  db: Firestore,
  opts: {
    userId: string;
    inkAmount: number;
    amountUsd: number;
    eventKey: string;
    email?: string | null;
  }
): Promise<void> {
  const { email, displayName } = await resolveUserEmail(db, opts.userId, opts.email);
  if (!email || opts.inkAmount <= 0) return;

  const body = wrapStudioEmail({
    preheader: `${opts.inkAmount.toLocaleString()} permanent Ink added to your studio.`,
    title: 'Ink pack purchased',
    bodyHtml: `
      <p style="margin:0 0 14px">${greet(displayName)}</p>
      <p style="margin:0 0 14px">Your payment went through. We added
        <strong style="color:#fff">${opts.inkAmount.toLocaleString()} permanent Ink</strong>
        to your account${opts.amountUsd > 0 ? ` ($${opts.amountUsd.toFixed(2)})` : ''}.</p>
      <p style="margin:0">Permanent Ink never expires — use it anytime for Generate Next, Creative Effects, and the rest of the Co-Writer.</p>
    `,
    ctaLabel: 'Back to the studio',
    ctaUrl: studioEmailCtaUrl('/'),
  });

  await sendStudioEmail({
    db,
    to: email,
    subject: `${opts.inkAmount.toLocaleString()} Ink added to AKAsheet`,
    html: body.html,
    text: body.text,
    idempotencyKey: `ink:${opts.eventKey}`,
  });
}

export async function sendProUpgradeEmail(
  db: Firestore,
  opts: {
    userId: string;
    tier: 'monthly' | 'yearly';
    amountUsd: number;
    eventKey: string;
    email?: string | null;
  }
): Promise<void> {
  const { email, displayName } = await resolveUserEmail(db, opts.userId, opts.email);
  if (!email) return;

  const tierLabel = opts.tier === 'yearly' ? 'Yearly Pro' : 'Monthly Pro';
  const priceHint =
    opts.tier === 'yearly'
      ? `${PRO_YEARLY_PRICE}/mo effective (billed yearly)`
      : `${PRO_MONTHLY_PRICE}/mo`;

  const body = wrapStudioEmail({
    preheader: `You’re on Studio Pro (${tierLabel}). Unlimited catalog + full workflow unlocked.`,
    title: 'You’re Studio Pro',
    bodyHtml: `
      <p style="margin:0 0 14px">${greet(displayName)}</p>
      <p style="margin:0 0 14px">Welcome to <strong style="color:#fff">${tierLabel}</strong>
        ${opts.amountUsd > 0 ? `($${opts.amountUsd.toFixed(2)})` : ''} — ${escapeHtml(priceHint)}.</p>
      <ul style="margin:0 0 14px;padding-left:18px;color:#c8c8d0">
        <li>Unlimited albums &amp; tracks</li>
        <li>Custom DNA / Vibe / Style vault saves</li>
        <li>Export, import, Performance, Freestyle &amp; DNA Drop</li>
        <li>Pro residency Ink refill on your billing cycle</li>
      </ul>
      <p style="margin:0">Manage billing anytime in Settings → Cloud / Pro.</p>
    `,
    ctaLabel: 'Open the studio',
    ctaUrl: studioEmailCtaUrl('/'),
  });

  await sendStudioEmail({
    db,
    to: email,
    subject: `Studio Pro activated — ${tierLabel}`,
    html: body.html,
    text: body.text,
    idempotencyKey: `pro_upgrade:${opts.eventKey}`,
  });
}

export async function sendRenewalChargeEmail(
  db: Firestore,
  opts: {
    userId: string;
    tier: 'monthly' | 'yearly';
    amountUsd: number;
    residencyInk: number;
    eventKey: string;
    email?: string | null;
  }
): Promise<void> {
  const { email, displayName } = await resolveUserEmail(db, opts.userId, opts.email);
  if (!email) return;

  const tierLabel = opts.tier === 'yearly' ? 'Yearly Pro' : 'Monthly Pro';
  const body = wrapStudioEmail({
    preheader: `${tierLabel} renewed${opts.amountUsd > 0 ? ` — $${opts.amountUsd.toFixed(2)}` : ''}. Residency Ink refilled.`,
    title: 'Pro membership renewed',
    bodyHtml: `
      <p style="margin:0 0 14px">${greet(displayName)}</p>
      <p style="margin:0 0 14px">Your <strong style="color:#fff">${tierLabel}</strong> membership renewed
        ${opts.amountUsd > 0 ? `for <strong style="color:#fff">$${opts.amountUsd.toFixed(2)}</strong>` : ''}.</p>
      <p style="margin:0 0 14px">We refilled your residency pool with
        <strong style="color:#fff">${opts.residencyInk.toLocaleString()} Ink</strong>.</p>
      <p style="margin:0">Receipts also come from Stripe when Customer emails are enabled. Manage or cancel in Settings.</p>
    `,
    ctaLabel: 'View usage & billing',
    ctaUrl: studioEmailCtaUrl('/usage?tab=cloud'),
  });

  await sendStudioEmail({
    db,
    to: email,
    subject: `${tierLabel} renewed — AKAsheet`,
    html: body.html,
    text: body.text,
    idempotencyKey: `renewal:${opts.eventKey}`,
  });
}

export async function sendMembershipCanceledEmail(
  db: Firestore,
  opts: {
    userId: string;
    eventKey: string;
    email?: string | null;
  }
): Promise<void> {
  const { email, displayName } = await resolveUserEmail(db, opts.userId, opts.email);
  if (!email) return;

  const body = wrapStudioEmail({
    preheader: 'Your Studio Pro membership has ended. Your lyrics stay saved on Visitor.',
    title: 'Studio Pro canceled',
    bodyHtml: `
      <p style="margin:0 0 14px">${greet(displayName)}</p>
      <p style="margin:0 0 14px">Your Pro membership is no longer active. You’re back on the free Visitor tier.</p>
      <ul style="margin:0 0 14px;padding-left:18px;color:#c8c8d0">
        <li>All lyrics and projects stay saved</li>
        <li>Demo catalog: ${FREE_ALBUM_LIMIT} album · ${FREE_TRACK_LIMIT} editable tracks</li>
        <li>Export, Freestyle, Performance, custom vault saves, and unlimited catalog need Pro again</li>
      </ul>
      <p style="margin:0">You can resubscribe anytime from Settings or Pricing.</p>
    `,
    ctaLabel: 'Go Pro again',
    ctaUrl: studioEmailCtaUrl('/usage?tab=cloud'),
  });

  await sendStudioEmail({
    db,
    to: email,
    subject: 'Studio Pro canceled — AKAsheet',
    html: body.html,
    text: body.text,
    idempotencyKey: `cancel:${opts.eventKey}`,
  });
}

/** Send before Auth/Firestore wipe — email must still be known. */
export async function sendAccountDeletedEmail(opts: {
  email: string;
  displayName?: string | null;
  userId: string;
  db: Firestore;
}): Promise<void> {
  const email = opts.email.trim().toLowerCase();
  if (!email.includes('@')) return;

  const body = wrapStudioEmail({
    preheader: 'Your AKAsheet account and vault have been deleted.',
    title: 'Account deleted',
    bodyHtml: `
      <p style="margin:0 0 14px">${greet(opts.displayName || null)}</p>
      <p style="margin:0 0 14px">Your AKAsheet account has been permanently deleted, including vault data tied to that login.</p>
      <p style="margin:0 0 14px">Any active Studio Pro billing was canceled with this deletion so you won’t be charged again.</p>
      <p style="margin:0">If this wasn’t you, contact support right away. You’re always welcome back with a new account.</p>
    `,
    ctaLabel: 'Visit AKAsheet',
    ctaUrl: studioEmailCtaUrl('/welcome'),
    footerNote: 'This is a confirmation that your account wipe completed.',
  });

  await sendStudioEmail({
    db: opts.db,
    to: email,
    subject: 'Your AKAsheet account was deleted',
    html: body.html,
    text: body.text,
    idempotencyKey: `delete:${opts.userId}`,
  });
}
