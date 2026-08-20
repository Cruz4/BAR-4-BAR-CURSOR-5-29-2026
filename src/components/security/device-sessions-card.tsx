'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import {
  Laptop,
  Loader2,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Tablet,
} from 'lucide-react';
import { auth } from '@/lib/firebase/client/firebase';
import type { DeviceSession } from '@/lib/device-sessions';
import {
  clearCurrentDeviceSessionIdentity,
  endCurrentDeviceSession,
  fetchDeviceSessions,
  revokeAllDeviceSessions,
  revokeDeviceSession,
  revokeOtherDeviceSessions,
} from '@/lib/device-sessions-client';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type PendingAction =
  | { kind: 'one'; session: DeviceSession }
  | { kind: 'current' }
  | { kind: 'others' }
  | { kind: 'everywhere' };

function DeviceIcon({ kind }: { kind: DeviceSession['deviceKind'] }) {
  if (kind === 'phone') return <Smartphone className="h-5 w-5" />;
  if (kind === 'tablet') return <Tablet className="h-5 w-5" />;
  return <Laptop className="h-5 w-5" />;
}

function lastActiveLabel(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Last active unavailable';
  return `Active ${formatDistanceToNow(date, { addSuffix: true })}`;
}

export function DeviceSessionsCard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const otherSessions = useMemo(() => sessions.filter((session) => !session.current), [sessions]);

  const refresh = useCallback(async (quiet = false) => {
    if (!user?.id) return;
    if (quiet) setRefreshing(true);
    else setLoading(true);
    try {
      setSessions(await fetchDeviceSessions());
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not load devices',
        description: error instanceof Error ? error.message : 'Try again in a moment.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast, user?.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const finishLocalSignOut = async (reason: 'device' | 'everywhere') => {
    clearCurrentDeviceSessionIdentity();
    await signOut(auth);
    router.replace(`/login?error=${reason === 'everywhere' ? 'signed-out-everywhere' : 'signed-out'}`);
  };

  const confirmAction = async () => {
    if (!pending) return;
    setSubmitting(true);
    try {
      if (pending.kind === 'one') {
        await revokeDeviceSession(pending.session.id);
        setSessions((current) => current.filter((session) => session.id !== pending.session.id));
        toast({
          title: 'Device signed out',
          description: `${pending.session.browser} on ${pending.session.operatingSystem} will be removed within about a minute if BA is open.`,
        });
      } else if (pending.kind === 'others') {
        const result = await revokeOtherDeviceSessions();
        setSessions((current) => current.filter((session) => session.current));
        toast({
          title: 'Other devices signed out',
          description: `${result.revoked || 0} signed-in device${result.revoked === 1 ? '' : 's'} revoked.`,
        });
      } else if (pending.kind === 'current') {
        await endCurrentDeviceSession().catch(() => undefined);
        await finishLocalSignOut('device');
      } else {
        await revokeAllDeviceSessions();
        await finishLocalSignOut('everywhere');
      }
      setPending(null);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not sign out device',
        description: error instanceof Error ? error.message : 'Try again in a moment.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const confirmation = pending?.kind === 'one'
    ? {
        title: 'Sign out this device?',
        description: `${pending.session.browser} on ${pending.session.operatingSystem} will need to sign in again.`,
        action: 'Sign out device',
      }
    : pending?.kind === 'others'
      ? {
          title: 'Sign out all other listed devices?',
          description: `Your current device stays signed in. ${otherSessions.length} other device${otherSessions.length === 1 ? '' : 's'} will need to sign in again.`,
          action: 'Sign out others',
        }
      : pending?.kind === 'everywhere'
        ? {
            title: 'Sign out everywhere?',
            description: 'This revokes Firebase sign-in tokens for every device, including this one. Use it if you think someone has access to your account.',
            action: 'Sign out everywhere',
          }
        : {
            title: 'Sign out this device?',
            description: 'Your work remains saved, but you will need to sign in again on this device.',
            action: 'Sign out',
          };

  return (
    <>
      <Card className="border-sky-500/25">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5">
              <CardTitle className="font-headline text-2xl flex items-center gap-2.5">
                <ShieldCheck className="h-6 w-6 text-sky-400" /> Signed-in Devices
              </CardTitle>
              <CardDescription className="text-sm uppercase tracking-tight">
                Review browsers using your BA account and remove anything you do not recognize.
              </CardDescription>
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Refresh signed-in devices"
              disabled={loading || refreshing}
              onClick={() => void refresh(true)}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex min-h-24 items-center justify-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : sessions.length ? (
            <div className="divide-y divide-border/70 overflow-hidden rounded-xl border border-border/70 bg-background/60">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="mt-0.5 rounded-lg border border-sky-500/20 bg-sky-500/10 p-2 text-sky-400">
                      <DeviceIcon kind={session.deviceKind} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-sm text-foreground">
                          {session.browser} on {session.operatingSystem}
                        </p>
                        {session.current ? (
                          <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/10">
                            This device
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 text-[11px] font-code text-muted-foreground">
                        {lastActiveLabel(session.lastSeenAt)} · Added {new Date(session.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 shrink-0 border-red-500/25 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                    onClick={() => setPending(session.current ? { kind: 'current' } : { kind: 'one', session })}
                  >
                    <LogOut className="mr-2 h-4 w-4" /> Sign out
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
              No device sessions are available yet. Refresh after signing in again.
            </div>
          )}

          <p className="text-xs leading-relaxed text-muted-foreground">
            Devices appear after they open BA with this security feature. A removed device is signed out on its next check, normally within one minute while BA is open.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              disabled={otherSessions.length === 0}
              onClick={() => setPending({ kind: 'others' })}
            >
              Sign out other listed devices
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => setPending({ kind: 'everywhere' })}
            >
              Sign out everywhere
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && !submitting && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmation.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmation.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={submitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                void confirmAction();
              }}
            >
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {confirmation.action}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
