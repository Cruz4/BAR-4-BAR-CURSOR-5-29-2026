import type { PublicProfileData } from '@/components/profile/public-profile-showcase';
import { getAchievement, type AchievementDef } from '@/lib/gamification/achievements';
import { normalizeArtistHomeConfig, type ArtistHomeConfig } from '@/lib/profile/modules';
import { normalizeProfilePhotoMode } from '@/lib/gamification/types';
import { parseStudioBadge } from '@/lib/studio-tier-chrome';

const LEGACY_PROFILE_KEYS = [
  'views',
  'pageViews',
  'profilePageViews',
  'legacyPageLoads',
  'legacyProfileViews',
] as const;

function legacyProfileLoadsFromRaw(data: Record<string, unknown>): number {
  let max = 0;
  for (const key of LEGACY_PROFILE_KEYS) {
    const n = Number(data[key]);
    if (Number.isFinite(n) && n > max) max = Math.floor(n);
  }
  return max;
}

export type PublicProfileView = {
  profile: PublicProfileData;
  config: ArtistHomeConfig;
  liveSlug: string;
};

export function publicProfileView(raw: unknown, fallbackSlug: string): PublicProfileView {
  const data = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>;
  const liveSlug =
    typeof data.slug === 'string' && data.slug.trim() ? data.slug.trim() : fallbackSlug;
  const badges: AchievementDef[] =
    data.badges ||
    (Array.isArray(data.badgeIds) ? data.badgeIds : [])
      .map((id: string) => getAchievement(id))
      .filter(Boolean);

  return {
    liveSlug,
    config: normalizeArtistHomeConfig(data.artistHome),
    profile: {
      displayName:
        typeof data.displayName === 'string' && data.displayName.trim()
          ? data.displayName.trim()
          : 'Artist',
      rankLabel: data.rankLabel,
      rankId: data.rankId,
      xp: Number(data.xp) || 0,
      currentStreak: Number(data.currentStreak) || 0,
      longestStreak: Number(data.longestStreak) || 0,
      lifetimeBarsWritten:
        typeof data.lifetimeBarsWritten === 'number' ? data.lifetimeBarsWritten : undefined,
      lifetimeLinesGenerated:
        typeof data.lifetimeLinesGenerated === 'number' ? data.lifetimeLinesGenerated : undefined,
      albumCoverUrls: data.albumCoverUrls,
      badges,
      unlockedAchievements:
        data.unlockedAchievements && typeof data.unlockedAchievements === 'object'
          ? data.unlockedAchievements
          : undefined,
      userId: data.userId,
      profilePhotoMode: normalizeProfilePhotoMode(data.profilePhotoMode),
      profilePhotoUrl: data.profilePhotoUrl || null,
      starMarkUseStar: Boolean(data.starMarkUseStar),
      starMarkSeed: typeof data.starMarkSeed === 'number' ? data.starMarkSeed : undefined,
      referralCode:
        typeof data.referralCode === 'string' && data.referralCode.trim()
          ? data.referralCode.trim().toUpperCase()
          : undefined,
      liveDnaDrops: Array.isArray(data.liveDnaDrops)
        ? data.liveDnaDrops
            .filter((d: { shareId?: string }) => typeof d?.shareId === 'string' && d.shareId.trim())
            .map((d: Record<string, any>) => ({
              shareId: d.shareId,
              title: typeof d.title === 'string' && d.title.trim() ? d.title : 'Untitled drop',
              type: d.type === 'album' ? ('album' as const) : ('track' as const),
              ...(typeof d.albumTitle === 'string' && d.albumTitle.trim()
                ? { albumTitle: d.albumTitle.trim() }
                : {}),
              ...(typeof d.albumShareId === 'string' && d.albumShareId.trim()
                ? { albumShareId: d.albumShareId.trim() }
                : {}),
              ...(typeof d.trackIndex === 'number' ? { trackIndex: d.trackIndex } : {}),
              ...(typeof d.trackCount === 'number' ? { trackCount: d.trackCount } : {}),
              ...(d.hasDropAudio ? { hasDropAudio: true } : {}),
              ...(d.releaseLive === true ? { releaseLive: true } : {}),
              ...(d.dnaLive === true ? { dnaLive: true } : {}),
              ...(d.houseRelease === true ? { houseRelease: true } : {}),
              ...(typeof d.dropPriceSummary === 'string' && d.dropPriceSummary.trim()
                ? { dropPriceSummary: d.dropPriceSummary.trim() }
                : {}),
              ...(typeof d.playCount === 'number' ? { playCount: d.playCount } : {}),
              ...(typeof d.previewCount === 'number' ? { previewCount: d.previewCount } : {}),
              ...(typeof d.purchaseCount === 'number' ? { purchaseCount: d.purchaseCount } : {}),
              ...(typeof d.firstBuyerName === 'string' && d.firstBuyerName.trim()
                ? { firstBuyerName: d.firstBuyerName.trim() }
                : {}),
            }))
        : [],
      slug: liveSlug,
      studioBadge: parseStudioBadge(data.studioBadge),
      ...((): Partial<PublicProfileData> => {
        const unique =
          typeof data.profileViewCount === 'number' && Number.isFinite(data.profileViewCount)
            ? Math.max(0, Math.floor(data.profileViewCount))
            : 0;
        const legacy = legacyProfileLoadsFromRaw(data);
        return {
          ...(unique > 0 ? { profileViewCount: unique, profileViewCountUnique: unique } : {}),
          ...(legacy > 0 ? { legacyProfilePageLoads: legacy } : {}),
        };
      })(),
      ...(typeof data.ownerProfileViewCount === 'number'
        ? { ownerProfileViewCount: Math.max(0, Math.floor(data.ownerProfileViewCount)) }
        : {}),
    },
  };
}
