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

function SoundCloudIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M1.5 13.2h1v4.1h-1zm2-2.1h1v6.2h-1zm2-1.7h1v7.9h-1zm2-1.2h1v9.1h-1zm2.1.4a6.1 6.1 0 0 1 10.9 3.8h.7a2.9 2.9 0 1 1 0 5.8H9.6z" />
    </svg>
  );
}

function AppleMusicIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="4.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M15.8 7.4v7.2a2.35 2.35 0 1 1-1.5-2.18V9.2l-5.1 1v5.35a2.35 2.35 0 1 1-1.5-2.18V8.95l8.1-1.55Z" fill="currentColor" />
    </svg>
  );
}

function SnapchatIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path d="M12 3.25c-2.8 0-4.55 2.15-4.55 4.8 0 .78.13 1.48.13 2.08-.43.76-1.54 1.08-2.23 1.38-.6.25-.57 1.05.05 1.26.62.2 1.24.31 1.69.66.42.34.25 1.25.88 1.38.58.12 1.05-.22 1.4.02.66.46 1.16 1.92 2.63 1.92s1.97-1.46 2.63-1.92c.35-.24.82.1 1.4-.02.63-.13.46-1.04.88-1.38.45-.35 1.07-.46 1.69-.66.62-.21.65-1.01.05-1.26-.69-.3-1.8-.62-2.23-1.38 0-.6.13-1.3.13-2.08 0-2.65-1.75-4.8-4.55-4.8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function MyspaceIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <circle cx="5.2" cy="8" r="2.1" /><circle cx="11.4" cy="7" r="2.7" /><circle cx="18.5" cy="5.8" r="3.3" />
      <path d="M1.8 14.6c0-2 1.5-3.5 3.4-3.5s3.4 1.5 3.4 3.5v3H1.8zm5.8.2c0-2.3 1.7-4.1 3.8-4.1s3.8 1.8 3.8 4.1v3.9H7.6zm6.5-.5c0-2.7 2-4.9 4.4-4.9s4.4 2.2 4.4 4.9v5.2h-8.8z" />
    </svg>
  );
}

function SunoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path d="M4 8.2c2.2 0 2.2 7.6 4.4 7.6s2.2-9.6 4.4-9.6 2.2 11.6 4.4 11.6S19.4 9 21 9" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
      <path d="M3 12h18" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity=".55" />
    </svg>
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
      return <MyspaceIcon className={className} />;
    case 'snapchat':
      return <SnapchatIcon className={className} />;
    case 'suno':
      return <SunoIcon className={className} />;
    case 'spotify':
      return <SpotifyIcon className={className} />;
    case 'soundcloud':
      return <SoundCloudIcon className={className} />;
    case 'appleMusic':
      return <AppleMusicIcon className={className} />;
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
