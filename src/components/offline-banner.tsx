'use client';

import { useEffect, useState } from 'react';
import { WifiOff, CloudUpload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useContext } from 'react';
import { DataContext } from '@/context/data-context';
import { isBrowserOffline, onNetworkChange } from '@/lib/offline/network';

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  const { syncPendingCount, syncVaultToCloud, cloudSaveStatus } = useContext(DataContext);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const update = () => setOffline(isBrowserOffline());
    update();
    return onNetworkChange(() => update());
  }, []);

  const showPendingSync = !offline && syncPendingCount > 0;
  if (!offline && !showPendingSync) return null;

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncVaultToCloud();
    } finally {
      setSyncing(false);
    }
  };

  if (showPendingSync) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[600] bg-primary/90 text-white px-3 py-2 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-[10px] font-bold uppercase tracking-widest shadow-lg font-code">
        <span>You&apos;re back online — {syncPendingCount} offline change{syncPendingCount === 1 ? '' : 's'} ready to sync</span>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-7 text-[9px] font-bold uppercase gap-1.5"
          disabled={syncing || cloudSaveStatus === 'saving'}
          onClick={() => void handleSync()}
        >
          <CloudUpload className="h-3.5 w-3.5" />
          {syncing || cloudSaveStatus === 'saving' ? 'Syncing…' : 'Sync now'}
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[600] bg-amber-600/95 text-black px-3 py-2 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-[10px] font-bold uppercase tracking-widest shadow-lg font-code">
      <div className="flex items-center gap-2 text-center">
        <WifiOff className="h-4 w-4 shrink-0" />
        <span>
          Offline — vault, editor, and Performance mode use this device. AI needs connection.
        </span>
      </div>
      {syncPendingCount > 0 && (
        <span className="text-[9px] opacity-80">{syncPendingCount} change{syncPendingCount === 1 ? '' : 's'} queued for sync</span>
      )}
    </div>
  );
}
