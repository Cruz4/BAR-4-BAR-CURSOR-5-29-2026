'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Images, LayoutGrid, Music2, Repeat2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  profileHref,
  profileImagesHref,
  profileReverbsHref,
  profileSongsHref,
} from '@/lib/profile/profile-slug';

export function ProfileSectionTabs({ slug, className }: { slug?: string; className?: string }) {
  const pathname = usePathname();
  if (!slug) return null;
  const tabs = [
    { label: 'Overview', href: profileHref(slug) || '/', suffix: '', icon: LayoutGrid },
    { label: 'Images', href: profileImagesHref(slug) || '/', suffix: '/images', icon: Images },
    { label: 'Pressed Songs', href: profileSongsHref(slug) || '/', suffix: '/songs', icon: Music2 },
    { label: 'Reverbs', href: profileReverbsHref(slug) || '/', suffix: '/reverbs', icon: Repeat2 },
  ];
  return (
    <nav
      aria-label="Profile sections"
      className={cn('flex max-w-full gap-1 overflow-x-auto border-b border-[var(--ph-border,rgba(255,255,255,.12))] pb-1', className)}
    >
      {tabs.map((tab) => {
        const active = tab.suffix ? pathname.endsWith(tab.suffix) : !/\/(images|songs|reverbs)$/.test(pathname);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.label}
            href={tab.href}
            replace
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex h-9 shrink-0 items-center gap-1.5 rounded-t-md px-3 text-[10px] font-bold uppercase tracking-[0.14em] transition-colors',
              active
                ? 'bg-[var(--ph-accent,#60a5fa)]/15 text-[var(--ph-accent,#60a5fa)]'
                : 'text-[var(--ph-muted,rgba(255,255,255,.55))] hover:bg-white/5 hover:text-white'
            )}
          >
            <Icon className="h-3.5 w-3.5" /> {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
