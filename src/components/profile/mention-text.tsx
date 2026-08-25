import Link from 'next/link';
import { profileHref } from '@/lib/profile/profile-slug';

const MENTION_RE = /@([a-z0-9_][a-z0-9_-]{1,47})/gi;

export function MentionText({ text }: { text: string }) {
  const parts = text.split(MENTION_RE);
  return <>{parts.map((part, index) => index % 2 === 1
    ? <Link key={`${part}-${index}`} href={profileHref(part) || `/${part}`} className="font-semibold text-sky-300 hover:underline">@{part}</Link>
    : part)}</>;
}
