import { NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase/server';
import { canonicalShareVisibility, resolveSupersededDnaShareRedirect } from '@/lib/server/dna-visibility';
import { resolveAlbumHubShareId } from '@/lib/pressed-song';
import {
  isHouseReleaseDocument,
  releaseShareIdFromShareDocument,
  shareDocumentVisibility,
} from '@/lib/release-management';
import type { ProjectShare } from '@/lib/types';
import { resolveShareArtistCredit } from '@/lib/server/share-artist-credit';
import { resolveShareReachDisplay } from '@/lib/server/reach-display';

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

    const raw = snap.data() as Record<string, unknown>;
    let visibility = await canonicalShareVisibility(db, shareId);
    if (isHouseReleaseDocument(raw) && visibility) {
      visibility = { ...visibility, releaseLive: true };
    }
    if (!visibility || (!visibility.dnaLive && !visibility.releaseLive)) {
      const redirectShareId = await resolveSupersededDnaShareRedirect(db, shareId, raw);
      if (redirectShareId) {
        return NextResponse.json(
          { error: 'Superseded', canonicalShareId: redirectShareId },
          { status: 404 }
        );
      }
      const documentVisibility = shareDocumentVisibility(raw);
      if (documentVisibility.releaseLive || isHouseReleaseDocument(raw)) {
        visibility = {
          dnaLive: documentVisibility.dnaLive,
          releaseLive: true,
        };
      } else {
        return NextResponse.json({ error: 'Not public' }, { status: 404 });
      }
    }
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
      landingCount:
        typeof raw.landingCount === 'number' && Number.isFinite(raw.landingCount)
          ? Math.max(0, Math.floor(raw.landingCount))
          : 0,
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

    const albumHubShareId =
      share.type === 'album'
        ? resolveAlbumHubShareId({
            releaseShareId: releaseShareIdFromShareDocument(raw),
            releaseLive: visibility.releaseLive,
            dnaShareId: shareId,
            dnaLive: visibility.dnaLive,
            fallbackShareId: shareId,
          })
        : (() => {
            const ctx = (share.data as { sharedAlbumContext?: { shareId?: string } } | undefined)
              ?.sharedAlbumContext;
            const parent = ctx?.shareId?.trim();
            return parent || undefined;
          })();

    const artist = await resolveShareArtistCredit(db, raw);
    const reach = await resolveShareReachDisplay(db, shareId, raw);
    share.landingCount = reach.unique;
    share.views = reach.legacy;

    return NextResponse.json({
      share,
      visibility,
      artist: {
        name: artist.name,
        ...(artist.slug ? { slug: artist.slug } : {}),
        ...(artist.userId ? { userId: artist.userId } : {}),
      },
      ...(albumHubShareId ? { albumHubShareId } : {}),
    });
  } catch (error) {
    console.error('[shares/get]', error);
    return NextResponse.json({ error: 'Could not load share.' }, { status: 500 });
  }
}
