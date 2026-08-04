'use client';

/**
 * Web Push / FCM registration for Activity alerts.
 * Requires NEXT_PUBLIC_FIREBASE_VAPID_KEY from Firebase Console → Cloud Messaging.
 */

import { getMessaging, getToken, isSupported, deleteToken } from 'firebase/messaging';
import { app } from '@/lib/firebase/client/firebase';

export async function registerActivityPush(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.trim();
  if (!vapidKey) return null;

  try {
    const supported = await isSupported();
    if (!supported) return null;

    const permission =
      Notification.permission === 'granted'
        ? 'granted'
        : await Notification.requestPermission();
    if (permission !== 'granted') return null;

    // Ensure our SW is controlling the page (same /sw.js used for PWA shell).
    const registration = await navigator.serviceWorker.ready;
    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });
    return token || null;
  } catch (err) {
    console.warn('[activity/push register]', err);
    return null;
  }
}

export async function unregisterActivityPush(): Promise<void> {
  try {
    const supported = await isSupported();
    if (!supported) return;
    const messaging = getMessaging(app);
    await deleteToken(messaging);
  } catch {
    /* ignore */
  }
}
