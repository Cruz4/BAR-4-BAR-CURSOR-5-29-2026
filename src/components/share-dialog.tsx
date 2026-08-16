'use client';

import React, { useState, useContext, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Copy,
  Check,
  Globe,
  Share2,
  Sparkles,
  Loader,
  RefreshCw,
  EyeOff,
  ExternalLink,
  Plus,
  Trash2,
  Link2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DataContext } from '@/context/data-context';
import {
  DNA_DROP_MEDIA_LIMIT,
  normalizeDnaDropMedia,
  tracksMissingDnaDrop,
} from '@/lib/dna-drop';
import { EMBED_HELP_TEXT, parseEmbedUrl } from '@/lib/profile/embeds';
import { EmbedPlayer } from '@/components/profile/embed-player';
import { DropCommercePanel } from '@/components/drop-commerce-panel';
import { cn } from '@/lib/utils';
import type { Track } from '@/lib/types';

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'album' | 'track';
  id: string;
  title: string;
  albumId?: string;
  existingShareId?: string;
}

type AlbumPublishKind = 'drop' | 'update';

export function ShareDialog({
  open,
  onOpenChange,
  type,
  id,
  title,
  albumId,
  existingShareId,
}: ShareDialogProps) {
  const {
    dropDNA,
    updateDNA,
    revokeDNA,
    isCloudSyncActive,
    getAlbumById,
    updateAlbum,
    updateTrack,
  } = useContext(DataContext);
  const { toast } = useToast();
  const [isWorking, setIsWorking] = useState(false);
  const [shareId, setShareId] = useState(existingShareId || '');
  const [copied, setCopied] = useState(false);
  const [mediaDraft, setMediaDraft] = useState<string[]>([]);
  const [mediaInput, setMediaInput] = useState('');
  const [mediaSaving, setMediaSaving] = useState(false);
  const [trackDropAskOpen, setTrackDropAskOpen] = useState(false);
  const [pendingAlbumKind, setPendingAlbumKind] = useState<AlbumPublishKind | null>(null);
  const [offlineTracks, setOfflineTracks] = useState<Track[]>([]);

  useEffect(() => {
    if (!open) return;
    setShareId(existingShareId || '');
    setMediaInput('');
    setTrackDropAskOpen(false);
    setPendingAlbumKind(null);
    setOfflineTracks([]);
    if (type === 'album') {
      setMediaDraft(normalizeDnaDropMedia(getAlbumById(id)?.dnaDropMedia));
      return;
    }
    const album = albumId ? getAlbumById(albumId) : null;
    const track = album?.tracks?.find((t) => t.id === id);
    setMediaDraft(normalizeDnaDropMedia(track?.dnaDropMedia));
  }, [open, existingShareId, type, id, albumId, getAlbumById]);

  const scopeOptions = albumId ? { albumId } : undefined;
  const mediaDirty =
    JSON.stringify(normalizeDnaDropMedia(mediaDraft)) !==
    JSON.stringify(
      normalizeDnaDropMedia(
        type === 'album'
          ? getAlbumById(id)?.dnaDropMedia
          : albumId
            ? getAlbumById(albumId)?.tracks?.find((t) => t.id === id)?.dnaDropMedia
            : []
      )
    );

  const persistMedia = async (next: string[], refreshSnapshot: boolean) => {
    const cleaned = normalizeDnaDropMedia(next);
    if (type === 'album') {
      updateAlbum(id, { dnaDropMedia: cleaned.length ? cleaned : [] });
    } else if (albumId) {
      updateTrack(albumId, id, { dnaDropMedia: cleaned.length ? cleaned : [] });
    } else {
      throw new Error('Album context required to save track media.');
    }
    setMediaDraft(cleaned);
    if (refreshSnapshot && shareId) {
      await updateDNA(type, id, shareId, scopeOptions);
    }
  };

  const liveDropMissingTracks = async () => {
    const album = getAlbumById(id);
    const missing = tracksMissingDnaDrop(album);
    for (const track of missing) {
      await dropDNA('track', track.id, { albumId: id });
    }
    return missing.length;
  };

  const runAlbumPublish = async (kind: AlbumPublishKind, alsoDropTracks: boolean) => {
    setIsWorking(true);
    try {
      if (mediaDirty) {
        await persistMedia(mediaDraft, false);
      }
      let droppedCount = 0;
      if (alsoDropTracks) {
        droppedCount = await liveDropMissingTracks();
      }
      if (kind === 'update' && shareId) {
        await updateDNA('album', id, shareId);
        toast({
          title: 'Album DNA refreshed',
          description:
            droppedCount > 0
              ? `Live-dropped ${droppedCount} track${droppedCount === 1 ? '' : 's'} and updated the album.`
              : 'Same link — the album now points at each track’s latest live DNA Drop.',
        });
      } else {
        const newShareId = await dropDNA('album', id);
        setShareId(newShareId);
        toast({
          title: shareId ? 'Album DNA updated' : 'Album DNA live',
          description:
            droppedCount > 0
              ? `Live-dropped ${droppedCount} track${droppedCount === 1 ? '' : 's'}. The album page shows song cards.`
              : 'Public album page shows track cards — open a song for its DNA Drop.',
        });
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Could not publish album DNA Drop.';
      toast({ variant: 'destructive', title: 'Drop Failed', description: message });
    } finally {
      setIsWorking(false);
      setTrackDropAskOpen(false);
      setPendingAlbumKind(null);
      setOfflineTracks([]);
    }
  };

  const beginAlbumPublish = (kind: AlbumPublishKind) => {
    if (!isCloudSyncActive) {
      toast({
        variant: 'destructive',
        title: 'Studio Pro Required',
        description: 'Sharing DNA is a premium platform feature.',
      });
      return;
    }
    const album = getAlbumById(id);
    const missing = tracksMissingDnaDrop(album);
    if (missing.length > 0) {
      setOfflineTracks(missing);
      setPendingAlbumKind(kind);
      setTrackDropAskOpen(true);
      return;
    }
    void runAlbumPublish(kind, false);
  };

  const handleDropDNA = async () => {
    if (type === 'album') {
      beginAlbumPublish('drop');
      return;
    }

    if (!isCloudSyncActive) {
      toast({
        variant: 'destructive',
        title: 'Studio Pro Required',
        description: 'Sharing DNA is a premium platform feature.',
      });
      return;
    }

    setIsWorking(true);
    try {
      if (mediaDirty) {
        await persistMedia(mediaDraft, false);
      }
      const newShareId = await dropDNA(type, id, scopeOptions);
      setShareId(newShareId);
      toast({
        title: shareId ? 'DNA Drop Updated' : 'DNA Drop Live',
        description: 'Your public link now reflects your latest saved setup.',
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Could not publish DNA Drop.';
      toast({ variant: 'destructive', title: 'Drop Failed', description: message });
    } finally {
      setIsWorking(false);
    }
  };

  const handleUpdateDNA = async () => {
    if (!shareId) return;
    if (type === 'album') {
      beginAlbumPublish('update');
      return;
    }
    setIsWorking(true);
    try {
      if (mediaDirty) {
        await persistMedia(mediaDraft, false);
      }
      await updateDNA(type, id, shareId, scopeOptions);
      toast({
        title: 'Snapshot refreshed',
        description: 'Same link — visitors and importers now see your latest saved DNA.',
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Could not update DNA Drop.';
      toast({ variant: 'destructive', title: 'Update Failed', description: message });
    } finally {
      setIsWorking(false);
    }
  };

  const handleRevokeDNA = async () => {
    if (!shareId) return;
    setIsWorking(true);
    try {
      await revokeDNA(type, id, shareId, scopeOptions);
      setShareId('');
      toast({
        title: 'DNA Drop offline',
        description: 'The public link no longer works. You can publish again anytime.',
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Could not take DNA Drop offline.';
      toast({ variant: 'destructive', title: 'Offline Failed', description: message });
    } finally {
      setIsWorking(false);
    }
  };

  const shareUrl = shareId ? `${window.location.origin}/share/${shareId}` : '';

  const copyToClipboard = () => {
    void navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast({ title: 'Link Copied' });
    setTimeout(() => setCopied(false), 2000);
  };

  const openShareInNewWindow = () => {
    if (!shareUrl) return;
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  };

  const addMediaLink = () => {
    const raw = mediaInput.trim();
    if (!raw) return;
    try {
      const u = new URL(raw);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('bad');
    } catch {
      toast({
        variant: 'destructive',
        title: 'Invalid link',
        description: 'Paste a full http(s) URL.',
      });
      return;
    }
    if (mediaDraft.length >= DNA_DROP_MEDIA_LIMIT) {
      toast({
        variant: 'destructive',
        title: 'Limit reached',
        description: `Up to ${DNA_DROP_MEDIA_LIMIT} media links per DNA Drop.`,
      });
      return;
    }
    if (mediaDraft.some((m) => m.toLowerCase() === raw.toLowerCase())) {
      toast({ variant: 'destructive', title: 'Already added' });
      return;
    }
    setMediaDraft((prev) => [...prev, raw]);
    setMediaInput('');
  };

  const removeMediaLink = (idx: number) => {
    setMediaDraft((prev) => prev.filter((_, i) => i !== idx));
  };

  const saveMediaLinks = async () => {
    setMediaSaving(true);
    try {
      await persistMedia(mediaDraft, Boolean(shareId));
      toast({
        title: shareId ? 'Media saved & snapshot updated' : 'Media saved',
        description: shareId
          ? 'Public DNA Drop page now includes these links and embeds.'
          : 'Links will publish with your next Confirm DNA Drop.',
      });
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Could not save media',
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setMediaSaving(false);
    }
  };

  const albumReadyCopy =
    type === 'album'
      ? 'Publishes an album page with your album DNA plus clickable cards for each song. Live tracks open their own DNA Drop (lyrics & rules). Offline tracks stay listed until you drop them.'
      : 'Publishes a snapshot of lyrics & structure plus only the rules that are toggled on right now — Creative DNA, intents, vibe, guardrails, special instructions, and Style DNA when active.';

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={cn(
            'flex w-[calc(100vw-1.25rem)] max-w-lg flex-col gap-0 overflow-hidden p-0',
            'max-h-[min(92vh,880px)] bg-card border-2 sm:rounded-xl'
          )}
        >
          <DialogHeader className="shrink-0 space-y-1.5 border-b border-white/10 px-5 pb-3 pt-6 pr-12 sm:px-6">
            <DialogTitle className="font-headline text-3xl flex items-center gap-3">
              <Globe className="text-primary h-8 w-8 shrink-0" /> DNA DROP
            </DialogTitle>
            <DialogDescription className="font-code text-[10px] uppercase tracking-widest text-muted-foreground">
              Public snapshot of <span className="text-foreground">{title}</span>
              {type === 'album' ? ' · album DNA' : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-5 py-4 sm:px-6">
            <div className="space-y-5 min-w-0">
            {!shareId ? (
              <div className="space-y-4 text-center px-2">
                <div className="p-5 bg-primary/5 border border-primary/20 rounded-xl space-y-3 text-left">
                  <Sparkles className="h-9 w-9 text-primary mx-auto animate-pulse" />
                  <h3 className="font-headline text-lg font-bold uppercase text-center">Ready to go live?</h3>
                  <p className="text-[11px] text-muted-foreground font-code leading-relaxed">{albumReadyCopy}</p>
                  <p className="text-[10px] text-muted-foreground/80 italic border-t border-white/5 pt-2">
                    Not live-synced — press Update after you change anything you want reflected on the link.
                  </p>
                </div>
                <Button
                  onClick={handleDropDNA}
                  disabled={isWorking}
                  className="w-full h-12 text-sm font-bold shadow-xl gap-2"
                >
                  {isWorking ? <Loader className="animate-spin" /> : <Share2 className="h-4 w-4" />}
                  Confirm DNA Drop
                </Button>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 min-w-0">
                <div className="space-y-2 min-w-0">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-primary">
                    Public Studio Link
                  </Label>
                  <div className="flex gap-2 min-w-0">
                    <a
                      href={shareUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        'flex h-10 min-w-0 flex-1 items-center truncate rounded-md border border-input bg-background/50 px-3 font-code text-xs text-primary underline-offset-2',
                        'hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                      )}
                      title="Open DNA Drop in a new tab"
                    >
                      {shareUrl}
                    </a>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 shrink-0"
                      onClick={openShareInNewWindow}
                      title="Open in new window"
                      aria-label="Open DNA Drop in new window"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 shrink-0"
                      onClick={copyToClipboard}
                      title="Copy link"
                      aria-label="Copy DNA Drop link"
                    >
                      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="p-4 bg-muted/20 border border-dashed rounded-lg space-y-2">
                  <p className="text-[9px] text-muted-foreground font-bold uppercase">Live status</p>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] font-bold uppercase text-green-600">
                      {type === 'album' ? 'Album DNA is public' : 'DNA Drop is public'}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    {type === 'album' ? (
                      <>
                        The album link stays the same. Use <strong className="text-foreground">Update snapshot</strong>{' '}
                        after you edit album DNA or track drops — visitors see song cards that open each live track page.
                      </>
                    ) : (
                      <>
                        The link stays the same. Use <strong className="text-foreground">Update snapshot</strong> after
                        you edit lyrics, toggles, DNA, intents, vibe, style, media, audio, price, or structure — otherwise visitors keep
                        seeing the last published version.
                      </>
                    )}
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    variant="secondary"
                    className="h-10 flex-1 text-[10px] font-bold uppercase gap-2"
                    onClick={handleUpdateDNA}
                    disabled={isWorking}
                  >
                    {isWorking ? (
                      <Loader className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                    Update snapshot
                  </Button>
                  <Button
                    variant="outline"
                    className="h-10 flex-1 text-[10px] font-bold uppercase gap-2 border-red-500/30 text-red-500 hover:bg-red-500/10"
                    onClick={handleRevokeDNA}
                    disabled={isWorking}
                  >
                    <EyeOff className="h-3.5 w-3.5" /> Take offline
                  </Button>
                </div>
              </div>
            )}

            <DropCommercePanel type={type} id={id} albumId={type === 'album' ? id : albumId} />

            <div className="space-y-3 border-t border-white/10 pt-4 min-w-0">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-primary shrink-0" />
                <Label className="text-[10px] font-bold uppercase tracking-widest text-primary">
                  Links &amp; embeds
                </Label>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">{EMBED_HELP_TEXT}</p>
              <div className="flex gap-2 min-w-0">
                <Input
                  value={mediaInput}
                  onChange={(e) => setMediaInput(e.target.value)}
                  placeholder="https://youtube.com/watch?v=…"
                  className="h-9 min-w-0 flex-1 font-code text-xs bg-background/50"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addMediaLink();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={addMediaLink}
                  disabled={!mediaInput.trim() || mediaDraft.length >= DNA_DROP_MEDIA_LIMIT}
                  aria-label="Add media link"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {mediaDraft.length > 0 && (
                <ul className="space-y-3 min-w-0">
                  {mediaDraft.map((url, idx) => {
                    const embeddable = Boolean(parseEmbedUrl(url));
                    return (
                      <li
                        key={`${url}-${idx}`}
                        className="min-w-0 space-y-2 overflow-hidden rounded-lg border border-white/10 bg-black/20 p-2"
                      >
                        <div className="flex items-start gap-2 min-w-0">
                          <p className="min-w-0 flex-1 break-all font-code text-[10px] text-muted-foreground">
                            {url}
                          </p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-red-400"
                            onClick={() => removeMediaLink(idx)}
                            aria-label="Remove media link"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        {embeddable ? (
                          <div className="min-w-0 max-w-full overflow-hidden">
                            <EmbedPlayer url={url} />
                          </div>
                        ) : (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer nofollow"
                            className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-primary hover:underline"
                          >
                            Open link <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-9 w-full text-[10px] font-bold uppercase"
                disabled={!mediaDirty || mediaSaving || isWorking}
                onClick={() => void saveMediaLinks()}
              >
                {mediaSaving ? <Loader className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                {shareId ? 'Save media to live drop' : 'Save media for next drop'}
              </Button>
            </div>
            </div>
          </div>

          <DialogFooter className="shrink-0 border-t border-white/10 px-5 py-3 sm:justify-start sm:px-6">
            <p className="text-[9px] text-muted-foreground font-code uppercase text-center w-full leading-relaxed">
              Import copies the snapshot into another artist&apos;s vault. Take offline to close the link entirely.
            </p>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={trackDropAskOpen}
        onOpenChange={(next) => {
          setTrackDropAskOpen(next);
          if (!next) {
            setPendingAlbumKind(null);
            setOfflineTracks([]);
          }
        }}
      >
        <AlertDialogContent className="bg-card border-2 max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-headline text-2xl uppercase">
              Live-drop offline tracks?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-code leading-relaxed space-y-3">
              <span className="block">
                {offlineTracks.length} song{offlineTracks.length === 1 ? '' : 's'} in this album{' '}
                {offlineTracks.length === 1 ? "isn't" : "aren't"} on a public DNA Drop yet. The album works best
                when each card opens that song&apos;s page.
              </span>
              <span className="block text-muted-foreground">
                {offlineTracks
                  .slice(0, 6)
                  .map((t) => t.title || 'Untitled')
                  .join(' · ')}
                {offlineTracks.length > 6 ? ` · +${offlineTracks.length - 6} more` : ''}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-col gap-2 sm:space-x-0">
            <AlertDialogAction
              className="w-full font-bold"
              disabled={isWorking || !pendingAlbumKind}
              onClick={(e) => {
                e.preventDefault();
                if (pendingAlbumKind) void runAlbumPublish(pendingAlbumKind, true);
              }}
            >
              {isWorking ? 'Publishing…' : `Live-drop ${offlineTracks.length} & publish album`}
            </AlertDialogAction>
            <AlertDialogAction
              className="w-full font-bold bg-secondary text-secondary-foreground hover:bg-secondary/80"
              disabled={isWorking || !pendingAlbumKind}
              onClick={(e) => {
                e.preventDefault();
                if (pendingAlbumKind) void runAlbumPublish(pendingAlbumKind, false);
              }}
            >
              Album only — leave tracks offline
            </AlertDialogAction>
            <AlertDialogCancel className="w-full font-bold mt-0" disabled={isWorking}>
              Cancel
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
