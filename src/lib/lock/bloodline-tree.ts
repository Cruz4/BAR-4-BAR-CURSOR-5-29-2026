/**
 * LOCK Verse Tree helpers — index echoes, walk ancestry, list forks.
 * parentEchoId null/missing = reply off the seed.
 */

import type { LockEcho } from '@/lib/lock/types';

/** Synthetic id for the seed node in path UIs. */
export const LOCK_SEED_NODE_ID = '__seed__';

export type LockPathLine = {
  /** Echo id, or LOCK_SEED_NODE_ID for the seed. */
  id: string;
  text: string;
  isSeed: boolean;
  echo?: LockEcho;
};

export type EchoTreeIndex = {
  byId: Map<string, LockEcho>;
  /** Parent key: echo id, or null for children of the seed. */
  childrenByParent: Map<string | null, LockEcho[]>;
};

const DEFAULT_FORK_LIMIT = 8;

export function parentKey(echo: LockEcho): string | null {
  const p = echo.parentEchoId;
  if (typeof p === 'string' && p.trim()) return p.trim();
  return null;
}

export function indexEchoes(echoes: LockEcho[]): EchoTreeIndex {
  const byId = new Map<string, LockEcho>();
  const childrenByParent = new Map<string | null, LockEcho[]>();

  for (const echo of echoes) {
    byId.set(echo.id, echo);
  }

  for (const echo of echoes) {
    let key = parentKey(echo);
    // Orphan parent id → treat as seed child so the bar still appears.
    if (key && !byId.has(key)) key = null;
    const list = childrenByParent.get(key) || [];
    list.push(echo);
    childrenByParent.set(key, list);
  }

  for (const [, list] of childrenByParent) {
    list.sort((a, b) => {
      if (b.lockScore !== a.lockScore) return b.lockScore - a.lockScore;
      return b.createdAt.localeCompare(a.createdAt);
    });
  }

  return { byId, childrenByParent };
}

export function childrenOf(
  parentId: string | null,
  index: EchoTreeIndex,
  limit = DEFAULT_FORK_LIMIT
): { children: LockEcho[]; hasMore: boolean } {
  const all = index.childrenByParent.get(parentId) || [];
  return {
    children: all.slice(0, Math.max(0, limit)),
    hasMore: all.length > limit,
  };
}

/**
 * Ordered path: seed → … → tip echo.
 * If echoId is missing, returns seed-only.
 */
export function ancestryPath(
  echoId: string | null | undefined,
  index: EchoTreeIndex,
  seedBar: string
): LockPathLine[] {
  const seed: LockPathLine = {
    id: LOCK_SEED_NODE_ID,
    text: seedBar,
    isSeed: true,
  };
  if (!echoId) return [seed];

  const chain: LockEcho[] = [];
  const seen = new Set<string>();
  let cur: string | null = echoId;
  while (cur && !seen.has(cur)) {
    seen.add(cur);
    const echo = index.byId.get(cur);
    if (!echo) break;
    chain.push(echo);
    cur = parentKey(echo);
  }
  chain.reverse();

  return [
    seed,
    ...chain.map((echo) => ({
      id: echo.id,
      text: echo.text,
      isSeed: false,
      echo,
    })),
  ];
}

/** Tip echo id for composer / branch query, or null when tip is the seed. */
export function tipEchoId(path: LockPathLine[]): string | null {
  if (path.length <= 1) return null;
  const last = path[path.length - 1];
  return last?.isSeed ? null : last?.id || null;
}

/** Trim path so the selected line becomes the new tip (inclusive). */
export function trimPathTo(path: LockPathLine[], lineId: string): LockPathLine[] {
  const idx = path.findIndex((l) => l.id === lineId);
  if (idx < 0) return path;
  return path.slice(0, idx + 1);
}

/** Append a fork echo onto the path (replaces any deeper tip after current). */
export function appendFork(path: LockPathLine[], echo: LockEcho): LockPathLine[] {
  return [
    ...path,
    {
      id: echo.id,
      text: echo.text,
      isSeed: false,
      echo,
    },
  ];
}

export function sortEchoesForBrowse(
  echoes: LockEcho[],
  filter: 'new' | 'score' | 'pick',
  artistPickEchoId?: string
): LockEcho[] {
  const list = [...echoes];
  if (filter === 'pick') {
    return list.filter((e) => e.isPick || e.id === artistPickEchoId);
  }
  if (filter === 'new') {
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  return list.sort((a, b) => b.lockScore - a.lockScore);
}
