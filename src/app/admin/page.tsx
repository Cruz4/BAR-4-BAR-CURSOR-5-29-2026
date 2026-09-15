'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase/client/firebase';
import { collection, query, doc, updateDoc, orderBy, getDoc, getDocs, limit, setDoc, where } from 'firebase/firestore';
import { subscribeQuery } from '@/lib/firebase/client/firestore-subscribe';
import { waitForAuthUser } from '@/lib/firebase/client/auth-ready';
import { initUserUsageAction } from '@/lib/server/usage-actions';
import { adminApiFetch } from '@/lib/admin-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
    Users, 
    ShieldCheck, 
    Settings, 
    Save, 
    Zap, 
    BarChart3,
    Ban,
    UserMinus,
    ShieldX,
    Clock,
    Star,
    Hourglass,
    AlertTriangle,
    LineChart,
    Trophy,
    ArrowUpDown,
    ChevronLeft,
    ChevronRight,
    EyeOff,
    Globe,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { User, SystemLog } from '@/lib/types';
import { LiveArtistStarAvatar } from '@/components/profile/artist-star-avatar';
import type { RankId } from '@/lib/gamification/types';
import { ACHIEVEMENTS } from '@/lib/gamification/achievements';
import { STUDIO_RANKS } from '@/lib/gamification/ranks';
import { cn } from '@/lib/utils';
import { studioChromeFromSubscriptionStatus, studioNameClass } from '@/lib/studio-tier-chrome';
import { linesToRhymeBars } from '@/lib/lyrics-units';
import { formatOpsLogInkLabel, resolveOpsLogInkDelta } from '@/lib/ops-log-ink';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AI_COSTS } from '@/lib/costs';
import { mergeStudioCosts } from '@/lib/studio-costs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StudioLoader } from '@/components/studio-loader';
import { AdminMetricsTab } from '@/components/admin-metrics-tab';
import { AdminCeoDashboardV2 } from '@/components/admin-ceo-dashboard-v2';
import { AdminAchievementsTab } from '@/components/admin-achievements-tab';
import { AdminInviteGateCard } from '@/components/admin-invite-gate-card';
import { AdminSceneLayoutCard } from '@/components/admin-scene-layout-card';
import { AdminProductSurfacesCard } from '@/components/admin-product-surfaces-card';
import { AdminProPreviewAuditCard } from '@/components/admin-pro-preview-audit-card';
import { AdminProductionGateCard } from '@/components/admin-production-gate-card';
import { AdminLockFeatureCard } from '@/components/admin-lock-feature-card';
import { AdminFoldsFeatureCard } from '@/components/admin-folds-feature-card';
import { AdminCollabSheetFeatureCard } from '@/components/admin-collab-sheet-feature-card';
import { AdminFirstDropsCard } from '@/components/admin-first-drops-card';
import { AdminFreeDropsCard } from '@/components/admin-free-drops-card';
import { AdminHouseBarCard } from '@/components/admin-house-bar-card';
import { AdminHouseReleasesCard } from '@/components/admin-house-releases-card';
import { AdminTonightsFormCard } from '@/components/admin-tonights-form-card';
import { AdminWeeklyChallengeCard } from '@/components/admin-weekly-challenge-card';
import { useProductSurfaces } from '@/hooks/use-product-surfaces';
import type { AdminGamificationRosterEntry } from '@/lib/gamification/admin-roster-types';
import { format } from 'date-fns';
import { formatUserJoinDate, userDateSortValue } from '@/lib/user-date';
import { isMasterAdminEmail } from '@/lib/master-admin';
import { isProFeaturePreviewActive, formatProFeaturePreviewCountdown, PRO_FEATURE_PREVIEW_HOURS, computeProFeaturePreviewExpiresAt } from '@/lib/subscription';
import {
  isAdminResidencyMode,
  residencyModeLabel,
  rosterResidencyMode,
  type AdminResidencyMode,
} from '@/lib/admin-residency';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type AdminGamificationStats = AdminGamificationRosterEntry;

type RosterSortKey = 'artist' | 'tier' | 'rank' | 'trophies' | 'streak' | 'joined' | 'lastLogin' | 'residency' | 'permanent';
type SortDir = 'asc' | 'desc';

const TOTAL_ACHIEVEMENTS = ACHIEVEMENTS.length;
const OPS_LOG_PAGE_SIZE = 50;

const TIER_SORT_ORDER: Record<string, number> = {
  yearly: 3,
  monthly: 2,
  none: 1,
};

function rankLabel(rankId: RankId | undefined): string {
  return STUDIO_RANKS.find((r) => r.id === (rankId || 'open_mic'))?.label ?? 'Open Mic';
}

