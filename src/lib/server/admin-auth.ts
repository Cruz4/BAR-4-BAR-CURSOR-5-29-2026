import 'server-only';

import { getAuth } from '@/lib/firebase/server';
import { enforceAppCheck, AppCheckError } from '@/lib/server/app-check-gate';
import { isMasterAdminEmail } from '@/lib/server/master-admin';
import { notifyAdminDenied } from '@/lib/server/security-alerts';

export class AdminAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AdminAuthError';
  }
}

async function verifyAdminRequestInner(req: Request): Promise<{ uid: string; email: string }> {
  const header = req.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) {
    throw new AdminAuthError('Admin sign-in required.');
  }

  const token = header.slice('Bearer '.length);
  const auth = await getAuth();
  let decoded;
  try {
    decoded = await auth.verifyIdToken(token);
  } catch {
    throw new AdminAuthError('Admin sign-in required.');
  }
  const email = decoded.email || '';

  if (!isMasterAdminEmail(email)) {
    const { getDb } = await import('@/lib/firebase/server');
    const db = await getDb();
    const userSnap = await db.doc(`users/${decoded.uid}`).get();
    if (!(userSnap.exists && userSnap.data()?.role === 'admin')) {
      throw new AdminAuthError('Admin access required.');
    }
  }

  try {
    await enforceAppCheck(req);
  } catch (error) {
    if (error instanceof AppCheckError) {
      throw new AdminAuthError(error.message);
    }
    throw error;
  }

  return { uid: decoded.uid, email };
}

export async function verifyAdminRequest(req: Request): Promise<{ uid: string; email: string }> {
  try {
    return await verifyAdminRequestInner(req);
  } catch (error) {
    if (error instanceof AdminAuthError) {
      const header = req.headers.get('authorization');
      let email: string | null = null;
      if (header?.startsWith('Bearer ')) {
        try {
          const auth = await getAuth();
          const decoded = await auth.verifyIdToken(header.slice('Bearer '.length));
          email = decoded.email || null;
        } catch {
          /* ignore */
        }
      }
      const detail = error.message.toLowerCase().includes('app verification')
        ? 'app check failed'
        : header?.startsWith('Bearer ')
          ? 'not an admin'
          : 'no sign-in';
      void notifyAdminDenied(req, { email, detail });
    }
    throw error;
  }
}
