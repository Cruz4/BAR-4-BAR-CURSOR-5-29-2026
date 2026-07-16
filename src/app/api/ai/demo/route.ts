import { NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { ai, z } from '@/ai/genkit';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { getDb, hasAdminFirestoreCredentials } from '@/lib/firebase/server';
import { computeLineMetrics } from '@/lib/server/lyric-guardrails';

export const runtime = 'nodejs';

/**
 * Anonymous guest demo — powers the "try a bar" sheet on the public landing page.
 * Never touches user accounts or the Ink economy. Hard-capped five ways:
 * signed cookie per browser, IP rate limit, global daily budget, tiny prompt,
 * generate-next-line only.
 */

const DEMO_MAX_USES = 3;
const IP_LIMIT_MAX = 6;
const IP_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const GLOBAL_DAILY_CAP = 500;
const MAX_LINES = 6;
const MAX_LINE_CHARS = 200;
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

/** Returns the verified use count, or DEMO_MAX_USES on any tamper/parse failure. */
function readUses(cookieValue: string | undefined): number {
  if (!cookieValue) return 0;
  const [countRaw, sig] = cookieValue.split('.');
  const count = Number.parseInt(countRaw, 10);
  if (!Number.isFinite(count) || count < 0 || !sig) return DEMO_MAX_USES;
  const expected = createHmac('sha256', DEMO_SECRET).update(String(count)).digest('hex').slice(0, 24);
  return sig === expected ? count : DEMO_MAX_USES;
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

const demoPrompt = ai.definePrompt({
  name: 'guestDemoNextLinePrompt',
  input: { schema: z.object({ lines: z.array(z.string()) }) },
  output: { schema: z.array(z.object({ line: z.string() })) },
  config: { temperature: 0.85 },
  prompt: `You are a Professional Phonetic Rhyme Engine demoing for a new artist. Generate TWO single-line rap/lyric options that continue their verse.

RULES:
1. You MUST rhyme with the last word of the LAST line below.
2. Match their tone, vocabulary level, and syllable count closely.
3. NEVER repeat their exact words or end-words.
4. Keep each option to one line, no profanity or slurs.

THEIR BARS:
{{#each lines}}- {{{this}}}
{{/each}}

Return a JSON array of exactly two objects, each with a 'line' field.`,
});

function limitResponse(remaining: number, message: string) {
  return NextResponse.json(
    { error: message, code: 'DEMO_LIMIT', remaining },
    { status: 429 }
  );
}

export async function GET(req: Request) {
  const uses = readUses(getCookie(req, COOKIE_NAME));
  return NextResponse.json({ remaining: Math.max(0, DEMO_MAX_USES - uses) });
}

export async function POST(req: Request) {
  let body: { lines?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!Array.isArray(body.lines)) {
    return NextResponse.json({ error: 'Missing lines' }, { status: 400 });
  }
  const lines = body.lines
    .filter((l): l is string => typeof l === 'string')
    .map((l) => l.trim().slice(0, MAX_LINE_CHARS))
    .filter(Boolean)
    .slice(-MAX_LINES);
  if (lines.length === 0) {
    return NextResponse.json({ error: 'Write a bar first' }, { status: 400 });
  }

  const uses = readUses(getCookie(req, COOKIE_NAME));
  if (uses >= DEMO_MAX_USES) {
    return limitResponse(0, 'Demo limit reached — sign up free to keep writing.');
  }

  const ipCheck = checkRateLimit(`demo:${clientIp(req)}`, IP_LIMIT_MAX, IP_LIMIT_WINDOW_MS);
  if (!ipCheck.allowed) {
    return limitResponse(
      Math.max(0, DEMO_MAX_USES - uses),
      'Too many demo requests from this connection — sign up free to keep writing.'
    );
  }

  try {
    if (!(await consumeGlobalDailyBudget())) {
      return limitResponse(0, 'The demo studio is at capacity today — sign up free to keep writing.');
    }
  } catch (err) {
    console.error('[api/ai/demo] global budget check failed', err);
    return NextResponse.json({ error: 'Demo temporarily unavailable' }, { status: 503 });
  }

  try {
    const response = await demoPrompt({ lines });
    const options = (response?.output ?? []).slice(0, 2);
    if (options.length === 0) {
      return NextResponse.json({ error: 'No suggestions this time — try again' }, { status: 502 });
    }

    const enriched = await Promise.all(
      options.map(async (opt) => {
        const metrics = await computeLineMetrics(opt.line);
        return { line: opt.line, syllables: metrics.syllables, rhymeKey: metrics.rhymeKey };
      })
    );

    const nextUses = uses + 1;
    const res = NextResponse.json({
      options: enriched,
      remaining: Math.max(0, DEMO_MAX_USES - nextUses),
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
    console.error('[api/ai/demo] generation failed', error);
    return NextResponse.json({ error: 'Demo generation failed — try again' }, { status: 500 });
  }
}
