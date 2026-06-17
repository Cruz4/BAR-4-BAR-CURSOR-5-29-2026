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
      <p className={cn('text-xs', proLockText())}>{getVisitorVaultBannerTitle(isDowngraded)}</p>
      <p className="text-[10px] text-muted-foreground mt-1 leading-snug">
        {getVisitorVaultBannerBody(user, albums, { openTrackSlots, hasExtraAlbums })}
      </p>
      {!isDowngraded && (
        <p className="text-[10px] text-muted-foreground/90 mt-1.5">{getVisitorInkGrantSummary()}</p>
      )}
    </ProLockBanner>
  );
}
