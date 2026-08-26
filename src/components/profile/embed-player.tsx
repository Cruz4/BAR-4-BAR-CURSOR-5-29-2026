'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { ExternalLink, Music } from 'lucide-react';
import {
  parseEmbedUrl,
  EMBED_PROVIDER_LABELS,
  type EmbedProvider,
} from '@/lib/profile/embeds';
import { auth } from '@/lib/firebase/client/firebase';
import type { DropPrice } from '@/lib/drop-commerce';
import { DropListenPanel } from '@/components/drop-listen-panel';
import type { FeaturedTrackSelection } from '@/lib/profile/modules';
import { pressedSongHref, type PressedSongSummary } from '@/lib/pressed-song';
import { profileHref } from '@/lib/profile/profile-slug';
import { cn } from '@/lib/utils';

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
function FirstDropFeedPlayer({ shareId, referralPostId }: { shareId: string; referralPostId?: string }) {
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
      <DropListenPanel
        shareId={shareId}
        source="artist_home"
        title={song.title}
        artistName={song.artist.name}
        ownerId={song.ownerId}
        price={song.price}
        hasAudio
        referralPostId={referralPostId}
        detailsHref={pressedSongHref(shareId, { referralPostId })}
        artistAttribution={{
          ...(artistHref ? { href: artistHref } : {}),
          ...(song.artist.avatarUrl ? { avatarUrl: song.artist.avatarUrl } : {}),
          useStarMark: song.artist.starMarkUseStar === true,
          ...(typeof song.artist.starMarkSeed === 'number'
            ? { starMarkSeed: song.artist.starMarkSeed }
            : {}),
          studioChrome: song.artist.studioBadge || 'free',
        }}
      />
    </Suspense>
  );
}

export function FeaturedTrackPlayer({
  selection,
  profileUserId,
  previewMode = false,
}: {
  selection: FeaturedTrackSelection;
  profileUserId: string;
  previewMode?: boolean;
}) {
  const [details, setDetails] = useState<{ price?: DropPrice; hasAudio: boolean } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ shareId: selection.shareId });
    if (selection.trackId) params.set('trackId', selection.trackId);
    void (async () => {
      const headers: HeadersInit = {};
      const current = auth.currentUser;
      if (current) headers.Authorization = `Bearer ${await current.getIdToken()}`;
      const response = await fetch(`/api/drops/metadata?${params.toString()}`, { headers });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Release metadata unavailable.');
      if (!cancelled) {
        setDetails({
          price: data.price as DropPrice | undefined,
          hasAudio: Boolean(data.hasAudio),
        });
      }
    })().catch(() => {
      if (!cancelled) setDetails({ hasAudio: false });
    });
    return () => { cancelled = true; };
  }, [selection.shareId, selection.trackId]);

  if (!details) {
    return <div className="h-24 animate-pulse rounded-xl border border-fuchsia-500/25 bg-fuchsia-500/10" />;
  }

  return (
    <Suspense fallback={null}>
      <DropListenPanel
        shareId={selection.shareId}
        trackId={selection.trackId}
        source="artist_home"
        title={selection.title}
        artistName={selection.artistName}
        ownerId={selection.ownerId}
        price={details.price}
        hasAudio={details.hasAudio}
        featuredByUserId={previewMode ? undefined : profileUserId}
        excerptStartSec={selection.excerptStartSec}
        firstPressRank={selection.showFirstPressBadge ? selection.firstPressRank : undefined}
      />
    </Suspense>
  );
}

export function EmbedPlayer({
  url,
  title,
  referralPostId,
  viewportBounded = false,
}: {
  url: string;
  title?: string;
  referralPostId?: string;
  /** Keep media inside one immersive slide without distorting its aspect ratio. */
  viewportBounded?: boolean;
}) {
  const dropShareId = firstDropShareId(url);
  if (dropShareId) return <FirstDropFeedPlayer shareId={dropShareId} referralPostId={referralPostId} />;

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
          className={portrait
            ? cn(
                'relative mx-auto max-w-full',
                viewportBounded ? 'h-[min(44dvh,32rem)]' : 'h-[min(65dvh,40rem)]'
              )
            : 'relative w-full min-w-0'}
          style={portrait
            ? { aspectRatio: `${100 / aspectPad} / 1` }
            : { paddingBottom: `${aspectPad}%` }}
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
          style={{ height: parsed.height ?? 166, maxHeight: viewportBounded ? '42dvh' : '60dvh' }}
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
