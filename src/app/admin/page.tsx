'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase/client/firebase';
import { collection, query, doc, updateDoc, orderBy, getDoc, limit, setDoc, deleteDoc } from 'firebase/firestore';
import { subscribeQuery } from '@/lib/firebase/client/firestore-subscribe';
import { waitForAuthUser } from '@/lib/firebase/client/auth-ready';
import { adminApiFetch } from '@/lib/admin-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
    Users, 
    ShieldCheck, 
    Droplets, 
    Settings, 
    Save, 
    Zap, 
    BarChart3,
    Ban,
    UserMinus,
    ShieldX,
    Clock,
    Star,
    AlertTriangle,
    LineChart,
    Trophy,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { User, SystemLog } from '@/lib/types';
import type { RankId } from '@/lib/gamification/types';
import { ACHIEVEMENTS } from '@/lib/gamification/achievements';
import { STUDIO_RANKS } from '@/lib/gamification/ranks';
import { cn } from '@/lib/utils';
import { linesToRhymeBars } from '@/lib/lyrics-units';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AI_COSTS } from '@/lib/costs';
import { mergeStudioCosts } from '@/lib/studio-costs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StudioLoader } from '@/components/studio-loader';
import { AdminMetricsTab } from '@/components/admin-metrics-tab';
import { AdminAchievementsTab } from '@/components/admin-achievements-tab';
import type { AdminGamificationRosterEntry } from '@/lib/gamification/admin-roster-types';
import { format } from 'date-fns';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type AdminGamificationStats = AdminGamificationRosterEntry;

const TOTAL_ACHIEVEMENTS = ACHIEVEMENTS.length;

function rankLabel(rankId: RankId | undefined): string {
  return STUDIO_RANKS.find((r) => r.id === (rankId || 'open_mic'))?.label ?? 'Open Mic';
}

