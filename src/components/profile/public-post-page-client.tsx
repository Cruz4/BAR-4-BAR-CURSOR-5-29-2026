'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Compass, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PostCard } from '@/components/profile/post-card';
import { InboxPageAtmosphere } from '@/components/inbox/inbox-page-atmosphere';
import { PublicPostBackButton, usePublicPostBackNavigation } from '@/components/profile/public-post-back-button';
import type { ProfilePost } from '@/lib/profile/social-client';

export function PublicPostPageClient({
  post,
  ownerName,
  ownerSlug,
  fromPath,
}: {
  post: ProfilePost;
  ownerName: string;
  ownerSlug: string;
  fromPath?: string | null;
}) {
  const goBack = usePublicPostBackNavigation(fromPath);

  useEffect(() => {
    window.history.pushState({ publicPostBack: true }, '');
    const onPopState = () => {
      goBack();
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [goBack]);

  return (
    <div className="relative min-h-[calc(100dvh-3.5rem)] w-full overflow-hidden">
      <InboxPageAtmosphere variant="public-post" />
      <div className="relative z-10 mx-auto max-w-2xl space-y-5 px-4 py-8 pb-16">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-4">
          <PublicPostBackButton fromPath={fromPath} />
          <Button size="sm" variant="ghost" className="h-9 gap-1.5 font-bold uppercase text-sky-300" asChild>
            <Link href="/discover">
              <Compass className="h-3.5 w-3.5" /> Discover
            </Link>
          </Button>
        </header>
        <div>
          <p className="mb-3 flex items-center gap-1.5 font-code text-[10px] font-bold uppercase tracking-[0.24em] text-fuchsia-300">
            <Radio className="h-3.5 w-3.5" /> Public Scene post
          </p>
          <div
            className="scroll-mt-28 rounded-2xl border border-white/10 bg-black/25 p-1 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-sm"
          >
            <PostCard post={post} showAuthor showExactTimestamp />
          </div>
        </div>
        <p className="text-center font-code text-[10px] uppercase tracking-widest text-muted-foreground/70">
          <Link href={`/${ownerSlug}`} className="text-fuchsia-300/90 hover:underline">
            {ownerName}
          </Link>
          {' · '}
          AKAsheet Scene
        </p>
      </div>
    </div>
  );
}
