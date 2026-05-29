import { NextResponse } from 'next/server';
import { verifyAdminRequest, AdminAuthError } from '@/lib/server/admin-auth';
import { getDb, hasAdminFirestoreCredentials } from '@/lib/firebase/server';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    await verifyAdminRequest(req);
    if (!hasAdminFirestoreCredentials()) {
      return NextResponse.json({ adSpend30d: 0, adSpend90d: 0, notes: '' });
    }
    const db = await getDb();
    const snap = await db.doc('studioMetrics/marketing').get();
    const data = snap.data() || {};
    return NextResponse.json({
      adSpend30d: Number(data.adSpend30d || 0),
      adSpend90d: Number(data.adSpend90d || 0),
      notes: String(data.notes || ''),
    });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to load marketing config' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await verifyAdminRequest(req);
    if (!hasAdminFirestoreCredentials()) {
      return NextResponse.json({ error: 'Firebase Admin required' }, { status: 503 });
    }
    const body = await req.json();
    const db = await getDb();
    await db.doc('studioMetrics/marketing').set(
      {
        adSpend30d: Number(body.adSpend30d || 0),
        adSpend90d: Number(body.adSpend90d || 0),
        notes: String(body.notes || ''),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to save marketing config' }, { status: 500 });
  }
}