export default function AdminPage() {
  const { user, loading: authLoading, authReady } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { ceoDashboard, loading: surfacesLoading } = useProductSurfaces();
  const metricsSurfaceOn = ceoDashboard !== 'off';
  const showCeoV2 = ceoDashboard === 'v2';
  const showLegacyMetrics = ceoDashboard === 'legacy';
  const defaultAdminTab = metricsSurfaceOn ? 'metrics' : 'users';
  
  const [users, setUsers] = useState<User[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<User[]>([]);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [opsLogFilter, setOpsLogFilter] = useState<'all' | 'transaction' | 'achievement' | 'ai_request'>('all');
  const [opsLogPage, setOpsLogPage] = useState(1);
  const [backfillingAchievements, setBackfillingAchievements] = useState(false);
  const [repairingNeomaiya, setRepairingNeomaiya] = useState(false);
  const [reseedingNeoCircle, setReseedingNeoCircle] = useState(false);
  const [reseedingJordieCircle, setReseedingJordieCircle] = useState(false);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);
  const [updatingTierId, setUpdatingTierId] = useState<string | null>(null);
  const [grantingPreviewId, setGrantingPreviewId] = useState<string | null>(null);
  const [previewNow, setPreviewNow] = useState(() => Date.now());
  const [balances, setBalances] = useState<Record<string, { res: number, pur: number }>>({});
  const [gamificationStats, setGamificationStats] = useState<Record<string, AdminGamificationStats>>({});
  const [inkAdjustment, setInkAdjustment] = useState<Record<string, string>>({});
  const [adjustType, setAdjustType] = useState<Record<string, 'res' | 'pur'>>({});
  const [rosterLoading, setRosterLoading] = useState(true);
  const [studioConfig, setStudioConfig] = useState<any>(AI_COSTS);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [resettingGamification, setResettingGamification] = useState<string | null>(null);
  const [moderatingPublicId, setModeratingPublicId] = useState<string | null>(null);
  const [gamificationRefreshing, setGamificationRefreshing] = useState(false);
  const [rosterSort, setRosterSort] = useState<{ key: RosterSortKey; dir: SortDir }>({ key: 'joined', dir: 'desc' });
  const rosterLoadedRef = useRef(false);
  const lastRosterUserIdsRef = useRef('');
  const gamificationFetchRef = useRef<Promise<void> | null>(null);
  const profileBackfillRef = useRef(false);

  const sortedUsers = useMemo(() => {
    const dir = rosterSort.dir === 'asc' ? 1 : -1;
    return [...users].sort((a, b) => {
      const gamA = gamificationStats[a.id];
      const gamB = gamificationStats[b.id];
      switch (rosterSort.key) {
        case 'artist':
          return dir * (a.displayName || '').localeCompare(b.displayName || '', undefined, { sensitivity: 'base' });
        case 'tier':
          return dir * ((TIER_SORT_ORDER[a.subscriptionTier || 'none'] ?? 0) - (TIER_SORT_ORDER[b.subscriptionTier || 'none'] ?? 0));
        case 'rank':
          return dir * ((gamA?.xp ?? 0) - (gamB?.xp ?? 0));
        case 'trophies':
          return dir * (Object.keys(gamA?.unlockedAchievements || {}).length - Object.keys(gamB?.unlockedAchievements || {}).length);
        case 'streak':
          return dir * ((gamA?.currentStreak ?? 0) - (gamB?.currentStreak ?? 0));
        case 'joined':
          return dir * (userDateSortValue(a.createdAt) - userDateSortValue(b.createdAt));
        case 'lastLogin':
          return dir * (
            userDateSortValue(gamA?.lastSignInAt || a.lastSignInAt) -
            userDateSortValue(gamB?.lastSignInAt || b.lastSignInAt)
          );
        case 'residency':
          return dir * ((balances[a.id]?.res || 0) - (balances[b.id]?.res || 0));
        case 'permanent':
          return dir * ((balances[a.id]?.pur || 0) - (balances[b.id]?.pur || 0));
        default:
          return 0;
      }
    });
  }, [users, gamificationStats, balances, rosterSort]);

  const filteredOpsLogs = useMemo(() => {
    if (opsLogFilter === 'all') return systemLogs;
    return systemLogs.filter((log) => log.type === opsLogFilter);
  }, [systemLogs, opsLogFilter]);

  const opsLogPageCount = Math.max(1, Math.ceil(filteredOpsLogs.length / OPS_LOG_PAGE_SIZE));
  const safeOpsLogPage = Math.min(opsLogPage, opsLogPageCount);
  const pagedOpsLogs = useMemo(() => {
    const start = (safeOpsLogPage - 1) * OPS_LOG_PAGE_SIZE;
    return filteredOpsLogs.slice(start, start + OPS_LOG_PAGE_SIZE);
  }, [filteredOpsLogs, safeOpsLogPage]);

  const opsLogCounts = useMemo(() => {
    let transaction = 0;
    let achievement = 0;
    let ai_request = 0;
    for (const log of systemLogs) {
      if (log.type === 'transaction') transaction += 1;
      else if (log.type === 'achievement') achievement += 1;
      else if (log.type === 'ai_request') ai_request += 1;
    }
    return { all: systemLogs.length, transaction, achievement, ai_request };
  }, [systemLogs]);

  useEffect(() => {
    setOpsLogPage(1);
  }, [opsLogFilter]);

  useEffect(() => {
    if (opsLogPage > opsLogPageCount) setOpsLogPage(opsLogPageCount);
  }, [opsLogPage, opsLogPageCount]);

  useEffect(() => {
    const id = window.setInterval(() => setPreviewNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const toggleRosterSort = (key: RosterSortKey) => {
    setRosterSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }
    );
  };

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
    let cancelled = false;

    const setupAdminListeners = async () => {
      const firebaseUser = await waitForAuthUser();
      if (cancelled || !firebaseUser || firebaseUser.uid !== user.id) {
        if (!cancelled && !rosterLoadedRef.current) setRosterLoading(false);
        return;
      }

      try {
        const idToken = await firebaseUser.getIdToken(false);
        await initUserUsageAction(idToken, user.id);
      } catch (err) {
        console.warn('[admin] profile bootstrap skipped:', err);
      }

      if (cancelled) {
        if (!rosterLoadedRef.current) setRosterLoading(false);
        return;
      }

      const configRef = doc(db, 'config', 'studio');
      getDoc(configRef).then((snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setStudioConfig(mergeStudioCosts(data.costs));
        }
      });

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

          // One-shot: fill blank ARTIST name/email from Firebase Auth.
          const needsIdentityBackfill = allUsers.some(
            (u) => !String(u.displayName || '').trim() || !String(u.email || '').trim()
          );
          if (needsIdentityBackfill && !profileBackfillRef.current) {
            profileBackfillRef.current = true;
            void adminApiFetch('/api/admin/users/backfill-profiles', { method: 'POST' })
              .then(async (res) => {
                const body = await res.json().catch(() => ({}));
                if (!res.ok) {
                  profileBackfillRef.current = false;
                  console.warn('[admin] profile backfill failed:', body.error || res.status);
                  return;
                }
                if (body.patched > 0) {
                  toast({
                    title: 'Roster identity restored',
                    description: `Filled name/email for ${body.patched} artist${body.patched === 1 ? '' : 's'} from Auth.`,
                  });
                }
              })
              .catch((err) => {
                profileBackfillRef.current = false;
                console.warn('[admin] profile backfill error:', err);
              });
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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-subscribe only when admin session identity changes
  }, [user?.id, user?.role, authLoading, authReady]);

  useEffect(() => {
    if (authLoading || !authReady || !user || user.role !== 'admin') return;

    let cancelled = false;
    let unsubLogs: (() => void) | undefined;

    const setupLogs = async () => {
      const firebaseUser = await waitForAuthUser();
      if (cancelled || !firebaseUser || firebaseUser.uid !== user.id) return;

      const logsRef = collection(db, 'system', 'logs', 'entries');
      // Achievements can be sparse vs AI noise — query that type directly.
      const logsQuery =
        opsLogFilter === 'achievement'
          ? query(logsRef, where('type', '==', 'achievement'), orderBy('timestamp', 'desc'), limit(200))
          : opsLogFilter === 'transaction'
            ? query(logsRef, where('type', '==', 'transaction'), orderBy('timestamp', 'desc'), limit(200))
            : opsLogFilter === 'ai_request'
              ? query(logsRef, where('type', '==', 'ai_request'), orderBy('timestamp', 'desc'), limit(200))
              : query(logsRef, orderBy('timestamp', 'desc'), limit(400));

      unsubLogs = subscribeQuery(
        logsQuery,
        (rows) => {
          if (!cancelled) setSystemLogs(rows as SystemLog[]);
        },
        (err) => {
          console.error('[admin] ops log listener:', err);
          // Composite index missing — fall back to recent mix.
          unsubLogs?.();
          unsubLogs = subscribeQuery(
            query(logsRef, orderBy('timestamp', 'desc'), limit(500)),
            (rows) => {
              if (cancelled) return;
              const all = rows as SystemLog[];
              setSystemLogs(
                opsLogFilter === 'all' ? all : all.filter((log) => log.type === opsLogFilter)
              );
            },
            (fallbackErr) => console.error('[admin] ops log fallback:', fallbackErr),
            20000
          );
        },
        20000
      );
    };

    void setupLogs();
    return () => {
      cancelled = true;
      unsubLogs?.();
    };
  }, [user, authLoading, authReady, opsLogFilter]);

  const handleBackfillAchievements = async () => {
    setBackfillingAchievements(true);
    try {
      const res = await adminApiFetch('/api/admin/ops/backfill-achievements', { method: 'POST' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Backfill failed');
      toast({
        title: 'Achievement ops backfill complete',
        description: `Wrote ${body.logsWritten ?? 0} rows · skipped ${body.skippedExisting ?? 0} existing · scanned ${body.unlocksSeen ?? 0} unlocks`,
      });
      setOpsLogFilter('achievement');
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Backfill failed',
        description: err instanceof Error ? err.message : 'Could not backfill achievement logs',
      });
    } finally {
      setBackfillingAchievements(false);
    }
  };

  const handleRepairNeomaiya = async () => {
    setRepairingNeomaiya(true);
    try {
      const res = await adminApiFetch('/api/admin/neomaiya/repair', { method: 'POST' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Repair failed');
      toast({
        title: 'Neomaiya Sol identity repaired',
        description: `Canonical ${body.canonicalEmail || 'plotformaiplan@gmail.com'} · Neo ↔ ${body.circleReseeded ?? body.artistsReseeded ?? 0} · Jordie ↔ ${body.jordieReseeded ?? 0} · Neo friends ${body.neoFriendCount ?? '?'} · Jordie friends ${body.jordieFriendCount ?? '?'}`,
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Neo repair failed',
        description: err instanceof Error ? err.message : 'Could not repair Neomaiya identity',
      });
    } finally {
      setRepairingNeomaiya(false);
    }
  };

  const handleReseedNeoCircle = async () => {
    setReseedingNeoCircle(true);
    try {
      const res = await adminApiFetch('/api/admin/neomaiya/reseed-circle', { method: 'POST' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Reseed failed');
      toast({
        title: 'Neo circle restored',
        description: `Linked Neo ↔ ${body.reseeded ?? 0} artists (of ${body.attempted ?? 0}) · Neo now has ${body.neoFriendCount ?? '?'} accepted friends · skipped ${body.skipped ?? 0}`,
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Neo circle reseed failed',
        description: err instanceof Error ? err.message : 'Could not restore Neo friendships',
      });
    } finally {
      setReseedingNeoCircle(false);
    }
  };

  const handleReseedJordieCircle = async () => {
    setReseedingJordieCircle(true);
    try {
      const res = await adminApiFetch('/api/admin/jordie/reseed-circle', { method: 'POST' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Reseed failed');
      toast({
        title: 'Jordie circle restored',
        description: `Linked Jordie ↔ ${body.reseeded ?? 0} artists · Jordie friends ${body.jordieFriendCount ?? '?'} · guestbook moved ${body.guestbookMoved ?? 0} · skipped ${body.skipped ?? 0}`,
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Jordie circle reseed failed',
        description: err instanceof Error ? err.message : 'Could not restore Jordie friendships',
      });
    } finally {
      setReseedingJordieCircle(false);
    }
  };

  const handleUpdateTier = async (targetUser: User, mode: AdminResidencyMode) => {
    if (rosterResidencyMode(targetUser) === mode) return;
    setUpdatingTierId(targetUser.id);
    try {
      const res = await adminApiFetch('/api/admin/users/residency', {
        method: 'POST',
        body: JSON.stringify({ targetUserId: targetUser.id, mode }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || `Residency update failed (${res.status})`);
      }
      setUsers((prev) =>
        prev.map((u) =>
          u.id === targetUser.id
            ? {
                ...u,
                subscriptionStatus: body.user?.subscriptionStatus ?? u.subscriptionStatus,
                subscriptionTier: body.user?.subscriptionTier ?? u.subscriptionTier,
                proSource: body.user?.proSource || undefined,
              }
            : u
        )
      );
      toast({
        title: 'Residency updated',
        description: body.message || `${targetUser.displayName} is now ${residencyModeLabel(mode)}.`,
      });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Update Failed', description: e.message });
    } finally {
      setUpdatingTierId(null);
    }
  };

  const handleUpdateRole = async (targetUser: User, role: 'admin' | 'artist') => {
    if (targetUser.id === user?.id && role === 'artist') {
      toast({
        variant: 'destructive',
        title: 'Blocked',
        description: 'You cannot demote yourself.',
      });
      return;
    }
    if (role === 'artist' && isMasterAdminEmail(targetUser.email)) {
      toast({
        variant: 'destructive',
        title: 'Blocked',
        description: 'Master admin cannot be demoted.',
      });
      return;
    }
    const label = role === 'admin' ? 'admin' : 'artist';
    if (
      !confirm(
        role === 'admin'
          ? `Make ${targetUser.displayName} an admin?\n\nThey will get the Admin Panel after refresh / re-sign-in.`
          : `Remove admin from ${targetUser.displayName}?\n\nThey will go back to a normal artist account.`
      )
    ) {
      return;
    }

    setUpdatingRoleId(targetUser.id);
    try {
      const res = await adminApiFetch('/api/admin/users/role', {
        method: 'POST',
        body: JSON.stringify({ targetUserId: targetUser.id, role }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || `Role update failed (${res.status})`);
      }
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, role } : u))
      );
      setBlockedUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, role } : u))
      );
      toast({
        title: role === 'admin' ? 'Admin granted' : 'Admin removed',
        description: `${targetUser.displayName} is now ${label}.`,
      });
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Role update failed',
        description: e.message,
      });
    } finally {
      setUpdatingRoleId(null);
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

  const handleGrantPreview = async (targetUser: User) => {
    const label = `${PRO_FEATURE_PREVIEW_HOURS}h Pro`;
    if (
      !confirm(
        `Give ${targetUser.displayName} a fresh ${label} preview?\n\nThis starts a new ${PRO_FEATURE_PREVIEW_HOURS}-hour Pro window from now (export, vault saves, Performance). It does not change paid Pro or Ink.`
      )
    ) {
      return;
    }
    setGrantingPreviewId(targetUser.id);
    try {
      const res = await adminApiFetch('/api/admin/users/preview', {
        method: 'POST',
        body: JSON.stringify({ targetUserId: targetUser.id }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || `Preview grant failed (${res.status})`);
      }
      const expiresAt = typeof body.expiresAt === 'string' ? body.expiresAt : computeProFeaturePreviewExpiresAt();
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, proFeaturePreviewExpiresAt: expiresAt } : u))
      );
      setBlockedUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, proFeaturePreviewExpiresAt: expiresAt } : u))
      );
      toast({
        title: `${label} granted`,
        description: `${targetUser.displayName} is on Pro preview until it runs out.`,
      });
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Preview grant failed',
        description: e.message,
      });
    } finally {
      setGrantingPreviewId(null);
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

  const handleTogglePublicProfile = async (targetUser: User, nextPublic: boolean) => {
    const action = nextPublic ? 'make public' : 'take offline (no public profile)';
    if (
      !confirm(
        `${nextPublic ? 'Make' : 'Take'} ${targetUser.displayName} ${nextPublic ? 'public' : 'offline'}?\n\n${
          nextPublic
            ? 'Their Artist Home will go live on the Scene (if a slug is available).'
            : 'Removes them from public friends lists, Discover, and /profile until they go live again.'
        }`
      )
    ) {
      return;
    }

    setModeratingPublicId(targetUser.id);
    try {
      const res = await adminApiFetch('/api/admin/gamification/moderate', {
        method: 'POST',
        body: JSON.stringify({ targetUserId: targetUser.id, publicProfile: nextPublic }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || `Could not ${action} (${res.status})`);
      }

      setGamificationStats((prev) => ({
        ...prev,
        [targetUser.id]: {
          ...(prev[targetUser.id] || {
            displayName: targetUser.displayName,
            email: targetUser.email,
            status: targetUser.status || 'active',
            xp: 0,
            rankId: 'open_mic',
            currentStreak: 0,
            longestStreak: 0,
            lifetimeBarsWritten: 0,
            unlockedAchievements: {},
            publicProfile: false,
          }),
          publicProfile: Boolean(body.publicProfile),
          profileSlug:
            typeof body.profileSlug === 'string' && body.profileSlug
              ? body.profileSlug
              : prev[targetUser.id]?.profileSlug,
        },
      }));

      toast({
        title: nextPublic ? 'Artist Home live' : 'Taken offline',
        description: nextPublic
          ? `${targetUser.displayName} is public again.`
          : `${targetUser.displayName} has no public profile now.`,
      });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Visibility update failed', description: e.message });
    } finally {
      setModeratingPublicId(null);
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
            publicProfile: false,
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
      if (
        !confirm(
          `ERADICATION PROTOCOL: Permanently delete ${targetUser.displayName}?\n\nThis removes their Firebase Authentication account and wipes all albums, tracks, ink balances, trophies, Lyrics DNA Drops, and vault data. Any active Studio Pro subscription in Stripe will be cancelled. They are cleared from the identity registry — if they sign in again they start completely fresh (welcome Ink and full onboarding), unlike self-delete which blocks perk farming.`
        )
      ) {
        return;
      }
      try {
          const res = await adminApiFetch('/api/admin/users/eradicate', {
            method: 'POST',
            body: JSON.stringify({ targetUserId: targetUser.id }),
          });
          const body = await res.json().catch(() => ({}));
          if (!res.ok) {
            throw new Error(body.error || `Eradication failed (${res.status})`);
          }
          setUsers((prev) => prev.filter((u) => u.id !== targetUser.id));
          setBlockedUsers((prev) => prev.filter((u) => u.id !== targetUser.id));
          setBalances((prev) => {
            const next = { ...prev };
            delete next[targetUser.id];
            return next;
          });
          setGamificationStats((prev) => {
            const next = { ...prev };
            delete next[targetUser.id];
            return next;
          });
          toast({
            title: 'Identity Eradicated',
            description: `Removed Auth account and ${body.albumsDeleted ?? 0} albums / ${body.tracksDeleted ?? 0} tracks${body.stripeSubscriptionsCanceled ? ` · ${body.stripeSubscriptionsCanceled} Stripe sub(s) cancelled` : ''}.`,
          });
      } catch (e: any) {
          toast({ variant: 'destructive', title: "Eradication Failed", description: e.message });
      }
  };

  if (authLoading || !authReady) return <StudioLoader size="lg" fullscreen />;
  if (!user || user.role !== 'admin') return null;

  return (
    <TooltipProvider>
    <div className="relative min-h-[calc(100vh-3.5rem)] overflow-hidden pb-12">
    <div className="container relative z-10 mx-auto py-12 px-4 max-w-[88rem] font-code">
      <div className="flex items-center gap-4 mb-10">
        <ShieldCheck className="h-12 w-12 text-primary" />
        <div>
          <h1 className="text-5xl font-headline font-bold text-white uppercase tracking-tighter">Master Control</h1>
          <p className="text-[10px] text-muted-foreground uppercase tracking-[0.4em] mt-1">5/22/2026 AUTHORITY PROTOCOL</p>
        </div>
      </div>

      <Tabs key={defaultAdminTab} defaultValue={defaultAdminTab} className="space-y-8">
        <TabsList className="bg-muted/50 border h-auto p-1.5 gap-2 w-full justify-start flex-wrap">
          {metricsSurfaceOn ? (
            <TabsTrigger value="metrics" className="gap-2 px-6 py-3 font-bold uppercase text-[10px] tracking-widest text-emerald-400">
              <LineChart className="h-4 w-4" /> {showCeoV2 ? 'CEO Deck' : 'Growth Metrics'}
            </TabsTrigger>
          ) : null}
          <TabsTrigger value="users" className="gap-2 px-6 py-3 font-bold uppercase text-[10px] tracking-widest"><Users className="h-4 w-4" /> Artist Roster</TabsTrigger>
          <TabsTrigger value="achievements" className="gap-2 px-6 py-3 font-bold uppercase text-[10px] tracking-widest text-amber-400"><Trophy className="h-4 w-4" /> Studio Trophies</TabsTrigger>
          <TabsTrigger value="blacklist" className="gap-2 px-6 py-3 font-bold uppercase text-[10px] tracking-widest text-red-500"><ShieldX className="h-4 w-4" /> Blacklist</TabsTrigger>
          <TabsTrigger value="logs" className="gap-2 px-6 py-3 font-bold uppercase text-[10px] tracking-widest"><BarChart3 className="h-4 w-4" /> Ops Log</TabsTrigger>
          <TabsTrigger value="config" className="gap-2 px-6 py-3 font-bold uppercase text-[10px] tracking-widest"><Settings className="h-4 w-4" /> Config</TabsTrigger>
        </TabsList>

        {metricsSurfaceOn ? (
          <TabsContent value="metrics">
            {surfacesLoading ? (
              <div className="py-16"><StudioLoader size="md" /></div>
            ) : showCeoV2 ? (
              <AdminCeoDashboardV2 />
            ) : showLegacyMetrics ? (
              <AdminMetricsTab />
            ) : null}
          </TabsContent>
        ) : null}

        <TabsContent
          value="users"
          className="relative left-1/2 w-[min(106rem,calc(100vw-5rem))] -translate-x-1/2"
        >
          {rosterLoading ? (
            <div className="py-20 text-center"><StudioLoader size="md" /></div>
          ) : (
          <Card className="bg-card border-2 shadow-2xl">
            <CardHeader className="border-b"><CardTitle className="font-headline text-2xl uppercase">Residency Management</CardTitle></CardHeader>
            <CardContent className="min-w-0 overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    {([
                      ['Artist', 'artist'],
                      ['Tier', 'tier'],
                      ['Joined', 'joined'],
                      ['Last login', 'lastLogin'],
                      ['Rank / XP', 'rank'],
                      ['Trophies', 'trophies'],
                      ['Streak', 'streak'],
                      ['Residency Ink', 'residency'],
                      ['Permanent Ink', 'permanent'],
                    ] as const).map(([label, key]) => (
                      <TableHead key={key}>
                        <button
                          type="button"
                          onClick={() => toggleRosterSort(key)}
                          className={cn(
                            'inline-flex items-center gap-1 font-bold uppercase text-[9px] tracking-wider hover:text-primary transition-colors',
                            rosterSort.key === key && 'text-primary'
                          )}
                        >
                          {label}
                          <ArrowUpDown className="h-3 w-3 opacity-60" />
                        </button>
                      </TableHead>
                    ))}
                    <TableHead className="font-bold uppercase text-[9px] tracking-wider">Manual Calibration</TableHead>
                    <TableHead className="text-right font-bold uppercase text-[9px] tracking-wider">Access</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedUsers.length > 0 ? sortedUsers.map(u => {
                    const gam = gamificationStats[u.id];
                    const unlocked = gam?.unlockedAchievements || {};
                    const unlockedCount = Object.keys(unlocked).length;
                    const unlockedIds = new Set(Object.keys(unlocked));

                    return (
                    <TableRow key={u.id} className="hover:bg-white/5 border-b border-white/5">
                      <TableCell>
                        <div className="font-bold text-white uppercase text-xs flex items-center gap-2 flex-wrap">
                          <LiveArtistStarAvatar
                            name={u.displayName || 'Artist'}
                            userId={u.id}
                            slug={gam?.profileSlug}
                            avatarUrl={u.photoURL}
                            studioChrome={studioChromeFromSubscriptionStatus(u.subscriptionStatus)}
                            size={28}
                            link={false}
                          />
                          <span className={studioNameClass(studioChromeFromSubscriptionStatus(u.subscriptionStatus))}>{u.displayName}</span>
                          {(u.role === 'admin' || isMasterAdminEmail(u.email)) && (
                            <Badge
                              variant="outline"
                              className="text-[8px] leading-none px-1.5 py-0.5 border-fuchsia-500/40 text-fuchsia-300 uppercase font-bold tracking-wide"
                            >
                              Admin
                            </Badge>
                          )}
                          {gam?.publicProfile ? (
                            <Badge
                              variant="outline"
                              className="text-[8px] leading-none px-1.5 py-0.5 border-sky-500/40 text-sky-300 uppercase font-bold tracking-wide"
                            >
                              Public
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[8px] leading-none px-1.5 py-0.5 border-white/20 text-muted-foreground uppercase font-bold tracking-wide"
                            >
                              Offline
                            </Badge>
                          )}
                        </div>
                        <div className="text-[9px] text-muted-foreground uppercase">{u.email}</div>
                        <div className="font-code text-[8px] text-muted-foreground/70">{u.id}</div>
                      </TableCell>
                      <TableCell>
                          <div className="space-y-1.5">
                          <Select
                            value={rosterResidencyMode(u)}
                            disabled={updatingTierId === u.id}
                            onValueChange={(val) => {
                              if (isAdminResidencyMode(val)) void handleUpdateTier(u, val);
                            }}
                          >
                              <SelectTrigger className={cn(
                                "h-8 w-36 text-[9px] font-bold uppercase",
                                studioNameClass(studioChromeFromSubscriptionStatus(u.subscriptionStatus)),
                                u.subscriptionStatus === 'active' ? "border-accent" : "border-primary"
                              )}>
                                  <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-card border-2">
                                  <SelectItem value="none" className="text-[rgb(125,211,252)]">LOCAL</SelectItem>
                                  <SelectItem value="admin-monthly" className="text-accent">ADMIN MO</SelectItem>
                                  <SelectItem value="admin-yearly" className="text-accent">ADMIN YR</SelectItem>
                                  <SelectItem value="stripe-monthly" className="text-sky-300">STRIPE MO</SelectItem>
                                  <SelectItem value="stripe-yearly" className="text-sky-300">STRIPE YR</SelectItem>
                              </SelectContent>
                          </Select>
                          {rosterResidencyMode(u).startsWith('admin') ? (
                            <p className="font-code text-[8px] uppercase tracking-wide text-muted-foreground">
                              Until you change it
                            </p>
                          ) : rosterResidencyMode(u).startsWith('stripe') ? (
                            <p className="font-code text-[8px] uppercase tracking-wide text-muted-foreground">
                              Follows Stripe
                            </p>
                          ) : null}
                          {u.subscriptionStatus === 'active' ? null : (
                            <div className="space-y-1">
                              {isProFeaturePreviewActive(u, previewNow) ? (
                                <p className="flex items-center gap-1 font-code text-[9px] font-bold uppercase tracking-wide text-sky-300">
                                  <Hourglass className="h-3 w-3 shrink-0" />
                                  48h Pro · {formatProFeaturePreviewCountdown(u, previewNow)}
                                </p>
                              ) : u.proFeaturePreviewExpiresAt ? (
                                <p className="font-code text-[8px] uppercase tracking-wide text-muted-foreground">
                                  48h Pro ended
                                </p>
                              ) : null}
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-[8px] font-bold uppercase tracking-widest border-sky-500/40 text-sky-200 hover:bg-sky-500/10"
                                disabled={grantingPreviewId === u.id}
                                onClick={() => void handleGrantPreview(u)}
                              >
                                {grantingPreviewId === u.id
                                  ? 'Granting…'
                                  : isProFeaturePreviewActive(u, previewNow)
                                    ? `Restart ${PRO_FEATURE_PREVIEW_HOURS}h`
                                    : `Give ${PRO_FEATURE_PREVIEW_HOURS}h Pro`}
                              </Button>
                            </div>
                          )}
                          </div>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const joined = formatUserJoinDate(u.createdAt);
                          return (
                            <>
                              <div className="text-[10px] font-code text-muted-foreground uppercase whitespace-nowrap">
                                {joined.date}
                              </div>
                              {joined.time && (
                                <p className="text-[8px] text-muted-foreground/70 font-code normal-case">
                                  {joined.time}
                                </p>
                              )}
                            </>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const lastLogin = formatUserJoinDate(gam?.lastSignInAt || u.lastSignInAt);
                          return (
                            <>
                              <div className="text-[10px] font-code text-muted-foreground uppercase whitespace-nowrap">
                                {lastLogin.date}
                              </div>
                              {lastLogin.time ? (
                                <p className="text-[8px] text-muted-foreground/70 font-code normal-case">
                                  {lastLogin.time}
                                </p>
                              ) : null}
                            </>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge
                            variant="outline"
                            className="inline-flex w-fit items-center whitespace-nowrap text-[8px] leading-none px-2 py-0.5 border-amber-500/30 text-amber-300 uppercase font-bold tracking-wide"
                          >
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
                      <TableCell>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 font-bold text-xs text-white">
                            <Clock className="h-3 w-3 text-primary" />
                            {(balances[u.id]?.res || 0).toLocaleString()}
                          </div>
                          {u.pendingWelcomeInk && (balances[u.id]?.res || 0) === 0 ? (
                            <p className="text-[8px] font-code uppercase tracking-wide text-amber-300/80">
                              pending verify
                            </p>
                          ) : u.returningIdentity && (balances[u.id]?.res || 0) === 0 ? (
                            <p className="text-[8px] font-code uppercase tracking-wide text-muted-foreground">
                              returning email
                            </p>
                          ) : null}
                        </div>
                      </TableCell>
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
                                  {(() => {
                                    const isAdminRow =
                                      u.role === 'admin' || isMasterAdminEmail(u.email);
                                    const isMaster = isMasterAdminEmail(u.email);
                                    const isSelf = u.id === user?.id;
                                    const busy = updatingRoleId === u.id;
                                    if (isAdminRow) {
                                      return (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-8 w-8 text-fuchsia-400 hover:bg-fuchsia-500/10"
                                              disabled={busy || isMaster || isSelf}
                                              onClick={() => void handleUpdateRole(u, 'artist')}
                                            >
                                              <ShieldX className="h-4 w-4" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p className="text-[10px] font-bold">
                                              {isMaster
                                                ? 'Master admin'
                                                : isSelf
                                                  ? 'Cannot demote yourself'
                                                  : 'Remove admin'}
                                            </p>
                                          </TooltipContent>
                                        </Tooltip>
                                      );
                                    }
                                    return (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-emerald-400 hover:bg-emerald-500/10"
                                            disabled={busy}
                                            onClick={() => void handleUpdateRole(u, 'admin')}
                                          >
                                            <ShieldCheck className="h-4 w-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p className="text-[10px] font-bold">Make admin</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    );
                                  })()}
                                  <Tooltip>
                                      <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className={cn(
                                              'h-8 w-8 hover:bg-sky-500/10',
                                              gam?.publicProfile
                                                ? 'text-sky-400'
                                                : 'text-muted-foreground hover:text-sky-300'
                                            )}
                                            disabled={moderatingPublicId === u.id}
                                            onClick={() =>
                                              void handleTogglePublicProfile(u, !Boolean(gam?.publicProfile))
                                            }
                                          >
                                            {gam?.publicProfile ? (
                                              <EyeOff className="h-4 w-4" />
                                            ) : (
                                              <Globe className="h-4 w-4" />
                                            )}
                                          </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="text-[10px] font-bold">
                                          {gam?.publicProfile
                                            ? 'Take offline (no public profile)'
                                            : 'Make public'}
                                        </p>
                                      </TooltipContent>
                                  </Tooltip>
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
                    <TableRow><TableCell colSpan={11} className="h-32 text-center text-muted-foreground text-[10px] uppercase tracking-[0.4em]">Searching studio roster...</TableCell></TableRow>
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

        <TabsContent value="config" className="space-y-8">
            <AdminSceneLayoutCard />
            <AdminProductSurfacesCard />
            <AdminProPreviewAuditCard />
            <AdminProductionGateCard />
            <AdminLockFeatureCard />
            <AdminFoldsFeatureCard />
            <AdminCollabSheetFeatureCard />
            <AdminFirstDropsCard />
            <AdminFreeDropsCard />
            <AdminHouseReleasesCard />
            <AdminHouseBarCard />
            <AdminTonightsFormCard />
            <AdminWeeklyChallengeCard />
            <AdminInviteGateCard />
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
                <CardHeader className="border-b space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <CardTitle className="font-headline text-2xl uppercase">Neural Operation Stream</CardTitle>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-9 text-[10px] font-bold uppercase tracking-wider"
                        disabled={backfillingAchievements}
                        onClick={() => void handleBackfillAchievements()}
                      >
                        {backfillingAchievements ? 'Backfilling…' : 'Backfill achievement unlocks'}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-9 text-[10px] font-bold uppercase tracking-wider border-fuchsia-500/40 text-fuchsia-200"
                        disabled={repairingNeomaiya}
                        onClick={() => void handleRepairNeomaiya()}
                      >
                        {repairingNeomaiya ? 'Repairing Neo…' : 'Repair Neomaiya Sol identity'}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-9 text-[10px] font-bold uppercase tracking-wider border-emerald-500/40 text-emerald-200"
                        disabled={reseedingNeoCircle}
                        onClick={() => void handleReseedNeoCircle()}
                      >
                        {reseedingNeoCircle ? 'Restoring Neo ↔ everyone…' : 'Make Neo everyone’s friend'}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-9 text-[10px] font-bold uppercase tracking-wider border-amber-500/40 text-amber-200"
                        disabled={reseedingJordieCircle}
                        onClick={() => void handleReseedJordieCircle()}
                      >
                        {reseedingJordieCircle
                          ? 'Restoring Jordie ↔ everyone…'
                          : 'Make Jordie everyone’s friend'}
                      </Button>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground max-w-2xl">
                    Signup auto-friends both Neo and Jordie. Guestbook welcome is{' '}
                    <span className="text-amber-200/90">Jordie Cruz</span> (jordiecruzllc@gmail.com).
                    Run <span className="text-amber-200/90">Make Jordie everyone’s friend</span> to
                    retro-link everyone and move welcome guestbook lines off Neo.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        { id: 'all' as const, label: 'All' },
                        { id: 'transaction' as const, label: 'Purchases' },
                        { id: 'achievement' as const, label: 'Achievements' },
                        { id: 'ai_request' as const, label: 'AI' },
                      ] as const
                    ).map((f) => (
                      <Button
                        key={f.id}
                        type="button"
                        size="sm"
                        variant={opsLogFilter === f.id ? 'default' : 'outline'}
                        className="h-8 text-[10px] font-bold uppercase tracking-wider"
                        onClick={() => {
                          setOpsLogFilter(f.id);
                          setOpsLogPage(1);
                        }}
                      >
                        {f.label}
                        <span className="ml-1.5 opacity-70">{opsLogCounts[f.id]}</span>
                      </Button>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed max-w-2xl">
                    Timestamps are when the artist unlocked the badge. Use{' '}
                    <strong className="text-foreground/80">Backfill achievement unlocks</strong> once to import
                    existing trophies into this stream (shows defined ink rewards — does not re-grant Ink).
                  </p>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader><TableRow><TableHead>Timestamp</TableHead><TableHead>Artist</TableHead><TableHead>Operation</TableHead><TableHead className="text-right">Ink</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {filteredOpsLogs.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                                  {opsLogFilter === 'achievement'
                                    ? 'No achievement unlocks in the stream yet. Click “Backfill achievement unlocks” above to import existing trophies.'
                                    : 'No operations in this filter.'}
                                </TableCell>
                              </TableRow>
                            ) : null}
                            {pagedOpsLogs.map(log => {
                                const rosterUser = users.find((u) => u.id === log.userId)
                                  || blockedUsers.find((u) => u.id === log.userId);
                                const artistLabel =
                                  (log.userName && String(log.userName).trim()) ||
                                  rosterUser?.displayName ||
                                  rosterUser?.email ||
                                  (log.userId ? `${String(log.userId).slice(0, 8)}…` : 'Unknown');
                                const delta = resolveOpsLogInkDelta(log);
                                const inkLabel = formatOpsLogInkLabel(delta);
                                const inkClass =
                                  delta > 0
                                    ? 'text-emerald-400'
                                    : delta < 0
                                      ? 'text-primary'
                                      : 'text-muted-foreground';
                                return (
                                <TableRow key={log.id} className="border-b border-white/5">
                                    <TableCell className="text-[10px] font-code text-muted-foreground">{format(new Date(log.timestamp), 'MM/dd HH:mm:ss')}</TableCell>
                                    <TableCell className="font-bold text-white uppercase text-xs">{artistLabel}</TableCell>
                                    <TableCell>
                                      <Badge
                                        variant="outline"
                                        className={cn(
                                          'text-[9px] uppercase border-primary/20 text-primary',
                                          log.type === 'achievement' && 'border-violet-400/40 text-violet-300',
                                          log.type === 'transaction' && 'border-emerald-400/40 text-emerald-300'
                                        )}
                                      >
                                        {log.action}
                                      </Badge>
                                      {log.details ? (
                                        <p className="mt-1 text-[9px] text-muted-foreground font-code max-w-[28rem] truncate" title={log.details}>{log.details}</p>
                                      ) : null}
                                    </TableCell>
                                    <TableCell className={`text-right font-code font-bold whitespace-nowrap ${inkClass}`}>{inkLabel}</TableCell>
                                </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                    {filteredOpsLogs.length > 0 ? (
                      <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                          Showing{' '}
                          <span className="font-bold text-foreground">
                            {(safeOpsLogPage - 1) * OPS_LOG_PAGE_SIZE + 1}
                            –
                            {Math.min(safeOpsLogPage * OPS_LOG_PAGE_SIZE, filteredOpsLogs.length)}
                          </span>{' '}
                          of <span className="font-bold text-foreground">{filteredOpsLogs.length}</span>
                          {' · '}
                          {OPS_LOG_PAGE_SIZE} per page
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1 text-[10px] font-bold uppercase tracking-wider"
                            disabled={safeOpsLogPage <= 1}
                            onClick={() => setOpsLogPage((p) => Math.max(1, p - 1))}
                          >
                            <ChevronLeft className="h-3.5 w-3.5" /> Prev
                          </Button>
                          <span className="min-w-[5.5rem] text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Page {safeOpsLogPage} / {opsLogPageCount}
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1 text-[10px] font-bold uppercase tracking-wider"
                            disabled={safeOpsLogPage >= opsLogPageCount}
                            onClick={() => setOpsLogPage((p) => Math.min(opsLogPageCount, p + 1))}
                          >
                            Next <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ) : null}
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
    </div>
    </TooltipProvider>
  );
}
