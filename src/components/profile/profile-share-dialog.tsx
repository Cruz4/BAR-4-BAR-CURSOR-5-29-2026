'use client';

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
import { trackShareCardEvent } from '@/lib/gamification-client';
import {
  Check,
  Copy,
  Facebook,
  Linkedin,
  Mail,
  MessageCircle,
  Share2,
} from 'lucide-react';

export type ProfileSocialShareData = {
  displayName: string;
  rankLabel: string;
  profileUrl: string;
};

type ProfileShareDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: ProfileSocialShareData;
};

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.727-8.833L1.254 2.25H8.08l4.259 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  );
}

function RedditIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm6.5 9.25c.69 0 1.25.56 1.25 1.25 0 .5-.29.93-.71 1.13.05.26.08.53.08.8 0 2.9-3.37 5.25-7.53 5.25S3.06 17.33 3.06 14.43c0-.27.03-.54.08-.8A1.25 1.25 0 013.7 11.5c.69 0 1.25.56 1.25 1.25 0 .1-.01.2-.04.29.7-.47 1.55-.82 2.5-1.02L8.5 8.1l2.2.46c.4-.27.9-.42 1.42-.42s1.02.15 1.42.42l2.2-.46.99 3.92c.95.2 1.8.55 2.5 1.02-.03-.09-.04-.19-.04-.29 0-.69.56-1.25 1.25-1.25zM8.75 14.5c-.69 0-1.25.56-1.25 1.25S8.06 17 8.75 17s1.25-.56 1.25-1.25-.56-1.25-1.25-1.25zm6.5 0c-.69 0-1.25.56-1.25 1.25S14.56 17 15.25 17s1.25-.56 1.25-1.25-.56-1.25-1.25-1.25zM12 18.4c-1.3 0-2.43-.52-3.05-1.28-.2-.24.02-.55.32-.48 1.72.4 3.54.4 5.26 0 .3-.07.52.24.32.48-.62.76-1.75 1.28-3.05 1.28z" />
    </svg>
  );
}

export function buildProfileShareText(displayName: string, rankLabel: string, profileUrl: string) {
  return `${displayName} · ${rankLabel} on Bar 4 Bar\n${profileUrl}\n#Bar4Bar`;
}

export function ProfileShareDialog({ open, onOpenChange, profile }: ProfileShareDialogProps) {
  const { toast } = useToast();
  const [copied, setCopied] = React.useState(false);

  const shareText = useMemo(
    () => buildProfileShareText(profile.displayName, profile.rankLabel, profile.profileUrl),
    [profile.displayName, profile.rankLabel, profile.profileUrl]
  );

  const encodedUrl = encodeURIComponent(profile.profileUrl);
  const encodedText = encodeURIComponent(shareText);
  const encodedTitle = encodeURIComponent(`${profile.displayName} · Bar 4 Bar`);

  const markShared = (network: string) => {
    void trackShareCardEvent('share_card_generated', { kind: 'profile_social', network });
  };

  const openShare = (url: string, network: string) => {
    markShared(network);
    window.open(url, '_blank', 'noopener,noreferrer,width=640,height=720');
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(profile.profileUrl);
      setCopied(true);
      markShared('copy_link');
      toast({ title: 'Profile link copied' });
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast({ variant: 'destructive', title: 'Could not copy link' });
    }
  };

  const channels = [
    {
      id: 'x',
      label: 'X / Twitter',
      icon: XIcon,
      onClick: () =>
        openShare(`https://twitter.com/intent/tweet?text=${encodedText}`, 'x'),
    },
    {
      id: 'facebook',
      label: 'Facebook',
      icon: Facebook,
      onClick: () =>
        openShare(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`, 'facebook'),
    },
    {
      id: 'linkedin',
      label: 'LinkedIn',
      icon: Linkedin,
      onClick: () =>
        openShare(
          `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
          'linkedin'
        ),
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      icon: MessageCircle,
      onClick: () => openShare(`https://wa.me/?text=${encodedText}`, 'whatsapp'),
    },
    {
      id: 'reddit',
      label: 'Reddit',
      icon: RedditIcon,
      onClick: () =>
        openShare(
          `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`,
          'reddit'
        ),
    },
    {
      id: 'email',
      label: 'Email',
      icon: Mail,
      onClick: () => {
        markShared('email');
        window.location.href = `mailto:?subject=${encodedTitle}&body=${encodedText}`;
      },
    },
  ] as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-primary/20">
        <DialogHeader>
          <DialogTitle className="font-headline text-xl uppercase flex items-center gap-2">
            <Share2 className="h-5 w-5 text-sky-400" /> Share profile
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            Share your public studio dossier link — rank, streak, and badges. Lyrics stay private.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-white/10 bg-black/30 p-3">
          <p className="text-[11px] font-code text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {shareText}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {channels.map((channel) => (
            <Button
              key={channel.id}
              type="button"
              variant="outline"
              className="h-11 justify-start gap-2 font-bold uppercase text-[10px] tracking-wider"
              onClick={channel.onClick}
            >
              <channel.icon className="h-4 w-4 shrink-0" />
              {channel.label}
            </Button>
          ))}
        </div>

        <Button
          type="button"
          className="h-11 w-full font-bold uppercase gap-2 bg-sky-500 hover:bg-sky-400 text-black"
          onClick={() => void handleCopyLink()}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Copied' : 'Copy Profile Link'}
        </Button>

        <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
          TikTok / Instagram: copy your profile link, then paste in your post or bio.
        </p>
      </DialogContent>
    </Dialog>
  );
}
