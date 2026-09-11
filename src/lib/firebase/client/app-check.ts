'use client';

import { initializeAppCheck, ReCaptchaV3Provider, getToken, type AppCheck } from 'firebase/app-check';
import { app } from '@/lib/firebase/client/firebase';

let appCheckInstance: AppCheck | null = null;
let initAttempted = false;

/** Browser-only App Check — requires NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY in production. */
export function initClientAppCheck(): AppCheck | null {
  if (typeof window === 'undefined') return null;
  if (appCheckInstance) return appCheckInstance;
  if (initAttempted) return null;
  initAttempted = true;

  const siteKey = process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY?.trim();
  if (!siteKey) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[App Check] NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY is unset — register reCAPTCHA v3 in Firebase Console → App Check.'
      );
    }
    return null;
  }

  if (process.env.NODE_ENV === 'development') {
    const debugToken = process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN?.trim();
    if (debugToken) {
      (globalThis as typeof globalThis & { FIREBASE_APPCHECK_DEBUG_TOKEN?: string }).FIREBASE_APPCHECK_DEBUG_TOKEN =
        debugToken;
    }
  }

  appCheckInstance = initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(siteKey),
    isTokenAutoRefreshEnabled: true,
  });
  return appCheckInstance;
}

export async function getClientAppCheckToken(forceRefresh = false): Promise<string | null> {
  const instance = initClientAppCheck();
  if (!instance) return null;
  try {
    const result = await getToken(instance, forceRefresh);
    return result.token;
  } catch {
    return null;
  }
}

export async function applyAppCheckHeader(headers: Headers): Promise<void> {
  const token = await getClientAppCheckToken();
  if (token) headers.set('X-Firebase-AppCheck', token);
}
