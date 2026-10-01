'use client';

import { useEffect, useState } from 'react';
import { Layers, Save, Sparkles } from 'lucide-react';
import { adminApiFetch } from '@/lib/admin-client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import type { ImprintPressPlusAdminConfig } from '@/lib/imprint-press-plus';

export function AdminImprintPressPlusCard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [config, setConfig] = useState<ImprintPressPlusAdminConfig | null>(null);

  useEffect(() => {
    adminApiFetch('/api/admin/imprint-press-plus')
      .then(async (res) => {
        const data = (await res.json()) as ImprintPressPlusAdminConfig & { error?: string };
        if (!res.ok) throw new Error(data.error || 'Failed to load');
        setConfig(data);
        setEnabled(data.enabled);
      })
      .catch((err) => {
        console.warn('[admin imprint plus]', err);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await adminApiFetch('/api/admin/imprint-press-plus', {
        method: 'POST',
        body: JSON.stringify({ enabled }),
      });
      const data = (await res.json().catch(() => ({}))) as ImprintPressPlusAdminConfig & {
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setConfig(data);
      setEnabled(data.enabled);
      toast({
        title: data.enabled ? 'Imprint plus on' : 'Imprint plus off',
        description: data.enabled
          ? 'Imprints pull from the expanded layer pool, extra highlights, and deeper cuts. Turn off any time to revert.'
          : 'Imprints use the classic layer set again.',
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
    <Card className="bg-card border-2 border-violet-500/25 shadow-2xl">
      <CardHeader className="border-b border-violet-500/10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="font-headline text-2xl uppercase flex items-center gap-2">
              <Layers className="h-6 w-6 text-violet-400" />
              Imprint plus
            </CardTitle>
            <CardDescription className="mt-2 max-w-xl">
              Experimental imprint variety — doubles the layer pool, adds highlight and ornament modes, and
              deeper die-cut styles. Off by default; same bar + faders stay deterministic.
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className={
              enabled
                ? 'border-violet-400 text-violet-300'
                : 'border-muted-foreground/40 text-muted-foreground'
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
                  <Layers className="h-4 w-4 text-violet-400" />
                  Expanded imprint layers
                </p>
                <p className="text-xs text-muted-foreground mt-1 max-w-md">
                  Extra animated backdrops and accents — still clean and motion-gated like today.
                </p>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>
            {config?.updatedAt ? (
              <p className="text-[10px] text-muted-foreground font-code">
                Last updated {new Date(config.updatedAt).toLocaleString()}
                {config.updatedBy ? ` · ${config.updatedBy}` : ''}
              </p>
            ) : (
              <p className="text-[10px] text-muted-foreground font-code">
                Never saved — classic imprint set only.
              </p>
            )}
          </>
        )}
      </CardContent>
      <CardFooter className="border-t border-violet-500/10 py-5">
        <Button
          className="w-full h-12 font-bold uppercase tracking-[0.15em]"
          onClick={() => void handleSave()}
          disabled={saving || loading}
        >
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving…' : enabled ? 'Turn On' : 'Turn Off'}
          <Sparkles className="ml-2 h-4 w-4 text-violet-300" />
        </Button>
      </CardFooter>
    </Card>
  );
}
