import 'server-only';

import { getAuth } from '@/lib/firebase/server';

const MASTER_ADMIN_EMAIL = 'plotformaiplan@gmail.com';

export class AdminAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AdminAuthError';
  }
}

export async function verifyAdminRequest(req: Request): Promise<{ uid: string; email: string }> {
  const header = req.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) {
    throw new AdminAuthError('Admin sign-in required.');
  }

  const token = header.slice('Bearer '.length);
  const auth = await getAuth();
  const decoded = await auth.verifyIdToken(token);
  const email = decoded.email || '';

  if (email === MASTER_ADMIN_EMAIL) {
    return { uid: decoded.uid, email };
  }

  const { getDb } = await import('@/lib/firebase/server');
  const db = await getDb();
  const userSnap = await db.doc(`users/${decoded.uid}`).get();
  if (userSnap.exists && userSnap.data()?.role === 'admin') {
    return { uid: decoded.uid, email };
  }

  throw new AdminAuthError('Admin access required.');
}
