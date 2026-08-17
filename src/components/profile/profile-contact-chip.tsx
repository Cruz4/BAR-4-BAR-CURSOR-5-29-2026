'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Clock, Copy, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { buildLoginUrl } from '@/lib/login-links';
import { contactHref, type ArtistHomeContact, type ContactRequestStatus } from '@/lib/profile/contact';
import {
  fetchContactForArtist,
  requestArtistContact,
} from '@/lib/profile/contact-client';

const chipClass =
  'inline-flex h-9 w-full min-w-0 items-center justify-center gap-1.5 rounded-full border px-3 text-[10px] font-bold uppercase tracking-[0.18em] transition-all';

function ContactValueButton({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const { toast } = useToast();
  const href = contactHref(value);
  const label = value.length > 22 ? `${value.slice(0, 20)}…` : value;

  const copy = async (event?: React.MouseEvent) => {
    event?.preventDefault();
    event?.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: 'Copied' });
    } catch {
      toast({ variant: 'destructive', title: 'Could not copy' });
    }
  };

  const inner = (
    <>
      <Mail className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate normal-case tracking-normal font-semibold">{label}</span>
      <Copy className="h-3 w-3 shrink-0 opacity-70" />
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        title={value}
        className={cn(chipClass, className)}
        onContextMenu={(event) => void copy(event)}
      >
        {inner}
      </a>
    );
  }

  return (
    <button type="button" title={value} onClick={() => void copy()} className={cn(chipClass, className)}>
      {inner}
    </button>
  );
}

export function ProfileContactChip({
  artistId,
  artistSlug,
  contact,
  isOwner,
  previewMode,
  viewerName,
  viewerSlug,
}: {
  artistId?: string;
  artistSlug?: string;
  contact?: ArtistHomeContact | null;
  isOwner?: boolean;
  previewMode?: boolean;
  viewerName?: string;
  viewerSlug?: string;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<ContactRequestStatus | 'owner'>(isOwner ? 'owner' : 'none');
  const [value, setValue] = useState<string | undefined>(contact?.value);
  const [busy, setBusy] = useState(false);

  const mode = contact?.mode;
  const loginHref = buildLoginUrl({
    mode: 'signup',
    next: artistSlug ? `/profile/${artistSlug}` : undefined,
  });

  useEffect(() => {
    if (!artistId || !mode) return;
    if (previewMode) {
      setValue(contact?.value);
      setStatus(isOwner ? 'owner' : 'none');
      return;
    }
    if (mode === 'public' && contact?.value && !isOwner) {
      setValue(contact.value);
      setStatus('none');
      return;
    }
    let cancelled = false;
    void fetchContactForArtist(artistId)
      .then((next) => {
        if (cancelled) return;
        setStatus(next.status);
        setValue(next.value || contact?.value);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [artistId, mode, contact?.value, isOwner, previewMode]);

  if (!mode) return null;

  const look = 'border-[var(--ph-border)] bg-[var(--ph-plate)] text-[var(--ph-muted)] hover:border-[var(--ph-accent)] hover:text-[var(--ph-accent)]';

  if (isOwner || previewMode) {
    if (value) {
      return (
        <div className="min-w-0">
          <ContactValueButton
            value={value}
            className={cn(look, mode === 'request' && 'border-dashed')}
          />
        </div>
      );
    }
    return (
      <div className={cn(chipClass, look, 'pointer-events-none opacity-70')}>
        <Mail className="h-3.5 w-3.5 shrink-0" />
        {mode === 'request' ? 'By request' : 'Contact'}
      </div>
    );
  }

  if (mode === 'public' && value) {
    return <ContactValueButton value={value} className={look} />;
  }

  if (status === 'accepted' && value) {
    return <ContactValueButton value={value} className="border-emerald-400/45 bg-emerald-500/15 text-emerald-100 hover:border-emerald-300/70 hover:bg-emerald-500/25" />;
  }

  if (status === 'pending') {
    return (
      <div className={cn(chipClass, look, 'pointer-events-none')}>
        <Clock className="h-3.5 w-3.5 shrink-0" />
        Requested
      </div>
    );
  }

  if (!user) {
    return (
      <Link href={loginHref} className={cn(chipClass, look)}>
        <Mail className="h-3.5 w-3.5 shrink-0" />
        Request
      </Link>
    );
  }

  const send = async () => {
    if (!artistId) return;
    setBusy(true);
    try {
      const next = await requestArtistContact({
        artistId,
        requesterName: viewerName || user.displayName || 'Artist',
        requesterSlug: viewerSlug,
      });
      setStatus(next);
      if (next === 'accepted') {
        const revealed = await fetchContactForArtist(artistId);
        setValue(revealed.value);
      }
      toast({
        title: next === 'accepted' ? 'Contact shared' : 'Request sent',
        description: next === 'pending' ? 'They’ll see it in Activity → Requests.' : undefined,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not send request',
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void send()}
      className={cn(chipClass, look, busy && 'opacity-60')}
    >
      {busy ? <Clock className="h-3.5 w-3.5 shrink-0" /> : <Mail className="h-3.5 w-3.5 shrink-0" />}
      {busy ? 'Sending' : 'Request'}
    </button>
  );
}
