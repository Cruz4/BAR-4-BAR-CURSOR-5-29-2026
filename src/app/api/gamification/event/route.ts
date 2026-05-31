import { NextResponse } from 'next/server';
import { verifyCheckoutUser, CheckoutAuthError } from '@/lib/stripe-server';
import { processGamificationEvent } from '@/lib/server/gamification';
import type { GamificationTrigger } from '@/lib/gamification/types';

export const runtime = 'nodejs';

const ALLOWED: GamificationTrigger[] = [
  'session_start',
  'ai_action',
  'smart_structure_used',
  'tour_complete',
  'rhyme_pulse_on',
  'track_saved',
  'dna_preset_saved',
  'share_created',
  'album_limit_hit',
];

export async function POST(req: Request) {
  try {
    const { trigger, userId, metadata, userName } = await req.json();
    if (!trigger || !userId || !ALLOWED.includes(trigger)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    try {
      await verifyCheckoutUser(req, userId);
    } catch (e) {
      if (e instanceof CheckoutAuthError) {
        return NextResponse.json({ error: e.message }, { status: 401 });
      }
      throw e;
    }

    const result = await processGamificationEvent(userId, trigger, metadata || {}, userName);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[gamification/event]', err);
    return NextResponse.json({ error: 'Failed to process event' }, { status: 500 });
  }
}
