import { NextResponse } from 'next/server';
import { verifyCheckoutUser, CheckoutAuthError } from '@/lib/stripe-server';
import { processGamificationEvent } from '@/lib/server/gamification';
import type { GamificationTrigger } from '@/lib/gamification/types';
import { checkRateLimit } from '@/lib/server/rate-limit';

export const runtime = 'nodejs';

const EVENT_WINDOW_MS = 60_000;
const EVENT_MAX_PER_WINDOW = 40;

const ALLOWED: GamificationTrigger[] = [
  'session_start',
  'smart_structure_used',
  'tour_complete',
  'rhyme_pulse_on',
  'track_saved',
  'dna_preset_saved',
  'share_created',
  'album_limit_hit',
  'dna_imported',
  'friendship_accepted',
  'wall_post_created',
  'dna_drop_imported_by_other',
];

export async function POST(req: Request) {
  try {
    const { trigger, userId, metadata, userName } = await req.json();
    if (!trigger || !userId || !ALLOWED.includes(trigger)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    let uid: string;
    try {
      uid = await verifyCheckoutUser(req, userId);
    } catch (e) {
      if (e instanceof CheckoutAuthError) {
        return NextResponse.json({ error: e.message }, { status: 401 });
      }
      throw e;
    }

    const { allowed } = await checkRateLimit(`gamification:${uid}`, EVENT_MAX_PER_WINDOW, EVENT_WINDOW_MS);
    if (!allowed) {
      return NextResponse.json({ error: 'Too many events. Please slow down.' }, { status: 429 });
    }

    const result = await processGamificationEvent(uid, trigger, metadata || {}, userName);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[gamification/event]', err);
    return NextResponse.json({ error: 'Failed to process event' }, { status: 500 });
  }
}
