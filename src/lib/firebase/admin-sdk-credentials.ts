import 'server-only';
import { existsSync } from 'fs';
import { resolve } from 'path';

function isCloudRuntime(): boolean {
  return Boolean(
    process.env.K_SERVICE ||
      process.env.FUNCTION_TARGET ||
      process.env.FIREBASE_CONFIG ||
      process.env.__FIREBASE_FRAMEWORKS_ENTRY__ ||
      process.env.__FIREBASE_DEFAULTS__
  );
}

/** True when Admin SDK can read/write Firestore (local key file or Firebase/GCP runtime). */
export function hasAdminFirestoreCredentials(): boolean {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim()) return true;
  if (isCloudRuntime()) return true;

  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (credentialsPath) {
    const absolutePath = resolve(process.cwd(), credentialsPath);
    if (existsSync(absolutePath)) return true;
  }

  return false;
}
