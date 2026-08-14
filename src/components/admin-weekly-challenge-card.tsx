'use client';

import { useEffect, useState } from 'react';
import { CalendarRange, Save, Sparkles } from 'lucide-react';
import { adminApiFetch } from '@/lib/admin-client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  DEFAULT_WEEKLY_CHALLENGE,
  type WeeklyChallengeAdminConfig,
} from '@/lib/scene/live-events';

export function AdminWeeklyChallengeCard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [title, setTitle] = useState(DEFAULT_WEEKLY_CHALLENGE.title);
  const [description, setDescription] = useState(DEFAULT_WEEKLY_CHALLENGE.description);
  const [targetBars, setTargetBars] = useState(DEFAULT_WEEKLY_CHALLENGE.targetBars);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    adminApiFetch('/api/admin/weekly-challenge')
      .then(async (res) => {
        const data = (await res.json()) as WeeklyChallengeAdminConfig & { error?: string };
        if (!res.ok) throw new Error(data.error || 'Failed to load');
        setEnabled(data.enabled);
        setTitle(data.title || DEFAULT_WEEKLY_CHALLENGE.title);
        setDescription(data.description || DEFAULT_WEEKLY_CHALLENGE.description);
        setTargetBars(data.targetBars || DEFAULT_WEEKLY_CHALLENGE.targetBars);
        setUpdatedAt(data.updatedAt);
      })
      .catch((err) => {
        console.warn('[admin weekly challenge]', err);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await adminApiFetch('/api/admin/weekly-challenge', {
        method: 'POST',
        body: JSON.stringify({ enabled, title, description, targetBars }),
      });
      const data = (await res.json().catch(() => ({}))) as WeeklyChallengeAdminConfig & {
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setEnabled(data.enabled);
      setTitle(data.title);
      setDescription(data.description);
      setTargetBars(data.targetBars);
      setUpdatedAt(data.updatedAt);
      toast({
        title: data.enabled ? 'Weekly challenge live on The Scene' : 'Weekly challenge off',
        description: data.enabled
          ? 'Pinned on The Scene. Progress uses each artist’s written bars this week.'
          : 'Hidden from The Scene. Studio Progress weekly goals are unchanged.',
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
              <CalendarRange className="h-6 w-6 text-amber-400" />
              Weekly public challenge
            </CardTitle>
            <CardDescription className="mt-2 max-w-xl">
              A Scene-wide weekly cypher. Toggle on/off and rewrite the prompt anytime. Counts
              hand-written rhyme bars (same counter as Studio Progress). Resets Monday UTC.
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
      <CardContent className="space-y-5 pt-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading config…</p>
        ) : (
          <>
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-background/40 p-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-wider text-white">Pin on The Scene</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-md">
                  When on, artists see the challenge and their own bar count.
                </p>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weekly-title" className="text-[10px] font-bold uppercase tracking-widest">
                Title
              </Label>
              <Input
                id="weekly-title"
                value={title}
                maxLength={80}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weekly-desc" className="text-[10px] font-bold uppercase tracking-widest">
                Description
              </Label>
              <Textarea
                id="weekly-desc"
                value={description}
                maxLength={280}
                rows={3}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weekly-target" className="text-[10px] font-bold uppercase tracking-widest">
                Target (rhyme bars)
              </Label>
              <Input
                id="weekly-target"
                type="number"
                min={1}
                max={256}
                value={targetBars}
                onChange={(e) => setTargetBars(parseInt(e.target.value, 10) || 1)}
                className="max-w-[8rem] font-mono"
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
      <CardFooter className="border-t border-amber-500/10 py-5">
        <Button
          className="w-full h-12 font-bold uppercase tracking-[0.15em]"
          onClick={() => void handleSave()}
          disabled={saving || loading}
        >
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Deploying…' : enabled ? 'Save & pin' : 'Save (hidden)'}
          <Sparkles className="ml-2 h-4 w-4 text-amber-300" />
        </Button>
      </CardFooter>
    </Card>
  );
}
