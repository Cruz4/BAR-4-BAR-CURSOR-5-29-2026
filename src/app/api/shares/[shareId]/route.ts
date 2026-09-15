import { NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase/server';
import { canonicalShareVisibility } from '@/lib/server/dna-visibility';
import type { ProjectShare } from '@/lib/types';

export const runtime = 'nodejs';

function safeShareId(value: string | undefined): string | null {
  const id = value?.trim().toUpperCase() || '';
  if (!id || id.length > 200 || id.includes('/')) return null;
  return id;
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ shareId: string }> }
) {
  try {
    const shareId = safeShareId((await context.params).shareId);
    if (!shareId) {
      return NextResponse.json({ error: 'Invalid share.' }, { status: 400 });
    }

    const db = await getDb();
    const snap = await db.doc(`shares/${shareId}`).get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const visibility = await canonicalShareVisibility(db, shareId);
    if (!visibility || (!visibility.dnaLive && !visibility.releaseLive)) {
      return NextResponse.json({ error: 'Not public' }, { status: 404 });
    }

    const raw = snap.data() as Record<string, unknown>;
    const share: ProjectShare = {
      id: snap.id,
      type: raw.type === 'track' ? 'track' : 'album',
      projectId: String(raw.projectId || ''),
      ownerId: String(raw.ownerId || ''),
      ownerName: String(raw.ownerName || 'Artist'),
      data: raw.data,
      createdAt: String(raw.createdAt || new Date().toISOString()),
      ...(typeof raw.updatedAt === 'string' ? { updatedAt: raw.updatedAt } : {}),
      views: typeof raw.views === 'number' ? raw.views : 0,
      imports: typeof raw.imports === 'number' ? raw.imports : 0,
      ...(typeof raw.hasDropAudio === 'boolean' ? { hasDropAudio: raw.hasDropAudio } : {}),
      ...(typeof raw.houseRelease === 'boolean' ? { houseRelease: raw.houseRelease } : {}),
      ...(typeof raw.houseArtistId === 'string' ? { houseArtistId: raw.houseArtistId } : {}),
      ...(typeof raw.houseLibraryNotice === 'boolean'
        ? { houseLibraryNotice: raw.houseLibraryNotice }
        : {}),
      ...(typeof raw.houseLibraryNoticeAt === 'string'
        ? { houseLibraryNoticeAt: raw.houseLibraryNoticeAt }
        : {}),
      ...(typeof raw.dropPriceSummary === 'string'
        ? { dropPriceSummary: raw.dropPriceSummary }
        : {}),
      ...(typeof raw.playCount === 'number' ? { playCount: raw.playCount } : {}),
      ...(typeof raw.previewCount === 'number' ? { previewCount: raw.previewCount } : {}),
      ...(typeof raw.purchaseCount === 'number' ? { purchaseCount: raw.purchaseCount } : {}),
      ...(typeof raw.lastPulseAt === 'string' ? { lastPulseAt: raw.lastPulseAt } : {}),
      ...(typeof raw.firstBuyerId === 'string' ? { firstBuyerId: raw.firstBuyerId } : {}),
      ...(typeof raw.firstBuyerName === 'string' ? { firstBuyerName: raw.firstBuyerName } : {}),
      ...(typeof raw.firstBuyerAt === 'string' ? { firstBuyerAt: raw.firstBuyerAt } : {}),
      ...(raw.releaseStatus === 'live' ||
      raw.releaseStatus === 'unlisted' ||
      raw.releaseStatus === 'draft'
        ? { releaseStatus: raw.releaseStatus as ProjectShare['releaseStatus'] }
        : {}),
      ...(raw.dnaStatus === 'live' || raw.dnaStatus === 'unlisted'
        ? { dnaStatus: raw.dnaStatus as ProjectShare['dnaStatus'] }
        : {}),
    };

    return NextResponse.json({ share, visibility });
  } catch (error) {
    console.error('[shares/get]', error);
    return NextResponse.json({ error: 'Could not load share.' }, { status: 500 });
  }
}
