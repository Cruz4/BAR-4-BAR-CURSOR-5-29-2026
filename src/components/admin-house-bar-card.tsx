'use client';

import { useEffect, useState } from 'react';
import { Radio, Save, Sparkles } from 'lucide-react';
import { adminApiFetch } from '@/lib/admin-client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { DEFAULT_HOUSE_BAR, type HouseBarAdminConfig } from '@/lib/scene/live-events';

export function AdminHouseBarCard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [title, setTitle] = useState(DEFAULT_HOUSE_BAR.title);
  const [seedBar, setSeedBar] = useState(DEFAULT_HOUSE_BAR.seedBar);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    adminApiFetch('/api/admin/house-bar')
      .then(async (res) => {
        const data = (await res.json()) as HouseBarAdminConfig & { error?: string };
        if (!res.ok) throw new Error(data.error || 'Failed to load');
        setEnabled(data.enabled);
        setTitle(data.title || DEFAULT_HOUSE_BAR.title);
        setSeedBar(data.seedBar || DEFAULT_HOUSE_BAR.seedBar);
        setUpdatedAt(data.updatedAt);
      })
      .catch((err) => {
        console.warn('[admin house bar]', err);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await adminApiFetch('/api/admin/house-bar', {
        method: 'POST',
        body: JSON.stringify({ enabled, title, seedBar }),
      });
      const data = (await res.json().catch(() => ({}))) as HouseBarAdminConfig & { error?: string };
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setEnabled(data.enabled);
      setTitle(data.title);
      setSeedBar(data.seedBar);
      setUpdatedAt(data.updatedAt);
      toast({
        title: data.enabled ? 'House bar live on The Scene' : 'House bar of the day off',
        description: data.enabled
          ? 'Pinned on The Scene. House LOCK seed updated to this bar.'
          : 'Hidden from The Scene. Existing /lock/house echoes stay.',
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
              <Radio className="h-6 w-6 text-fuchsia-400" />
              House bar of the day
            </CardTitle>
            <CardDescription className="mt-2 max-w-xl">
              One shared unfinished bar pinned on The Scene. Toggle live and rewrite the line
              anytime — no redeploy. Updates the house LOCK seed at{' '}
              <code className="text-foreground/80">/lock/house</code>.
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
      <CardContent className="space-y-5 pt-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading config…</p>
        ) : (
          <>
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-background/40 p-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-wider text-white">Pin on The Scene</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-md">
                  When on, every signed-in artist sees this bar above the feed.
                </p>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="house-bar-title" className="text-[10px] font-bold uppercase tracking-widest">
                Label
              </Label>
              <Input
                id="house-bar-title"
                value={title}
                maxLength={80}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="house-bar-seed" className="text-[10px] font-bold uppercase tracking-widest">
                Today&apos;s bar
              </Label>
              <Textarea
                id="house-bar-seed"
                value={seedBar}
                maxLength={280}
                rows={3}
                onChange={(e) => setSeedBar(e.target.value)}
                className="font-code text-sm"
              />
            </div>
            {updatedAt ? (
              <p className="text-[10px] text-muted-foreground font-code">
                Last updated {new Date(updatedAt).toLocaleString()}
              </p>
            ) : null}
          </>
        )}
      </CardContent>
      <CardFooter className="border-t border-fuchsia-500/10 py-5">
        <Button
          className="w-full h-12 font-bold uppercase tracking-[0.15em]"
          onClick={() => void handleSave()}
          disabled={saving || loading}
        >
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Deploying…' : enabled ? 'Save & pin' : 'Save (hidden)'}
          <Sparkles className="ml-2 h-4 w-4 text-fuchsia-300" />
        </Button>
      </CardFooter>
    </Card>
  );
}
