'use client';

import React, { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import {
  fetchActivityPrefs,
  saveActivityPrefs,
  savePushToken,
} from '@/lib/activity/client';
import { DEFAULT_ACTIVITY_PREFS, type ActivityPrefs } from '@/lib/activity/types';
import { registerActivityPush } from '@/lib/activity/push';

export function NotificationSettingsCard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<ActivityPrefs>({ ...DEFAULT_ACTIVITY_PREFS });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const pushSupported =
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    Boolean(process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    void fetchActivityPrefs()
      .then(setPrefs)
      .finally(() => setLoading(false));
  }, [user]);

  const persist = async (next: ActivityPrefs) => {
    setSaving(true);
    setPrefs(next);
    try {
      await saveActivityPrefs(next);
      if (next.pushEnabled) {
        const result = await registerActivityPush();
        if (result.ok) {
          await savePushToken(result.token);
        } else if (pushSupported) {
          const description =
            result.reason === 'permission'
              ? 'Allow notifications in your browser (address-bar tune icon → Notifications → Allow), then try again.'
              : result.reason === 'push_service'
                ? 'Chrome push registration failed. Clear site data for akasheet.com (or try another browser/profile), reload, then turn Push on once — don’t toggle it repeatedly.'
                : result.reason === 'unsupported'
                  ? 'This browser doesn’t support web push.'
                  : result.message || 'Could not register for push alerts.';
          toast({
            title: result.reason === 'permission' ? 'Permission needed' : 'Push not available yet',
            description,
          });
          // Keep the account pref on so other devices (and later retries) still receive.
        }
      } else {
        // Keep the browser push subscription; only stop sending to this account.
        await savePushToken(null);
      }
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Could not save notification settings',
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <Card className="border-emerald-500/25">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2.5 font-headline text-2xl">
          {prefs.pushEnabled ? (
            <Bell className="h-6 w-6 text-emerald-400" />
          ) : (
            <BellOff className="h-6 w-6 text-muted-foreground" />
          )}
          Notifications
        </CardTitle>
        <CardDescription className="text-sm leading-relaxed">
          In-app Activity inbox is always on. Push is for your craft — unfinished verse,
          streak at midnight, someone echoing your bar — not a dump of feed posts.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : (
          <>
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border/80 bg-muted/20 px-3.5 py-3">
              <div>
                <Label className="text-sm font-bold">Push notifications</Label>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {pushSupported
                    ? 'Badge on the app icon + alerts for your verse, streak, and echoes. Install AKAsheet to your home screen and allow notifications in Android settings.'
                    : 'Add NEXT_PUBLIC_FIREBASE_VAPID_KEY to enable push. In-app inbox still works.'}
                </p>
              </div>
              <Switch
                checked={prefs.pushEnabled}
                disabled={saving || !pushSupported}
                onCheckedChange={(checked) => void persist({ ...prefs, pushEnabled: checked })}
              />
            </div>

            {(
              [
                ['craftReminders', 'Verse still open + streak at midnight'],
                ['lockCasts', 'Someone echoed your bar'],
                ['friendRequests', 'Friend + contact requests'],
                ['foldBars', 'Msgs'],
                ['friendAccepted', 'Friend accepted'],
                ['relationships', 'Followers + Inner Circle support'],
                ['postLoves', 'Loves on your posts'],
                ['postReplies', 'Replies on your posts'],
                ['dnaImports', 'Lyrics DNA Drop imports'],
                ['collabSheets', 'Collab Sheet invites, edits & chat'],
                ['firstDrops', 'Release loves, replies, unlocks'],
              ] as const
            ).map(([key, label]) => (
              <div
                key={key}
                className="flex items-center justify-between gap-4 rounded-lg border border-white/10 px-3 py-2.5"
              >
                <Label className="text-xs font-bold uppercase tracking-wide">{label}</Label>
                <Switch
                  checked={prefs[key]}
                  disabled={saving}
                  onCheckedChange={(checked) => void persist({ ...prefs, [key]: checked })}
                />
              </div>
            ))}
          </>
        )}
      </CardContent>
      <CardFooter className="pt-0">
        <Button asChild variant="outline" className="w-full h-10 text-[10px] font-bold uppercase">
          <a href="/activity">Open Activity inbox</a>
        </Button>
      </CardFooter>
    </Card>
  );
}
