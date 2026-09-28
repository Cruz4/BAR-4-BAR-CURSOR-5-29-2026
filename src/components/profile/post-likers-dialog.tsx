'use client';

import React, { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StudioLoader } from '@/components/studio-loader';
import { ArtistHomeLink } from '@/components/profile/artist-home-link';
import { ArtistStarAvatar } from '@/components/profile/artist-star-avatar';
import { fetchPostLikers, type PostLiker } from '@/lib/profile/social-client';
import { cn } from '@/lib/utils';

type PostLikersDialogProps = {
  postId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  likeCount: number;
};

export function PostLikersDialog({ postId, open, onOpenChange, likeCount }: PostLikersDialogProps) {
  const [likers, setLikers] = useState<PostLiker[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !postId) return;
    let cancelled = false;
    setLoading(true);
    void fetchPostLikers(postId)
      .then((rows) => {
        if (cancelled) return;
        setLikers(rows);
        setLoadedFor(postId);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, postId]);

  useEffect(() => {
    if (!open) return;
    if (loadedFor === postId) return;
    setLikers([]);
  }, [open, postId, loadedFor]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(85dvh,32rem)] flex-col border-fuchsia-400/25 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-headline text-xl uppercase">
            <Heart className="h-5 w-5 fill-fuchsia-400 text-fuchsia-400" />
            Loved by
          </DialogTitle>
          <DialogDescription>
            {likeCount > 0
              ? `${likeCount.toLocaleString()} ${likeCount === 1 ? 'person' : 'people'} — tap a name to open their Artist Home.`
              : 'No loves yet.'}
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {loading && likers.length === 0 ? (
            <div className="flex justify-center py-10">
              <StudioLoader size="md" />
            </div>
          ) : likers.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No loves to show yet.</p>
          ) : (
            <ul className="space-y-1">
              {likers.map((liker) => (
                <li key={liker.userId}>
                  <div
                    className={cn(
                      'flex items-center gap-3 rounded-xl border border-transparent px-2 py-2.5 transition-colors',
                      'hover:border-white/10 hover:bg-white/[0.04]'
                    )}
                  >
                    <ArtistStarAvatar
                      name={liker.displayName}
                      avatarUrl={liker.avatarUrl}
                      useStarMark={liker.starMarkUseStar}
                      starMarkSeed={liker.starMarkSeed}
                      size={40}
                      className="shrink-0"
                    />
                    <ArtistHomeLink
                      userId={liker.userId}
                      slug={liker.slug}
                      className="min-w-0 flex-1 truncate text-sm font-bold text-[var(--ph-text,#fff)] hover:text-fuchsia-200"
                      onNavigate={() => onOpenChange(false)}
                    >
                      {liker.displayName}
                    </ArtistHomeLink>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
