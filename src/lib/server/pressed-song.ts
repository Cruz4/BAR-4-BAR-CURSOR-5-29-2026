import 'server-only';

import type { Firestore, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { normalizeDropPrice } from '@/lib/drop-commerce';
import { audioForPlay, isReleaseShareLive, loadShare, priceFromShare } from '@/lib/server/drop-entitlements';
import { needsVanitySlugUpgrade } from '@/lib/profile/profile-slug';
import { resolveAlbumHubShareId, type PressedSongSummary, type PressedSongSupporter } from '@/lib/pressed-song';
import { normalizeArtistHomeConfig } from '@/lib/profile/modules';
import { combinePublicMusicMetadata, publicMusicMetadataFromTrack } from '@/lib/music-discovery-metadata';
import { releaseShareIdFromShareDocument, shareDocumentVisibility } from '@/lib/release-management';
import { canManageReleaseShare } from '@/lib/house-artist-link';

function nonnegative(value: unknown): number {
  return Math.max(0, Math.floor(Number(value) || 0));
}

function albumHubShareIdFromDocument(shareId: string, shareRaw: Record<string, unknown>): string | undefined {
  const visibility = shareDocumentVisibility(shareRaw);
  const type = shareRaw.type === 'album' ? 'album' : 'track';
  return resolveAlbumHubShareId({
    releaseShareId: releaseShareIdFromShareDocument(shareRaw),
    releaseLive: visibility.releaseLive,
    dnaShareId: type === 'album' ? shareId : undefined,
    dnaLive: visibility.dnaLive,
    fallbackShareId: shareId,
  });
}

function timestamp(value: unknown): string {
  if (typeof value === 'string' && !Number.isNaN(new Date(value).getTime())) return new Date(value).toISOString();
  if (value && typeof value === 'object' && 'toDate' in value) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return new Date(0).toISOString();
}

type Sale = { buyerId: string; amountCents: number; createdAt: string };

async function publicProfilesByUser(
  db: Firestore,
  userIds: string[]
): Promise<Map<string, QueryDocumentSnapshot>> {
  const result = new Map<string, QueryDocumentSnapshot>();
  for (let index = 0; index < userIds.length; index += 30) {
    const chunk = userIds.slice(index, index + 30);
    if (!chunk.length) continue;
    const snap = await db.collection('publicProfiles').where('userId', 'in', chunk).get();
    for (const doc of snap.docs) {
      const data = doc.data();
      const userId = typeof data.userId === 'string' ? data.userId : '';
      if (!userId || needsVanitySlugUpgrade(doc.id, userId)) continue;
      const current = result.get(userId);
      if (!current || String(data.updatedAt || '') > String(current.data().updatedAt || '')) {
        result.set(userId, doc);
      }
    }
  }
  return result;
}

async function avatarUrlsByProfile(
  db: Firestore,
  profiles: Iterable<QueryDocumentSnapshot>
): Promise<Map<string, string>> {
  const docs = [...profiles];
  if (!docs.length) return new Map();
  const avatars = await db.getAll(...docs.map((profile) => profile.ref.collection('assets').doc('avatar')));
  return new Map(
    avatars.flatMap((avatar) => {
      const url = avatar.data()?.url;
      const slug = avatar.ref.parent.parent?.id;
      return typeof url === 'string' && url.trim() && slug ? [[slug, url.trim()] as const] : [];
    })
  );
}

export async function getPressedSongSummary(
  db: Firestore,
  shareId: string,
  viewerId?: string | null,
  trackId?: string,
): Promise<PressedSongSummary | null> {
  const share = await loadShare(db, shareId);
  if (!share) return null;
  const albumLevel = share.type === 'album' && !trackId;
  const priced = priceFromShare(share, trackId);
  const audio = priced.audio || audioForPlay(share, trackId);
  if (!audio) return null;
  const shareSnap = await db.collection('shares').doc(shareId).get();
  const shareRaw = shareSnap.data() || {};
  const houseArtistId =
    share.houseRelease === true &&
    typeof shareRaw.houseArtistId === 'string' &&
    shareRaw.houseArtistId.trim()
      ? shareRaw.houseArtistId.trim()
      : share.ownerId;
  const creditedProfiles = await publicProfilesByUser(db, [houseArtistId, share.ownerId]);
  const creditedProfile = creditedProfiles.get(houseArtistId);
  const creditedData = creditedProfile?.data() || {};
  const creditedAvatars = await avatarUrlsByProfile(db, creditedProfiles.values());
  const artistName =
    (typeof creditedData.displayName === 'string' && creditedData.displayName.trim()) ||
    share.ownerName ||
    'Artist';
  const releasedAt = timestamp(audio.uploadedAt || shareRaw.createdAt);

  const albumTracks = share.type === 'album' && Array.isArray(share.data?.tracks)
    ? share.data.tracks as Array<Record<string, unknown>>
    : [];
  const selectedTrack = trackId ? albumTracks.find((row) => row.id === trackId) : undefined;
  const trackDnaShareId =
    typeof selectedTrack?.shareId === 'string' &&
    selectedTrack.shareId.trim() &&
    selectedTrack.dnaStatus !== 'unlisted'
      ? selectedTrack.shareId.trim()
      : undefined;
  const shareDnaLive = shareDocumentVisibility(shareRaw).dnaLive;
  const dnaShareId =
    trackDnaShareId ||
    (share.type === 'track' && shareDnaLive ? shareId : undefined);
  const contextAlbumShareId =
    typeof (share.data as Record<string, unknown> | undefined)?.sharedAlbumContext === 'object'
      ? String(
          ((share.data as Record<string, unknown>).sharedAlbumContext as Record<string, unknown>)
            ?.shareId || ''
        ).trim()
      : '';
  const albumShareId =
    share.type === 'album'
      ? albumHubShareIdFromDocument(shareId, shareRaw)
      : publicMusicMetadataFromTrack(selectedTrack || share.data).albumShareId ||
        contextAlbumShareId ||
        undefined;
  const albumTitle =
    share.type === 'album' && typeof share.data?.title === 'string'
      ? share.data.title
      : publicMusicMetadataFromTrack(selectedTrack || share.data).albumTitle ||
        (typeof share.data?.albumTitle === 'string' ? share.data.albumTitle : undefined);
  const base: PressedSongSummary = {
    shareId,
    ...(trackId ? { trackId } : {}),
    ...(albumTitle ? { albumTitle } : {}),
    ...(albumShareId ? { albumShareId } : {}),
    ...(dnaShareId ? { dnaShareId } : {}),
    ...(albumLevel ? { scope: 'album' as const } : { scope: 'track' as const }),
    ownerId: share.ownerId,
    title: priced.title,
    hasAudio: true,
    releaseLive: isReleaseShareLive(share),
    houseRelease: share.houseRelease === true,
    metadata: combinePublicMusicMetadata([
      publicMusicMetadataFromTrack(selectedTrack || share.data),
      ...(share.type === 'album' && selectedTrack ? [publicMusicMetadataFromTrack(share.data)] : []),
    ]),
    price: normalizeDropPrice(priced.price),
    releasedAt,
    artist: {
      name: artistName,
      ...(creditedProfile ? { slug: creditedProfile.id } : {}),
      ...(creditedProfile && creditedAvatars.get(creditedProfile.id)
        ? { avatarUrl: creditedAvatars.get(creditedProfile.id) }
        : {}),
      studioBadge: creditedData.studioBadge === 'pro' ? 'pro' : 'free',
      starMarkUseStar: creditedData.starMarkUseStar === true,
      ...(typeof creditedData.starMarkSeed === 'number' ? { starMarkSeed: creditedData.starMarkSeed } : {}),
      pressing: normalizeArtistHomeConfig(creditedData.artistHome).theme,
    },
    publicTotals: {
      plays: nonnegative(shareRaw.playCount) + nonnegative(shareRaw.previewCount),
      buyers: nonnegative(shareRaw.purchaseCount),
    },
  };
  if (base.albumShareId) {
    base.metadata = { ...base.metadata, albumShareId: base.albumShareId };
  }
  if (!base.releaseLive && share.type === 'track') {
    const ownerShares = await db.collection('shares').where('ownerId', '==', share.ownerId).get();
    const successor = ownerShares.docs
      .flatMap((doc) => {
        const data = doc.data() as Record<string, unknown>;
        if (data.type !== 'album' || !shareDocumentVisibility(data).releaseLive) return [];
        const payload = data.data && typeof data.data === 'object'
          ? data.data as Record<string, unknown>
          : {};
        const tracks = Array.isArray(payload.tracks) ? payload.tracks as Array<Record<string, unknown>> : [];
        const track = tracks.find((row) => row.id === share.projectId);
        if (!track) return [];
        return [{
          shareId: doc.id,
          trackId: share.projectId,
          title: typeof track.title === 'string' && track.title.trim() ? track.title.trim() : priced.title,
          albumTitle: typeof payload.title === 'string' && payload.title.trim() ? payload.title.trim() : 'Album',
          updatedAt: timestamp(data.updatedAt || data.createdAt),
        }];
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    if (successor) {
      const { updatedAt: _updatedAt, ...currentRelease } = successor;
      base.currentRelease = currentRelease;
      if (!base.albumShareId) {
        base.albumShareId = successor.shareId;
        base.albumTitle = successor.albumTitle;
      }
    }
  }
  if (!base.albumShareId && share.type === 'track') {
    const ownerShares = await db.collection('shares').where('ownerId', '==', share.ownerId).get();
    const parent = ownerShares.docs
      .flatMap((doc) => {
        const data = doc.data() as Record<string, unknown>;
        if (data.type !== 'album' || !shareDocumentVisibility(data).releaseLive) return [];
        const payload = data.data && typeof data.data === 'object'
          ? data.data as Record<string, unknown>
          : {};
        const tracks = Array.isArray(payload.tracks) ? payload.tracks as Array<Record<string, unknown>> : [];
        const track = tracks.find((row) => row.id === share.projectId || row.releaseShareId === shareId);
        if (!track) return [];
        return [{
          shareId: doc.id,
          shareRaw: data,
          albumTitle: typeof payload.title === 'string' && payload.title.trim() ? payload.title.trim() : 'Album',
        }];
      })[0];
    if (parent) {
      base.albumShareId = albumHubShareIdFromDocument(parent.shareId, parent.shareRaw) || parent.shareId;
      if (!base.albumTitle) base.albumTitle = parent.albumTitle;
    }
  }
  if (!viewerId) return base;

  const [insightSnap, salesSnap, viewerLibrarySnap] = await Promise.all([
    db.collection('users').doc(share.ownerId).collection('dropInsightDays').where('shareId', '==', shareId).get(),
    db.collection('users').doc(share.ownerId).collection('dropEarnings').where('shareId', '==', shareId).get(),
    db.collection('users').doc(viewerId).collection('dropLibrary').doc(shareId).get(),
  ]);
  const sales: Sale[] = salesSnap.docs.flatMap((doc) => {
    const data = doc.data();
    const amountCents = nonnegative(data.amountCents);
    if (data.status === 'failed' || amountCents <= 0 || typeof data.buyerId !== 'string' || !data.buyerId) return [];
    return [{ buyerId: data.buyerId, amountCents, createdAt: timestamp(data.createdAt) }];
  });
  sales.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const firstBuyerAt = new Map<string, string>();
  const totals = new Map<string, number>();
  for (const sale of sales) {
    totals.set(sale.buyerId, (totals.get(sale.buyerId) || 0) + sale.amountCents);
    if (!firstBuyerAt.has(sale.buyerId)) firstBuyerAt.set(sale.buyerId, sale.createdAt);
  }
  const chronological = [...firstBuyerAt.entries()].sort((a, b) => a[1].localeCompare(b[1])).slice(0, 10);
  const top = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const allBuyerIds = [...new Set([...chronological.map(([id]) => id), ...top.map(([id]) => id)])];
  const librarySnaps = allBuyerIds.length
    ? await db.getAll(...allBuyerIds.map((id) => db.collection('users').doc(id).collection('dropLibrary').doc(shareId)))
    : [];
  const optedIn = new Set(
    librarySnaps
      .filter((snap) => snap.exists && snap.data()?.supporterCreditPublic === true)
      .map((snap) => snap.ref.parent.parent!.id)
  );
  const optedProfiles = await publicProfilesByUser(db, allBuyerIds.filter((id) => optedIn.has(id)));
  const optedAvatars = await avatarUrlsByProfile(db, optedProfiles.values());
  const supporter = (buyerId: string, rank: number, amountCents?: number): PressedSongSupporter => {
    const profile = optedProfiles.get(buyerId);
    if (!optedIn.has(buyerId) || !profile) return { rank, anonymous: true, ...(amountCents ? { amountCents } : {}) };
    const data = profile.data();
    return {
      rank,
      anonymous: false,
      ...(amountCents ? { amountCents } : {}),
      name: typeof data.displayName === 'string' && data.displayName.trim() ? data.displayName : 'Music Fan',
      slug: profile.id,
      ...(optedAvatars.get(profile.id) ? { avatarUrl: optedAvatars.get(profile.id) } : {}),
      studioBadge: data.studioBadge === 'pro' ? 'pro' : 'free',
    };
  };
  let qualifiedListeningDays = 0;
  let completions = 0;
  let repeats = 0;
  for (const doc of insightSnap.docs) {
    qualifiedListeningDays += nonnegative(doc.data().qualifiedListeners);
    completions += nonnegative(doc.data().completions);
    repeats += nonnegative(doc.data().repeatListeners);
  }
  const viewerLibrary = viewerLibrarySnap.data() || {};
  const firstRankIndex = chronological.findIndex(([id]) => id === viewerId);
  base.member = {
    qualifiedListeningDays,
    completions,
    repeats,
    grossSupportCents: sales.reduce((sum, sale) => sum + sale.amountCents, 0),
    topSupporters: top.map(([id, amount], index) => supporter(id, index + 1, amount)),
    firstPress: chronological.map(([id], index) => supporter(id, index + 1)),
  };
  base.viewer = {
    amountPaidCents: nonnegative(viewerLibrary.amountCents),
    supporterCreditPublic: viewerLibrary.supporterCreditPublic === true,
    ...(firstRankIndex >= 0 ? { firstPressRank: firstRankIndex + 1 } : {}),
    owns: viewerId === share.ownerId || viewerLibrarySnap.exists || (Boolean(viewerId) && share.houseRelease === true),
    ...(viewerId !== share.ownerId && viewerLibrarySnap.exists
      ? {
          purchase: {
            title:
              typeof viewerLibrary.title === 'string' && viewerLibrary.title.trim()
                ? viewerLibrary.title.trim()
                : base.title,
            artistName,
            amountCents: nonnegative(viewerLibrary.amountCents),
            purchasedAt: timestamp(viewerLibrary.purchasedAt),
            scope: viewerLibrary.scope === 'album' ? ('album' as const) : ('track' as const),
            edition:
              firstRankIndex >= 0
                ? `First Press #${firstRankIndex + 1}`
                : 'Standard digital edition',
          },
        }
      : {}),
  };
  if (canManageReleaseShare(shareRaw, viewerId) && share.type === 'track') {
    const albumId = typeof share.data?.albumId === 'string' ? share.data.albumId.trim() : '';
    base.ownerControls = {
      albumId,
      trackId: share.projectId,
      releaseStatus:
        share.releaseStatus === 'draft' || share.releaseStatus === 'unlisted'
          ? share.releaseStatus
          : 'live',
    };
  }
  return base;
}
