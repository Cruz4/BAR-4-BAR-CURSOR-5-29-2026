/**
 * One-time / maintenance: copy unique wall post viewers onto Artist Home profileViewTicks.
 * Usage: node scripts/backfill-profile-views-from-wall.mjs [ownerId]
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { existsSync, readFileSync } from 'fs';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const projectId =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
  'lyricai-studio-otgxn';

function init() {
  if (getApps().length) return getApps()[0];
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim();
  if (json) {
    return initializeApp({ credential: cert(JSON.parse(json)), projectId });
  }
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (credPath && existsSync(resolve(process.cwd(), credPath))) {
    const sa = JSON.parse(readFileSync(resolve(process.cwd(), credPath), 'utf8'));
    return initializeApp({ credential: cert(sa), projectId });
  }
  throw new Error('No firebase credentials');
}

const db = getFirestore(init());

async function canonicalSlug(ownerId) {
  const summary = await db.doc(`users/${ownerId}/gamification/summary`).get();
  const claimed =
    typeof summary.data()?.profileSlug === 'string' ? summary.data().profileSlug.trim() : '';
  if (claimed) {
    const snap = await db.doc(`publicProfiles/${claimed}`).get();
    if (snap.exists && snap.data()?.userId === ownerId) return claimed;
  }
  const byUser = await db.collection('publicProfiles').where('userId', '==', ownerId).limit(1).get();
  return byUser.docs[0]?.id ?? null;
}

async function backfillOwner(ownerId) {
  const slug = await canonicalSlug(ownerId);
  if (!slug) {
    console.log('skip', ownerId, 'no public profile');
    return { added: 0, slug: null };
  }
  const profileRef = db.doc(`publicProfiles/${slug}`);
  const posts = await db.collection('posts').where('ownerId', '==', ownerId).get();
  let added = 0;
  let batch = db.batch();
  let ops = 0;
  const mirrored = new Set();

  for (const post of posts.docs) {
    const ticks = await post.ref.collection('viewTicks').get();
    for (const tick of ticks.docs) {
      const tickId = tick.id;
      if (mirrored.has(tickId)) continue;
      const profileTickRef = profileRef.collection('profileViewTicks').doc(tickId);
      const existing = await profileTickRef.get();
      if (existing.exists) {
        mirrored.add(tickId);
        continue;
      }
      mirrored.add(tickId);
      const td = tick.data() || {};
      batch.set(profileTickRef, {
        at: typeof td.at === 'string' ? td.at : new Date().toISOString(),
        viewerId: td.viewerId ?? null,
        guestId: td.guestId ?? null,
        source: 'wall_post_backfill',
      });
      batch.set(
        profileRef,
        {
          profileViewCount: FieldValue.increment(1),
          profileViewCountUpdatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      added += 1;
      ops += 2;
      if (ops >= 400) {
        await batch.commit();
        batch = db.batch();
        ops = 0;
      }
    }
  }
  if (ops > 0) await batch.commit();
  const countSnap = await profileRef.collection('profileViewTicks').count().get();
  const totalTicks = countSnap.data().count;
  await profileRef.set(
    {
      profileViewCount: totalTicks,
      profileViewCountUpdatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
  console.log('backfilled', ownerId, slug, { added, totalTicks });
  return { added, slug };
}

const arg = process.argv[2]?.trim();
if (arg) {
  await backfillOwner(arg);
} else {
  const jordie = await db.doc('publicProfiles/jordie_cruz').get();
  const uid = jordie.data()?.userId;
  if (uid) await backfillOwner(uid);
  else console.log('jordie_cruz missing');
}
