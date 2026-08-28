'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { auth } from '@/lib/firebase/client/firebase';
import { cn } from '@/lib/utils';
import {
  SHARE_ASPECT_FRAMES,
  SHARE_ASPECT_RATIOS,
  buildShareCampaignUrl,
  buildShareTargetUrl,
  type ShareAspectRatio,
  type ShareCampaignKind,
} from '@/lib/share-attribution';
import { Check, Copy, Download, Loader, Share2 } from 'lucide-react';

export type ShareStudioDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: ShareCampaignKind;
  /** Canonical path without origin, e.g. /u/slug or /song/ABC */
  targetPath: string;
  title: string;
  subtitle?: string;
  coverUrl?: string | null;
  shareText?: string;
};

async function authHeaders(): Promise<HeadersInit> {
  const user = auth.currentUser;
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (!user) return headers;
  return { ...headers, Authorization: `Bearer ${await user.getIdToken()}` };
}

export function ShareStudioDialog({
  open,
  onOpenChange,
  kind,
  targetPath,
  title,
  subtitle,
  coverUrl,
  shareText,
}: ShareStudioDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [aspect, setAspect] = useState<ShareAspectRatio>('9:16');
  const [campaignCode, setCampaignCode] = useState<string | null>(null);
  const [minting, setMinting] = useState(false);
  const [copied, setCopied] = useState(false);

  const frame = SHARE_ASPECT_FRAMES[aspect];
  const fallbackUrl = useMemo(
    () => buildShareTargetUrl(targetPath, typeof window !== 'undefined' ? window.location.origin : undefined),
    [targetPath]
  );
  const campaignUrl = campaignCode
    ? buildShareCampaignUrl(
        campaignCode,
        typeof window !== 'undefined' ? window.location.origin : undefined
      )
    : fallbackUrl;

  const composedText = shareText || `${title}\n${campaignUrl}\n#bar4bar.ink`;

  useEffect(() => {
    if (!open || !user) {
      setCampaignCode(null);
      return;
    }
    let cancelled = false;
    setMinting(true);
    void (async () => {
      try {
        const res = await fetch('/api/share/campaign', {
          method: 'POST',
          headers: await authHeaders(),
          body: JSON.stringify({
            kind,
            targetPath,
            title,
            channel: 'share_studio',
          }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          campaign?: { code?: string };
          error?: string;
        };
        if (!res.ok) throw new Error(data.error || 'Could not mint campaign link');
        if (!cancelled && data.campaign?.code) setCampaignCode(data.campaign.code);
      } catch (error) {
        if (!cancelled) {
          setCampaignCode(null);
          toast({
            variant: 'destructive',
            title: 'Using direct link',
            description: error instanceof Error ? error.message : 'Campaign mint failed',
          });
        }
      } finally {
        if (!cancelled) setMinting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, user, kind, targetPath, title, toast]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(campaignUrl);
      setCopied(true);
      toast({ title: 'Link copied' });
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast({ variant: 'destructive', title: 'Could not copy link' });
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator === 'undefined' || !navigator.share) {
      toast({ title: 'Native share unavailable — copy the link instead' });
      return;
    }
    try {
      await navigator.share({
        title: `${title} · Bar 4 Bar`,
        text: composedText,
        url: campaignUrl,
      });
    } catch {
      /* user cancelled */
    }
  };

  const cover = coverUrl?.trim() || '/Logo.png';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto border-primary/25 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-headline text-xl uppercase flex items-center gap-2">
            <Share2 className="h-5 w-5 text-sky-400" /> Share Studio
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            Branded preview frames for {kind === 'release' ? 'releases' : kind === 'profile' ? 'profiles' : 'achievements'}.
            Campaign links stay opaque — no account IDs in the URL.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-1.5">
          {SHARE_ASPECT_RATIOS.map((ratio) => (
            <Button
              key={ratio}
              type="button"
              size="sm"
              variant={aspect === ratio ? 'default' : 'outline'}
              className={cn(
                'h-8 text-[10px] font-bold uppercase tracking-wider',
                aspect === ratio && 'bg-sky-500 text-black hover:bg-sky-400'
              )}
              onClick={() => setAspect(ratio)}
            >
              {SHARE_ASPECT_FRAMES[ratio].label} · {ratio}
            </Button>
          ))}
        </div>

        <div className="mx-auto w-full max-w-[220px]">
          <div
            className="relative w-full overflow-hidden rounded-xl border border-white/15 bg-gradient-to-b from-sky-950/80 via-black to-black shadow-[0_0_40px_-12px_hsl(var(--primary)/0.45)]"
            style={{ aspectRatio: frame.css }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cover}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-70"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 space-y-1 p-3">
              <p className="font-headline text-sm font-bold uppercase leading-tight text-white line-clamp-2">
                {title}
              </p>
              {subtitle ? (
                <p className="text-[10px] text-white/70 line-clamp-2">{subtitle}</p>
              ) : null}
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-sky-300">
                Bar 4 Bar
              </p>
            </div>
          </div>
          <p className="mt-2 text-center text-[10px] text-muted-foreground">
            {frame.platforms} · {frame.width}×{frame.height}
          </p>
        </div>

        <div className="rounded-lg border border-white/10 bg-black/30 p-3 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Campaign link
          </p>
          <p className="break-all font-code text-[11px] text-sky-200/90">
            {minting ? 'Minting opaque link…' : campaignUrl}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button
            type="button"
            className="h-11 font-bold uppercase gap-2 bg-sky-500 hover:bg-sky-400 text-black"
            disabled={minting}
            onClick={() => void handleCopy()}
          >
            {minting ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copied ? 'Copied' : 'Copy link'}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 font-bold uppercase gap-2"
            disabled={minting}
            onClick={() => void handleNativeShare()}
          >
            <Share2 className="h-4 w-4" />
            Native share
          </Button>
        </div>

        <div className="rounded-lg border border-dashed border-white/15 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
          <p className="mb-1 flex items-center gap-1.5 font-bold uppercase tracking-wider text-foreground/80">
            <Download className="h-3.5 w-3.5 text-sky-400" />
            TikTok / Instagram
          </p>
          Screenshot or screen-record this {aspect} frame, then paste the campaign link in your caption or bio.
          Export target: {frame.width}×{frame.height}px.
        </div>
      </DialogContent>
    </Dialog>
  );
}
