'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Music } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import {
  parseEmbedUrl,
  EMBED_PROVIDER_LABELS,
  type EmbedProvider,
} from '@/lib/profile/embeds';
import { db } from '@/lib/firebase/client/firebase';
import type { ProjectShare } from '@/lib/types';
import type { DnaDropAlbumPayload, DnaDropTrackPayload } from '@/lib/dna-drop';
import { normalizeDropAudio, normalizeDropPrice } from '@/lib/drop-commerce';
import { DropListenPanel } from '@/components/drop-listen-panel';
import type { FeaturedTrackSelection } from '@/lib/profile/modules';
import type { PressedSongSummary } from '@/lib/pressed-song';
import { profileHref } from '@/lib/profile/profile-slug';
import { ArtistStarAvatar } from '@/components/profile/artist-star-avatar';

/**
 * Plays a whitelisted provider link right on the page (iframe embed).
 * Unsupported URLs render as a safe outbound link card — never a broken box.
 *
 * Sandbox note: YouTube's "Watch on YouTube" opens a popup. Without
 * allow-popups-to-escape-sandbox that popup stays sandboxed and youtube.com
 * refuses to connect (ERR_BLOCKED_BY_RESPONSE).
 */
const EMBED_SANDBOX =
  'allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox';

const OPEN_LABELS: Record<EmbedProvider, string> = {
  youtube: 'Watch on YouTube',
  spotify: 'Open in Spotify',
  soundcloud: 'Open in SoundCloud',
  suno: 'Open in Suno',
  tiktok: 'Watch on TikTok',
  instagram: 'Open on Instagram',
  facebook: 'Open on Facebook',
};

