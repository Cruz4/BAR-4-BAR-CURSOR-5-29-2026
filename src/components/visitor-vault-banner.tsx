'use client';

import type { Album } from '@/lib/types';
import { ProLockBanner, proLockText } from '@/components/pro-lock';
import { cn } from '@/lib/utils';
import {
  getVisitorVaultBannerBody,
  getVisitorVaultBannerTitle,
} from '@/lib/free-vault-copy';
import { getVisitorInkGrantSummary } from '@/lib/ink-grants';
import { isDowngradedProVault, type TierUserLike } from '@/lib/tier-limits';

export function VisitorVaultBanner({
  user,
  albums,
  openTrackSlots,
  hasExtraAlbums,
}: {
  user: TierUserLike;
  albums: Album[];
  openTrackSlots?: number;
  hasExtraAlbums?: boolean;
}) {
  const isDowngraded = isDowngradedProVault(user, albums);

  return (
    <ProLockBanner>
      <p className={cn('text-sm font-bold leading-snug sm:text-base', proLockText())}>
        {getVisitorVaultBannerTitle(isDowngraded)}
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
        {getVisitorVaultBannerBody(user, albums, { openTrackSlots, hasExtraAlbums })}
      </p>
      {!isDowngraded && (
        <p className="mt-2 text-xs text-muted-foreground/90 sm:text-sm">{getVisitorInkGrantSummary()}</p>
      )}
    </ProLockBanner>
  );
}
