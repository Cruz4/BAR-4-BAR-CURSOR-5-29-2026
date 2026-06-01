'use client';

import { useEffect } from 'react';

/** Registers the PWA service worker in production and auto-applies updates. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    let reloading = false;

    const onControllerChange = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void navigator.serviceWorker.getRegistration().then((registration) => registration?.update());
      }
    };

    document.addEventListener('visibilitychange', onVisible);

    void navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        void registration.update();

        const activateWaitingWorker = (worker: ServiceWorker | null | undefined) => {
          worker?.postMessage({ type: 'SKIP_WAITING' });
        };

        if (registration.waiting) activateWaitingWorker(registration.waiting);

        registration.addEventListener('updatefound', () => {
          const worker = registration.installing;
          if (!worker) return;
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              activateWaitingWorker(worker);
            }
          });
        });
      })
      .catch(() => undefined);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return null;
}
