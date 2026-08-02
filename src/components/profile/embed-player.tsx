'use client';

import React from 'react';
import { ExternalLink, Music } from 'lucide-react';
import { parseEmbedUrl, EMBED_PROVIDER_LABELS } from '@/lib/profile/embeds';

/**
 * Plays a whitelisted provider link right on the page (iframe embed).
 * Unsupported URLs render as a safe outbound link card — never a broken box.
 */
export function EmbedPlayer({ url, title }: { url: string; title?: string }) {
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

  return (
    <div className="overflow-hidden rounded-[var(--ph-radius,16px)] border border-[var(--ph-border,rgba(255,255,255,0.12))] bg-black/40">
      {parsed.isVideo ? (
        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
          <iframe
            src={parsed.src}
            title={title || `${EMBED_PROVIDER_LABELS[parsed.provider]} player`}
            className="absolute inset-0 h-full w-full"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
          />
        </div>
      ) : (
        <iframe
          src={parsed.src}
          title={title || `${EMBED_PROVIDER_LABELS[parsed.provider]} player`}
          className="w-full"
          style={{ height: parsed.height ?? 166 }}
          loading="lazy"
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
          sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
        />
      )}
    </div>
  );
}
