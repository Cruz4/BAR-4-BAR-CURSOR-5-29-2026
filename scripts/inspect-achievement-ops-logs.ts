import { existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
function loadEnv(p: string) {
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnv(resolve(root, '.env'));
loadEnv(resolve(root, '.env.local'));
const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!);
if (!getApps().length) initializeApp({ credential: cert(sa), projectId: sa.project_id });
const db = getFirestore();

async function main() {
  const snap = await db
    .collection('system')
    .doc('logs')
    .collection('entries')
    .where('type', '==', 'achievement')
    .get();
  console.log('achievement logs total', snap.size);
  const samples = snap.docs.slice(0, 3).map((d) => {
    const x = d.data();
    return {
      id: d.id,
      timestamp: x.timestamp,
      action: x.action,
      inkDelta: x.inkDelta,
      inkUsed: x.inkUsed,
      type: x.type,
      userName: x.userName,
      details: x.details,
      backfilled: x.backfilled,
    };
  });
  console.log(JSON.stringify(samples, null, 2));

  const recent = await db
    .collection('system')
    .doc('logs')
    .collection('entries')
    .orderBy('timestamp', 'desc')
    .limit(30)
    .get();
  console.log('--- recent 30 ---');
  let achInRecent = 0;
  for (const d of recent.docs) {
    const x = d.data();
    if (x.type === 'achievement') achInRecent += 1;
    console.log(x.timestamp, x.type, x.action, 'delta=', x.inkDelta);
  }
  console.log('achievements in latest 30:', achInRecent);

  const top400 = await db
    .collection('system')
    .doc('logs')
    .collection('entries')
    .orderBy('timestamp', 'desc')
    .limit(400)
    .get();
  const ach400 = top400.docs.filter((d) => d.data().type === 'achievement').length;
  console.log('achievements in latest 400:', ach400);

  const times = snap.docs.map((d) => String(d.data().timestamp || '')).sort();
  console.log('achievement oldest', times[0], 'newest', times[times.length - 1]);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
