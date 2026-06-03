'use client';

export function isBrowserOffline(): boolean {
  if (typeof navigator === 'undefined') return false;
  return !navigator.onLine;
}

export function onNetworkChange(listener: (online: boolean) => void): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const handleOnline = () => listener(true);
  const handleOffline = () => listener(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}
