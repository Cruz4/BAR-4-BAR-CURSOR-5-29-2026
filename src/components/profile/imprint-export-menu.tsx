'use client';

import { useEffect, useState } from 'react';
import { Bookmark, BookmarkCheck, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  captureImprintLoop,
  captureImprintNodeToCanvas,
  downloadImprintBlob,
  downloadImprintPng,
  imprintExportFilename,
} from '@/lib/profile/imprint-capture';
import {
  isImprintSaved,
  saveImprintToCollection,
  unsaveImprintFromCollection,
} from '@/lib/profile/imprint-collection-client';
import { syndicateImprintPost } from '@/lib/profile/imprint-syndicate-client';
import type { ImprintGiphySyndication, ProfilePost } from '@/lib/profile/social-client';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type ImprintExportMenuProps = {
  captureRoot: HTMLElement | null;
  text: string;
  post?: Pick<ProfilePost, 'id' | 'text' | 'ownerName' | 'ownerSlug' | 'giphySyndication' | 'imprintSaveCount'>;
  isAdmin?: boolean;
  className?: string;
  onSaveCountChange?: (count: number) => void;
};

export function ImprintExportMenu({
  captureRoot,
  text,
  post,
  isAdmin = false,
  className,
  onSaveCountChange,
}: ImprintExportMenuProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [busy, setBusy] = useState<'png' | 'loop' | 'giphy' | 'collection' | null>(null);
  const [saved, setSaved] = useState(false);
  const [saveCount, setSaveCount] = useState(post?.imprintSaveCount || 0);
  const syndication = post?.giphySyndication as ImprintGiphySyndication | undefined;

  useEffect(() => {
    setSaveCount(post?.imprintSaveCount || 0);
  }, [post?.imprintSaveCount]);

  useEffect(() => {
    if (!user?.id || !post?.id) {
      setSaved(false);
      return;
    }
    let cancelled = false;
    void isImprintSaved(post.id).then((next) => {
      if (!cancelled) setSaved(next);
    });
    return () => {
      cancelled = true;
    };
  }, [post?.id, user?.id]);

  const run = async (kind: 'png' | 'loop' | 'giphy') => {
    if (!captureRoot || busy) return;
    setBusy(kind);
    try {
      if (kind === 'png') {
        const canvas = await captureImprintNodeToCanvas(captureRoot);
        downloadImprintPng(canvas, imprintExportFilename(text, 'png'));
        toast({ title: 'PNG saved' });
        return;
      }
      if (kind === 'loop') {
        const blob = await captureImprintLoop(captureRoot, {
          durationSec: 4.5,
          fps: 12,
          onProgress: (pct) => {
            if (pct >= 99) return;
          },
        });
        downloadImprintBlob(blob, imprintExportFilename(text, 'webm'));
        toast({ title: 'Clip saved' });
        return;
      }
      if (kind === 'giphy' && post) {
        const result = await syndicateImprintPost({
          post,
          captureRoot,
          auto: false,
          preferLoop: true,
        });
        if (result.status === 'live' && result.giphyUrl) {
          toast({
            title: 'Sent to Giphy',
            description: 'Queued for phone GIF search once Giphy indexes it.',
          });
        } else {
          throw new Error(result.error || 'Giphy upload failed.');
        }
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: kind === 'giphy' ? 'Giphy syndication failed' : 'Export failed',
        description: (err as Error).message,
      });
    } finally {
      setBusy(null);
    }
  };

  const toggleCollection = async () => {
    if (!post?.id || busy) return;
    if (!user) {
      toast({ variant: 'destructive', title: 'Sign in to save imprints' });
      return;
    }
    setBusy('collection');
    try {
      const result = saved
        ? await unsaveImprintFromCollection(post.id)
        : await saveImprintToCollection(post.id);
      setSaved(result.saved);
      setSaveCount(result.imprintSaveCount);
      onSaveCountChange?.(result.imprintSaveCount);
      toast({
        title: result.saved ? 'Added to your collection' : 'Removed from collection',
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Could not update collection',
        description: (err as Error).message,
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={cn('flex items-center justify-end gap-1.5', className)}>
      {saveCount > 0 ? (
        <span
          className="inline-flex items-center gap-1 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-cyan-200/85"
          title={`Saved to ${saveCount} collection${saveCount === 1 ? '' : 's'}`}
        >
          <Bookmark className="h-3 w-3" />
          {saveCount}
        </span>
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 gap-1 px-2 text-[10px] uppercase tracking-[0.14em] text-cyan-300/80 hover:text-cyan-200"
            disabled={!captureRoot || Boolean(busy)}
            aria-label="Imprint options"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Imprint
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {post?.id ? (
            <>
              <DropdownMenuItem disabled={Boolean(busy)} onClick={() => void toggleCollection()}>
                {saved ? (
                  <BookmarkCheck className="mr-2 h-3.5 w-3.5 text-cyan-300" />
                ) : (
                  <Bookmark className="mr-2 h-3.5 w-3.5 text-cyan-300/80" />
                )}
                {saved ? 'Remove from collection' : 'Add to collection'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          ) : null}
          <DropdownMenuItem disabled={Boolean(busy)} onClick={() => void run('png')}>
            Save PNG
          </DropdownMenuItem>
          <DropdownMenuItem disabled={Boolean(busy)} onClick={() => void run('loop')}>
            Save clip
          </DropdownMenuItem>
          {isAdmin && post ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled={Boolean(busy)} onClick={() => void run('giphy')}>
                <Sparkles className="mr-2 h-3.5 w-3.5 text-cyan-300" />
                {syndication?.status === 'live' ? 'Re-send to Giphy' : 'Send to Giphy'}
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      {isAdmin && syndication?.status === 'live' && syndication.giphyUrl ? (
        <a
          href={syndication.giphyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[9px] uppercase tracking-[0.12em] text-emerald-300/75 hover:text-emerald-200"
        >
          On Giphy
        </a>
      ) : null}
      {isAdmin && syndication?.status === 'failed' ? (
        <span className="text-[9px] text-amber-300/70" title={syndication.error}>
          Giphy failed
        </span>
      ) : null}
    </div>
  );
}
