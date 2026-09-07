'use client';

import { useEffect, useState } from 'react';
import { Moon, Save, Sparkles } from 'lucide-react';
import { adminApiFetch } from '@/lib/admin-client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  TONIGHTS_FORM_NIGHT_END_HOUR,
  TONIGHTS_FORM_NIGHT_START_HOUR,
  TONIGHTS_FORM_SLOT_COUNT,
  TONIGHTS_FORM_TZ,
  type TonightsFormAdminConfig,
} from '@/lib/tonights-form';

export function AdminTonightsFormCard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [seedHouseBar, setSeedHouseBar] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    adminApiFetch('/api/admin/tonights-form')
      .then(async (res) => {
        const data = (await res.json()) as TonightsFormAdminConfig & { error?: string };
        if (!res.ok) throw new Error(data.error || 'Failed to load');
        setEnabled(data.enabled);
        setSeedHouseBar(data.seedHouseBar !== false);
        setUpdatedAt(data.updatedAt);
      })
      .catch((err) => {
        console.warn('[admin tonights form]', err);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await adminApiFetch('/api/admin/tonights-form', {
        method: 'POST',
        body: JSON.stringify({ enabled, seedHouseBar }),
      });
      const data = (await res.json().catch(() => ({}))) as TonightsFormAdminConfig & {
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setEnabled(data.enabled);
      setSeedHouseBar(data.seedHouseBar !== false);
      setUpdatedAt(data.updatedAt);
      toast({
        title: data.enabled ? "Tonight's Form live on The Scene" : "Tonight's Form off",
        description: data.enabled
          ? 'Artists can claim one of 16 seats each night (6 PM–sunrise Eastern).'
          : 'Hidden from The Scene. Past archived forms stay at /form/[date].',
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
    <Card className="bg-card border-2 border-indigo-500/25 shadow-2xl">
      <CardHeader className="border-b border-indigo-500/10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="font-headline text-2xl uppercase flex items-center gap-2">
              <Moon className="h-6 w-6 text-indigo-400" />
              Tonight&apos;s Form
            </CardTitle>
            <CardDescription className="mt-2 max-w-2xl space-y-2 text-sm leading-relaxed">
              <p>
                A communal 16-seat lyric sheet on The Scene — one bar per writer per night. Not a
                collab track, not AI generation, not chat. Think open mic with numbered seats that
                disappear at sunrise.
              </p>
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className={
              enabled
                ? 'border-indigo-400 text-indigo-300'
                : 'border-muted-foreground/40 text-muted-foreground'
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
            <div className="rounded-xl border border-white/10 bg-background/40 p-4 space-y-3 text-xs leading-relaxed text-muted-foreground">
              <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-200/90">
                How it works
              </p>
              <ul className="list-disc space-y-2 pl-4">
                <li>
                  Each night ({TONIGHTS_FORM_NIGHT_START_HOUR === 18 ? '6 PM' : `${TONIGHTS_FORM_NIGHT_START_HOUR}:00`}–
                  {TONIGHTS_FORM_NIGHT_END_HOUR === 6 ? '6 AM' : `${TONIGHTS_FORM_NIGHT_END_HOUR}:00`}{' '}
                  {TONIGHTS_FORM_TZ.replace('_', ' ')}) opens a blank {TONIGHTS_FORM_SLOT_COUNT}-bar form on
                  The Scene.
                </li>
                <li>
                  A signed-in writer taps one empty seat and posts <strong className="text-white/90">one bar</strong>{' '}
                  (their couplet). They only get one seat per night.
                </li>
                <li>
                  The Scene shows seat number, display name, and that bar — not their whole Vault sheet.
                </li>
                <li>
                  At sunrise the form <strong className="text-white/90">freezes</strong> as an archive
                  (e.g. &quot;Form of Sep 7&quot;) at <span className="font-code">/form/YYYY-MM-DD</span>.
                  Tomorrow night starts fresh.
                </li>
                <li>
                  Optional: seat 1 can auto-fill from today&apos;s House bar seed when House bar is on.
                </li>
              </ul>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-background/40 p-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-wider text-white">Show on The Scene</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-md">
                  When off, artists never see the card. Archived nights remain readable at their URLs.
                </p>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-background/40 p-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-wider text-white">Seed seat 1 from House bar</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-md">
                  When House bar of the day is live, slot 1 opens with that seed line (labeled House).
                  Turn off to start completely blank.
                </p>
              </div>
              <Switch checked={seedHouseBar} onCheckedChange={setSeedHouseBar} disabled={!enabled} />
            </div>

            {updatedAt ? (
              <p className="text-[10px] text-muted-foreground font-code">
                Last updated {new Date(updatedAt).toLocaleString()}
              </p>
            ) : (
              <p className="text-[10px] text-muted-foreground font-code">
                Default: off (safe until you opt in)
              </p>
            )}
          </>
        )}
      </CardContent>
      <CardFooter className="border-t border-indigo-500/10 py-5">
        <Button
          className="w-full h-12 font-bold uppercase tracking-[0.15em]"
          onClick={() => void handleSave()}
          disabled={saving || loading}
        >
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Deploying…' : enabled ? 'Save & go live' : 'Save (hidden)'}
          <Sparkles className="ml-2 h-4 w-4 text-indigo-300" />
        </Button>
      </CardFooter>
    </Card>
  );
}
