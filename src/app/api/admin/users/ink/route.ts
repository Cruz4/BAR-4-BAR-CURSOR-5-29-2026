import { NextResponse } from 'next/server';
import { verifyAdminRequest, AdminAuthError } from '@/lib/server/admin-auth';
import { getDb, hasAdminFirestoreCredentials } from '@/lib/firebase/server';

export const runtime = 'nodejs';

type InkType = 'res' | 'pur';

/** Admin: adjust residency or permanent ink (Admin SDK — client rules block balance writes). */
export async function POST(req: Request) {
  let admin: { uid: string; email: string };
  try {
    admin = await verifyAdminRequest(req);
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    throw e;
  }

  if (!hasAdminFirestoreCredentials()) {
    return NextResponse.json({ error: 'Admin credentials required' }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const targetUserId = typeof body.targetUserId === 'string' ? body.targetUserId : '';
  const amount = Number(body.amount);
  const type: InkType = body.type === 'res' ? 'res' : 'pur';

  if (!targetUserId || !Number.isFinite(amount) || amount === 0) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const field = type === 'res' ? 'residencyBalance' : 'purchasedBalance';
  const db = await getDb();
  const balanceRef = db.doc(`users/${targetUserId}/usage/balance`);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(balanceRef);
    const data = snap.data() || { residencyBalance: 0, purchasedBalance: 0 };
    const res =
      type === 'res' ? (data.residencyBalance || 0) + amount : data.residencyBalance || 0;
    const pur =
      type === 'pur' ? (data.purchasedBalance || 0) + amount : data.purchasedBalance || 0;

    if (res < 0 || pur < 0) {
      throw new Error('Ink balance cannot go below zero.');
    }

    tx.set(
      balanceRef,
      {
        residencyBalance: res,
        purchasedBalance: pur,
        balance: res + pur,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  });

  await db.collection('system/logs/entries').add({
    action: 'admin_ink_adjust',
    userId: targetUserId,
    userName: admin.email,
    inkUsed: Math.abs(amount),
    timestamp: new Date().toISOString(),
    details: `${amount > 0 ? '+' : ''}${amount} ${type === 'res' ? 'residency' : 'permanent'} ink`,
  });

  return NextResponse.json({ ok: true, field, amount });
}
