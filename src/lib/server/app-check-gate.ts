import 'server-only';

import { getAppCheck } from 'firebase-admin/app-check';
import { getAdminApp } from '@/lib/firebase/server';

export class AppCheckError extends Error {
  constructor(message = 'App verification failed. Refresh and try again.') {
    super(message);
    this.name = 'AppCheckError';
  }
}

/** Same gate as upload tickets — production when the reCAPTCHA site key is set. */
export function shouldEnforceAppCheck(): boolean {
  if (process.env.UPLOAD_APP_CHECK_ENFORCE === 'false') return false;
  if (process.env.NODE_ENV === 'development') return process.env.UPLOAD_APP_CHECK_ENFORCE === 'true';
  return Boolean(process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY?.trim());
}

export async function enforceAppCheck(req: Request): Promise<void> {
  if (!shouldEnforceAppCheck()) return;
  const appCheckToken = req.headers.get('x-firebase-appcheck')?.trim();
  if (!appCheckToken) throw new AppCheckError();
  try {
    await getAppCheck(getAdminApp()).verifyToken(appCheckToken);
  } catch {
    throw new AppCheckError();
  }
}
