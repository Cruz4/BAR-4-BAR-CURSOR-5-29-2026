'use client';

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { AtSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { auth } from '@/lib/firebase/client/firebase';

type MentionHit = { userId: string; displayName: string; slug: string; studioBadge?: 'pro' | 'free' };

const MENTION_RE = /(?:^|\s)@([a-z0-9_-]{1,48})$/i;

function applyMention(value: string, match: RegExpMatchArray, slug: string): string {
  const start = match.index! + match[0].lastIndexOf('@');
  const end = match.index! + match[0].length;
  return `${value.slice(0, start)}@${slug} ${value.slice(end)}`;
}

/** Wrap a composer input/textarea so @mention suggestions anchor and portal correctly. */
export function MentionField({
  value,
  onChange,
  excludeUserId,
  className,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  excludeUserId?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const anchorRef = useRef<HTMLDivElement>(null);
  return (
    <div ref={anchorRef} data-composer-field className={cn('relative min-w-0', className)}>
      {children}
      <MentionSuggestions
        value={value}
        onChange={onChange}
        excludeUserId={excludeUserId}
        anchorRef={anchorRef}
      />
    </div>
  );
}

export function MentionSuggestions({
  value,
  onChange,
  excludeUserId,
  anchorRef,
}: {
  value: string;
  onChange: (value: string) => void;
  excludeUserId?: string;
  anchorRef?: RefObject<HTMLElement | null>;
}) {
  const match = useMemo(() => value.match(MENTION_RE), [value]);
  const query = match?.[1]?.toLowerCase() || '';
  const [hits, setHits] = useState<MentionHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [menuRect, setMenuRect] = useState<{ left: number; top: number; width: number } | null>(
    null
  );

  useEffect(() => {
    if (!query) {
      setHits([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({ q: query });
      if (excludeUserId) params.set('excludeUserId', excludeUserId);
      if (excludeUserId) params.set('viewerId', excludeUserId);
      void (async () => {
        try {
          const token = await auth.currentUser?.getIdToken().catch(() => undefined);
          const response = await fetch(`/api/profile/search?${params.toString()}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          });
          const data = response.ok
            ? ((await response.json()) as { artists?: MentionHit[] })
            : { artists: [] };
          if (!cancelled) {
            setHits(Array.isArray(data.artists) ? data.artists.slice(0, 8) : []);
          }
        } catch {
          if (!cancelled) setHits([]);
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    }, 140);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [excludeUserId, query]);

  const open = Boolean(query && match && (loading || hits.length > 0));

  const updateMenuRect = () => {
    const el = anchorRef?.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setMenuRect({
      left: rect.left,
      top: rect.bottom + 4,
      width: Math.max(rect.width, 240),
    });
  };

  useLayoutEffect(() => {
    if (!open) {
      setMenuRect(null);
      return;
    }
    updateMenuRect();
    const onLayout = () => updateMenuRect();
    window.addEventListener('resize', onLayout);
    window.addEventListener('scroll', onLayout, true);
    return () => {
      window.removeEventListener('resize', onLayout);
      window.removeEventListener('scroll', onLayout, true);
    };
  }, [open, anchorRef, hits.length, loading]);

  if (!open || !match) return null;

  const menu = (
    <div
      role="listbox"
      className={cn(
        'overflow-hidden rounded-lg border border-sky-400/30 bg-[hsl(216_38%_7%)] shadow-2xl',
        anchorRef ? 'fixed z-[200]' : 'absolute inset-x-0 top-full z-50 mt-1'
      )}
      style={
        anchorRef && menuRect
          ? { left: menuRect.left, top: menuRect.top, width: menuRect.width }
          : undefined
      }
    >
      {loading && !hits.length ? (
        <p className="px-3 py-2 text-xs text-muted-foreground">Searching artists…</p>
      ) : null}
      {hits.map((hit) => (
        <button
          key={hit.userId}
          type="button"
          role="option"
          className="flex w-full items-center gap-2 border-b border-white/8 px-3 py-2 text-left last:border-0 hover:bg-white/[0.06]"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            onChange(applyMention(value, match, hit.slug));
            setHits([]);
          }}
        >
          <AtSign className="h-3.5 w-3.5 shrink-0 text-sky-300" />
          <span className="min-w-0 flex-1 truncate text-xs font-bold">{hit.displayName}</span>
          <span className="truncate font-code text-[9px] text-muted-foreground">@{hit.slug}</span>
        </button>
      ))}
    </div>
  );

  if (anchorRef && typeof document !== 'undefined') {
    return createPortal(menu, document.body);
  }

  return menu;
}
