import 'server-only';

import type { Firestore } from 'firebase-admin/firestore';
import {
  NEOMAIYA_CANONICAL_SLUG,
  isValidProfileSlug,
  normalizeProfileSlugInput,
  slugBaseFromDisplayName,
} from '@/lib/profile/profile-slug';
import { NEOMAIYA_SOL } from '@/lib/profile/neomaiya-sol';

async function slugOwnerId(db: Firestore, slug: string): Promise<string | null> {
  try {
    const snap = await db.doc(`publicProfiles/${slug}`).get();
    if (!snap.exists) return null;
    const uid = snap.data()?.userId;
    return typeof uid === 'string' && uid ? uid : null;
  } catch {
    return null;
  }
}

/**
 * Pick a free vanity slug from a display name (or desired base).
 * Tries `name`, then `name_2`… — uid suffix only as last resort.
 */
export async function allocateUniqueProfileSlug(
  db: Firestore,
  displayNameOrBase: string,
  userId: string,
  opts?: { desired?: string; excludeSlug?: string }
): Promise<string> {
  const desiredRaw = opts?.desired ? normalizeProfileSlugInput(opts.desired) : '';
  const base = desiredRaw || slugBaseFromDisplayName(displayNameOrBase);
  const safeBase = isValidProfileSlug(base)
    ? base
    : isValidProfileSlug(slugBaseFromDisplayName(displayNameOrBase))
      ? slugBaseFromDisplayName(displayNameOrBase)
      : 'artist';

  for (let i = 0; i < 80; i++) {
    const candidate =
      i === 0 ? safeBase : `${safeBase.slice(0, Math.max(2, 32 - String(i + 1).length - 1))}_${i + 1}`;
    if (!isValidProfileSlug(candidate) && i > 0) continue;
    // Reserved list blocks neomaiya_sol for everyone except we allow owner claim elsewhere.
    if (candidate === NEOMAIYA_CANONICAL_SLUG && userId) {
      // Only Neo can land here via forceClaim — skip in normal allocate.
      continue;
    }
    if (!isValidProfileSlug(candidate)) continue;
    if (opts?.excludeSlug && candidate === opts.excludeSlug) return candidate;
    const owner = await slugOwnerId(db, candidate);
    if (!owner || owner === userId) return candidate;
  }

  const fallback = `${safeBase.slice(0, 24)}_${userId.slice(0, 6)}`.toLowerCase();
  return fallback.replace(/[^a-z0-9_]/g, '').replace(/^_|_$/g, '') || `artist_${userId.slice(0, 6)}`;
}

/**
 * Claim a specific slug for userId. Throws if taken by someone else.
 * Allows Neo to claim the reserved canonical slug.
 */
export async function assertProfileSlugAvailable(
  db: Firestore,
  slug: string,
  userId: string,
  opts?: { allowProspectId?: string }
): Promise<string> {
  const clean = normalizeProfileSlugInput(slug);
  let isNeo = false;
  try {
    const { getAuth } = await import('@/lib/firebase/server');
    const auth = await getAuth();
    const user = await auth.getUser(userId);
    isNeo = (user.email || '').toLowerCase() === NEOMAIYA_SOL.email.toLowerCase();
  } catch {
    isNeo = false;
  }

  if (clean === NEOMAIYA_CANONICAL_SLUG) {
    if (!isNeo) throw new Error('That link is reserved.');
  } else if (!isValidProfileSlug(clean)) {
    throw new Error('That profile link is not allowed.');
  }

  const owner = await slugOwnerId(db, clean);
  if (owner && owner !== userId) {
    throw new Error('That profile link is already taken.');
  }
  if (!owner) {
    const holdSnap = await db.doc(`publicProfiles/${clean}`).get();
    if (holdSnap.exists) {
      const heldProspect =
        typeof holdSnap.data()?.prospectId === 'string' ? holdSnap.data()!.prospectId : '';
      const heldUid = typeof holdSnap.data()?.userId === 'string' ? holdSnap.data()!.userId : '';
      if (!heldUid && heldProspect && heldProspect !== opts?.allowProspectId) {
        throw new Error('That profile link is reserved for an invite.');
      }
    }
  }
  return clean;
}

