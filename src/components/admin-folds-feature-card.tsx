'use client';

import { useEffect, useState } from 'react';
import { Save, ScrollText, Sparkles } from 'lucide-react';
import { adminApiFetch } from '@/lib/admin-client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import type { FoldsAdminConfig } from '@/lib/folds-feature';

export function AdminFoldsFeatureCard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [config, setConfig] = useState<FoldsAdminConfig | null>(null);

  useEffect(() => {
    adminApiFetch('/api/admin/folds')
      .then(async (res) => {
        const data = (await res.json()) as FoldsAdminConfig & { error?: string };
        if (!res.ok) throw new Error(data.error || 'Failed to load');
        setConfig(data);
        setEnabled(data.enabled);
      })
      .catch((err) => {
        console.warn('[admin folds]', err);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await adminApiFetch('/api/admin/folds', {
        method: 'POST',
        body: JSON.stringify({ enabled }),
      });
      const data = (await res.json().catch(() => ({}))) as FoldsAdminConfig & {
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setConfig(data);
      setEnabled(data.enabled);
      toast({
        title: data.enabled ? 'Folds live' : 'Folds off',
        description: data.enabled
          ? 'Passed bars, /folds, Artist Home Pass a bar, and realtime slips are on. Free for every signed-in artist — no Ink.'
          : 'Messaging is hidden. Existing sheets stay saved if you turn it back on.',
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
    <Card className="bg-card border-2 border-amber-500/25 shadow-2xl">
      <CardHeader className="border-b border-amber-500/10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="font-headline text-2xl uppercase flex items-center gap-2">
              <ScrollText className="h-6 w-6 text-amber-400" />
              Folds
            </CardTitle>
            <CardDescription className="mt-2 max-w-xl">
              Private lyric-sheet messaging (pass a bar, reply, wet ink / fold back, live slips + push).
              Free for every signed-in artist — no Ink, no Pro. Toggle live — no redeploy. Emergency:{' '}
              <code className="text-foreground/80">FOLDS_FORCE_OFF=1</code>.
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className={
              enabled ? 'border-amber-400 text-amber-300' : 'border-muted-foreground/40 text-muted-foreground'
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
                  <ScrollText className="h-4 w-4 text-amber-400" />
                  Enable Folds messaging
                </p>
                <p className="text-xs text-muted-foreground mt-1 max-w-md">
                  When on: header, Scene dock, Artist Home, Your circle, and /folds. Contact-on-page
                  (show / request) is separate and stays available.
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
                <strong>FOLDS_FORCE_OFF</strong> is set in the environment — admin cannot enable until
                that is cleared and the server restarts.
              </p>
            ) : null}

            {config?.source === 'env' && !config.updatedAt ? (
              <p className="text-xs text-amber-200/90 border border-amber-500/25 rounded-lg px-3 py-2">
                Currently on via <code className="text-foreground/80">NEXT_PUBLIC_FOLDS</code> bootstrap.
                Hit Deploy once to make Admin the source of truth.
              </p>
            ) : null}

            <ul className="text-[11px] text-muted-foreground space-y-1.5 list-disc list-inside">
              <li>Inbox <code className="text-foreground/80">/folds</code> · live sheet <code className="text-foreground/80">/folds/[id]</code></li>
              <li>Firestore listeners + FCM only while this is on</li>
              <li>No Ink charged. Visitor and Pro both get it when live.</li>
            </ul>

            {config?.updatedAt ? (
              <p className="text-[10px] text-muted-foreground font-code">
                Last updated {new Date(config.updatedAt).toLocaleString()}
                {config.updatedBy ? ` · ${config.updatedBy}` : ''}
                {config.source ? ` · source ${config.source}` : ''}
              </p>
            ) : null}
          </>
        )}
      </CardContent>
      <CardFooter className="border-t border-amber-500/10 py-5">
        <Button
          className="w-full h-12 font-bold uppercase tracking-[0.15em]"
          onClick={() => void handleSave()}
          disabled={saving || loading || config?.forceOff}
        >
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Deploying…' : enabled ? 'Turn On' : 'Turn Off'}
          <Sparkles className="ml-2 h-4 w-4 text-amber-300" />
        </Button>
      </CardFooter>
    </Card>
  );
}
