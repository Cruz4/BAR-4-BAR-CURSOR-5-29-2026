import { NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { getDb, hasAdminFirestoreCredentials } from '@/lib/firebase/server';
import { GUEST_DEMO_MAX_USES } from '@/lib/guest-try';
import { generateGuestDemoNextLine } from '@/ai/flows/guest-demo-next-line';
import { GUEST_FUNNEL_EVENTS } from '@/lib/guest-funnel-events';
import { recordGuestFunnelEvent } from '@/lib/server/record-guest-funnel-event';
import { normalizeMarketingRef } from '@/lib/marketing-attribution';
import { guestAliasFromId, normalizeGuestAlias, normalizeGuestId } from '@/lib/guest-identity';

export const runtime = 'nodejs';

/**
 * Anonymous guest demo — powers free AI on the guest try sheet.
 * Never touches user accounts or the Ink economy. Hard-capped five ways:
 * signed cookie per browser, IP rate limit, global daily budget, tiny prompt,
 * generate-next-line only.
 *
 * Separate from SIGNUP_INK (250) — that only applies after creating an account.
 */

const DEMO_MAX_USES = GUEST_DEMO_MAX_USES;
const IP_LIMIT_MAX = 6;
const IP_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const GLOBAL_DAILY_CAP = 500;
const MAX_LINES = 6;
const MAX_LINE_CHARS = 200;
const MAX_END_WITH_CHARS = 48;
const COOKIE_NAME = 'b4b_demo_uses';
const COOKIE_MAX_AGE_S = 60 * 60 * 24 * 30;

const DEMO_SECRET =
  process.env.DEMO_GATE_SECRET ||
  process.env.INVITE_GATE_SECRET ||
  'b4b-demo-gate-dev-secret';

function signUses(count: number): string {
  const sig = createHmac('sha256', DEMO_SECRET).update(String(count)).digest('hex').slice(0, 24);
  return `${count}.${sig}`;
}

/**
 * Verified use count. Missing/invalid cookie → 0 (fresh), not max.
 * (Invalid used to count as exhausted, which falsely blocked after secret rotation.)
 */
function readUses(cookieValue: string | undefined): number {
  if (!cookieValue) return 0;
  const [countRaw, sig] = cookieValue.split('.');
  const count = Number.parseInt(countRaw, 10);
  if (!Number.isFinite(count) || count < 0 || !sig) return 0;
  const expected = createHmac('sha256', DEMO_SECRET).update(String(count)).digest('hex').slice(0, 24);
  if (sig !== expected) return 0;
  return Math.min(count, DEMO_MAX_USES);
}

function getCookie(req: Request, name: string): string | undefined {
  const header = req.headers.get('cookie') || '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return undefined;
}

function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  return fwd ? fwd.split(',')[0].trim() : 'unknown';
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'object' && error && 'message' in error) {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === 'string' && msg.trim()) return msg;
  }
  return 'Demo generation failed — try again';
}

/** Firestore-backed daily circuit breaker — worst case the demo degrades to a signup prompt. */
async function consumeGlobalDailyBudget(): Promise<boolean> {
  if (!hasAdminFirestoreCredentials()) return true;
  const db = await getDb();
  const dayKey = new Date().toISOString().slice(0, 10);
  const ref = db.doc('system/demo-usage');
  let allowed = true;
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const count = (snap.data()?.[dayKey] as number) || 0;
    if (count >= GLOBAL_DAILY_CAP) {
      allowed = false;
      return;
    }
    tx.set(ref, { [dayKey]: count + 1 }, { merge: true });
  });
  return allowed;
}

function resolveDemoRef(raw: unknown): string {
  if (typeof raw !== 'string') return 'organic';
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed || trimmed === 'organic') return 'organic';
  return normalizeMarketingRef(trimmed) || 'organic';
}

function resolveDemoGuest(body: { guestId?: unknown; guestAlias?: unknown }): {
  guestId: string | null;
  guestAlias: string | null;
} {
  const guestId = normalizeGuestId(body.guestId);
  const guestAlias =
    normalizeGuestAlias(body.guestAlias) || (guestId ? guestAliasFromId(guestId) : null);
  return { guestId, guestAlias };
}

