import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'The Vault',
  description:
    'Your Bar 4 Bar studio vault — albums, loose tracks, Collab Sheets, DNA strains, and every project blueprint in one place.',
  path: '/vault',
});

export default function VaultLayout({ children }: { children: React.ReactNode }) {
  return children;
}