export default function AdminPage() {
  const { user, loading: authLoading, authReady } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [users, setUsers] = useState<User[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<User[]>([]);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [balances, setBalances] = useState<Record<string, { res: number, pur: number }>>({});
  const [gamificationStats, setGamificationStats] = useState<Record<string, AdminGamificationStats>>({});
  const [inkAdjustment, setInkAdjustment] = useState<Record<string, string>>({});
  const [adjustType, setAdjustType] = useState<Record<string, 'res' | 'pur'>>({});
  const [rosterLoading, setRosterLoading] = useState(true);
  const [studioConfig, setStudioConfig] = useState<any>(AI_COSTS);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [resettingGamification, setResettingGamification] = useState<string | null>(null);
  const [gamificationRefreshing, setGamificationRefreshing] = useState(false);
  const rosterLoadedRef = useRef(false);
  const lastRosterUserIdsRef = useRef('');
  const gamificationFetchRef = useRef<Promise<void> | null>(null);

  const loadGamificationRoster = (force = false) => {
    if (!force && gamificationFetchRef.current) return gamificationFetchRef.current;
    setGamificationRefreshing(true);
    gamificationFetchRef.current = adminApiFetch('/api/admin/gamification/roster')
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(body.error || `Gamification roster failed (${res.status})`);
        }
        if (body.stats) {
          setGamificationStats(body.stats);
        }
      })
      .catch((err) => {
        console.warn('[admin] gamification roster load failed:', err);
      })
      .finally(() => {
        gamificationFetchRef.current = null;
        setGamificationRefreshing(false);
      });
    return gamificationFetchRef.current;
  };

  useEffect(() => {
    if (authLoading || !authReady) return;
    if (!user || user.role !== 'admin') {
      router.replace('/');
      return;
    }

    if (!rosterLoadedRef.current) {
      setRosterLoading(true);
    }

    let unsubUsers: (() => void) | undefined;
    let unsubLogs: (() => void) | undefined;
    let cancelled = false;

    const setupAdminListeners = async () => {
      const firebaseUser = await waitForAuthUser();
      if (cancelled || !firebaseUser || firebaseUser.uid !== user.id) {
        if (!cancelled && !rosterLoadedRef.current) setRosterLoading(false);
        return;
      }

      const configRef = doc(db, 'config', 'studio');
      getDoc(configRef).then((snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setStudioConfig(mergeStudioCosts(data.costs));
        }
      });

      const logsRef = collection(db, 'system', 'logs', 'entries');
      unsubLogs = subscribeQuery(
        query(logsRef, orderBy('timestamp', 'desc'), limit(100)),
        (rows) => {
          setSystemLogs(rows as SystemLog[]);
        },
        (err) => {
          console.error('[admin] ops log listener:', err);
        },
        20000
      );

      const usersRef = collection(db, 'users');
      unsubUsers = subscribeQuery(
        usersRef,
        (rows) => {
          const allUsers = rows as User[];
          setUsers(allUsers.filter((u) => u.status !== 'blocked'));
          setBlockedUsers(allUsers.filter((u) => u.status === 'blocked'));

          const rosterUserIds = allUsers
            .map((u) => u.id)
            .sort()
            .join(',');
          const rosterChanged = rosterUserIds !== lastRosterUserIdsRef.current;
          if (rosterChanged) {
            lastRosterUserIdsRef.current = rosterUserIds;
            void loadGamificationRoster();
          }

          void (async () => {
            const balanceEntries = await Promise.all(
              allUsers.map(async (u) => {
                try {
                  const balDoc = await getDoc(doc(db, 'users', u.id, 'usage', 'balance'));
                  if (!balDoc.exists()) return null;
                  const data = balDoc.data();
                  return [
                    u.id,
                    {
                      res: data.residencyBalance || 0,
                      pur: data.purchasedBalance || 0,
                    },
                  ] as const;
                } catch (err) {
                  console.warn('[admin] balance read failed for', u.id, err);
                  return null;
                }
              })
            );

            const nextBalances = Object.fromEntries(
              balanceEntries.filter(Boolean) as Array<
                [string, { res: number; pur: number }]
              >
            );
            if (Object.keys(nextBalances).length > 0) {
              setBalances((prev) => ({ ...prev, ...nextBalances }));
            }
          })();

          rosterLoadedRef.current = true;
          setRosterLoading(false);
        },
        (err) => {
          console.error('[admin] users listener:', err);
          toast({
            variant: 'destructive',
            title: 'Roster access error',
            description: (err as Error).message,
          });
          rosterLoadedRef.current = true;
          setRosterLoading(false);
        },
        25000
      );
    };

    void setupAdminListeners();

    return () => {
      cancelled = true;
      unsubUsers?.();
      unsubLogs?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-subscribe only when admin session identity changes
  }, [user?.id, user?.role, authLoading, authReady]);

  const handleUpdateTier = async (targetUser: User, tier: 'none' | 'monthly' | 'yearly') => {
    const status = tier === 'none' ? 'none' : 'active';
    try {
        await updateDoc(doc(db, 'users', targetUser.id), { 
            subscriptionStatus: status,
            subscriptionTier: tier
        });
        toast({ title: "Residency Updated", description: `${targetUser.displayName} is now on ${tier.toUpperCase()} Pro.` });
    } catch (e: any) {
        toast({ variant: 'destructive', title: "Update Failed", description: e.message });
    }
  };

  const handleUpdateInk = async (userId: string, amount: number) => {
    const type = adjustType[userId] || 'pur';
    if (!amount) {
      toast({ variant: 'destructive', title: 'Invalid amount', description: 'Enter a non-zero ink adjustment.' });
      return;
    }

    try {
      const res = await adminApiFetch('/api/admin/users/ink', {
        method: 'POST',
        body: JSON.stringify({ targetUserId: userId, amount, type }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || `Adjustment failed (${res.status})`);
      }

      setBalances((prev) => {
        const current = prev[userId] || { res: 0, pur: 0 };
        return {
          ...prev,
          [userId]:
            type === 'res'
              ? { ...current, res: Math.max(0, current.res + amount) }
              : { ...current, pur: Math.max(0, current.pur + amount) },
        };
      });

      toast({
        title: amount > 0 ? 'Ink Injected' : 'Ink Recalled',
        description: `${amount > 0 ? '+' : ''}${amount} ${type === 'res' ? 'Residency' : 'Permanent'} Ink processed.`,
      });
      setInkAdjustment((prev) => ({ ...prev, [userId]: '' }));
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Adjustment Failed', description: e.message });
    }
  };

  const handleBlockUser = async (targetUser: User) => {
      try {
          await updateDoc(doc(db, 'users', targetUser.id), { status: 'blocked' });
          toast({ title: "Artist Blocked", description: `${targetUser.displayName} has been restricted from the studio.` });
      } catch (e: any) {
          toast({ variant: 'destructive', title: "Blocking Failed", description: e.message });
      }
  };

  const handleUnblockUser = async (targetUser: User) => {
      try {
          await updateDoc(doc(db, 'users', targetUser.id), { status: 'active' });
          toast({ title: "Artist Restored", description: `${targetUser.displayName} is back on the roster.` });
      } catch (e: any) {
          toast({ variant: 'destructive', title: "Restoration Failed", description: e.message });
      }
  };

  const handleResetGamification = async (targetUser: User) => {
    if (
      !confirm(
        `Reset trophies & achievements for ${targetUser.displayName}?\n\nThis clears all unlocked trophies, XP, rank, streaks, challenge progress, and re-earn flags. Bonus Ink already granted is not removed.`
      )
    ) {
      return;
    }

    setResettingGamification(targetUser.id);
    try {
      const res = await adminApiFetch('/api/admin/gamification/reset', {
        method: 'POST',
        body: JSON.stringify({ targetUserId: targetUser.id }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || `Reset failed (${res.status})`);
      }

      toast({
        title: 'Trophies Reset',
        description: `Cleared ${body.clearedAchievements ?? 0} trophies for ${targetUser.displayName}. XP reset from ${body.previousXp ?? 0} to 0.`,
      });
      setGamificationStats((prev) => ({
        ...prev,
        [targetUser.id]: {
          ...(prev[targetUser.id] || {
            displayName: targetUser.displayName,
            email: targetUser.email,
            status: targetUser.status || 'active',
          }),
          xp: 0,
          rankId: 'open_mic',
          currentStreak: 0,
          longestStreak: 0,
          lifetimeBarsWritten: 0,
          unlockedAchievements: {},
        },
      }));
      void loadGamificationRoster(true);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Reset Failed', description: e.message });
    } finally {
      setResettingGamification(null);
    }
  };

  const handleDeleteUser = async (targetUser: User) => {
      if (!confirm(`ERADICATION PROTOCOL: Are you absolutely sure you want to delete ${targetUser.displayName}? This removes their profile and albums from the studio view.`)) return;
      try {
          await deleteDoc(doc(db, 'users', targetUser.id));
          toast({ title: "Artist Scrapped", description: "Identity removed from the roster." });
      } catch (e: any) {
          toast({ variant: 'destructive', title: "Eradication Failed", description: e.message });
      }
  };

  if (authLoading || !authReady) return <div className="flex h-screen items-center justify-center"><StudioLoader size="lg" /></div>;
  if (!user || user.role !== 'admin') return null;

  return (
    <TooltipProvider>
    <div className="container mx-auto py-12 px-4 max-w-[88rem] font-code">
      <div className="flex items-center gap-4 mb-10">
        <ShieldCheck className="h-12 w-12 text-primary" />
        <div>
          <h1 className="text-5xl font-headline font-bold text-white uppercase tracking-tighter">Master Control</h1>
          <p className="text-[10px] text-muted-foreground uppercase tracking-[0.4em] mt-1">5/22/2026 AUTHORITY PROTOCOL</p>
        </div>
      </div>

      <Tabs defaultValue="metrics" className="space-y-8">
        <TabsList className="bg-muted/50 border h-auto p-1.5 gap-2 w-full justify-start flex-wrap">
          <TabsTrigger value="metrics" className="gap-2 px-6 py-3 font-bold uppercase text-[10px] tracking-widest text-emerald-400"><LineChart className="h-4 w-4" /> Growth Metrics</TabsTrigger>
          <TabsTrigger value="users" className="gap-2 px-6 py-3 font-bold uppercase text-[10px] tracking-widest"><Users className="h-4 w-4" /> Artist Roster</TabsTrigger>
          <TabsTrigger value="achievements" className="gap-2 px-6 py-3 font-bold uppercase text-[10px] tracking-widest text-amber-400"><Trophy className="h-4 w-4" /> Studio Trophies</TabsTrigger>
          <TabsTrigger value="blacklist" className="gap-2 px-6 py-3 font-bold uppercase text-[10px] tracking-widest text-red-500"><ShieldX className="h-4 w-4" /> Blacklist</TabsTrigger>
          <TabsTrigger value="logs" className="gap-2 px-6 py-3 font-bold uppercase text-[10px] tracking-widest"><BarChart3 className="h-4 w-4" /> Ops Log</TabsTrigger>
          <TabsTrigger value="config" className="gap-2 px-6 py-3 font-bold uppercase text-[10px] tracking-widest"><Settings className="h-4 w-4" /> Config</TabsTrigger>
        </TabsList>

        <TabsContent value="metrics">
          <AdminMetricsTab />
        </TabsContent>

        <TabsContent value="users">
          {rosterLoading ? (
            <div className="py-20 text-center"><StudioLoader size="md" /></div>
          ) : (
          <Card className="bg-card border-2 shadow-2xl">
            <CardHeader className="border-b"><CardTitle className="font-headline text-2xl uppercase">Residency Management</CardTitle></CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Artist</TableHead><TableHead>Tier</TableHead><TableHead>Rank / XP</TableHead><TableHead>Trophies</TableHead><TableHead>Streak</TableHead><TableHead>Residency Ink</TableHead><TableHead>Permanent Ink</TableHead><TableHead>Manual Calibration</TableHead><TableHead className="text-right">Access</TableHead></TableRow></TableHeader>
                <TableBody>
                  {users.length > 0 ? users.map(u => {
                    const gam = gamificationStats[u.id];
                    const unlocked = gam?.unlockedAchievements || {};
                    const unlockedCount = Object.keys(unlocked).length;
                    const unlockedIds = new Set(Object.keys(unlocked));

                    return (
                    <TableRow key={u.id} className="hover:bg-white/5 border-b border-white/5">
                      <TableCell><div className="font-bold text-white uppercase text-xs">{u.displayName}</div><div className="text-[9px] text-muted-foreground uppercase">{u.email}</div></TableCell>
                      <TableCell>
                          <Select value={u.subscriptionTier || 'none'} onValueChange={(val: any) => handleUpdateTier(u, val)}>
                              <SelectTrigger className={cn("h-8 w-32 text-[9px] font-bold uppercase", u.subscriptionTier === 'yearly' ? "border-accent text-accent" : "border-primary text-primary")}>
                                  <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-card border-2">
                                  <SelectItem value="none">LOCAL</SelectItem>
                                  <SelectItem value="monthly">PRO MO</SelectItem>
                                  <SelectItem value="yearly" className="text-accent">PRO YR</SelectItem>
                              </SelectContent>
                          </Select>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant="outline" className="text-[8px] h-5 border-amber-500/30 text-amber-300 uppercase">
                            {rankLabel(gam?.rankId)}
                          </Badge>
                          <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                            <Zap className="h-3 w-3 text-amber-400" />
                            {(gam?.xp ?? 0).toLocaleString()} XP
                          </div>
                          <p className="text-[8px] text-muted-foreground uppercase">{linesToRhymeBars(gam?.lifetimeBarsWritten ?? 0).toLocaleString()} bars lifetime</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" className="text-left space-y-1 cursor-help rounded-md px-1 -mx-1 hover:bg-white/5 transition-colors">
                              <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                                <Trophy className="h-3.5 w-3.5 text-amber-400" />
                                {unlockedCount}/{TOTAL_ACHIEVEMENTS}
                              </div>
                              <div className="h-1.5 w-20 rounded-full bg-muted/40 overflow-hidden">
                                <div
                                  className="h-full bg-amber-400/80 rounded-full transition-all"
                                  style={{ width: `${TOTAL_ACHIEVEMENTS ? (unlockedCount / TOTAL_ACHIEVEMENTS) * 100 : 0}%` }}
                                />
                              </div>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="max-w-[280px] p-3 space-y-2">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300">Trophy Progress</p>
                            <div className="grid gap-1 max-h-52 overflow-y-auto pr-1">
                              {ACHIEVEMENTS.map((achievement) => {
                                const isUnlocked = unlockedIds.has(achievement.id);
                                return (
                                  <div
                                    key={achievement.id}
                                    className={cn(
                                      'flex items-start gap-2 text-[10px] leading-snug',
                                      isUnlocked ? 'text-emerald-300' : 'text-muted-foreground'
                                    )}
                                  >
                                    <Trophy className={cn('h-3 w-3 shrink-0 mt-0.5', isUnlocked ? 'text-emerald-400' : 'text-white/20')} />
                                    <span>
                                      {achievement.title}
                                      {isUnlocked && unlocked[achievement.id] && (
                                        <span className="block text-[8px] text-emerald-400/70 font-code normal-case">
                                          {format(new Date(unlocked[achievement.id]), 'MM/dd/yy')}
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-white">{gam?.currentStreak ?? 0}d active</p>
                          <p className="text-[8px] text-muted-foreground uppercase">best {gam?.longestStreak ?? 0}d</p>
                        </div>
                      </TableCell>
                      <TableCell><div className="flex items-center gap-2 font-bold text-xs text-white"><Clock className="h-3 w-3 text-primary" />{(balances[u.id]?.res || 0).toLocaleString()}</div></TableCell>
                      <TableCell><div className="flex items-center gap-2 font-bold text-xs text-white"><Star className="h-3 w-3 text-orange-500" />{(balances[u.id]?.pur || 0).toLocaleString()}</div></TableCell>
                      <TableCell>
                          <div className="flex items-center gap-2">
                              <Select value={adjustType[u.id] || 'pur'} onValueChange={(val: any) => setAdjustType({...adjustType, [u.id]: val})}>
                                  <SelectTrigger className="h-8 w-24 text-[8px] font-bold uppercase bg-background/50">
                                      <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                      <SelectItem value="res">RESIDENCY</SelectItem>
                                      <SelectItem value="pur">PERMANENT</SelectItem>
                                  </SelectContent>
                              </Select>
                              <Input type="number" placeholder="+/-" className="h-8 w-20 text-[10px] font-bold bg-background/50" value={inkAdjustment[u.id] || ''} onChange={(e) => setInkAdjustment({...inkAdjustment, [u.id]: e.target.value})} />
                              <Button size="sm" variant="outline" className="h-8 px-3 font-bold text-[9px] uppercase tracking-widest border-primary/40 text-primary" onClick={() => handleUpdateInk(u.id, parseInt(inkAdjustment[u.id] || '0'))}>Inject</Button>
                          </div>
                      </TableCell>
                      <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                                  <Tooltip>
                                      <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-amber-400 hover:bg-amber-400/10"
                                            disabled={resettingGamification === u.id}
                                            onClick={() => handleResetGamification(u)}
                                          >
                                            <Trophy className="h-4 w-4" />
                                          </Button>
                                      </TooltipTrigger>
                                      <TooltipContent><p className="text-[10px] font-bold">Reset Trophies & Achievements</p></TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                      <TooltipTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-8 w-8 text-orange-500 hover:bg-orange-500/10" onClick={() => handleBlockUser(u)}><Ban className="h-4 w-4" /></Button>
                                      </TooltipTrigger>
                                      <TooltipContent><p className="text-[10px] font-bold">Block Access</p></TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                      <TooltipTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-500/10" onClick={() => handleDeleteUser(u)}><UserMinus className="h-4 w-4" /></Button>
                                      </TooltipTrigger>
                                      <TooltipContent><p className="text-[10px] font-bold uppercase">Eradicate Identity</p></TooltipContent>
                                  </Tooltip>
                          </div>
                      </TableCell>
                    </TableRow>
                    );
                  }) : (
                    <TableRow><TableCell colSpan={9} className="h-32 text-center text-muted-foreground text-[10px] uppercase tracking-[0.4em]">Searching studio roster...</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          )}
        </TabsContent>

        <TabsContent value="achievements">
          <AdminAchievementsTab
            stats={gamificationStats}
            loading={rosterLoading && Object.keys(gamificationStats).length === 0}
            refreshing={gamificationRefreshing}
            onRefresh={() => loadGamificationRoster(true)}
          />
        </TabsContent>

        <TabsContent value="blacklist">
            <Card className="bg-card border-2 border-red-500/20 shadow-2xl">
                <CardHeader className="border-b bg-red-500/5 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="font-headline text-2xl text-red-500 uppercase">Restricted Hardware</CardTitle>
                        <CardDescription className="text-[10px] uppercase text-red-700">Artists with blocked status cannot enter the studio.</CardDescription>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-red-500" />
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader><TableRow><TableHead>Blocked Identity</TableHead><TableHead>Email</TableHead><TableHead className="text-right">Protocol</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {blockedUsers.length > 0 ? blockedUsers.map(u => (
                                <TableRow key={u.id} className="border-b border-red-500/10">
                                    <TableCell><div className="font-bold text-red-400 uppercase text-xs">{u.displayName}</div></TableCell>
                                    <TableCell className="text-xs text-muted-foreground">{u.email}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="outline" size="sm" className="h-8 px-4 font-bold text-[9px] uppercase tracking-widest border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10" onClick={() => handleUnblockUser(u)}>Unblock Artist</Button>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={3} className="h-32 text-center text-muted-foreground text-[10px] uppercase tracking-[0.4em]">Blacklist is currently empty</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="config">
            <Card className="bg-card border-2 shadow-2xl">
                <CardHeader className="border-b"><CardTitle className="font-headline text-2xl uppercase">Global Task Economics</CardTitle></CardHeader>
                <CardContent className="space-y-6 pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Object.entries(studioConfig).map(([key, value]) => (
                            <div key={key} className="flex flex-col gap-2 p-4 border rounded-xl bg-background/50">
                                <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">{key.replace(/([A-Z])/g, ' $1')}</Label>
                                <div className="flex items-center gap-3">
                                    <Input type="number" className="h-9 flex-grow font-mono text-xs font-bold" value={value as number} onChange={(e) => setStudioConfig({...studioConfig, [key]: parseInt(e.target.value) || 0})} />
                                    <Badge variant="outline" className="h-9 border-primary/20 text-primary">INK</Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
                <CardFooter className="bg-primary/5 border-t py-6"><Button className="w-full h-14 text-lg font-bold uppercase tracking-[0.2em] shadow-[0_0_30px_rgba(59,130,246,0.3)]" onClick={() => { setIsSavingConfig(true); setDoc(doc(db, 'config', 'studio'), { costs: mergeStudioCosts(studioConfig) }, { merge: true }).then(() => { toast({ title: "Economic Rules Deployed" }); setIsSavingConfig(false); }); }} disabled={isSavingConfig}><Save className="mr-3 h-5 w-5" /> Deploy Master Protocol</Button></CardFooter>
            </Card>
        </TabsContent>

        <TabsContent value="logs">
            <Card className="bg-card border-2 shadow-2xl">
                <CardHeader className="border-b"><CardTitle className="font-headline text-2xl uppercase">Neural Operation Stream</CardTitle></CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader><TableRow><TableHead>Timestamp</TableHead><TableHead>Artist</TableHead><TableHead>Operation</TableHead><TableHead className="text-right">Ink Spent</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {systemLogs.map(log => (
                                <TableRow key={log.id} className="border-b border-white/5">
                                    <TableCell className="text-[10px] font-code text-muted-foreground">{format(new Date(log.timestamp), 'MM/dd HH:mm:ss')}</TableCell>
                                    <TableCell className="font-bold text-white uppercase text-xs">{log.userName || 'Unknown'}</TableCell>
                                    <TableCell><Badge variant="outline" className="text-[9px] uppercase border-primary/20 text-primary">{log.action}</Badge></TableCell>
                                    <TableCell className="text-right font-code font-bold text-primary">-{log.inkUsed}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
    </TooltipProvider>
  );
}
