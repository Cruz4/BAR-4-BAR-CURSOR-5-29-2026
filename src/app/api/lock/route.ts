import { NextResponse } from 'next/server';
import { verifyCheckoutUser, CheckoutAuthError } from '@/lib/stripe-server';
import { createLock } from '@/lib/server/lock';
import { isLockEnabled } from '@/lib/lock-feature';
import type { LockDnaSnapshot } from '@/lib/lock/types';
import { parseEmbedUrl } from '@/lib/profile/embeds';

export const runtime = 'nodejs';

/** Publish a new Open LOCK (authenticated artist). */
export async function POST(req: Request) {
  if (!isLockEnabled()) {
    return NextResponse.json({ error: 'LOCK is off' }, { status: 404 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const userId = typeof body.userId === 'string' ? body.userId : '';
    if (!userId) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }
    try {
      await verifyCheckoutUser(req, userId);
    } catch (e) {
      if (e instanceof CheckoutAuthError) {
        return NextResponse.json({ error: e.message }, { status: 401 });
      }
      throw e;
    }

    const seedBar = typeof body.seedBar === 'string' ? body.seedBar : '';
    const ownerName = typeof body.ownerName === 'string' ? body.ownerName : 'Artist';
    const ownerSlug = typeof body.ownerSlug === 'string' ? body.ownerSlug : undefined;
    const embedRaw = typeof body.embedUrl === 'string' ? body.embedUrl.trim() : '';
    const embedUrl = embedRaw && parseEmbedUrl(embedRaw) ? embedRaw : undefined;
    const dnaSnapshot =
      body.dnaSnapshot && typeof body.dnaSnapshot === 'object'
        ? (body.dnaSnapshot as LockDnaSnapshot)
        : undefined;

    const lock = await createLock({
      ownerId: userId,
      ownerName,
      ownerSlug,
      seedBar,
      embedUrl,
      dnaSnapshot,
    });

    return NextResponse.json({ lock });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not create LOCK';
    console.error('[lock create]', err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
