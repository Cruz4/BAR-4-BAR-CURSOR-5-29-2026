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
  firstInlineHref,
  normalizeInlineHref,
  previewHrefFromFields,
  toNavigableHref,
} from '@/lib/profile/inline-links';
import { fetchPostById, type ProfilePost } from '@/lib/profile/social-client';
import { cn } from '@/lib/utils';

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
  'flex items-center gap-3 rounded-[var(--ph-radius,16px)] border border-[var(--ph-border,rgba(255,255,255,0.12))] bg-black/30 px-3 py-2.5';

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
    host = href.startsWith('/') ? 'bar4bar.ink' : new URL(href).hostname.replace(/^www\./, '');
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
      <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[var(--ph-muted,rgba(255,255,255,0.6))]">
        {host} {nav.internal ? null : <ExternalLink className="h-3 w-3" />}
      </span>
    </PreviewShell>
  );
}

function Bar4BarPostPreview({
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

  useEffect(() => {
    let cancelled = false;
    void fetchPostById(postId)
      .then((row) => {
        if (!cancelled && row) setPost(row);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [postId]);

  const snippet = (post?.text || '').trim();
  return (
    <PreviewShell href={href} interactive={interactive} className={cn(!compact && 'items-start')}>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--ph-muted,rgba(255,255,255,0.55))]">
          Bar 4 Bar post
        </span>
        <span className="mt-1 block text-sm font-semibold text-[var(--ph-text,#fff)]">
          {post?.ownerName || 'Open this post'}
        </span>
        {snippet ? (
          <span
            className={cn(
              'mt-1 block text-sm leading-snug text-[var(--ph-text,#fff)]/80',
              compact ? 'line-clamp-2' : 'line-clamp-3'
            )}
          >
            {snippet}
          </span>
        ) : null}
      </span>
    </PreviewShell>
  );
}

function Bar4BarProfilePreview({
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
          bar4bar.ink/{slug}
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
      <Bar4BarPostPreview
        postId={target.postId}
        href={target.href}
        compact={compact}
        interactive={interactive}
      />
    );
  }
  if (target?.kind === 'profile') {
    return <Bar4BarProfilePreview slug={target.slug} href={target.href} interactive={interactive} />;
  }
  if (target?.kind === 'internal') {
    return (
      <GenericLinkCard
        href={target.href}
        eyebrow="Bar 4 Bar"
        label={target.href === '/' ? 'bar4bar.ink' : target.href}
        interactive={interactive}
      />
    );
  }
  return <GenericLinkCard href={normalized} label={normalized} interactive={interactive} />;
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
