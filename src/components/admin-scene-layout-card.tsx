'use client';

import { useEffect, useState } from 'react';
import { LayoutGrid, Save, Undo2 } from 'lucide-react';
import { adminApiFetch } from '@/lib/admin-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
  SCENE_LAYOUT_CHANGED_EVENT,
  SCENE_PORTAL_HUB_DEFAULT_ENABLED,
  type SceneLayoutAdminConfig,
} from '@/lib/scene/portal-hub-config';

export function AdminSceneLayoutCard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [portalHubEnabled, setPortalHubEnabled] = useState(
    SCENE_PORTAL_HUB_DEFAULT_ENABLED
  );
  const [config, setConfig] = useState<SceneLayoutAdminConfig | null>(null);

  useEffect(() => {
    adminApiFetch('/api/admin/scene-layout')
      .then(async (response) => {
        const data = (await response.json()) as SceneLayoutAdminConfig & { error?: string };
        if (!response.ok) throw new Error(data.error || 'Failed to load');
        setConfig(data);
        setPortalHubEnabled(data.portalHubEnabled);
      })
      .catch((error) => console.warn('[admin scene layout]', error))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await adminApiFetch('/api/admin/scene-layout', {
        method: 'POST',
        body: JSON.stringify({ portalHubEnabled }),
      });
      const data = (await response.json().catch(() => ({}))) as SceneLayoutAdminConfig & {
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || 'Save failed');

      setConfig(data);
      setPortalHubEnabled(data.portalHubEnabled);
      window.dispatchEvent(
        new CustomEvent(SCENE_LAYOUT_CHANGED_EVENT, {
          detail: { portalHubEnabled: data.portalHubEnabled },
        })
      );
      toast({
        title: data.portalHubEnabled ? 'Portal Map is live' : 'Original Scene is live',
        description: data.portalHubEnabled
          ? 'Your Block and Discover now open in the full-screen swipe viewer.'
          : 'The inline Your Block and Discover feeds and shortcut dock are restored.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not change Scene layout',
        description: error instanceof Error ? error.message : 'Unknown error',
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
            <CardTitle className="flex items-center gap-2 font-headline text-2xl uppercase">
              <LayoutGrid className="h-6 w-6 text-cyan-400" />
              Scene Layout
            </CardTitle>
            <CardDescription className="mt-2 max-w-xl">
              Switch the signed-in Scene between the new Portal Map and the original full inline
              feed. The change is live and does not delete posts, preferences, or discovery data.
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className={
              portalHubEnabled
                ? 'border-cyan-400 text-cyan-300'
                : 'border-amber-400 text-amber-300'
            }
          >
            {portalHubEnabled ? 'PORTAL MAP' : 'ORIGINAL SCENE'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading Scene layout...</p>
        ) : (
          <>
            <div className="flex items-center justify-between gap-5 rounded-xl border border-white/10 bg-background/40 p-4">
              <div>
                <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white">
                  {portalHubEnabled ? (
                    <LayoutGrid className="h-4 w-4 text-cyan-400" />
                  ) : (
                    <Undo2 className="h-4 w-4 text-amber-400" />
                  )}
                  Use Portal Map
                </p>
                <p className="mt-1 max-w-md text-xs text-muted-foreground">
                  On uses the portal hub and immersive swipe feeds. Off restores the full inline
                  Your Block and Discover layout with the original Scene shortcut dock.
                </p>
              </div>
              <Switch checked={portalHubEnabled} onCheckedChange={setPortalHubEnabled} />
            </div>

            <p className="text-[11px] text-muted-foreground">
              Safe default: Portal Map. If the setting cannot load, visitors keep the current
              portal experience instead of flashing between layouts.
            </p>

            {config?.updatedAt ? (
              <p className="font-code text-[10px] text-muted-foreground">
                Last updated {new Date(config.updatedAt).toLocaleString()}
                {config.updatedBy ? ` · ${config.updatedBy}` : ''}
                {config.source ? ` · source ${config.source}` : ''}
              </p>
            ) : (
              <p className="font-code text-[10px] text-muted-foreground">
                No admin choice saved yet · using the Portal Map default
              </p>
            )}
          </>
        )}
      </CardContent>
      <CardFooter className="border-t border-cyan-500/10 py-5">
        <Button
          className="h-12 w-full font-bold uppercase tracking-[0.15em]"
          onClick={() => void handleSave()}
          disabled={saving || loading}
        >
          <Save className="mr-2 h-4 w-4" />
          {saving
            ? 'Saving...'
            : portalHubEnabled
              ? 'Use Portal Map'
              : 'Restore Original Scene'}
        </Button>
      </CardFooter>
    </Card>
  );
}
