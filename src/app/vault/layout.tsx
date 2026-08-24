import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'The Vault',
  description:
    'Your Bar 4 Bar studio vault—albums, loose tracks, Collab Sheets, DNA strains, and versioned non-destructive backup and restore.',
  path: '/vault',
  index: false,
});

export default function VaultLayout({ children }: { children: React.ReactNode }) {
  return children;
}
