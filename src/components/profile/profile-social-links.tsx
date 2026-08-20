'use client';

import React from 'react';
import { Github, Instagram, Youtube } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProfileVoiceMemoBadge } from '@/components/profile/profile-voice-memo-badge';
import {
  resolvedSocialLinks,
  SOCIAL_PROVIDERS,
  type ArtistHomeSocials,
  type SocialProviderId,
} from '@/lib/profile/social-links';
import type { VoiceNote } from '@/lib/profile/voice-notes';

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.727-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .56.04.82.12v-3.4a6.22 6.22 0 0 0-.82-.05A6.34 6.34 0 0 0 3.16 15.3 6.34 6.34 0 0 0 9.5 21.64a6.34 6.34 0 0 0 6.34-6.34V8.73a8.19 8.19 0 0 0 4.76 1.52V6.84a4.84 4.84 0 0 1-1.01-.15z" />
    </svg>
  );
}

function SpotifyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.402.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  );
}

function LetterBadge({ letters, className }: { letters: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center font-black leading-none tracking-tight',
        letters.length > 2 ? 'text-[6px]' : 'text-[8px]',
        className
      )}
    >
      {letters}
    </span>
  );
}

function SocialGlyph({ id, className }: { id: SocialProviderId; className?: string }) {
  switch (id) {
    case 'instagram':
      return <Instagram className={className} />;
    case 'tiktok':
      return <TikTokIcon className={className} />;
    case 'youtube':
      return <Youtube className={className} />;
    case 'github':
      return <Github className={className} />;
    case 'twitter':
      return <XIcon className={className} />;
    case 'myspace':
      return <LetterBadge letters="MY" className={className} />;
    case 'snapchat':
      return <LetterBadge letters="SNAP" className={className} />;
    case 'suno':
      return <LetterBadge letters="SUNO" className={className} />;
    case 'spotify':
      return <SpotifyIcon className={className} />;
    case 'soundcloud':
      return <LetterBadge letters="SC" className={className} />;
    case 'appleMusic':
      return <LetterBadge letters="AM" className={className} />;
    default:
      return null;
  }
}

const SANDBOX_SOCIAL_EXAMPLES: SocialProviderId[] = ['instagram', 'tiktok', 'youtube', 'spotify'];

/** Guest sandbox — example social chips under the initials star (not live links). */
export function ProfileSocialExampleBadges({ className }: { className?: string }) {
  return (
    <div
      className={cn('flex flex-wrap items-center justify-center gap-1.5', className)}
      aria-label="Example social badges"
    >
      {SANDBOX_SOCIAL_EXAMPLES.map((id) => {
        const provider = SOCIAL_PROVIDERS.find((p) => p.id === id);
        return (
          <span
            key={id}
            title={provider?.label || id}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--ph-border)] bg-[var(--ph-plate)] text-[var(--ph-muted)]"
          >
            <SocialGlyph id={id} className="h-3.5 w-3.5" />
          </span>
        );
      })}
    </div>
  );
}

export function ProfileSocialLinks({
  socials,
  voiceMemo,
  className,
}: {
  socials?: ArtistHomeSocials | null;
  voiceMemo?: VoiceNote | null;
  className?: string;
}) {
  const links = resolvedSocialLinks(socials);
  if (!links.length && !voiceMemo) return null;

  return (
    <div className={cn('flex flex-wrap items-center justify-center gap-1.5', className)}>
      {voiceMemo ? <ProfileVoiceMemoBadge memo={voiceMemo} /> : null}
      {links.map((link) => (
        <a
          key={link.id}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          title={link.label}
          aria-label={link.label}
          className="relative z-[2] inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--ph-border)] bg-[var(--ph-plate)] text-[var(--ph-muted)] transition-colors hover:border-[var(--ph-accent)] hover:text-[var(--ph-accent)] pointer-events-auto"
        >
          <SocialGlyph id={link.id} className="h-3.5 w-3.5" />
        </a>
      ))}
    </div>
  );
}
