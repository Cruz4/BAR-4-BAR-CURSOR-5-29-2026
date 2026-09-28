'use client';

import React, { useEffect, useState } from 'react';
import { Search, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { auth } from '@/lib/firebase/client/firebase';
import { pendingRemoteGif, revokePostImagePreview, type PendingPostImage } from '@/lib/profile/post-images';
import { revokeWallClipPreview, type PendingWallClip } from '@/lib/profile/wall-clips';
import { cn } from '@/lib/utils';

type GifHit = {
  id: string;
  title: string;
  previewUrl: string;
  url: string;
};

type GifAttachButtonProps = {
  disabled?: boolean;
  image: PendingPostImage | null;
  onImageChange: (image: PendingPostImage | null) => void;
  clip?: PendingWallClip | null;
  onClipChange?: (clip: PendingWallClip | null) => void;
};

export function GifAttachButton({
  disabled,
  image,
  onImageChange,
  clip,
  onClipChange,
}: GifAttachButtonProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState<GifHit[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    const handle = window.setTimeout(() => {
      void load(query);
    }, query.trim() ? 280 : 0);
    return () => window.clearTimeout(handle);
  }, [open, query]);

  const load = async (nextQuery: string) => {
    setBusy(true);
    setError('');
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        setGifs([]);
        setError('Sign in to search GIFs.');
        return;
      }
      const params = new URLSearchParams();
      if (nextQuery.trim()) params.set('q', nextQuery.trim());
      const res = await fetch(`/api/gifs/search?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const data = (await res.json()) as { gifs?: GifHit[]; error?: string };
      if (!res.ok) {
        setGifs([]);
        setError(data.error || 'GIF search is not available right now.');
        return;
      }
      setGifs(Array.isArray(data.gifs) ? data.gifs : []);
    } catch {
      setGifs([]);
      setError('GIF search failed.');
    } finally {
      setBusy(false);
    }
  };

  const pick = (gif: GifHit) => {
    revokePostImagePreview(image);
    revokeWallClipPreview(clip);
    onClipChange?.(null);
    onImageChange(pendingRemoteGif(gif.url));
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="inline-flex h-8 shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-1.5 font-code text-[9px] font-bold uppercase tracking-wider text-fuchsia-200/80 hover:bg-fuchsia-500/10 hover:text-fuchsia-100 disabled:opacity-40"
        title="Add a GIF"
      >
        <Sparkles className="h-3.5 w-3.5" />
        GIF
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className={cn(
            'flex max-h-[min(92dvh,44rem)] w-[min(calc(100vw-1rem),40rem)] max-w-[min(calc(100vw-1rem),40rem)] flex-col gap-3 overflow-hidden',
            'border-white/10 bg-[#0b0f14] p-4 text-white sm:p-5'
          )}
        >
          <DialogHeader className="shrink-0 space-y-1 text-left">
            <DialogTitle className="text-sm font-bold uppercase tracking-widest text-fuchsia-200">
              Add a GIF
            </DialogTitle>
            <DialogDescription className="text-xs text-white/55">
              Search Giphy. The GIF posts with your message.
            </DialogDescription>
          </DialogHeader>
          <div className="relative shrink-0">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-white/40" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search GIFs"
              className="h-9 border-white/10 bg-black/40 pl-8 text-sm"
            />
          </div>
          {error ? <p className="shrink-0 text-xs text-amber-200">{error}</p> : null}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {gifs.map((gif) => (
                <button
                  key={gif.id}
                  type="button"
                  onClick={() => pick(gif)}
                  className="flex min-h-[9rem] items-center justify-center rounded-lg bg-black/70 p-2 ring-1 ring-white/10 transition hover:bg-black hover:ring-fuchsia-300/60 sm:min-h-[10rem]"
                  title={gif.title}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={gif.previewUrl}
                    alt={gif.title}
                    className="max-h-[min(12rem,28vh)] w-full object-contain"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
            {!busy && !error && gifs.length === 0 ? (
              <p className="py-6 text-center text-xs text-white/45">No GIFs for that search.</p>
            ) : null}
          </div>
          {busy ? (
            <p className="shrink-0 text-[10px] uppercase tracking-widest text-white/40">Searching…</p>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
