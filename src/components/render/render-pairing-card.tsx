'use client';

import { useCallback, useState } from 'react';
import { Copy, Loader2, Monitor, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/use-auth';
import { auth } from '@/lib/firebase/client/firebase';
import { useToast } from '@/hooks/use-toast';

type PairChallenge = { code: string; expiresAt: string };
type PairResult = { deviceId: string; deviceToken: string };

export function RenderPairingCard({
  onlineDevices,
  onPaired,
}: {
  onlineDevices: { id: string; label: string }[];
  onPaired?: () => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [challenge, setChallenge] = useState<PairChallenge | null>(null);
  const [label, setLabel] = useState('My Render PC');
  const [lastPair, setLastPair] = useState<PairResult | null>(null);

  const authHeaders = useCallback(async () => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error('Sign in required');
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  }, [user?.id]);

  const createCode = async () => {
    setLoading(true);
    try {
      const headers = await authHeaders();
      const res = await fetch('/api/render/devices/pair', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'create' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not create pairing code');
      setChallenge({ code: data.code, expiresAt: data.expiresAt });
      setLastPair(null);
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Pairing failed',
        description: (e as Error).message,
      });
    } finally {
      setLoading(false);
    }
  };

  const completePairing = async () => {
    if (!challenge?.code) return;
    setLoading(true);
    try {
      const headers = await authHeaders();
      const res = await fetch('/api/render/devices/pair', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'complete',
          code: challenge.code,
          label: label.trim() || 'Render PC',
          capability: 'compatible',
          companionVersion: '0.1.0',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not complete pairing');
      setLastPair({ deviceId: data.deviceId, deviceToken: data.deviceToken });
      setChallenge(null);
      onPaired?.();
      toast({ title: 'Render PC paired', description: 'Copy device env vars below into the companion terminal.' });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Pairing failed',
        description: (e as Error).message,
      });
    } finally {
      setLoading(false);
    }
  };

  const copyEnv = () => {
    if (!lastPair) return;
    const block = `RENDER_DEVICE_ID=${lastPair.deviceId}\nRENDER_DEVICE_TOKEN=${lastPair.deviceToken}`;
    void navigator.clipboard.writeText(block);
    toast({ title: 'Copied', description: 'Paste into your companion shell (with AKASHEET_ID_TOKEN set).' });
  };

  return (
    <div className="rounded-lg border border-violet-500/25 bg-violet-500/5 p-3 space-y-3 text-[10px] leading-snug">
      <div className="flex items-center gap-2 font-bold uppercase tracking-wide text-violet-200">
        <Monitor className="h-3.5 w-3.5" />
        Render Companion (local PC)
      </div>
      {onlineDevices.length > 0 ? (
        <p className="text-muted-foreground">
          Online: {onlineDevices.map((d) => d.label).join(', ')}. Keep{' '}
          <code className="text-[9px]">python -m akasheet_render.worker</code> running to claim queued jobs.
        </p>
      ) : (
        <p className="text-amber-100/90">
          No paired PC is heartbeating. Jobs stay <strong>queued</strong> until the companion polls your account.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" className="h-8 text-[9px] font-bold uppercase" disabled={loading} onClick={() => void createCode()}>
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="mr-1 h-3 w-3" />}
          Get pairing code
        </Button>
      </div>

      {challenge && (
        <div className="space-y-2 rounded-md border border-white/10 bg-background/40 p-2">
          <p>
            Code: <span className="font-code text-lg font-bold text-primary">{challenge.code}</span>
          </p>
          <p className="text-muted-foreground">Expires {new Date(challenge.expiresAt).toLocaleTimeString()}</p>
          <div className="space-y-1">
            <Label className="text-[9px] uppercase">PC label</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} className="h-8 text-xs" />
          </div>
          <Button type="button" size="sm" className="w-full h-8 text-[9px] font-bold uppercase" disabled={loading} onClick={() => void completePairing()}>
            Confirm pairing in AKAsheet
          </Button>
          <p className="text-muted-foreground">
            Click confirm to register this PC, copy the <code className="text-[9px]">RENDER_DEVICE_*</code> lines to
            that machine, set <code className="text-[9px]">AKASHEET_ID_TOKEN</code>, then run{' '}
            <code className="text-[9px]">python -m akasheet_render.worker</code> from{' '}
            <code className="text-[9px]">render-companion/</code>.
          </p>
        </div>
      )}

      {lastPair && (
        <div className="space-y-1 rounded-md border border-green-500/30 bg-green-500/10 p-2 font-code text-[9px] break-all">
          <p>RENDER_DEVICE_ID={lastPair.deviceId}</p>
          <p>RENDER_DEVICE_TOKEN={lastPair.deviceToken}</p>
          <Button type="button" size="sm" variant="secondary" className="h-7 text-[9px] mt-1" onClick={copyEnv}>
            <Copy className="mr-1 h-3 w-3" /> Copy env lines
          </Button>
        </div>
      )}
    </div>
  );
}
