import 'server-only';

import { getDb } from '@/lib/firebase/server';

export type ServerFriendship = {
  id: string;
  uids: [string, string];
  requestedBy: string;
  status: 'accepted' | 'pending';
  profiles: Record<string, { name: string; slug?: string }>;
  createdAt: string;
  respondedAt?: string;
};

function mapFriendship(id: string, data: Record<string, unknown>): ServerFriendship {
  const rawStatus = String(data.status || '').trim().toLowerCase();
  const uidsRaw = Array.isArray(data.uids) ? data.uids.map(String) : [];
  const uids = [uidsRaw[0] || '', uidsRaw[1] || ''] as [string, string];
  const profilesIn =
    data.profiles && typeof data.profiles === 'object'
      ? (data.profiles as Record<string, { name?: string; slug?: string }>)
      : {};
  const profiles: ServerFriendship['profiles'] = {};
  for (const [k, v] of Object.entries(profilesIn)) {
    profiles[k] = {
      name: typeof v?.name === 'string' && v.name.trim() ? v.name.trim() : 'Artist',
      ...(typeof v?.slug === 'string' && v.slug.trim() ? { slug: v.slug.trim() } : {}),
    };
  }
  return {
    id,
    uids,
    requestedBy: String(data.requestedBy || ''),
    status: rawStatus === 'accepted' ? 'accepted' : 'pending',
    profiles,
    createdAt: String(data.createdAt || ''),
    ...(typeof data.respondedAt === 'string' ? { respondedAt: data.respondedAt } : {}),
  };
}

/**
 * Admin-SDK friendship list — bypasses client rules/index failures that were
 * blanking every circle as [].
 */
export async function listFriendshipsForUser(
  userId: string,
  opts?: { status?: 'accepted' | 'pending'; limit?: number }
): Promise<ServerFriendship[]> {
  const uid = userId.trim();
  if (!uid) return [];
  const lim = Math.min(Math.max(opts?.limit ?? 400, 1), 500);
  const db = await getDb();

  const snap = await db
    .collection('friendships')
    .where('uids', 'array-contains', uid)
    .limit(lim)
    .get();

  let rows = snap.docs.map((d) => mapFriendship(d.id, (d.data() || {}) as Record<string, unknown>));
  if (opts?.status) {
    rows = rows.filter((f) => f.status === opts.status);
  }
  rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  // Rewrite chip slugs to live underscore vanity so Neo / friends never open hyphen URLs.
  try {
    const { resolveLiveUnderscoreProfileSlug } = await import('@/lib/server/profile-slug');
    const { needsVanitySlugUpgrade } = await import('@/lib/profile/profile-slug');
    const cache = new Map<string, string | null>();

    const liveFor = async (friendUid: string, name?: string, hint?: string) => {
      if (cache.has(friendUid)) return cache.get(friendUid) ?? null;
      if (hint && !needsVanitySlugUpgrade(hint, friendUid)) {
        cache.set(friendUid, hint);
        return hint;
      }
      try {
        const live = await resolveLiveUnderscoreProfileSlug(db, friendUid, {
          displayName: name,
          currentSlugHint: hint,
        });
        cache.set(friendUid, live);
        return live;
      } catch {
        cache.set(friendUid, hint && !needsVanitySlugUpgrade(hint, friendUid) ? hint : null);
        return cache.get(friendUid) ?? null;
      }
    };

    rows = await Promise.all(
      rows.map(async (row) => {
        const nextProfiles: ServerFriendship['profiles'] = { ...row.profiles };
        let changed = false;
        for (const friendUid of row.uids) {
          if (!friendUid) continue;
          const prev = nextProfiles[friendUid] || { name: 'Artist' };
          const live = await liveFor(friendUid, prev.name, prev.slug);
          if (live && live !== prev.slug) {
            nextProfiles[friendUid] = { ...prev, slug: live };
            changed = true;
          } else if (live && !prev.slug) {
            nextProfiles[friendUid] = { ...prev, slug: live };
            changed = true;
          }
        }
        // Persist underscore chips so Neo reseed leftovers don't keep opening hyphen URLs.
        if (changed) {
          try {
            await db.doc(`friendships/${row.id}`).set({ profiles: nextProfiles }, { merge: true });
          } catch {
            /* response still uses live slug */
          }
        }
        return { ...row, profiles: nextProfiles };
      })
    );
  } catch (err) {
    console.warn('[friendships] underscore slug enrich skipped', err);
  }

  return rows;
}
