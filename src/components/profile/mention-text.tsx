import Link from 'next/link';
import { EmojiFontText } from '@/components/profile/emoji-font-text';
import { splitRichText } from '@/lib/profile/inline-links';
import { profileHref } from '@/lib/profile/profile-slug';

const LINK_CLASS = 'break-words font-semibold text-sky-300 underline underline-offset-2 hover:text-sky-200';

export function MentionText({ text }: { text: string }) {
  const parts = splitRichText(text);
  return (
    <>
      {parts.map((part, index) => {
        if (part.kind === 'mention') {
          return (
            <Link
              key={`m-${part.slug}-${index}`}
              href={profileHref(part.slug) || `/${part.slug}`}
              prefetch={false}
              className="font-semibold text-sky-300 underline underline-offset-2 hover:text-sky-200"
            >
              @{part.slug}
            </Link>
          );
        }
        if (part.kind === 'link') {
          if (part.internal) {
            return (
              <Link key={`l-${index}`} href={part.href} prefetch={false} className={LINK_CLASS}>
                {part.raw}
              </Link>
            );
          }
          return (
            <a
              key={`l-${index}`}
              href={part.href}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className={LINK_CLASS}
            >
              {part.raw}
            </a>
          );
        }
        return (
          <span key={`t-${index}`}>
            <EmojiFontText text={part.value} />
          </span>
        );
      })}
    </>
  );
}
