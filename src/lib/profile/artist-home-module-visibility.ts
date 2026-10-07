import type { AchievementDef } from '@/lib/gamification/achievements';
import {
  firstDropTracks,
  selectDropShelfDna,
  type LiveDnaDropItem,
} from '@/components/profile/live-dna-drop-card';
import type { PublicWallPostsPage } from '@/lib/server/public-post';
import type { ArtistHomeFeatured, ProfileModuleId } from '@/lib/profile/modules';
import type { ProfilePost } from '@/lib/profile/social-client';

export type ArtistHomeModuleVisibilityMode = 'show' | 'hide' | 'defer';

export type ArtistHomeModuleVisibilityInput = {
  featured: ArtistHomeFeatured;
  badges: AchievementDef[];
  liveDnaDrops: LiveDnaDropItem[];
  profileUserId: string;
  firstDropsOn: boolean;
  lockOn: boolean;
  isOwner: boolean;
  previewMode?: boolean;
  initialWallPosts?: PublicWallPostsPage | null;
  initialImprintPosts?: ProfilePost[];
  hasPlaygroundWall?: boolean;
  hasPlaygroundFriends?: boolean;
  hasPlaygroundGuestbook?: boolean;
  hasPlaygroundBarOfWeek?: boolean;
};

export function artistHomeModuleVisibility(
  moduleId: ProfileModuleId,
  ctx: ArtistHomeModuleVisibilityInput
): ArtistHomeModuleVisibilityMode {
  const { featured } = ctx;

  switch (moduleId) {
    case 'rhymeFingerprint':
      return featured.fingerprint ? 'show' : 'hide';
    case 'barOfWeek':
      if (ctx.hasPlaygroundBarOfWeek) return 'show';
      return featured.barOfWeek?.trim() ? 'show' : 'hide';
    case 'barBoard':
      return featured.barBoard?.pins?.length ? 'show' : 'hide';
    case 'nowPlaying':
      if (ctx.firstDropsOn && featured.featuredTrack && ctx.profileUserId) return 'show';
      if (featured.embedUrl?.trim()) return 'show';
      if (ctx.firstDropsOn && firstDropTracks(ctx.liveDnaDrops)[0]) return 'show';
      return 'hide';
    case 'proofWall':
      return ctx.badges.length > 0 ? 'show' : 'hide';
    case 'dropShelf':
      return selectDropShelfDna(ctx.liveDnaDrops, featured.dropShelfShareIds).length > 0
        ? 'show'
        : 'hide';
    case 'imprintShelf': {
      const ids = featured.imprintShelfPostIds;
      if (!ids?.length) return 'hide';
      if (ctx.initialImprintPosts?.length) {
        const byId = new Map(ctx.initialImprintPosts.map((post) => [post.id, post]));
        const any = ids.some((id) => Boolean(byId.get(id)?.quotePress));
        return any ? 'show' : 'hide';
      }
      return 'defer';
    }
    case 'wall':
      if (ctx.hasPlaygroundWall) return 'show';
      if (ctx.isOwner) return 'show';
      if ((ctx.initialWallPosts?.total ?? 0) > 0) return 'show';
      if ((ctx.initialWallPosts?.posts?.length ?? 0) > 0) return 'show';
      return 'defer';
    case 'friends':
      if (ctx.hasPlaygroundFriends) return 'show';
      return 'defer';
    case 'openLock':
      if (!ctx.lockOn) return 'hide';
      return 'defer';
    case 'guestbook':
      if (ctx.hasPlaygroundGuestbook) return 'show';
      if (!ctx.isOwner) return 'show';
      return 'defer';
    default:
      return 'show';
  }
}

export function artistHomeModuleOnPage(
  mode: ArtistHomeModuleVisibilityMode,
  moduleId: string,
  presence: Record<string, boolean | undefined>
): boolean {
  if (mode === 'hide') return false;
  if (mode === 'show') return true;
  return presence[moduleId] === true;
}
