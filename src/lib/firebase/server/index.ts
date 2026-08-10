import 'server-only';
import './prepare-cloud-env';
import {
  getApps,
  initializeApp,
  cert,
  applicationDefault,
  type App,
  type ServiceAccount,
} from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth as getAdminAuth, type Auth } from 'firebase-admin/auth';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const DEFAULT_PROJECT_ID = 'lyricai-studio-otgxn';

declare global {
  // eslint-disable-next-line no-var
  var __bar4barFirebaseApp: App | undefined;
}

function isCloudRuntime(): boolean {
  return Boolean(
    process.env.K_SERVICE ||
      process.env.FUNCTION_TARGET ||
      process.env.FIREBASE_CONFIG ||
      process.env.__FIREBASE_FRAMEWORKS_ENTRY__ ||
      process.env.__FIREBASE_DEFAULTS__
  );
}

function getProjectId(): string {
  const configJson = process.env.FIREBASE_CONFIG?.trim();
  if (configJson) {
    try {
      const parsed = JSON.parse(configJson) as { projectId?: string };
      if (parsed.projectId) return parsed.projectId;
    } catch {
      /* fall through */
    }
  }

  const defaultsJson = process.env.__FIREBASE_DEFAULTS__?.trim();
  if (defaultsJson) {
    try {
      const parsed = JSON.parse(defaultsJson) as { config?: { projectId?: string } };
      if (parsed.config?.projectId) return parsed.config.projectId;
    } catch {
      /* fall through */
    }
  }

  return (
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GCLOUD_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    DEFAULT_PROJECT_ID
  );
}

/** Strip local-only credential paths before Admin SDK / google-auth token refresh. */
function clearMisconfiguredCredentialsEnv(): void {
  if (isCloudRuntime() && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
  }
}

function initWithOptions(options: Parameters<typeof initializeApp>[0]): App {
  try {
    return initializeApp(options);
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code;
    if (code === 'app/duplicate-app') {
      return getApps()[0]!;
    }
    console.error('[firebase-admin] initializeApp failed:', error);
    throw error;
  }
}

function createFirebaseApp(): App {
  clearMisconfiguredCredentialsEnv();
  const projectId = getProjectId();

  if (isCloudRuntime()) {
    return initWithOptions({
      credential: applicationDefault(),
      projectId,
    });
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim();
  if (serviceAccountJson) {
    try {
      return initWithOptions({
        credential: cert(JSON.parse(serviceAccountJson) as ServiceAccount),
        projectId,
      });
    } catch (error) {
      throw new Error(
        `Invalid FIREBASE_SERVICE_ACCOUNT_KEY — use GOOGLE_APPLICATION_CREDENTIALS locally. ${(error as Error).message}`
      );
    }
  }

  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (credentialsPath) {
    const absolutePath = resolve(process.cwd(), credentialsPath);
    if (existsSync(absolutePath)) {
      const serviceAccount = JSON.parse(readFileSync(absolutePath, 'utf8')) as ServiceAccount;
      return initWithOptions({
        credential: cert(serviceAccount),
        projectId,
      });
    }
    console.warn(
      `[firebase-admin] GOOGLE_APPLICATION_CREDENTIALS missing at ${absolutePath}; using ADC`
    );
  }

  return initWithOptions({
    credential: applicationDefault(),
    projectId,
  });
}

function getOrInitApp(): App {
  clearMisconfiguredCredentialsEnv();

  if (globalThis.__bar4barFirebaseApp) {
    return globalThis.__bar4barFirebaseApp;
  }

  const existing = getApps();
  if (existing.length > 0) {
    globalThis.__bar4barFirebaseApp = existing[0]!;
    return globalThis.__bar4barFirebaseApp;
  }

  globalThis.__bar4barFirebaseApp = createFirebaseApp();
  return globalThis.__bar4barFirebaseApp;
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

export async function getDb(): Promise<Firestore> {
  return getFirestore(getOrInitApp());
}

export async function getAuth(): Promise<Auth> {
  return getAdminAuth(getOrInitApp());
}

export function getAdminApp(): App {
  return getOrInitApp();
}

// Do NOT eagerly init Admin here. Firebase deploy discovery sets FIREBASE_CONFIG
// and times out (10s) if module load blocks on applicationDefault() / network.
// Init lazily on first getDb() / getAuth() / getAdminApp() call instead.
