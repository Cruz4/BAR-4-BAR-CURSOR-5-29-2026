'use client';

import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[600] bg-amber-600/95 text-black px-4 py-2 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest shadow-lg font-code">
      <WifiOff className="h-4 w-4" />
      Offline — lyrics edit from cache; AI generation requires connection
    </div>
  );
}
