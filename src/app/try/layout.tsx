import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Try the Bar-by-Bar AI Songwriting Workstation',
  description:
    'Try a guided lyric sheet in your browser. Structure rough lyrics, use rhyme-aware bar tools, and experience Bar 4 Bar without generating an entire song for you.',
  path: '/try',
});

export default function TryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
