'use client';

import React, { useEffect, useState } from 'react';
import { Repeat2 } from 'lucide-react';
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
import { fetchPostReverbers, type PostReverber } from '@/lib/profile/social-client';
import { cn } from '@/lib/utils';

type PostReverbersDialogProps = {
  rootPostId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reverbCount: number;
};

export function PostReverbersDialog({
  rootPostId,
  open,
  onOpenChange,
  reverbCount,
}: PostReverbersDialogProps) {
  const [reverbers, setReverbers] = useState<PostReverber[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !rootPostId) return;
    let cancelled = false;
    setLoading(true);
    void fetchPostReverbers(rootPostId)
      .then((rows) => {
        if (cancelled) return;
        setReverbers(rows);
        setLoadedFor(rootPostId);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, rootPostId]);

  useEffect(() => {
    if (!open) return;
    if (loadedFor === rootPostId) return;
    setReverbers([]);
  }, [open, rootPostId, loadedFor]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(85dvh,32rem)] flex-col border-violet-400/25 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-headline text-xl uppercase text-violet-100">
            <Repeat2 className="h-5 w-5 text-violet-300" />
            Reverbed by
          </DialogTitle>
          <DialogDescription>
            {reverbCount > 0
              ? `${reverbCount.toLocaleString()} ${reverbCount === 1 ? 'person' : 'people'} echoed this onto their wall — tap a name for their Artist Home.`
              : 'No Reverbs yet.'}
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {loading && reverbers.length === 0 ? (
            <div className="flex justify-center py-10">
              <StudioLoader size="md" />
            </div>
          ) : reverbers.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No Reverbs to show yet.</p>
          ) : (
            <ul className="space-y-1">
              {reverbers.map((reverber) => (
                <li key={reverber.userId}>
                  <div
                    className={cn(
                      'flex items-center gap-3 rounded-xl border border-transparent px-2 py-2.5 transition-colors',
                      'hover:border-white/10 hover:bg-white/[0.04]'
                    )}
                  >
                    <ArtistStarAvatar
                      name={reverber.displayName}
                      avatarUrl={reverber.avatarUrl}
                      useStarMark={reverber.starMarkUseStar}
                      starMarkSeed={reverber.starMarkSeed}
                      size={40}
                      className="shrink-0"
                    />
                    <ArtistHomeLink
                      userId={reverber.userId}
                      slug={reverber.slug}
                      className="min-w-0 flex-1 truncate text-sm font-bold text-[var(--ph-text,#fff)] hover:text-violet-200"
                      onNavigate={() => onOpenChange(false)}
                    >
                      {reverber.displayName}
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
