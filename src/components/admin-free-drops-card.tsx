'use client';

import { useEffect, useState } from 'react';
import { Gift, Save, Sparkles } from 'lucide-react';
import { adminApiFetch } from '@/lib/admin-client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import type { FreeDropsAdminConfig } from '@/lib/free-drops-feature';

export function AdminFreeDropsCard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [config, setConfig] = useState<FreeDropsAdminConfig | null>(null);

  useEffect(() => {
    adminApiFetch('/api/admin/free-drops')
      .then(async (res) => {
        const data = (await res.json()) as FreeDropsAdminConfig & { error?: string };
        if (!res.ok) throw new Error(data.error || 'Failed to load');
        setConfig(data);
        setEnabled(data.enabled);
      })
      .catch((err) => {
        console.warn('[admin free drops]', err);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await adminApiFetch('/api/admin/free-drops', {
        method: 'POST',
        body: JSON.stringify({ enabled }),
      });
      const data = (await res.json().catch(() => ({}))) as FreeDropsAdminConfig & {
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setConfig(data);
      setEnabled(data.enabled);
      toast({
        title: data.enabled ? 'Free releases on' : 'Free releases off',
        description: data.enabled
          ? 'Artists can choose Free when pricing a release. Existing free drops stay free.'
          : 'Artists can no longer set new releases to Free. Drops already published free stay free.',
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Could not save',
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="bg-card border-2 border-cyan-500/25 shadow-2xl">
      <CardHeader className="border-b border-cyan-500/10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="font-headline text-2xl uppercase flex items-center gap-2">
              <Gift className="h-6 w-6 text-cyan-400" />
              Free releases
            </CardTitle>
            <CardDescription className="mt-2 max-w-xl">
              Let artists publish a release as <strong>Free</strong> so fans add it to Library without
              checkout. Toggle off to hide that pricing option — already-free releases stay free.
              Emergency: <code className="text-foreground/80">FREE_DROPS_FORCE_OFF=1</code>.
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className={
              enabled ? 'border-cyan-400 text-cyan-300' : 'border-muted-foreground/40 text-muted-foreground'
            }
          >
            {enabled ? 'ON' : 'OFF'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading config…</p>
        ) : (
          <>
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-background/40 p-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                  <Gift className="h-4 w-4 text-cyan-400" />
                  Allow artist free pricing
                </p>
                <p className="text-xs text-muted-foreground mt-1 max-w-md">
                  When off, New release only offers paid / pay-what-you-want. Fans can still stream
                  releases that were already published free.
                </p>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} disabled={config?.forceOff} />
            </div>

            {config?.forceOff ? (
              <p className="text-xs text-rose-300 border border-rose-500/30 rounded-lg px-3 py-2">
                <strong>FREE_DROPS_FORCE_OFF</strong> is set in the environment — admin cannot enable
                until that is cleared and the server restarts.
              </p>
            ) : null}

            {config?.updatedAt ? (
              <p className="text-[10px] text-muted-foreground font-code">
                Last updated {new Date(config.updatedAt).toLocaleString()}
                {config.updatedBy ? ` · ${config.updatedBy}` : ''}
                {config.source ? ` · source ${config.source}` : ''}
              </p>
            ) : (
              <p className="text-[10px] text-muted-foreground font-code">
                No admin save yet — currently {enabled ? 'ON' : 'OFF'} by default for testing.
              </p>
            )}
          </>
        )}
      </CardContent>
      <CardFooter className="border-t border-cyan-500/10 py-5">
        <Button
          className="w-full h-12 font-bold uppercase tracking-[0.15em]"
          onClick={() => void handleSave()}
          disabled={saving || loading || config?.forceOff}
        >
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Deploying…' : enabled ? 'Turn On' : 'Turn Off'}
          <Sparkles className="ml-2 h-4 w-4 text-cyan-300" />
        </Button>
      </CardFooter>
    </Card>
  );
}
