'use client';

import React, { useState } from 'react';
import { Check, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getPublicAppUrl } from '@/lib/app-url';
import { profileHref } from '@/lib/profile/profile-slug';
import { cn } from '@/lib/utils';

export function publicProfileShareUrl(slug: string): string | undefined {
  const path = profileHref(slug);
  if (!path) return undefined;
  return `${getPublicAppUrl()}${path}`;
}

export function CopyProfileLinkButton({
  slug,
  displayName,
  className,
}: {
  slug: string;
  displayName?: string;
  className?: string;
}) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const url = publicProfileShareUrl(slug);

  if (!url) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({
        title: 'Link copied',
        description: displayName
          ? `Paste it in a post to share ${displayName}'s Artist Home.`
          : 'Paste it in a post to share this Artist Home.',
      });
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast({ variant: 'destructive', title: 'Could not copy link' });
    }
  };

  return (
    <Button
      type="button"
      size="sm"
      className={cn(
        'h-9 gap-1.5 bg-[var(--ph-accent,#7dd3fc)] font-bold uppercase text-black hover:opacity-90',
        className
      )}
      onClick={() => void copy()}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
      {copied ? 'Copied' : 'Share'}
    </Button>
  );
}
