/**
 * Install fal.ai API key for local ACE-Step renders.
 * Usage: node scripts/install-fal-key.mjs YOUR_FAL_KEY
 * Writes fal-api-key.local (gitignored via .env* patterns) and config/renderOps.falApiKey in Firestore.
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import admin from 'firebase-admin';

const key = (process.argv[2] || '').trim();
if (!key || key.length < 12) {
  console.error('Usage: node scripts/install-fal-key.mjs <FAL_KEY from https://fal.ai/dashboard/keys>');
  process.exit(1);
}

const root = resolve(process.cwd());
const localPath = resolve(root, 'fal-api-key.local');
writeFileSync(localPath, `${key}\n`, 'utf8');
console.log('Wrote', localPath);

const saPath = resolve(root, 'firebase-service-account.json');
const sa = JSON.parse(readFileSync(saPath, 'utf8'));
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(sa) });
}
await admin
  .firestore()
  .doc('config/renderOps')
  .set(
    {
      falApiKey: key,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
console.log('Saved falApiKey to Firestore config/renderOps');
console.log('Restart npm run dev, then Generate again.');
