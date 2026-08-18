'use client';

import { useEffect, useState } from 'react';
import { Music, Save, Sparkles } from 'lucide-react';
import { adminApiFetch } from '@/lib/admin-client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import type { FirstDropsAdminConfig } from '@/lib/first-drops-feature';
import { dropArtistShareLabel } from '@/lib/drop-commerce';

export function AdminFirstDropsCard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [config, setConfig] = useState<FirstDropsAdminConfig | null>(null);

  useEffect(() => {
    adminApiFetch('/api/admin/first-drops')
      .then(async (res) => {
        const data = (await res.json()) as FirstDropsAdminConfig & { error?: string };
        if (!res.ok) throw new Error(data.error || 'Failed to load');
        setConfig(data);
        setEnabled(data.enabled);
      })
      .catch((err) => {
        console.warn('[admin first drops]', err);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await adminApiFetch('/api/admin/first-drops', {
        method: 'POST',
        body: JSON.stringify({ enabled }),
      });
      const data = (await res.json().catch(() => ({}))) as FirstDropsAdminConfig & {
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setConfig(data);
      setEnabled(data.enabled);
      toast({
        title: data.enabled ? 'First Drops live' : 'First Drops off',
        description: data.enabled
          ? 'Audio upload, pricing, buy/stream, Library, Earnings cashout, and First Drop Discover cards are on.'
          : 'Commerce is hidden. DNA Drops still work. Existing purchases and earnings stay saved if you turn it back on.',
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
    <Card className="bg-card border-2 border-fuchsia-500/25 shadow-2xl">
      <CardHeader className="border-b border-fuchsia-500/10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="font-headline text-2xl uppercase flex items-center gap-2">
              <Music className="h-6 w-6 text-fuchsia-400" />
              First Drops
            </CardTitle>
            <CardDescription className="mt-2 max-w-xl">
              Buy-once audio on DNA Drops: upload, set price or pay-what-you-want, stream in-app.
              Artists cash out {dropArtistShareLabel()} on Earnings after connecting Stripe payouts.
              Toggle live — no redeploy. Emergency:{' '}
              <code className="text-foreground/80">FIRST_DROPS_FORCE_OFF=1</code>.
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className={
              enabled ? 'border-fuchsia-400 text-fuchsia-300' : 'border-muted-foreground/40 text-muted-foreground'
            }
          >
            {enabled ? 'LIVE' : 'OFF'}
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
                  <Music className="h-4 w-4 text-fuchsia-400" />
                  Enable First Drops
                </p>
                <p className="text-xs text-muted-foreground mt-1 max-w-md">
                  When off: no audio upload, no checkout, no Library, no Earnings cashout, no First Drop labels. DNA Drop
                  links and lyrics stay.
                </p>
              </div>
              <Switch
                checked={enabled}
                onCheckedChange={setEnabled}
                disabled={config?.forceOff}
              />
            </div>

            {config?.forceOff ? (
              <p className="text-xs text-rose-300 border border-rose-500/30 rounded-lg px-3 py-2">
                <strong>FIRST_DROPS_FORCE_OFF</strong> is set in the environment — admin cannot enable
                until that is cleared and the server restarts.
              </p>
            ) : null}

            <ul className="text-[11px] text-muted-foreground space-y-1.5 list-disc list-inside">
              <li>Scene dock → Press a song — upload, price, press live</li>
              <li>Public /share player + Stripe buy / pay-what-you-want</li>
              <li>Library + Discover “First Drop” cards</li>
              <li>Earnings — Connect payouts, held sales, Stripe bank cashout</li>
            </ul>

            {config?.updatedAt ? (
              <p className="text-[10px] text-muted-foreground font-code">
                Last updated {new Date(config.updatedAt).toLocaleString()}
                {config.updatedBy ? ` · ${config.updatedBy}` : ''}
                {config.source ? ` · source ${config.source}` : ''}
              </p>
            ) : (
              <p className="text-[10px] text-muted-foreground font-code">
                No admin save yet — currently {enabled ? 'ON' : 'OFF'} by default. Hit Deploy to lock it.
              </p>
            )}
          </>
        )}
      </CardContent>
      <CardFooter className="border-t border-fuchsia-500/10 py-5">
        <Button
          className="w-full h-12 font-bold uppercase tracking-[0.15em]"
          onClick={() => void handleSave()}
          disabled={saving || loading || config?.forceOff}
        >
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Deploying…' : enabled ? 'Turn On' : 'Turn Off'}
          <Sparkles className="ml-2 h-4 w-4 text-fuchsia-300" />
        </Button>
      </CardFooter>
    </Card>
  );
}
