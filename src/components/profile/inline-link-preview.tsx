'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';
import { ExternalLink, Music2, Radio } from 'lucide-react';
import { db } from '@/lib/firebase/client/firebase';
import { EmbedPlayer } from '@/components/profile/embed-player';
import { parseEmbedUrl } from '@/lib/profile/embeds';
import {
  classifyAppHref,
  displayLabelForHref,
  firstInlineHref,
  normalizeInlineHref,
  previewHrefFromFields,
  toNavigableHref,
} from '@/lib/profile/inline-links';
import { activityOpenLinkHref, artistHomePostHref } from '@/lib/activity/href';
import { fetchPostById, type ProfilePost } from '@/lib/profile/social-client';
import { cn } from '@/lib/utils';
import { LiveArtistStarAvatar } from '@/components/profile/artist-star-avatar';
import { ExpandableImage } from '@/components/profile/expandable-image';
import { WallClipPlayer } from '@/components/profile/wall-clip-player';
import { VoiceNotePlayer } from '@/components/profile/voice-note-player';
import { LyricClipCard } from '@/components/profile/lyric-clip-card';
import { MentionText } from '@/components/profile/mention-text';
import { parseStudioBadge } from '@/lib/studio-tier-chrome';

function useDebounced<T>(value: T, ms = 200): T {
  const [next, setNext] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setNext(value), ms);
    return () => window.clearTimeout(id);
  }, [value, ms]);
  return next;
}

function slugLabel(slug: string): string {
  return slug
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

const CARD_CLASS =
  'flex min-w-0 max-w-full items-center gap-3 overflow-hidden rounded-[var(--ph-radius,16px)] border border-[var(--ph-border,rgba(255,255,255,0.12))] bg-black/30 px-3 py-2.5';

function PreviewShell({
  href,
  interactive,
  className,
  children,
}: {
  href: string;
  interactive: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const nav = toNavigableHref(href);
  const classes = cn(
    CARD_CLASS,
    interactive && 'transition-colors hover:border-[var(--ph-accent,#7dd3fc)]',
    className
  );
  if (!interactive) {
    return <div className={classes}>{children}</div>;
  }
  if (nav.internal) {
    return (
      <Link href={nav.href} prefetch={false} className={classes}>
        {children}
      </Link>
    );
  }
  return (
    <a href={nav.href} target="_blank" rel="noopener noreferrer nofollow" className={classes}>
      {children}
    </a>
  );
}

function GenericLinkCard({
  href,
  label,
  eyebrow,
  interactive,
}: {
  href: string;
  label: string;
  eyebrow?: string;
  interactive: boolean;
}) {
  const nav = toNavigableHref(href);
  let host = '';
  try {
    host = href.startsWith('/') ? 'akasheet.com' : new URL(href).hostname.replace(/^www\./, '');
  } catch {
    host = 'link';
  }
  return (
    <PreviewShell href={href} interactive={interactive}>
      <Music2 className="h-4 w-4 shrink-0 text-[var(--ph-accent,#7dd3fc)]" />
      <span className="min-w-0 flex-1">
        {eyebrow ? (
          <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--ph-muted,rgba(255,255,255,0.55))]">
            {eyebrow}
          </span>
        ) : null}
        <span className="block truncate text-sm text-[var(--ph-text,#fff)]">{label}</span>
      </span>
      <span className="flex max-w-[38%] shrink-0 items-center gap-1 truncate text-[10px] font-bold uppercase tracking-widest text-[var(--ph-muted,rgba(255,255,255,0.6))]">
        {host} {nav.internal ? null : <ExternalLink className="h-3 w-3 shrink-0" />}
      </span>
    </PreviewShell>
  );
}

