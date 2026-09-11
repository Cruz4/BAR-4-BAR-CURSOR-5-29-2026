import 'server-only';

import { getAuth } from '@/lib/firebase/server';
import { AppCheckError, enforceAppCheck, shouldEnforceAppCheck } from '@/lib/server/app-check-gate';

export class UploadAuthError extends Error {
  status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.name = 'UploadAuthError';
    this.status = status;
  }
}

export { shouldEnforceAppCheck as shouldEnforceUploadAppCheck };

/** Verifies Firebase ID token + optional App Check for upload ticket APIs. */
export async function verifyUploadRequest(req: Request): Promise<{ uid: string }> {
  const header = req.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) {
    throw new UploadAuthError('Sign in required to upload.');
  }

  const token = header.slice('Bearer '.length).trim();
  const auth = await getAuth();
  const decoded = await auth.verifyIdToken(token);

  try {
    await enforceAppCheck(req);
  } catch (error) {
    if (error instanceof AppCheckError) {
      throw new UploadAuthError(error.message, 403);
    }
    throw error;
  }

  return { uid: decoded.uid };
}
