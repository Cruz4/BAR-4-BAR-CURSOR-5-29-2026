'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Loader2, Plus, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { QuotePressCard } from '@/components/profile/quote-press-card';
import { ImprintScaleFit } from '@/components/profile/imprint-scale-fit';
import { fetchImprintCollection } from '@/lib/profile/imprint-collection-client';
import type { ArtistHomeConfig } from '@/lib/profile/modules';
import { fetchPostById, type ProfilePost } from '@/lib/profile/social-client';

type UpdateFn = (mutate: (draft: ArtistHomeConfig) => void) => void;

export function ImprintShelfEditor({
  userId,
  profileSlug,
  config,
  update,
  onShelfPostsChange,
}: {
  userId: string;
  profileSlug?: string;
  config: ArtistHomeConfig;
  update: UpdateFn;
  onShelfPostsChange?: (posts: ProfilePost[]) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState<ProfilePost[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchImprintCollection()
      .then(async (entries) => {
        const posts = await Promise.all(entries.map((entry) => fetchPostById(entry.postId)));
        if (cancelled) return;
        setCandidates(
          posts.filter((post): post is ProfilePost =>
            Boolean(post?.quotePress && post.text?.trim())
          )
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const selectedIds = useMemo(
    () => config.featured.imprintShelfPostIds ?? [],
    [config.featured.imprintShelfPostIds]
  );
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const selectedPosts = useMemo(() => {
    const byId = new Map(candidates.map((post) => [post.id, post]));
    return selectedIds
      .map((id) => byId.get(id))
      .filter((post): post is ProfilePost => Boolean(post));
  }, [candidates, selectedIds]);

  const available = candidates.filter((post) => !selectedSet.has(post.id));

  const shelfPostKey = selectedPosts.map((post) => post.id).join(',');
  const lastShelfPostKeyRef = useRef('');
  useEffect(() => {
    if (!onShelfPostsChange) return;
    if (lastShelfPostKeyRef.current === shelfPostKey) return;
    lastShelfPostKeyRef.current = shelfPostKey;
    onShelfPostsChange(selectedPosts);
  }, [onShelfPostsChange, selectedPosts, shelfPostKey]);

  const addPost = (postId: string) => {
    update((draft) => {
      const prev = draft.featured.imprintShelfPostIds || [];
      if (prev.includes(postId)) return;
      draft.featured.imprintShelfPostIds = [...prev, postId];
      const mod = draft.modules.find((m) => m.id === 'imprintShelf');
      if (mod) mod.enabled = true;
    });
  };

  const removeAt = (index: number) => {
    update((draft) => {
      const prev = [...(draft.featured.imprintShelfPostIds || [])];
      prev.splice(index, 1);
      if (!prev.length) delete draft.featured.imprintShelfPostIds;
      else draft.featured.imprintShelfPostIds = prev;
    });
  };

  const move = (index: number, dir: -1 | 1) => {
    update((draft) => {
      const prev = [...(draft.featured.imprintShelfPostIds || [])];
      const next = index + dir;
      if (next < 0 || next >= prev.length) return;
      const [row] = prev.splice(index, 1);
      prev.splice(next, 0, row);
      draft.featured.imprintShelfPostIds = prev;
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Save imprints from any post via the <span className="font-bold text-cyan-200/90">Imprint</span>{' '}
        menu, then choose which ones appear on your Artist Home here. Toggle the Imprint Shelf module in
        the deck below.
      </p>

      {selectedPosts.length > 0 ? (
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
            On your home ({selectedPosts.length})
          </p>
          {selectedPosts.map((post, index) => (
            <div
              key={post.id}
              className="rounded-xl border border-cyan-500/25 bg-cyan-500/5 p-3"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-[9px] font-bold uppercase tracking-wider text-cyan-200/80">
                  #{index + 1}
                </span>
                <div className="flex items-center gap-0.5">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    aria-label="Move up"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    disabled={index === selectedPosts.length - 1}
                    onClick={() => move(index, 1)}
                    aria-label="Move down"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-red-300 hover:text-red-200"
                    onClick={() => removeAt(index)}
                    aria-label="Remove from home shelf"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <ImprintScaleFit density="L">
                <QuotePressCard
                  text={post.text}
                  config={post.quotePress!}
                  creatorSlug={profileSlug || post.ownerSlug}
                />
              </ImprintScaleFit>
            </div>
          ))}
        </div>
      ) : null}

      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">
          {loading ? 'Loading your collection…' : 'Add from your collection'}
        </p>
        {loading ? (
          <div className="flex items-center gap-2 py-6 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-xs">Opening collection…</span>
          </div>
        ) : available.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/15 bg-black/20 px-4 py-6 text-center">
            <Sparkles className="mx-auto mb-2 h-6 w-6 text-cyan-400/60" />
            <p className="text-xs text-muted-foreground">
              {candidates.length
                ? 'Every saved imprint is already on your home shelf.'
                : 'Your collection is empty. Open any Imprint post and choose Add to collection from the Imprint menu.'}
            </p>
          </div>
        ) : (
          <div className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-1.5">
            {available.map((post) => (
              <button
                key={post.id}
                type="button"
                onClick={() => addPost(post.id)}
                className={cn(
                  'flex w-full items-start gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors',
                  'border-transparent text-white/80 hover:border-cyan-500/30 hover:bg-cyan-500/10'
                )}
              >
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-400/80" />
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-xs text-white/90">{post.text}</span>
                  <span className="mt-0.5 block text-[9px] uppercase tracking-wider text-muted-foreground">
                    {post.ownerId === userId ? 'Yours' : post.ownerName}
                    {post.imprintSaveCount ? ` · ${post.imprintSaveCount} saved` : ''}
                  </span>
                </span>
                <Plus className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300" />
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedPosts[0] ? (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-primary">Live preview</p>
          <ImprintScaleFit density="L">
            <QuotePressCard
              text={selectedPosts[0].text}
              config={selectedPosts[0].quotePress!}
              creatorSlug={profileSlug || selectedPosts[0].ownerSlug}
            />
          </ImprintScaleFit>
        </div>
      ) : null}
    </div>
  );
}
