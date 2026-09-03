'use client';

import { useEffect, useState } from 'react';
import { Save, Sparkles, Users } from 'lucide-react';
import { adminApiFetch } from '@/lib/admin-client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import type { CollabSheetAdminConfig } from '@/lib/collab-sheet-feature';

export function AdminCollabSheetFeatureCard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [config, setConfig] = useState<CollabSheetAdminConfig | null>(null);

  useEffect(() => {
    adminApiFetch('/api/admin/collab-sheet')
      .then(async (res) => {
        const data = (await res.json()) as CollabSheetAdminConfig & { error?: string };
        if (!res.ok) throw new Error(data.error || 'Failed to load');
        setConfig(data);
        setEnabled(data.enabled);
      })
      .catch((err) => {
        console.warn('[admin collab-sheet]', err);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await adminApiFetch('/api/admin/collab-sheet', {
        method: 'POST',
        body: JSON.stringify({ enabled }),
      });
      const data = (await res.json().catch(() => ({}))) as CollabSheetAdminConfig & {
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setConfig(data);
      setEnabled(data.enabled);
      toast({
        title: data.enabled ? 'Collab Sheet live' : 'Collab Sheet off',
        description: data.enabled
          ? 'Pro owners can open live shared sheets — collaborators edit in real time with chat on the track.'
          : 'Collab Sheet is hidden. Existing sheets stay saved if you turn it back on.',
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
              <Users className="h-6 w-6 text-violet-400" />
              Collab Sheet
            </CardTitle>
            <CardDescription className="mt-2 max-w-xl">
              Live shared lyric sheets on tracks — real-time sync, presence, and in-sheet chat.
              Studio Pro required to open/share as owner; invited friends edit free. Toggle live — no redeploy.
              Emergency: <code className="text-foreground/80">COLLAB_SHEET_FORCE_OFF=1</code>.
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className={
              enabled ? 'border-violet-400 text-violet-300' : 'border-muted-foreground/40 text-muted-foreground'
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
                  <Users className="h-4 w-4 text-violet-400" />
                  Enable Collab Sheet
                </p>
                <p className="text-xs text-muted-foreground mt-1 max-w-md">
                  When on: left panel Collab Sheet button, live presence chip, vault section, and album badges.
                </p>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} disabled={config?.forceOff} />
            </div>

            {config?.forceOff ? (
              <p className="text-xs text-rose-300 border border-rose-500/30 rounded-lg px-3 py-2">
                <strong>COLLAB_SHEET_FORCE_OFF</strong> is set in the environment — admin cannot enable until that
                is cleared and the server restarts.
              </p>
            ) : null}

            {config?.source === 'env' && !config.updatedAt ? (
              <p className="text-xs text-violet-200/90 border border-violet-500/25 rounded-lg px-3 py-2">
                Currently on via <code className="text-foreground/80">NEXT_PUBLIC_COLLAB_SHEET</code> bootstrap. Hit
                Deploy once to make Admin the source of truth.
              </p>
            ) : null}

            <ul className="text-[11px] text-muted-foreground space-y-1.5 list-disc list-inside">
              <li>Track editor · live 2/13 presence · bottom chat drawer</li>
              <li>Firestore <code className="text-foreground/80">collabSheets</code> · API sync for edits</li>
              <li>Pro to share; collaborators need a AKAsheet account</li>
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
      <CardFooter className="border-t border-violet-500/10 py-5">
        <Button
          className="w-full h-12 font-bold uppercase tracking-[0.15em]"
          onClick={() => void handleSave()}
          disabled={saving || loading || config?.forceOff}
        >
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Deploying…' : enabled ? 'Turn On' : 'Turn Off'}
          <Sparkles className="ml-2 h-4 w-4 text-violet-300" />
        </Button>
      </CardFooter>
    </Card>
  );
}
