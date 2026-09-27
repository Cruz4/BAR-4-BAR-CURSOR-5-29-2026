'use client';

import { useEffect, useState } from 'react';
import { Flame, Save, Sparkles } from 'lucide-react';
import { adminApiFetch } from '@/lib/admin-client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import type { DiscoverHeatAdminConfig } from '@/lib/discover-heat';

export function AdminDiscoverHeatCard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [config, setConfig] = useState<DiscoverHeatAdminConfig | null>(null);

  useEffect(() => {
    adminApiFetch('/api/admin/discover-heat')
      .then(async (res) => {
        const data = (await res.json()) as DiscoverHeatAdminConfig & { error?: string };
        if (!res.ok) throw new Error(data.error || 'Failed to load');
        setConfig(data);
        setEnabled(data.enabled);
      })
      .catch((err) => {
        console.warn('[admin discover heat]', err);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await adminApiFetch('/api/admin/discover-heat', {
        method: 'POST',
        body: JSON.stringify({ enabled }),
      });
      const data = (await res.json().catch(() => ({}))) as DiscoverHeatAdminConfig & {
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setConfig(data);
      setEnabled(data.enabled);
      toast({
        title: data.enabled ? 'Discover heat on' : 'Discover heat off',
        description: data.enabled
          ? 'Discover mixes recent posts with posts people are still responding to. Each viewer’s taste still tilts the order.'
          : 'Discover is newest-first again. Loves, replies, Reverbs, and views keep their scores for the next time you turn this on.',
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
    <Card className="bg-card border-2 border-orange-500/25 shadow-2xl">
      <CardHeader className="border-b border-orange-500/10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="font-headline text-2xl uppercase flex items-center gap-2">
              <Flame className="h-6 w-6 text-orange-400" />
              Discover heat
            </CardTitle>
            <CardDescription className="mt-2 max-w-xl">
              Test mix for The Scene and /discover. Off by default. When on, a post that people Love,
              reply to, or Reverb can rise inside the same feed — including after it leaves the newest
              posts. No separate Hot section. Turn it off any time to go back to newest-first.
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className={
              enabled
                ? 'border-orange-400 text-orange-300'
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
                  <Flame className="h-4 w-4 text-orange-400" />
                  Mix heat into Discover
                </p>
                <p className="text-xs text-muted-foreground mt-1 max-w-md">
                  A Love, reply, or Reverb from someone else counts more than a unique view. Your own
                  actions do not. Taste match still changes the order for each signed-in viewer.
                </p>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>
            <ul className="text-[11px] text-muted-foreground space-y-1.5 list-disc list-inside">
              <li>Scores are kept while this is off, so turning it on uses activity since this shipped.</li>
              <li>Posts nobody has touched in 14 days stay out of the warm pull.</li>
              <li>Charts, Emerging, and Your Block are unchanged.</li>
            </ul>
            {config?.updatedAt ? (
              <p className="text-[10px] text-muted-foreground font-code">
                Last updated {new Date(config.updatedAt).toLocaleString()}
                {config.updatedBy ? ` · ${config.updatedBy}` : ''}
              </p>
            ) : (
              <p className="text-[10px] text-muted-foreground font-code">
                Never saved — Discover stays newest-first.
              </p>
            )}
          </>
        )}
      </CardContent>
      <CardFooter className="border-t border-orange-500/10 py-5">
        <Button
          className="w-full h-12 font-bold uppercase tracking-[0.15em]"
          onClick={() => void handleSave()}
          disabled={saving || loading}
        >
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving…' : enabled ? 'Turn On' : 'Turn Off'}
          <Sparkles className="ml-2 h-4 w-4 text-orange-300" />
        </Button>
      </CardFooter>
    </Card>
  );
}
