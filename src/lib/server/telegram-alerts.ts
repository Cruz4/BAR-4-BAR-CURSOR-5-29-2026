import 'server-only';

import type { AdminAlertKind } from '@/lib/admin-alerts';

type TelegramAlertInput = {
  kind: AdminAlertKind;
  message: string;
  ref?: string | null;
  path?: string | null;
  userEmail?: string | null;
  userId?: string | null;
  userName?: string | null;
  method?: string | null;
  detail?: string | null;
  guestId?: string | null;
  guestAlias?: string | null;
  refLabel?: string | null;
  referralName?: string | null;
  ipHash?: string | null;
};

const KIND_HEADLINE: Record<AdminAlertKind, string> = {
  signup: '🆕 New signup',
  landing_hit: '👀 Page visit',
  landing_burst: '⚠️ Visit burst',
  probe: '🪤 Scanner path',
  pricing_view: '💰 Pricing page',
  checkout_started: '🛒 Checkout started',
  guest_try: '🎤 Demo sheet',
  guest_pressing: '🏠 Profile sandbox',
  lock_funnel: '🔐 Finish-the-bar',
  admin_denied: '🛡️ Admin door denied',
  admin_role: '👑 Admin role change',
  admin_action: '🚨 Admin action',
  admin_device: '📱 Admin new device',
  ink_spike: '🧪 Ink spike',
  signup_burst: '📈 Signup burst',
  stripe_risk: '💳 Stripe risk',
  blocked_ai: '🚫 Blocked account → AI',
};

function telegramConfigured(): boolean {
  if (process.env.TELEGRAM_ALERTS_ENABLED === 'false') return false;
  const ok = Boolean(
    process.env.TELEGRAM_BOT_TOKEN?.trim() && process.env.TELEGRAM_CHAT_ID?.trim()
  );
  if (!ok) {
    console.warn('[telegram-alerts] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set');
  }
  return ok;
}

function formatTelegramText(input: TelegramAlertInput): string {
  const lines: string[] = [KIND_HEADLINE[input.kind], input.message];
  if (input.kind === 'signup') {
    if (input.guestAlias) {
      lines.push(`converted from: ${input.guestAlias}`);
    }
    if (input.userName || input.userEmail) {
      const who =
        input.userName && input.userEmail
          ? `${input.userName} <${input.userEmail}>`
          : input.userEmail || input.userName || '';
      if (who) lines.push(`now user: ${who}`);
    }
  }
  if (
    (input.kind === 'landing_hit' || input.kind === 'landing_burst' || input.kind === 'pricing_view') &&
    (input.userName || input.userEmail)
  ) {
    const who =
      input.userName && input.userEmail
        ? `${input.userName} <${input.userEmail}>`
        : input.userEmail || input.userName || '';
    if (who) lines.push(`signed-in: ${who}`);
  }
  if (
    (input.kind === 'guest_try' ||
      input.kind === 'guest_pressing' ||
      input.kind === 'lock_funnel' ||
      input.kind === 'landing_hit' ||
      input.kind === 'landing_burst' ||
      input.kind === 'pricing_view') &&
    input.guestAlias
  ) {
    lines.push(`guest: ${input.guestAlias}`);
  }
  if (input.referralName) {
    lines.push(`referred by: ${input.referralName}`);
  } else if (input.ref) {
    lines.push(`ref: ${input.refLabel || input.ref}`);
  }
  if (input.path) lines.push(`path: ${input.path}`);
  if (
    input.method &&
    (input.kind === 'landing_burst' ||
      input.kind === 'probe' ||
      input.kind === 'admin_denied' ||
      input.kind === 'admin_device' ||
      input.kind === 'stripe_risk')
  ) {
    lines.push(`client: ${input.method}`);
  }
  if (input.detail && !input.message.includes(input.detail)) {
    lines.push(input.detail);
  }
  if (input.ipHash) lines.push(`same-IP id: ${input.ipHash}`);
  if (input.userId) {
    lines.push(
      input.kind === 'landing_burst' || input.kind === 'landing_hit'
        ? `uid: ${input.userId}`
        : `uid: ${input.userId.slice(0, 12)}…`
    );
  }
  return lines.join('\n');
}

/** Push admin alert to Telegram (non-blocking for core app flows). */
export async function sendTelegramAdminAlert(input: TelegramAlertInput): Promise<void> {
  if (!telegramConfigured()) return;

  const token = process.env.TELEGRAM_BOT_TOKEN!.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID!.trim();
  const text = formatTelegramText(input);

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.warn('[telegram-alerts] send failed', res.status, body.slice(0, 200));
    }
  } catch (error) {
    console.warn('[telegram-alerts] skipped:', (error as Error).message);
  }
}
