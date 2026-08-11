'use client';

/**
 * Web Push / FCM registration for Activity alerts.
 * Requires NEXT_PUBLIC_FIREBASE_VAPID_KEY from Firebase Console → Cloud Messaging.
 *
 * Always uses `/sw.js` (same PWA + FCM worker). Never rely on Firebase’s default
 * `/firebase-messaging-sw.js` — that file is not shipped and 404s on localhost.
 */

import { getMessaging, getToken, isSupported, deleteToken } from 'firebase/messaging';
import { app } from '@/lib/firebase/client/firebase';

export type ActivityPushRegisterResult =
  | { ok: true; token: string }
  | { ok: false; reason: 'unsupported' | 'no_vapid' | 'permission' | 'push_service' | 'unknown'; message?: string };

/** Register or reuse `/sw.js` and wait until it can handle push. */
async function ensurePushServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service workers are not supported in this browser.');
  }

  let registration = await navigator.serviceWorker.getRegistration('/');
  if (!registration) {
    registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  }

  // Activate ASAP in case a waiting worker is stuck (common after SW updates).
  if (registration.waiting) {
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }

  const ready = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 12000)),
  ]);
  if (!ready?.active) {
    throw new Error('Service worker did not become active in time. Reload and try again.');
  }
  return ready;
}

export async function registerActivityPush(): Promise<ActivityPushRegisterResult> {
  if (typeof window === 'undefined') {
    return { ok: false, reason: 'unsupported' };
  }
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.trim();
  if (!vapidKey) {
    return { ok: false, reason: 'no_vapid' };
  }

  try {
    const supported = await isSupported();
    if (!supported) {
      return { ok: false, reason: 'unsupported' };
    }

    const permission =
      Notification.permission === 'granted'
        ? 'granted'
        : await Notification.requestPermission();
    if (permission !== 'granted') {
      return { ok: false, reason: 'permission' };
    }

    const registration = await ensurePushServiceWorker();
    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });
    if (!token) {
      return { ok: false, reason: 'push_service', message: 'No FCM token returned' };
    }
    return { ok: true, token };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn('[activity/push register]', err);
    if (/permission|denied|blocked/i.test(message)) {
      return { ok: false, reason: 'permission', message };
    }
    if (
      /push service error|AbortError|Registration failed|failed-service-worker|firebase-messaging-sw/i.test(
        message
      )
    ) {
      return { ok: false, reason: 'push_service', message };
    }
    return { ok: false, reason: 'unknown', message };
  }
}

/**
 * Clear local FCM subscription. Avoid calling this on every toggle-off —
 * Chrome can permanently break push for the profile after too many
 * subscribe/unsubscribe cycles ("Registration failed - push service error").
 */
export async function unregisterActivityPush(opts?: { deleteDeviceToken?: boolean }): Promise<void> {
  if (!opts?.deleteDeviceToken) return;
  try {
    const supported = await isSupported();
    if (!supported) return;
    const messaging = getMessaging(app);
    await deleteToken(messaging);
  } catch {
    /* ignore */
  }
}
