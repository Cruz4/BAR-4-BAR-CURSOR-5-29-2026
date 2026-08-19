import 'server-only';

import { getAppCheck } from 'firebase-admin/app-check';
import { getAdminApp, getAuth } from '@/lib/firebase/server';

export class UploadAuthError extends Error {
  status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.name = 'UploadAuthError';
    this.status = status;
  }
}

export function shouldEnforceUploadAppCheck(): boolean {
  if (process.env.UPLOAD_APP_CHECK_ENFORCE === 'false') return false;
  if (process.env.NODE_ENV === 'development') return process.env.UPLOAD_APP_CHECK_ENFORCE === 'true';
  return Boolean(process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY?.trim());
}

/** Verifies Firebase ID token + optional App Check for upload ticket APIs. */
export async function verifyUploadRequest(req: Request): Promise<{ uid: string }> {
  const header = req.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) {
    throw new UploadAuthError('Sign in required to upload.');
  }

  const token = header.slice('Bearer '.length).trim();
  const auth = await getAuth();
  const decoded = await auth.verifyIdToken(token);
  const uid = decoded.uid;

  if (shouldEnforceUploadAppCheck()) {
    const appCheckToken = req.headers.get('x-firebase-appcheck')?.trim();
    if (!appCheckToken) {
      throw new UploadAuthError('App verification failed. Refresh and try again.', 403);
    }
    try {
      await getAppCheck(getAdminApp()).verifyToken(appCheckToken);
    } catch {
      throw new UploadAuthError('App verification failed. Refresh and try again.', 403);
    }
  }

  return { uid };
}
