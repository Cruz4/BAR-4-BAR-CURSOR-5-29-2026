#!/usr/bin/env node
/**
 * Audit Firestore documents that inflate Internet egress (large inline blobs).
 *
 * Usage:
 *   node scripts/audit-firestore-egress.mjs
 *   node scripts/audit-firestore-egress.mjs --repair-posts
 *
 * Requires FIREBASE_SERVICE_ACCOUNT_KEY or Application Default Credentials.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const repairPosts = args.includes('--repair-posts');
const migratePostImages = args.includes('--migrate-post-images');
const migrateLimit = Number(args.find((a) => a.startsWith('--limit='))?.split('=')[1] || 50);

async function loadAdmin() {
  const admin = await import('firebase-admin');
  if (!admin.default.apps.length) {
    const keyPath = resolve('firebase-service-account.json');
    const envKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (envKey) {
      admin.default.initializeApp({
        credential: admin.default.credential.cert(JSON.parse(envKey)),
        storageBucket: 'lyricai-studio-otgxn.firebasestorage.app',
      });
    } else if (existsSync(keyPath)) {
      const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'));
      admin.default.initializeApp({
        credential: admin.default.credential.cert(serviceAccount),
        storageBucket: `${serviceAccount.project_id}.firebasestorage.app`,
      });
    } else {
      admin.default.initializeApp({
        credential: admin.default.credential.applicationDefault(),
        storageBucket: 'lyricai-studio-otgxn.firebasestorage.app',
      });
    }
  }
  return admin.default;
}

function approxBytes(value) {
  if (typeof value === 'string') return value.length;
  try {
    return JSON.stringify(value).length;
  } catch {
    return 0;
  }
}

function isInlineImage(url) {
  return typeof url === 'string' && url.startsWith('data:image/');
}

function parseDataImage(dataUrl) {
  if (!isInlineImage(dataUrl)) return null;
  const match = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(dataUrl);
  if (!match) return null;
  return { contentType: match[1], buffer: Buffer.from(match[2], 'base64') };
}

function wallImagePostPath(userId, postId) {
  return `wall/${userId}/posts/${postId}.jpg`;
}

async function migrateInlinePostImages(db, admin, limit = 50) {
  const snap = await db.collection('posts').orderBy('createdAt', 'desc').limit(500).get();
  const bucket = admin.storage().bucket();
  let migrated = 0;
  for (const doc of snap.docs) {
    if (migrated >= limit) break;
    const data = doc.data();
    const ownerId = typeof data.ownerId === 'string' ? data.ownerId.trim() : '';
    if (!ownerId) continue;

    if (isInlineImage(data.imageUrl) && !data.imageStoragePath) {
      const parsed = parseDataImage(data.imageUrl);
      if (!parsed) continue;
      const storagePath = wallImagePostPath(ownerId, doc.id);
      const file = bucket.file(storagePath);
      await file.save(parsed.buffer, {
        contentType: 'image/jpeg',
        resumable: false,
        metadata: { cacheControl: 'public,max-age=31536000' },
      });
      await doc.ref.update({
        imageStoragePath: storagePath,
        imageUrl: admin.firestore.FieldValue.delete(),
        egressMigratedAt: new Date().toISOString(),
      });
      migrated += 1;
      console.log(`  migrated image ${doc.id} → ${storagePath} (${(parsed.buffer.length / 1024).toFixed(0)} KB)`);
      continue;
    }

    if (isInlineImage(data.reverbImageUrl)) {
      const parsed = parseDataImage(data.reverbImageUrl);
      if (!parsed) continue;
      const storagePath = `wall/${ownerId}/reverbs/${doc.id}.jpg`;
      const file = bucket.file(storagePath);
      await file.save(parsed.buffer, {
        contentType: 'image/jpeg',
        resumable: false,
        metadata: { cacheControl: 'public,max-age=31536000' },
      });
      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: '03-09-2491',
      });
      await doc.ref.update({
        reverbImageUrl: signedUrl.slice(0, 2000),
        egressMigratedAt: new Date().toISOString(),
      });
      migrated += 1;
      console.log(`  migrated reverb ${doc.id} → ${storagePath} (${(parsed.buffer.length / 1024).toFixed(0)} KB)`);
    }
  }
  console.log(`Migrated ${migrated} post image(s) to Storage.`);
}

async function auditPosts(db, admin) {
  const snap = await db.collection('posts').orderBy('createdAt', 'desc').limit(500).get();
  let inlineCount = 0;
  let inlineBytes = 0;
  let repairable = 0;
  const top = [];

  for (const doc of snap.docs) {
    const data = doc.data();
    const imageLen = isInlineImage(data.imageUrl) ? data.imageUrl.length : 0;
    const reverbLen = isInlineImage(data.reverbImageUrl) ? data.reverbImageUrl.length : 0;
    const total = imageLen + reverbLen;
    if (total > 0) {
      inlineCount += 1;
      inlineBytes += total;
      if (data.imageStoragePath && imageLen > 0) repairable += 1;
      top.push({ id: doc.id, imageLen, reverbLen, hasPath: Boolean(data.imageStoragePath) });
    }
  }

  top.sort((a, b) => b.imageLen + b.reverbLen - (a.imageLen + a.reverbLen));

  console.log('\n=== posts (newest 500) ===');
  console.log(`Inline data:image posts: ${inlineCount}`);
  console.log(`Inline image bytes in sample: ${(inlineBytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Repairable (has imageStoragePath): ${repairable}`);
  top.slice(0, 8).forEach((row) => {
    console.log(
      `  ${row.id}  image=${(row.imageLen / 1024).toFixed(0)}KB  reverb=${(row.reverbLen / 1024).toFixed(0)}KB  storagePath=${row.hasPath}`
    );
  });

  if (repairPosts && repairable > 0) {
    console.log('\nRepairing posts with redundant inline images…');
    let fixed = 0;
    for (const doc of snap.docs) {
      const data = doc.data();
      if (!data.imageStoragePath || !isInlineImage(data.imageUrl)) continue;
      await doc.ref.update({
        imageUrl: admin.firestore.FieldValue.delete(),
        egressRepairAt: new Date().toISOString(),
      });
      fixed += 1;
    }
    console.log(`Stripped inline imageUrl from ${fixed} post(s).`);
  }
}

async function auditPublicProfiles(db) {
  const snap = await db.collection('publicProfiles').limit(200).get();
  let heavy = 0;
  let heroInline = 0;
  for (const doc of snap.docs) {
    const data = doc.data();
    const size = approxBytes(data);
    if (size > 200_000) heavy += 1;
    const home = data.artistHome;
    const rooms = home?.featured?.albumRooms;
    if (Array.isArray(rooms)) {
      for (const room of rooms) {
        if (isInlineImage(room?.coverArtUrl)) heroInline += 1;
      }
    }
    if (isInlineImage(data.profilePhotoUrl)) heroInline += 1;
  }
  console.log('\n=== publicProfiles (sample 200) ===');
  console.log(`Docs > 200KB JSON: ${heavy}`);
  console.log(`Inline image fields on public docs: ${heroInline}`);
}

async function auditShares(db) {
  const snap = await db.collection('shares').orderBy('updatedAt', 'desc').limit(100).get();
  const sizes = snap.docs.map((doc) => ({ id: doc.id, bytes: approxBytes(doc.data()) }));
  sizes.sort((a, b) => b.bytes - a.bytes);
  console.log('\n=== shares (newest 100) ===');
  sizes.slice(0, 5).forEach((row) => {
    console.log(`  ${row.id}  ~${(row.bytes / 1024).toFixed(0)} KB`);
  });
}

async function main() {
  const admin = await loadAdmin();
  const db = admin.firestore();
  console.log('Firestore egress audit — lyricai-studio-otgxn');
  if (migratePostImages) {
    console.log('\n=== migrate inline post images → Storage ===');
    await migrateInlinePostImages(db, admin, migrateLimit);
  }
  await auditPosts(db, admin);
  await auditPublicProfiles(db);
  await auditShares(db);
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
