'use client';

/**
 * When push is already on for the account, register THIS device's FCM token
 * so the phone still gets alerts after the setting was enabled on desktop.
 * Never turns the account pref off if this WebView cannot register.
 */

import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { fetchActivityPrefs, savePushToken } from '@/lib/activity/client';
import { registerActivityPush } from '@/lib/activity/push';
import { onMessage, getMessaging, isSupported } from 'firebase/messaging';
import { app } from '@/lib/firebase/client/firebase';
import { refreshActivityAlerts } from '@/hooks/use-activity-alerts';
import { syncAppBadge } from '@/lib/activity/app-badge';

export function ActivityPushDeviceSync() {
  const { user } = useAuth();
  const startedRef = useRef(false);

  useEffect(() => {
    if (!user?.id) {
      startedRef.current = false;
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;
    let unsubscribe: (() => void) | undefined;

    void (async () => {
      try {
        const prefs = await fetchActivityPrefs();
        if (prefs.pushEnabled) {
          const result = await registerActivityPush();
          if (result.ok) await savePushToken(result.token);
        }
      } catch {
        /* this device may not support web push */
      }

      try {
        if (!(await isSupported())) return;
        const messaging = getMessaging(app);
        unsubscribe = onMessage(messaging, (payload) => {
          const unread = Number(payload.data?.unread);
          if (Number.isFinite(unread) && unread > 0) syncAppBadge(unread);
          else syncAppBadge(1);
          refreshActivityAlerts();
          if (Notification.permission !== 'granted') return;
          const title = payload.notification?.title || payload.data?.title || 'AKAsheet';
          const body = payload.notification?.body || payload.data?.body || 'You have new activity';
          const href = payload.data?.href || '/activity';
          try {
            const note = new Notification(title, { body, icon: '/Logo.png', data: { href } });
            note.onclick = () => {
              window.focus();
              const path =
                typeof href === 'string' && href.startsWith('http')
                  ? new URL(href).pathname + new URL(href).hash
                  : href;
              window.location.assign(path);
              note.close();
            };
          } catch {
            /* some WebViews cannot construct Notification */
          }
        });
      } catch {
        /* foreground messaging optional */
      }
    })();

    return () => {
      unsubscribe?.();
    };
  }, [user?.id]);

  return null;
}
