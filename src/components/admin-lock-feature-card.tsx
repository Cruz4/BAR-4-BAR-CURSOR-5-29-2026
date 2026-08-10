'use client';

import { useEffect, useState } from 'react';
import { Lock, Radio, Save, Sparkles } from 'lucide-react';
import { adminApiFetch } from '@/lib/admin-client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import type { LockFeatureAdminConfig } from '@/lib/lock-feature';

export function AdminLockFeatureCard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [config, setConfig] = useState<LockFeatureAdminConfig | null>(null);

  useEffect(() => {
    adminApiFetch('/api/admin/lock-feature')
      .then(async (res) => {
        const data = (await res.json()) as LockFeatureAdminConfig & { error?: string };
        if (!res.ok) throw new Error(data.error || 'Failed to load');
        setConfig(data);
        setEnabled(data.enabled);
      })
      .catch((err) => {
        console.warn('[admin lock feature]', err);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await adminApiFetch('/api/admin/lock-feature', {
        method: 'POST',
        body: JSON.stringify({ enabled }),
      });
      const data = (await res.json().catch(() => ({}))) as LockFeatureAdminConfig & {
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setConfig(data);
      setEnabled(data.enabled);
      toast({
        title: data.enabled ? 'Finish-the-bar live' : 'Finish-the-bar off',
        description: data.enabled
          ? '/lock routes, Discover cards, Artist Home module, Press Desk publish — guest home stays try/marketing.'
          : 'Finish-the-bar routes redirect home. Guest try / marketing unchanged.',
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
    <Card className="bg-card border-2 border-emerald-500/25 shadow-2xl">
      <CardHeader className="border-b border-emerald-500/10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="font-headline text-2xl uppercase flex items-center gap-2">
              <Radio className="h-6 w-6 text-emerald-400" />
              Finish this bar
            </CardTitle>
            <CardDescription className="mt-2 max-w-xl">
              Optional unfinished-bar casts: /lock routes, Scene Discover cards, Artist Home module,
              Press Desk publish. Does <strong>not</strong> steal guest home (try / marketing stay the
              front door). Toggle live — no redeploy. Emergency:{' '}
              <code className="text-foreground/80">LOCK_FORCE_OFF=1</code>.
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className={
              enabled ? 'border-emerald-400 text-emerald-300' : 'border-muted-foreground/40 text-muted-foreground'
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
                  <Lock className="h-4 w-4 text-emerald-400" />
                  Enable finish-the-bar
                </p>
                <p className="text-xs text-muted-foreground mt-1 max-w-md">
                  When on: shared /lock links and Discover work. Guest `/` still goes to try or
                  marketing — never hijacked.
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
                <strong>LOCK_FORCE_OFF</strong> is set in the environment — admin cannot enable until
                that is cleared and the server restarts.
              </p>
            ) : null}

            {config?.source === 'env' && !config.updatedAt ? (
              <p className="text-xs text-amber-200/90 border border-amber-500/25 rounded-lg px-3 py-2">
                Currently on via <code className="text-foreground/80">NEXT_PUBLIC_LOCK</code> bootstrap.
                Hit Deploy once to make Admin the source of truth.
              </p>
            ) : null}

            <ul className="text-[11px] text-muted-foreground space-y-1.5 list-disc list-inside">
              <li>House prompt: <code className="text-foreground/80">/lock/house</code></li>
              <li>Press Desk → Finish this bar · Artist Home module · Scene Discover</li>
              <li>How-to / What&apos;s New copy follows this flag</li>
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
      <CardFooter className="border-t border-emerald-500/10 py-5">
        <Button
          className="w-full h-12 font-bold uppercase tracking-[0.15em]"
          onClick={() => void handleSave()}
          disabled={saving || loading || config?.forceOff}
        >
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Deploying…' : enabled ? 'Turn On' : 'Turn Off'}
          <Sparkles className="ml-2 h-4 w-4 text-emerald-300" />
        </Button>
      </CardFooter>
    </Card>
  );
}
