'use client';

/**
 * Share this post — intent-based outbound (X, Facebook, WhatsApp, copy, native share).
 * Links back to the artist's Artist Home (posts live on the wall).
 */

import React, { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Check, Copy, Facebook, Mail, MessageCircle, Share2 } from 'lucide-react';
import type { ProfilePost } from '@/lib/profile/social-client';

type PostShareDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: ProfilePost;
};

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.727-8.833L1.254 2.25H8.08l4.259 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  );
}

function buildPostShareUrl(post: ProfilePost): string {
  if (typeof window === 'undefined') return '';
  const origin = window.location.origin;
  if (post.ownerSlug) {
    return `${origin}/profile/${post.ownerSlug}#post-${post.id}`;
  }
  return origin;
}

function buildPostShareText(post: ProfilePost, shareUrl: string): string {
  const snippet = (post.text || '').trim().replace(/\s+/g, ' ').slice(0, 160);
  const who = post.ownerName?.trim() || 'an artist';
  const line = snippet
    ? `"${snippet}${snippet.length >= 160 ? '…' : ''}" — ${who} on Bar 4 Bar`
    : `${who} dropped something on Bar 4 Bar`;
  return `${line}\n${shareUrl}\n#Bar4Bar`;
}

export function PostShareDialog({ open, onOpenChange, post }: PostShareDialogProps) {
  const { toast } = useToast();
  const [copied, setCopied] = React.useState(false);
  const [canNativeShare, setCanNativeShare] = React.useState(false);

  React.useEffect(() => {
    setCanNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
  }, []);

  const shareUrl = useMemo(() => buildPostShareUrl(post), [post]);
  const shareText = useMemo(() => buildPostShareText(post, shareUrl), [post, shareUrl]);

  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(shareText);
  const encodedTitle = encodeURIComponent(`${post.ownerName || 'Artist'} on Bar 4 Bar`);

  const openShare = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer,width=640,height=720');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl || shareText);
      setCopied(true);
      toast({ title: 'Link copied', description: 'Paste it on TikTok, IG, or anywhere.' });
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast({ variant: 'destructive', title: 'Could not copy' });
    }
  };

  const handleNativeShare = async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({
        title: `${post.ownerName || 'Artist'} on Bar 4 Bar`,
        text: shareText,
        url: shareUrl || undefined,
      });
    } catch {
      /* user cancelled */
    }
  };

  const channels = [
    {
      id: 'x',
      label: 'X / Twitter',
      icon: XIcon,
      onClick: () => openShare(`https://twitter.com/intent/tweet?text=${encodedText}`),
    },
    {
      id: 'facebook',
      label: 'Facebook',
      icon: Facebook,
      onClick: () =>
        openShare(
          `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`
        ),
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      icon: MessageCircle,
      onClick: () => openShare(`https://wa.me/?text=${encodedText}`),
    },
    {
      id: 'email',
      label: 'Email',
      icon: Mail,
      onClick: () => {
        window.location.href = `mailto:?subject=${encodedTitle}&body=${encodedText}`;
      },
    },
  ] as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-primary/20 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-headline text-xl uppercase">
            <Share2 className="h-5 w-5 text-sky-400" /> Share this post
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            Push it out with a link back to {post.ownerName || 'their'} Artist Home. Lyrics in the vault
            stay private.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-white/10 bg-black/30 p-3">
          <p className="whitespace-pre-wrap font-code text-[11px] leading-relaxed text-muted-foreground">
            {shareText}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {channels.map((channel) => (
            <Button
              key={channel.id}
              type="button"
              variant="outline"
              className="h-11 justify-start gap-2 text-[10px] font-bold uppercase tracking-wider"
              onClick={channel.onClick}
            >
              <channel.icon className="h-4 w-4 shrink-0" />
              {channel.label}
            </Button>
          ))}
        </div>

        {canNativeShare && (
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full gap-2 font-bold uppercase"
            onClick={() => void handleNativeShare()}
          >
            <Share2 className="h-4 w-4" />
            More apps…
          </Button>
        )}

        <Button
          type="button"
          className="h-11 w-full gap-2 bg-sky-500 font-bold uppercase text-black hover:bg-sky-400"
          onClick={() => void handleCopy()}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Copied' : 'Copy link'}
        </Button>

        <p className="text-center text-[10px] leading-relaxed text-muted-foreground">
          TikTok / Instagram: copy the link, then paste into your post or bio.
        </p>
      </DialogContent>
    </Dialog>
  );
}