function LinkedPostMedia({
  text,
  imageUrl,
  video,
  voice,
  lyricClip,
  compact,
}: {
  text?: string | null;
  imageUrl?: string | null;
  video?: ProfilePost['video'];
  voice?: ProfilePost['voice'];
  lyricClip?: ProfilePost['lyricClip'];
  compact?: boolean;
}) {
  const imgMax = compact ? 'max-h-[11rem]' : 'max-h-[min(36dvh,20rem)]';
  return (
    <>
      {lyricClip ? (
        <div className="mt-2">
          <LyricClipCard clip={lyricClip} />
        </div>
      ) : text ? (
        <p className={cn('mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[var(--ph-text,#fff)]/90', compact && 'line-clamp-6')}>
          <MentionText text={text} />
        </p>
      ) : null}
      {video && !lyricClip ? (
        <div className="mt-2 flex justify-center">
          <WallClipPlayer clip={video} poster={imageUrl || undefined} className={imgMax} />
        </div>
      ) : imageUrl && !lyricClip ? (
        <div className="mt-2 flex justify-center">
          <ExpandableImage
            src={imageUrl}
            alt=""
            thumbClassName={cn('block h-auto w-auto max-w-full rounded-lg object-contain', imgMax)}
          />
        </div>
      ) : null}
      {voice ? (
        <div className="mt-2">
          <VoiceNotePlayer
            src={voice.url}
            storagePath={voice.storagePath}
            contentType={voice.contentType}
            transcript={voice.transcript}
            durationSec={voice.durationSec}
            compact
          />
        </div>
      ) : null}
    </>
  );
}

function AKAsheetPostPreview({
  postId,
  href,
  compact,
  interactive,
}: {
  postId: string;
  href: string;
  compact?: boolean;
  interactive: boolean;
}) {
  const [post, setPost] = useState<ProfilePost | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setPost(null);
    setFailed(false);
    void fetchPostById(postId)
      .then((row) => {
        if (cancelled) return;
        if (row) setPost(row);
        else setFailed(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [postId]);

  if (!post) {
    return (
      <PreviewShell href={href} interactive={interactive} className="items-start">
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--ph-muted,rgba(255,255,255,0.55))]">
            Original
          </span>
          <span className="mt-1 block text-sm text-[var(--ph-muted,rgba(255,255,255,0.7))]">
            {failed ? 'This post is unavailable' : 'Loading post…'}
          </span>
        </span>
      </PreviewShell>
    );
  }

  const name = post.ownerName || 'Artist';
  const originalHref = artistHomePostHref(post.ownerSlug, post.id);
  const chrome = parseStudioBadge(post.ownerStudioBadge);

  return (
    <div className="rounded-xl border border-[var(--ph-border,rgba(255,255,255,0.14))] bg-black/30 p-3">
      <div className="mb-1.5 flex items-center gap-2">
        <LiveArtistStarAvatar
          name={name}
          userId={post.ownerId}
          slug={post.ownerSlug}
          avatarUrl={post.ownerAvatarUrl}
          useStarMark={post.ownerStarMarkUseStar}
          starMarkSeed={post.ownerStarMarkSeed}
          studioChrome={chrome}
          size={36}
          link={interactive}
        />
        <p className="min-w-0 text-[10px] font-bold uppercase tracking-widest text-[var(--ph-muted,rgba(255,255,255,0.55))]">
          {interactive && originalHref ? (
            <Link
              href={activityOpenLinkHref(originalHref)}
              prefetch={false}
              onClick={(event) => {
                event.preventDefault();
                window.location.assign(originalHref);
              }}
              className="transition-colors hover:text-[var(--ph-text,#fff)] hover:underline"
            >
              Original
            </Link>
          ) : (
            'Original'
          )}
          {' · '}
          <span className="text-[var(--ph-text,#fff)]/80">{name}</span>
        </p>
      </div>
      {post.isReverb ? (
        <>
          {post.text ? (
            <p className={cn('whitespace-pre-wrap text-sm leading-relaxed text-[var(--ph-text,#fff)]', compact && 'line-clamp-4')}>
              <MentionText text={post.text} />
            </p>
          ) : null}
          <div className="mt-2 rounded-lg border border-[var(--ph-border,rgba(255,255,255,0.1))] bg-black/25 p-2.5">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[var(--ph-muted,rgba(255,255,255,0.45))]">
              {post.reverbOwnerName || 'Artist'}
            </p>
            <LinkedPostMedia
              text={post.reverbText}
              imageUrl={post.reverbImageUrl}
              video={post.reverbVideo}
              voice={post.reverbVoice}
              lyricClip={post.reverbLyricClip}
              compact={compact}
            />
          </div>
        </>
      ) : (
        <LinkedPostMedia
          text={post.text}
          imageUrl={post.imageUrl}
          video={post.video}
          voice={post.voice}
          lyricClip={post.lyricClip}
          compact={compact}
        />
      )}
    </div>
  );
}