function guestMeta(
  base: Record<string, string | number | boolean | null>,
  guest: { guestId: string | null; guestAlias: string | null }
) {
  return {
    ...base,
    ...(guest.guestId ? { guestId: guest.guestId } : {}),
    ...(guest.guestAlias ? { guestAlias: guest.guestAlias } : {}),
  };
}

function limitResponse(
  remaining: number,
  message: string,
  reason: 'browser' | 'ip' | 'global' = 'browser'
) {
  return NextResponse.json(
    { error: message, code: 'DEMO_LIMIT', remaining, reason },
    { status: 429 }
  );
}

async function trackDemoLimit(
  ref: string,
  reason: 'browser' | 'ip' | 'global',
  remaining: number,
  guest: { guestId: string | null; guestAlias: string | null }
) {
  await recordGuestFunnelEvent(GUEST_FUNNEL_EVENTS.DEMO_AI_LIMIT, {
    ref,
    metadata: guestMeta({ reason, remaining }, guest),
  });
}

export async function GET(req: Request) {
  const uses = readUses(getCookie(req, COOKIE_NAME));
  return NextResponse.json({ remaining: Math.max(0, DEMO_MAX_USES - uses) });
}

export async function POST(req: Request) {
  let body: {
    lines?: unknown;
    mode?: unknown;
    endWith?: unknown;
    intents?: unknown;
    vibe?: unknown;
    direction?: unknown;
    negativePrompt?: unknown;
    forbiddenWords?: unknown;
    mustIncludeWords?: unknown;
    customInstructions?: unknown;
    ref?: unknown;
    guestId?: unknown;
    guestAlias?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const ref = resolveDemoRef(body.ref);
  const guest = resolveDemoGuest(body);
  const mode = body.mode === 'starter' ? 'starter' : 'next';

  if (!Array.isArray(body.lines)) {
    return NextResponse.json({ error: 'Missing lines' }, { status: 400 });
  }
  const lines = body.lines
    .filter((l): l is string => typeof l === 'string')
    .map((l) => l.trim().slice(0, MAX_LINE_CHARS))
    .filter(Boolean)
    .slice(-MAX_LINES);
  if (mode === 'next' && lines.length === 0) {
    return NextResponse.json({ error: 'Write a bar first' }, { status: 400 });
  }
  const endWith =
    typeof body.endWith === 'string' ? body.endWith.trim().slice(0, MAX_END_WITH_CHARS) : '';
  const intents = Array.isArray(body.intents)
    ? body.intents
        .filter((i): i is string => typeof i === 'string')
        .map((i) => i.trim().slice(0, MAX_END_WITH_CHARS))
        .filter(Boolean)
        .slice(0, 6)
    : [];
  const forbiddenWords = Array.isArray(body.forbiddenWords)
    ? body.forbiddenWords
        .filter((w): w is string => typeof w === 'string')
        .map((w) => w.trim().slice(0, 40))
        .filter(Boolean)
        .slice(0, 12)
    : [];
  const mustIncludeWords = Array.isArray(body.mustIncludeWords)
    ? body.mustIncludeWords
        .filter((w): w is string => typeof w === 'string')
        .map((w) => w.trim().slice(0, 40))
        .filter(Boolean)
        .slice(0, 8)
    : [];
  const negativePrompt =
    typeof body.negativePrompt === 'string' ? body.negativePrompt.trim().slice(0, 240) : '';
  const customInstructions =
    typeof body.customInstructions === 'string'
      ? body.customInstructions.trim().slice(0, 280)
      : '';

  let vibe:
    | {
        genre?: string;
        tempoBPM?: number;
        feeling?: string[];
        instrumentation?: string;
        productionNotes?: string;
      }
    | undefined;
  if (body.vibe && typeof body.vibe === 'object') {
    const v = body.vibe as Record<string, unknown>;
    vibe = {
      genre: typeof v.genre === 'string' ? v.genre.trim().slice(0, 64) : undefined,
      tempoBPM:
        typeof v.tempoBPM === 'number' && Number.isFinite(v.tempoBPM) ? v.tempoBPM : undefined,
      feeling: Array.isArray(v.feeling)
        ? v.feeling
            .filter((f): f is string => typeof f === 'string')
            .map((f) => f.trim().slice(0, 48))
            .filter(Boolean)
            .slice(0, 6)
        : undefined,
      instrumentation:
        typeof v.instrumentation === 'string' ? v.instrumentation.trim().slice(0, 120) : undefined,
      productionNotes:
        typeof v.productionNotes === 'string' ? v.productionNotes.trim().slice(0, 160) : undefined,
    };
  }

  let direction:
    | {
        setting_world?: string;
        emotion_core?: string;
        trigger_moment?: string;
        message_truth?: string;
        tone_palette?: string;
      }
    | undefined;
  if (body.direction && typeof body.direction === 'object') {
    const d = body.direction as Record<string, unknown>;
    const pick = (key: string) =>
      typeof d[key] === 'string' ? (d[key] as string).trim().slice(0, 120) : undefined;
    direction = {
      setting_world: pick('setting_world'),
      emotion_core: pick('emotion_core'),
      trigger_moment: pick('trigger_moment'),
      message_truth: pick('message_truth'),
      tone_palette: pick('tone_palette'),
    };
  }

  void recordGuestFunnelEvent(GUEST_FUNNEL_EVENTS.DEMO_AI_REQUEST, {
    ref,
    metadata: guestMeta({ lineCount: lines.length, mode }, guest),
  });

  const uses = readUses(getCookie(req, COOKIE_NAME));
  if (uses >= DEMO_MAX_USES) {
    await trackDemoLimit(ref, 'browser', 0, guest);
    return limitResponse(
      0,
      `You already used your ${DEMO_MAX_USES} free demo Generate Next assists on this browser. Sign up free — you get real Ink (not connected to this demo cap).`,
      'browser'
    );
  }

  const ipCheck = checkRateLimit(`demo:${clientIp(req)}`, IP_LIMIT_MAX, IP_LIMIT_WINDOW_MS);
  if (!ipCheck.allowed) {
    const remaining = Math.max(0, DEMO_MAX_USES - uses);
    await trackDemoLimit(ref, 'ip', remaining, guest);
    return limitResponse(
      remaining,
      'Too many demo requests from this connection right now. Wait a bit, or sign up free for real Ink.',
      'ip'
    );
  }

  try {
    if (!(await consumeGlobalDailyBudget())) {
      await trackDemoLimit(ref, 'global', 0, guest);
      return limitResponse(
        0,
        'The public demo is at capacity today. Sign up free to keep writing with real Ink.',
        'global'
      );
    }
  } catch (err) {
    console.error('[api/ai/demo] global budget check failed', err);
    return NextResponse.json({ error: 'Demo temporarily unavailable' }, { status: 503 });
  }

  try {
    const options = await generateGuestDemoNextLine(
      lines,
      {
        endWith: endWith || null,
        intents,
        vibe,
        direction,
        negativePrompt: negativePrompt || null,
        forbiddenWords,
        mustIncludeWords,
        customInstructions: customInstructions || null,
      },
      mode
    );
    if (options.length === 0) {
      await recordGuestFunnelEvent(GUEST_FUNNEL_EVENTS.DEMO_AI_ERROR, {
        ref,
        metadata: guestMeta({ reason: 'empty_options', mode }, guest),
      });
      return NextResponse.json({ error: 'No suggestions this time — try again' }, { status: 502 });
    }

    const nextUses = uses + 1;
    const remaining = Math.max(0, DEMO_MAX_USES - nextUses);
    await recordGuestFunnelEvent(GUEST_FUNNEL_EVENTS.DEMO_AI_SUCCESS, {
      ref,
      metadata: guestMeta(
        { remaining, useNumber: nextUses, optionCount: options.length, mode },
        guest
      ),
    });
    const res = NextResponse.json({
      options,
      remaining,
      endWith: endWith || null,
      intents,
      mode,
    });
    res.cookies.set(COOKIE_NAME, signUses(nextUses), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: COOKIE_MAX_AGE_S,
      path: '/',
    });
    return res;
  } catch (error) {
    const message = errorMessage(error);
    console.error('[api/ai/demo] generation failed:', message, error);
    await recordGuestFunnelEvent(GUEST_FUNNEL_EVENTS.DEMO_AI_ERROR, {
      ref,
      metadata: guestMeta({ reason: 'generation_failed', mode }, guest),
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