/**
 * Force-claim `neomaiya_sol` for the canonical Neo uid.
 * If another account holds it (or the legacy hyphen slug), reassign them a clean alternate.
 */
export async function forceClaimNeomaiyaCanonicalSlug(
  db: Firestore,
  neoUid: string
): Promise<string> {
  const slug = NEOMAIYA_CANONICAL_SLUG;
  const legacyHyphen = 'neomaiya-sol';

  async function relocateOtherOwner(occupiedSlug: string) {
    const owner = await slugOwnerId(db, occupiedSlug);
    if (!owner || owner === neoUid) return;
    const oldSnap = await db.doc(`publicProfiles/${occupiedSlug}`).get();
    const oldData = oldSnap.data() || {};
    const otherName =
      (typeof oldData.displayName === 'string' && oldData.displayName.trim()) || 'Artist';
    const alt = await allocateUniqueProfileSlug(db, otherName, owner);
    const moved = {
      ...oldData,
      userId: owner,
      updatedAt: new Date().toISOString(),
    };
    await db.doc(`publicProfiles/${alt}`).set(moved, { merge: true });
    try {
      const avatar = await db.doc(`publicProfiles/${occupiedSlug}/assets/avatar`).get();
      if (avatar.exists) {
        await db.doc(`publicProfiles/${alt}/assets/avatar`).set(avatar.data() || {}, { merge: true });
        await avatar.ref.delete();
      }
    } catch {
      /* ignore */
    }
    if (oldSnap.exists) await oldSnap.ref.delete();
    await db.doc(`users/${owner}/gamification/summary`).set({ profileSlug: alt }, { merge: true });
  }

  await relocateOtherOwner(slug);
  await relocateOtherOwner(legacyHyphen);
  // Drop Neo's own legacy hyphen mirror after claiming underscore.
  try {
    const legacySnap = await db.doc(`publicProfiles/${legacyHyphen}`).get();
    if (legacySnap.exists && String(legacySnap.data()?.userId || '') === neoUid) {
      try {
        await legacySnap.ref.collection('assets').doc('avatar').delete();
      } catch {
        /* ignore */
      }
      await legacySnap.ref.delete();
    }
  } catch {
    /* ignore */
  }

  await db.doc(`users/${neoUid}/gamification/summary`).set(
    {
      profileSlug: slug,
      publicProfile: true,
      displayName: NEOMAIYA_SOL.displayName,
    },
    { merge: true }
  );

  // Ensure the canonical public mirror points at Neo even before full sync.
  await db.doc(`publicProfiles/${slug}`).set(
    {
      userId: neoUid,
      displayName: NEOMAIYA_SOL.displayName,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  // Drop any leftover Neo mirrors (e.g. neomaiya-sol-paQXxm / neomaiya_sol_xxxxxx).
  try {
    const extras = await db.collection('publicProfiles').where('userId', '==', neoUid).get();
    for (const docSnap of extras.docs) {
      if (docSnap.id === slug) continue;
      try {
        await docSnap.ref.collection('assets').doc('avatar').delete();
      } catch {
        /* ignore */
      }
      await docSnap.ref.delete();
    }
  } catch {
    /* ignore */
  }

  return slug;
}

async function movePublicProfileDoc(
  db: Firestore,
  fromSlug: string,
  toSlug: string,
  userId: string
): Promise<void> {
  if (!fromSlug || !toSlug || fromSlug === toSlug) return;
  const oldSnap = await db.doc(`publicProfiles/${fromSlug}`).get();
  const oldData = oldSnap.exists ? oldSnap.data() || {} : {};
  await db.doc(`publicProfiles/${toSlug}`).set(
    {
      ...oldData,
      userId,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
  try {
    const avatar = await db.doc(`publicProfiles/${fromSlug}/assets/avatar`).get();
    if (avatar.exists) {
      await db.doc(`publicProfiles/${toSlug}/assets/avatar`).set(avatar.data() || {}, { merge: true });
      await avatar.ref.delete();
    }
  } catch {
    /* ignore */
  }
  if (oldSnap.exists) await oldSnap.ref.delete();
  await db.doc(`users/${userId}/gamification/summary`).set({ profileSlug: toSlug }, { merge: true });
}

/**
 * Resolve a publicProfiles doc from a URL slug, trying underscore/hyphen variants.
 */
export async function resolvePublicProfileSlugDoc(
  db: Firestore,
  rawSlug: string
): Promise<{ slug: string; data: Record<string, unknown>; userId: string } | null> {
  const { profileSlugLookupCandidates } = await import('@/lib/profile/profile-slug');
  for (const candidate of profileSlugLookupCandidates(rawSlug)) {
    try {
      const snap = await db.doc(`publicProfiles/${candidate}`).get();
      if (!snap.exists) continue;
      const data = (snap.data() || {}) as Record<string, unknown>;
      const userId = typeof data.userId === 'string' ? data.userId : '';
      const prospectId = typeof data.prospectId === 'string' ? data.prospectId : '';
      if (!userId && !prospectId) continue;
      return { slug: snap.id, data, userId };
    } catch {
      /* try next */
    }
  }
  return null;
}

/**
 * Migrate hyphen / uid-suffix vanity slugs to clean underscore form.
 * e.g. `jordie-cruz-46LuTi` → `jordie_cruz` (not `jordie_cruz_46luti`).
 */
export async function migrateUserProfileSlugToUnderscore(
  db: Firestore,
  userId: string,
  opts?: { displayName?: string; currentSlugHint?: string }
): Promise<string | null> {
  const {
    looksLikeLegacyUidSlug,
    needsVanitySlugUpgrade,
    slugBaseFromDisplayName,
    stripLegacyUidSuffix,
  } = await import('@/lib/profile/profile-slug');

  const gamRef = db.doc(`users/${userId}/gamification/summary`);
  const gamSnap = await gamRef.get();
  let current =
    typeof gamSnap.data()?.profileSlug === 'string' ? String(gamSnap.data()!.profileSlug).trim() : '';

  // Summary may be missing/stale — discover live public mirror(s).
  if (!current || needsVanitySlugUpgrade(current, userId)) {
    try {
      const byUser = await db.collection('publicProfiles').where('userId', '==', userId).get();
      const hyphenDoc = byUser.docs.find((d) => d.id.includes('-'));
      const anyDoc = byUser.docs[0];
      if (hyphenDoc) current = hyphenDoc.id;
      else if (!current && anyDoc) current = anyDoc.id;
    } catch {
      /* ignore */
    }
  }
  if (!current && opts?.currentSlugHint) current = opts.currentSlugHint.trim();
  if (!current) return null;
  if (!needsVanitySlugUpgrade(current, userId)) return current;

  let displayName = opts?.displayName;
  if (!displayName) {
    try {
      const userSnap = await db.doc(`users/${userId}`).get();
      const dn = userSnap.data()?.displayName;
      if (typeof dn === 'string' && dn.trim()) displayName = dn.trim();
    } catch {
      /* ignore */
    }
  }
  if (!displayName) {
    try {
      const pub = await db.doc(`publicProfiles/${current}`).get();
      const dn = pub.data()?.displayName;
      if (typeof dn === 'string' && dn.trim()) displayName = dn.trim();
    } catch {
      /* ignore */
    }
  }

  // Prefer the artist name — never keep the old uid tail as the "desired" slug.
  const fromName = slugBaseFromDisplayName(displayName || stripLegacyUidSuffix(current));
  const next = await allocateUniqueProfileSlug(db, displayName || fromName, userId, {
    desired: fromName,
  });
  if (!next) return current;
  // If allocator somehow returned another legacy/hyphen form, force strip + retry once.
  let live = next;
  if (needsVanitySlugUpgrade(live, userId) || looksLikeLegacyUidSlug(live, userId)) {
    live = await allocateUniqueProfileSlug(db, fromName, userId, {
      desired: stripLegacyUidSuffix(live),
    });
  }
  if (!live || live === current) {
    // Still write underscore-normalized form if only separators differ.
    const underscored = stripLegacyUidSuffix(current);
    if (underscored !== current) {
      const owner = await slugOwnerId(db, underscored);
      if (!owner || owner === userId) {
        await movePublicProfileDoc(db, current, underscored, userId);
        return underscored;
      }
    }
    return current;
  }

  await movePublicProfileDoc(db, current, live, userId);

  // Drop other mirrors for this user except the new slug.
  try {
    const extras = await db.collection('publicProfiles').where('userId', '==', userId).get();
    for (const docSnap of extras.docs) {
      if (docSnap.id === live) continue;
      try {
        await docSnap.ref.collection('assets').doc('avatar').delete();
      } catch {
        /* ignore */
      }
      await docSnap.ref.delete();
    }
  } catch {
    /* ignore */
  }

  return live;
}

/**
 * Live Artist Home slug for chips / Neo reseed — always underscore vanity.
 * Migrates hyphen / uid-tail publicProfiles when needed.
 */
export async function resolveLiveUnderscoreProfileSlug(
  db: Firestore,
  userId: string,
  opts?: { displayName?: string; currentSlugHint?: string }
): Promise<string | null> {
  const uid = (userId || '').trim();
  if (!uid) return null;
  const { needsVanitySlugUpgrade } = await import('@/lib/profile/profile-slug');

  let hint = (opts?.currentSlugHint || '').trim() || undefined;
  let displayName = opts?.displayName;

  try {
    const byUser = await db.collection('publicProfiles').where('userId', '==', uid).limit(8).get();
    if (!byUser.empty) {
      const ranked = [...byUser.docs].sort((a, b) => {
        const aBad = needsVanitySlugUpgrade(a.id, uid) ? 1 : 0;
        const bBad = needsVanitySlugUpgrade(b.id, uid) ? 1 : 0;
        if (aBad !== bBad) return aBad - bBad;
        const aAt = String(a.data()?.updatedAt || '');
        const bAt = String(b.data()?.updatedAt || '');
        return bAt.localeCompare(aAt);
      });
      const best = ranked[0]!;
      if (!hint) hint = best.id;
      if (!displayName) {
        const dn = best.data()?.displayName;
        if (typeof dn === 'string' && dn.trim()) displayName = dn.trim();
      }
      if (!needsVanitySlugUpgrade(best.id, uid)) {
        return best.id;
      }
    }
  } catch {
    /* fall through to migrate */
  }

  if (!hint) {
    try {
      const gamSnap = await db.doc(`users/${uid}/gamification/summary`).get();
      const s = gamSnap.data()?.profileSlug;
      if (typeof s === 'string' && s.trim()) hint = s.trim();
      if (!displayName) {
        const dn = gamSnap.data()?.displayName;
        if (typeof dn === 'string' && dn.trim()) displayName = dn.trim();
      }
    } catch {
      /* ignore */
    }
  }

  if (hint && !needsVanitySlugUpgrade(hint, uid)) {
    return hint;
  }

  try {
    const migrated = await migrateUserProfileSlugToUnderscore(db, uid, {
      displayName,
      currentSlugHint: hint,
    });
    if (migrated) return migrated;
  } catch (err) {
    console.warn('[profile-slug] live underscore resolve failed', uid, err);
  }

  return hint && !needsVanitySlugUpgrade(hint, uid) ? hint : null;
}