function AKAsheetProfilePreview({
  slug,
  href,
  interactive,
}: {
  slug: string;
  href: string;
  interactive: boolean;
}) {
  const [name, setName] = useState(slugLabel(slug));

  useEffect(() => {
    let cancelled = false;
    setName(slugLabel(slug));
    void getDoc(doc(db, 'publicProfiles', slug))
      .then((snap) => {
        if (cancelled || !snap.exists()) return;
        const displayName = snap.data()?.displayName;
        if (typeof displayName === 'string' && displayName.trim()) {
          setName(displayName.trim());
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
    <PreviewShell href={href} interactive={interactive}>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--ph-muted,rgba(255,255,255,0.55))]">
          Artist Home
        </span>
        <span className="block truncate text-sm font-semibold text-[var(--ph-text,#fff)]">{name}</span>
        <span className="block truncate text-xs text-[var(--ph-muted,rgba(255,255,255,0.6))]">
          akasheet.com/{slug}
        </span>
      </span>
      <Radio className="h-4 w-4 shrink-0 text-[var(--ph-accent,#7dd3fc)]" />
    </PreviewShell>
  );
}

export function InlineLinkPreview({
  href,
  compact = false,
  referralPostId,
  viewportBounded = false,
  interactive = true,
}: {
  href: string;
  compact?: boolean;
  referralPostId?: string;
  viewportBounded?: boolean;
  /** Published cards can open the link. Composer previews must not navigate or prefetch. */
  interactive?: boolean;
}) {
  const normalized = normalizeInlineHref(href);
  if (!normalized) return null;

  const target = classifyAppHref(normalized);
  if (target?.kind === 'song' || parseEmbedUrl(normalized)) {
    return (
      <EmbedPlayer
        url={normalized}
        referralPostId={referralPostId}
        viewportBounded={viewportBounded || compact}
      />
    );
  }
  if (target?.kind === 'post') {
    return (
      <AKAsheetPostPreview
        postId={target.postId}
        href={target.href}
        compact={compact}
        interactive={interactive}
      />
    );
  }
  if (target?.kind === 'profile') {
    return <AKAsheetProfilePreview slug={target.slug} href={target.href} interactive={interactive} />;
  }
  if (target?.kind === 'internal') {
    return (
      <GenericLinkCard
        href={target.href}
        eyebrow="AKAsheet"
        label={target.href === '/' ? 'akasheet.com' : displayLabelForHref(target.href)}
        interactive={interactive}
      />
    );
  }
  return <GenericLinkCard href={normalized} label={displayLabelForHref(normalized)} interactive={interactive} />;
}

export function ComposerLinkPreview({ text, className }: { text: string; className?: string }) {
  const href = useDebounced(firstInlineHref(text));
  if (!href) return null;
  return (
    <div className={cn('mt-1.5', className)}>
      <InlineLinkPreview href={href} compact interactive={false} />
    </div>
  );
}

export function FieldsLinkPreview({
  embedUrl,
  text,
  referralPostId,
  viewportBounded,
  compact,
  className,
}: {
  embedUrl?: string | null;
  text?: string | null;
  referralPostId?: string;
  viewportBounded?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const href = previewHrefFromFields(embedUrl, text);
  if (!href) return null;
  return (
    <div className={className}>
      <InlineLinkPreview
        href={href}
        compact={compact}
        referralPostId={referralPostId}
        viewportBounded={viewportBounded}
      />
    </div>
  );
}