function firstDropShareId(raw: string): string | null {
  try {
    const base = typeof window !== 'undefined' ? window.location.origin : 'https://bar4bar.app';
    const parsed = new URL(raw, base);
    const match = parsed.pathname.match(/^\/(?:share|song)\/([^/?#]+)\/?$/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

/** Native First Drop media inside a wall/feed post. Entitlements stay server-authoritative. */
function FirstDropFeedPlayer({ shareId }: { shareId: string }) {
  const [song, setSong] = useState<PressedSongSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/songs/${encodeURIComponent(shareId)}`)
      .then((response) => response.ok ? response.json() : null)
      .then((data) => { if (!cancelled && data) setSong(data as PressedSongSummary); });
    return () => { cancelled = true; };
  }, [shareId]);

  if (!song) {
    return <div className="h-24 animate-pulse rounded-xl border border-fuchsia-500/25 bg-fuchsia-500/10" />;
  }

  const artistHref = profileHref(song.artist.slug);
  return (
    <Suspense fallback={null}>
      <div className="mb-2 flex items-center gap-2 px-1">
        <ArtistStarAvatar name={song.artist.name} avatarUrl={song.artist.avatarUrl} studioChrome={song.artist.studioBadge || 'free'} size={28} />
        <div className="min-w-0"><p className="text-[8px] font-bold uppercase tracking-widest text-fuchsia-300">Original artist</p>{artistHref ? <Link href={artistHref} className="block truncate text-xs font-bold hover:text-fuchsia-300">{song.artist.name}</Link> : <p className="truncate text-xs font-bold">{song.artist.name}</p>}</div>
      </div>
      <DropListenPanel
        shareId={shareId}
        source="artist_home"
        title={song.title}
        ownerId={song.ownerId}
        price={song.price}
        hasAudio
      />
    </Suspense>
  );
}

export function FeaturedTrackPlayer({
  selection,
  profileUserId,
}: {
  selection: FeaturedTrackSelection;
  profileUserId: string;
}) {
  const [share, setShare] = useState<ProjectShare | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getDoc(doc(db, 'shares', selection.shareId)).then((snapshot) => {
      if (!cancelled && snapshot.exists()) setShare(snapshot.data() as ProjectShare);
    });
    return () => { cancelled = true; };
  }, [selection.shareId]);

  const details = useMemo(() => {
    if (!share) return null;
    const payload = share.data as DnaDropAlbumPayload | DnaDropTrackPayload;
    if (share.type === 'album') {
      const track = (payload as DnaDropAlbumPayload).tracks?.find((row) => row.id === selection.trackId);
      return {
        price: normalizeDropPrice(track?.dropPrice ?? payload.dropPrice),
        hasAudio: Boolean(normalizeDropAudio(track?.dropAudio)),
      };
    }
    return {
      price: normalizeDropPrice(payload.dropPrice),
      hasAudio: Boolean(normalizeDropAudio((payload as DnaDropTrackPayload).dropAudio)),
    };
  }, [selection.trackId, share]);

  if (!share || !details) {
    return <div className="h-24 animate-pulse rounded-xl border border-fuchsia-500/25 bg-fuchsia-500/10" />;
  }

  return (
    <Suspense fallback={null}>
      <DropListenPanel
        shareId={selection.shareId}
        trackId={selection.trackId}
        source="artist_home"
        title={selection.title}
        ownerId={selection.ownerId}
        price={details.price}
        hasAudio={details.hasAudio}
        featuredByUserId={profileUserId}
        excerptStartSec={selection.excerptStartSec}
      />
      {selection.showFirstPressBadge ? (
        <p className="mt-2 inline-flex rounded-full border border-amber-400/35 bg-amber-500/10 px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-amber-200">
          First Press #{selection.firstPressRank || '1–10'}
        </p>
      ) : null}
    </Suspense>
  );
}

export function EmbedPlayer({ url, title }: { url: string; title?: string }) {
  const dropShareId = firstDropShareId(url);
  if (dropShareId) return <FirstDropFeedPlayer shareId={dropShareId} />;

  const parsed = parseEmbedUrl(url);

  if (!parsed) {
    let host = '';
    try {
      host = new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return null;
    }
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="flex items-center gap-3 rounded-[var(--ph-radius,16px)] border border-[var(--ph-border,rgba(255,255,255,0.12))] bg-black/30 px-4 py-3 transition-colors hover:border-[var(--ph-accent,#7dd3fc)]"
      >
        <Music className="h-4 w-4 shrink-0 text-[var(--ph-accent,#7dd3fc)]" />
        <span className="min-w-0 flex-1 truncate text-sm text-[var(--ph-text,#fff)]">
          {title || url}
        </span>
        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[var(--ph-muted,rgba(255,255,255,0.6))]">
          {host} <ExternalLink className="h-3 w-3" />
        </span>
      </a>
    );
  }

  const openLabel = OPEN_LABELS[parsed.provider];
  const aspectPad = parsed.aspectPaddingPercent ?? 56.25;
  const portrait = aspectPad > 70;

  return (
    <div className="min-w-0 max-w-full overflow-hidden rounded-[var(--ph-radius,16px)] border border-[var(--ph-border,rgba(255,255,255,0.12))] bg-black/40">
      {parsed.isVideo ? (
        <div
          className={portrait ? 'relative mx-auto w-full max-w-[420px]' : 'relative w-full min-w-0'}
          style={{ paddingBottom: `${aspectPad}%` }}
        >
          <iframe
            src={parsed.src}
            title={title || `${EMBED_PROVIDER_LABELS[parsed.provider]} player`}
            className="absolute inset-0 h-full w-full max-w-full border-0"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            allowFullScreen
            sandbox={EMBED_SANDBOX}
          />
        </div>
      ) : (
        <iframe
          src={parsed.src}
          title={title || `${EMBED_PROVIDER_LABELS[parsed.provider]} player`}
          className="w-full max-w-full border-0"
          style={{ height: parsed.height ?? 166, maxHeight: '80vh' }}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen"
          sandbox={EMBED_SANDBOX}
        />
      )}
      <a
        href={parsed.watchUrl}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="flex items-center justify-center gap-1.5 border-t border-[var(--ph-border,rgba(255,255,255,0.1))] px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--ph-muted,rgba(255,255,255,0.65))] transition-colors hover:text-[var(--ph-accent,#7dd3fc)]"
      >
        {openLabel} <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}
