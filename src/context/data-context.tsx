'use client';

import React, { createContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import type { Album, StyleProfile, Track } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { isGuestTryAlbumId, isGuestTrySheetEnabled } from '@/lib/guest-try';
import { loadOrCreateGuestAlbum, persistGuestTrack } from '@/lib/guest-track-session';

import { db } from '@/lib/firebase/client/firebase';
import { waitForAuthUser } from '@/lib/firebase/client/auth-ready';
import { doc, setDoc, getDoc, collection, getDocs, deleteDoc, writeBatch, deleteField } from 'firebase/firestore';
import { stripForFirestore } from '@/lib/utils';
import { deleteVoiceStorage } from '@/lib/profile/voice-notes';
import { countNonEmptyBars } from '@/lib/gamification/bar-count';
import {
  buildLineBaseline,
  computeLineCreditDeltas,
  countLinesWithSource,
  type LineBaselineEntry,
} from '@/lib/gamification/line-attribution';
import { postGamificationEvent } from '@/lib/gamification-client';
import { isBrowserOffline, onNetworkChange } from '@/lib/offline/network';
import {
  loadVaultSnapshot,
  saveVaultSnapshot,
  warmStudioRoutes,
} from '@/lib/offline/vault-cache';
import {
  clearOutbox,
  mergeAlbumOutbox,
  mergeTrackOutbox,
  outboxCount,
  pushDeleteAlbumOutbox,
  pushDeleteTrackOutbox,
  pushStyleOutbox,
  readOutbox,
} from '@/lib/offline/sync-outbox';
import {
  buildAlbumDropPayload,
  buildTrackDropPayload,
  findTrackInVault,
  type DnaDropTrackPayload,
} from '@/lib/dna-drop';
import { shareDocCommerceFlags } from '@/lib/drop-commerce';
import { canUserAddTrack, FreeTrackLimitError, hasUnlimitedCatalog, isProOrTrial } from '@/lib/subscription';
import { computeRotatedFreeEditableTrackIds } from '@/lib/tier-limits';
import { persistFreeEditableTrackIds } from '@/lib/free-editable-tracks';
import { createCatalogAlbum, createCatalogTrack } from '@/lib/catalog-client';

const UNASSIGNED_ALBUM_ID = 'unassigned';

const createUnassignedShell = (ownerId: string): Omit<Album, 'tracks'> => ({
  id: UNASSIGNED_ALBUM_ID,
  ownerId,
  title: 'Loose Tracks',
  theme: 'Unassigned tracks.',
  createdAt: new Date().toISOString(),
});

function ensureTrackId(track: Track, index: number): string {
  const id = track.id?.trim();
  if (id) return id;
  return `track-import-${Date.now()}-${index}`;
}

interface DataContextType {
  albums: Album[];
  styleProfile: StyleProfile | null;
  loading: boolean;
  isCloudSyncActive: boolean;
  cloudSaveStatus: 'saved' | 'pending' | 'saving' | 'offline';
  syncPendingCount: number;
  isOfflineMode: boolean;
  flushCloudNow: () => Promise<void>;
  syncVaultToCloud: () => Promise<void>;
  addAlbum: (album: Album) => void;
  updateAlbum: (albumId: string, updates: Partial<Album>) => void;
  deleteAlbum: (albumId: string) => void;
  getAlbumById: (albumId: string) => Album | undefined;
  addTrack: (albumId: string, track: Omit<Track, 'id'>) => Track;
  updateTrack: (albumId: string, trackId: string, updates: Partial<Track>) => void;
  deleteTrack: (albumId: string, trackId: string) => void;
  getTrackById: (albumId: string, trackId: string) => { track: Track | undefined, album: Album | undefined };
  mergeData: (
    albumsToMerge: Album[],
    tracksToMerge: Track[],
    options?: {
      styleProfile?: StyleProfile | null;
      copyOnConflict?: boolean;
      applyImportedTrackStyle?: boolean;
    }
  ) => Promise<void>;
  clearVault: () => Promise<void>;
  moveTrack: (trackId: string, fromAlbumId: string, toAlbumId: string) => void;
  updateStyleProfile: (analysis: string, metrics?: any) => void;
  dropDNA: (type: 'album' | 'track', id: string, options?: { albumId?: string }) => Promise<string>;
  updateDNA: (type: 'album' | 'track', id: string, shareId: string, options?: { albumId?: string }) => Promise<string>;
  revokeDNA: (type: 'album' | 'track', id: string, shareId: string, options?: { albumId?: string }) => Promise<void>;
}

export const DataContext = createContext<DataContextType>({
  albums: [],
  styleProfile: null,
  loading: true,
  isCloudSyncActive: false,
  cloudSaveStatus: 'saved' as const,
  syncPendingCount: 0,
  isOfflineMode: false,
  flushCloudNow: async () => {},
  syncVaultToCloud: async () => {},
  addAlbum: () => {},
  updateAlbum: () => {},
  deleteAlbum: () => {},
  getAlbumById: () => undefined,
  addTrack: () => ({} as Track),
  updateTrack: () => {},
  deleteTrack: () => {},
  getTrackById: () => ({ track: undefined, album: undefined }),
  mergeData: async () => {},
  clearVault: async () => {},
  moveTrack: () => {},
  updateStyleProfile: () => {},
  dropDNA: async () => '',
  updateDNA: async () => '',
  revokeDNA: async () => {},
});

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const { user, authReady } = useAuth();
  const userId = user?.id;
  const { toast } = useToast();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [styleProfile, setStyleProfile] = useState<StyleProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCloudSyncActive, setIsCloudSyncActive] = useState(false);
  const [cloudSaveStatus, setCloudSaveStatus] = useState<'saved' | 'pending' | 'saving' | 'offline'>('saved');
  const [syncPendingCount, setSyncPendingCount] = useState(0);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  useEffect(() => {
    setIsCloudSyncActive(isProOrTrial(user));
  }, [user]);

  const pendingTrackUpdates = useRef<Record<string, { albumId: string, updates: any }>>({});
  const syncTrackTimeout = useRef<NodeJS.Timeout | null>(null);
  const pendingAlbumUpdates = useRef<Record<string, any>>({});
  const syncAlbumTimeout = useRef<NodeJS.Timeout | null>(null);
  const pendingCatalogCreatesRef = useRef(new Map<string, Promise<void>>());
  const albumsRef = useRef<Album[]>([]);
  const vaultLoadedUserIdRef = useRef<string | null>(null);
  const prevBarCountsRef = useRef<Record<string, number>>({});
  const prevTrackCompleteRef = useRef<Record<string, boolean>>({});
  const prevLineBaselinesRef = useRef<Record<string, Record<string, LineBaselineEntry>>>({});

  const seedTrackProgressBaselines = useCallback((albumList: Album[]) => {
    const barBaselines: Record<string, number> = {};
    const completeBaselines: Record<string, boolean> = {};
    const lineBaselines: Record<string, Record<string, LineBaselineEntry>> = {};
    for (const album of albumList) {
      for (const track of album.tracks) {
        barBaselines[track.id] = countNonEmptyBars(track.sections);
        completeBaselines[track.id] = track.status === 'complete';
        lineBaselines[track.id] = buildLineBaseline(track.sections);
      }
    }
    prevBarCountsRef.current = barBaselines;
    prevTrackCompleteRef.current = completeBaselines;
    prevLineBaselinesRef.current = lineBaselines;
  }, []);

  useEffect(() => {
    albumsRef.current = albums;
  }, [albums]);

  useEffect(() => {
    prevBarCountsRef.current = {};
    prevTrackCompleteRef.current = {};
    prevLineBaselinesRef.current = {};
  }, [user?.id]);

  useEffect(() => {
    setIsOfflineMode(isBrowserOffline());
    return onNetworkChange((online) => {
      setIsOfflineMode(!online);
      if (online && user?.id) {
        setSyncPendingCount(outboxCount(user.id));
      }
    });
  }, [user?.id]);

  const queuePendingToOutbox = useCallback(() => {
    if (!user) return 0;

    Object.entries(pendingTrackUpdates.current).forEach(([trackId, data]) => {
      mergeTrackOutbox(user.id, trackId, data.albumId, data.updates);
    });
    pendingTrackUpdates.current = {};

    Object.entries(pendingAlbumUpdates.current).forEach(([albumId, data]) => {
      mergeAlbumOutbox(user.id, albumId, data);
    });
    pendingAlbumUpdates.current = {};

    const count = outboxCount(user.id);
    setSyncPendingCount(count);
    if (count > 0) {
      setCloudSaveStatus('offline');
    }
    return count;
  }, [user]);

  const performTrackSync = useCallback(async () => {
    if (!user) return;
    if (isBrowserOffline()) {
      queuePendingToOutbox();
      return;
    }
    if (Object.keys(pendingTrackUpdates.current).length === 0) return;
    setCloudSaveStatus('saving');
    const batch = writeBatch(db);
    const updates = { ...pendingTrackUpdates.current };
    pendingTrackUpdates.current = {};
    await Promise.allSettled(
      Object.entries(updates)
        .map(([trackId, data]) =>
          pendingCatalogCreatesRef.current.get(`track:${data.albumId}:${trackId}`)
        )
        .filter((pending): pending is Promise<void> => Boolean(pending))
    );
    Object.entries(updates).forEach(([trackId, data]) => {
        batch.set(
          doc(db, 'users', user.id, 'albums', data.albumId, 'tracks', trackId),
          stripForFirestore({ ...data.updates, updatedAt: new Date().toISOString() }),
          { merge: true },
        );
    });
    await batch.commit();
    if (Object.keys(pendingTrackUpdates.current).length === 0 && Object.keys(pendingAlbumUpdates.current).length === 0) {
      setCloudSaveStatus('saved');
    }

    for (const [trackId, data] of Object.entries(updates)) {
      const album = albumsRef.current.find((a) => a.id === data.albumId);
      const track = album?.tracks.find((t) => t.id === trackId);
      if (!track) continue;

      const sections = data.updates?.sections ?? track.sections;
      const barCount = countNonEmptyBars(sections);
      const prevBarCount = prevBarCountsRef.current[trackId] ?? 0;
      prevBarCountsRef.current[trackId] = barCount;

      const prevLineBaseline = prevLineBaselinesRef.current[trackId] ?? {};
      const { writtenLines, generatedLines } = computeLineCreditDeltas(prevLineBaseline, sections);
      prevLineBaselinesRef.current[trackId] = buildLineBaseline(sections);

      const nextStatus = data.updates?.status ?? track.status;
      const wasComplete = prevTrackCompleteRef.current[trackId] ?? track.status === 'complete';
      const trackComplete = nextStatus === 'complete' && !wasComplete;
      prevTrackCompleteRef.current[trackId] = nextStatus === 'complete';

      const delta = Math.max(0, barCount - prevBarCount);
      if (delta === 0 && writtenLines === 0 && generatedLines === 0 && !trackComplete) continue;

      void postGamificationEvent('track_saved', {
        trackId,
        albumId: data.albumId,
        barCount,
        prevBarCount,
        writtenLinesDelta: writtenLines,
        generatedLinesDelta: generatedLines,
        trackComplete,
        albumTrackCount: album?.id !== UNASSIGNED_ALBUM_ID ? (album?.tracks?.length || 0) : 0,
        sessionBarCount: barCount,
        sessionWrittenLineCount: countLinesWithSource(sections, 'written'),
      });
    }
  }, [user, queuePendingToOutbox]);

  const performAlbumSync = useCallback(async () => {
    if (!user) return;
    if (isBrowserOffline()) {
      queuePendingToOutbox();
      return;
    }
    if (Object.keys(pendingAlbumUpdates.current).length === 0) return;
    setCloudSaveStatus('saving');
    const batch = writeBatch(db);
    const updates = { ...pendingAlbumUpdates.current };
    pendingAlbumUpdates.current = {};
    await Promise.allSettled(
      Object.keys(updates)
        .map((albumId) => pendingCatalogCreatesRef.current.get(`album:${albumId}`))
        .filter((pending): pending is Promise<void> => Boolean(pending))
    );
    Object.entries(updates).forEach(([albumId, data]) => {
        batch.set(
          doc(db, 'users', user.id, 'albums', albumId),
          stripForFirestore({ ...data, updatedAt: new Date().toISOString() }),
          { merge: true },
        );
    });
    await batch.commit();
    if (Object.keys(pendingTrackUpdates.current).length === 0 && Object.keys(pendingAlbumUpdates.current).length === 0) {
      setCloudSaveStatus('saved');
    }
  }, [user, queuePendingToOutbox]);

  const flushOutboxReplay = useCallback(async () => {
    if (!user || isBrowserOffline()) return;

    queuePendingToOutbox();
    const entries = readOutbox(user.id);
    if (entries.length === 0) {
      setSyncPendingCount(0);
      return;
    }

    setCloudSaveStatus('saving');

    for (const entry of entries) {
      if (entry.type === 'track') {
        const trackRef = doc(db, 'users', user.id, 'albums', entry.albumId, 'tracks', entry.trackId);
        const trackData = stripForFirestore({ ...entry.updates, updatedAt: new Date().toISOString() });
        if ((await getDoc(trackRef)).exists()) {
          await setDoc(trackRef, trackData, { merge: true });
        } else {
          await createCatalogTrack(entry.albumId, entry.trackId, trackData);
        }
      } else if (entry.type === 'album') {
        const albumRef = doc(db, 'users', user.id, 'albums', entry.albumId);
        const albumData = stripForFirestore({ ...entry.updates, updatedAt: new Date().toISOString() });
        if ((await getDoc(albumRef)).exists()) {
          await setDoc(albumRef, albumData, { merge: true });
        } else {
          await createCatalogAlbum(entry.albumId, albumData);
        }
      } else if (entry.type === 'styleProfile') {
        await setDoc(doc(db, 'users', user.id, 'styleProfile', 'main'), stripForFirestore(entry.profile));
      } else if (entry.type === 'deleteTrack') {
        await deleteDoc(doc(db, 'users', user.id, 'albums', entry.albumId, 'tracks', entry.trackId));
      } else if (entry.type === 'deleteAlbum') {
        await deleteDoc(doc(db, 'users', user.id, 'albums', entry.albumId));
      }
    }

    clearOutbox(user.id);
    setSyncPendingCount(0);
    setCloudSaveStatus('saved');
  }, [user, queuePendingToOutbox]);

  const flushCloudNow = useCallback(async () => {
    if (syncTrackTimeout.current) {
      clearTimeout(syncTrackTimeout.current);
      syncTrackTimeout.current = null;
    }
    if (syncAlbumTimeout.current) {
      clearTimeout(syncAlbumTimeout.current);
      syncAlbumTimeout.current = null;
    }
    if (isBrowserOffline()) {
      queuePendingToOutbox();
      return;
    }
    await Promise.all([performTrackSync(), performAlbumSync(), flushOutboxReplay()]);
    setCloudSaveStatus('saved');
  }, [performTrackSync, performAlbumSync, flushOutboxReplay, queuePendingToOutbox]);

  const syncVaultToCloud = useCallback(async () => {
    if (!user || isBrowserOffline()) {
      queuePendingToOutbox();
      toast({
        title: 'Still offline',
        description: 'Changes stay saved on this device until you reconnect.',
      });
      return;
    }
    try {
      await flushCloudNow();
      toast({ title: 'Vault synced', description: 'Your studio is up to date in the cloud.' });
    } catch (error) {
      console.error('[syncVaultToCloud]', error);
      toast({
        variant: 'destructive',
        title: 'Sync failed',
        description: 'Try again when your connection is stable.',
      });
    }
  }, [user, flushCloudNow, queuePendingToOutbox, toast]);

  useEffect(() => {
    if (!user?.id) return;
    return onNetworkChange((online) => {
      if (online) {
        setSyncPendingCount(outboxCount(user.id));
        void flushOutboxReplay();
      }
    });
  }, [user?.id, flushOutboxReplay]);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') {
        void flushCloudNow();
      }
    };
    const onUnload = () => {
      void flushCloudNow();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('beforeunload', onUnload);
    window.addEventListener('pagehide', onUnload);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('beforeunload', onUnload);
      window.removeEventListener('pagehide', onUnload);
    };
  }, [flushCloudNow]);

  const applyLocalVault = useCallback(
    (parsedAlbums: Album[], parsedStyle: StyleProfile | null) => {
      if (!userId) return;
      const finalAlbums = [...parsedAlbums];
      if (!finalAlbums.find((a) => a.id === UNASSIGNED_ALBUM_ID)) {
        finalAlbums.unshift({ ...createUnassignedShell(userId), tracks: [] });
      }
      setAlbums(finalAlbums);
      seedTrackProgressBaselines(finalAlbums);
      if (parsedStyle) setStyleProfile(parsedStyle);
      setSyncPendingCount(outboxCount(userId));
      if (isBrowserOffline()) {
        setCloudSaveStatus(outboxCount(userId) > 0 ? 'offline' : 'saved');
      }
    },
    [seedTrackProgressBaselines, userId]
  );

  useEffect(() => {
    const loadData = async () => {
      if (!authReady) {
        // Auth still settling — seed guest try vault so the sheet can open without login redirect.
        if (!userId && isGuestTrySheetEnabled()) {
          setAlbums([loadOrCreateGuestAlbum()]);
          setStyleProfile(null);
          setSyncPendingCount(0);
          setCloudSaveStatus('saved');
          setLoading(false);
          vaultLoadedUserIdRef.current = null;
          return;
        }
        setAlbums([]);
        setStyleProfile(null);
        setSyncPendingCount(0);
        setCloudSaveStatus('saved');
        setLoading(false);
        vaultLoadedUserIdRef.current = null;
        return;
      }

      if (!userId) {
        if (isGuestTrySheetEnabled()) {
          setAlbums([loadOrCreateGuestAlbum()]);
          setStyleProfile(null);
          setSyncPendingCount(0);
          setCloudSaveStatus('saved');
          setLoading(false);
          vaultLoadedUserIdRef.current = null;
          return;
        }
        // Prevent cross-account/stale vault flash while logged out.
        setAlbums([]);
        setStyleProfile(null);
        setSyncPendingCount(0);
        setCloudSaveStatus('saved');
        setLoading(false);
        vaultLoadedUserIdRef.current = null;
        return;
      }

      const offline = isBrowserOffline();
      setIsOfflineMode(offline);
      setSyncPendingCount(outboxCount(userId));

      const cached = loadVaultSnapshot(userId);
      const onHome =
        typeof window !== 'undefined' &&
        (window.location.pathname === '/' || window.location.pathname === '/feed');
      if (cached.albums?.length) {
        applyLocalVault(cached.albums, cached.styleProfile);
        setLoading(false);
      }

      if (offline) {
        setLoading(false);
        vaultLoadedUserIdRef.current = userId;
        return;
      }

      if (onHome) {
        await new Promise((resolve) => window.setTimeout(resolve, cached.albums?.length ? 600 : 200));
      }

      const isSameUserReload = vaultLoadedUserIdRef.current === userId;
      const hasVisibleVault = albumsRef.current.length > 0;
      if ((!isSameUserReload || !hasVisibleVault) && !onHome) {
        setLoading(true);
      }

      try {
        const firebaseUser = await waitForAuthUser();
        if (!firebaseUser || firebaseUser.uid !== userId) {
          throw new Error('Auth session not ready');
        }

        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          const { markFreshSignup } = await import('@/lib/post-login-redirect');
          const { trackStudioEvent } = await import('@/lib/analytics-client');
          const { ANALYTICS_EVENTS } = await import('@/lib/analytics-events');
          const { getStoredMarketingRef } = await import('@/lib/marketing-attribution');
          const resolvedName =
            (typeof firebaseUser.displayName === 'string' && firebaseUser.displayName.trim()) ||
            'Anonymous Artist';
          const resolvedEmail =
            typeof firebaseUser.email === 'string' && firebaseUser.email.includes('@')
              ? firebaseUser.email.trim().toLowerCase()
              : '';
          const signupRef = getStoredMarketingRef();
          const { consumeGuestTrySignupMeta } = await import('@/lib/guest-funnel-client');
          const guestMeta = consumeGuestTrySignupMeta();
          await setDoc(
            userRef,
            stripForFirestore({
              displayName: resolvedName,
              ...(resolvedEmail ? { email: resolvedEmail } : {}),
              ...(signupRef ? { signupAttribution: signupRef } : {}),
              createdAt: new Date().toISOString(),
              role: 'artist',
              subscriptionStatus: 'none',
              subscriptionTier: 'none',
              status: 'active',
            })
          );
          // Safety net when this path wins the race against login syncUserProfile.
          void trackStudioEvent(ANALYTICS_EVENTS.SIGNUP, {
            method: 'profile_bootstrap',
            ...(signupRef ? { ref: signupRef } : {}),
            ...(guestMeta.guestId ? { guestId: guestMeta.guestId } : {}),
            ...(guestMeta.guestAlias ? { guestAlias: guestMeta.guestAlias } : {}),
            ...(guestMeta.fromGuestTry || guestMeta.guestId
              ? {
                  fromGuestTry: Boolean(guestMeta.fromGuestTry),
                  ...(guestMeta.fromGuestTry ? { intent: 'guest_try' } : {}),
                  ...(guestMeta.barsWritten != null ? { barsWritten: guestMeta.barsWritten } : {}),
                  ...(guestMeta.assistsUsed != null ? { assistsUsed: guestMeta.assistsUsed } : {}),
                }
              : {}),
          });
          markFreshSignup();
        } else {
          // Doc may exist from usage-init without identity — fill blanks only.
          const data = userSnap.data() || {};
          const patch: Record<string, unknown> = {};
          if (!String(data.displayName || '').trim()) {
            patch.displayName =
              (typeof firebaseUser.displayName === 'string' && firebaseUser.displayName.trim()) ||
              'Anonymous Artist';
          }
          if (
            !String(data.email || '').trim() &&
            typeof firebaseUser.email === 'string' &&
            firebaseUser.email.includes('@')
          ) {
            patch.email = firebaseUser.email.trim().toLowerCase();
          }
          if (!data.status) patch.status = 'active';
          if (Object.keys(patch).length > 0) {
            await setDoc(userRef, stripForFirestore(patch), { merge: true });
          }
        }

        // Universal Residency: Cloud Sync enabled for ALL users (Visitor and Pro)
        const albumsSnap = await getDocs(collection(db, 'users', userId, 'albums'));
        const loadedAlbums: Album[] = [];
        
        for (const albumDoc of albumsSnap.docs) {
          const tracksSnap = await getDocs(collection(db, 'users', userId, 'albums', albumDoc.id, 'tracks'));
          loadedAlbums.push({ ...albumDoc.data(), id: albumDoc.id, tracks: tracksSnap.docs.map(d => ({ ...d.data(), id: d.id })) } as Album);
        }

        // Loose tracks may exist under albums/unassigned/tracks without an album doc.
        const looseTracks = (
          await getDocs(collection(db, 'users', userId, 'albums', UNASSIGNED_ALBUM_ID, 'tracks'))
        ).docs.map((d) => ({ ...d.data(), id: d.id, albumId: UNASSIGNED_ALBUM_ID })) as Track[];

        // Self-heal: if local backup has loose tracks missing from cloud, push them back up.
        try {
          if (cached.albums?.length) {
            const localAlbums = cached.albums;
            const localLoose = localAlbums.find((a) => a.id === UNASSIGNED_ALBUM_ID)?.tracks ?? [];
            const missingLoose = localLoose.filter((lt) => lt?.id && !looseTracks.some((ct) => ct.id === lt.id));
            if (missingLoose.length > 0) {
              for (const track of missingLoose) {
                const trackId = ensureTrackId(track, looseTracks.length);
                const trackData = stripForFirestore({
                  ...track,
                  id: trackId,
                  ownerId: userId,
                  albumId: UNASSIGNED_ALBUM_ID,
                  updatedAt: new Date().toISOString(),
                });
                await createCatalogTrack(UNASSIGNED_ALBUM_ID, trackId, trackData);
                looseTracks.push(trackData as Track);
              }
            }
          }
        } catch (recoveryError) {
          console.warn('Loose track cloud recovery skipped', recoveryError);
        }

        const finalAlbums = [...loadedAlbums];
        const unassignedIdx = finalAlbums.findIndex((a) => a.id === UNASSIGNED_ALBUM_ID);
        if (unassignedIdx >= 0) {
          finalAlbums[unassignedIdx] = { ...finalAlbums[unassignedIdx], tracks: looseTracks };
        } else if (looseTracks.length > 0) {
          finalAlbums.unshift({ ...createUnassignedShell(userId), tracks: looseTracks });
        }

        if (!finalAlbums.find((a) => a.id === UNASSIGNED_ALBUM_ID)) {
          finalAlbums.unshift({ ...createUnassignedShell(userId), tracks: [] });
        }
        
        const styleSnap = await getDoc(doc(db, 'users', userId, 'styleProfile', 'main'));
        const loadedStyleProfile = styleSnap.exists()
          ? (styleSnap.data() as StyleProfile)
          : cached.styleProfile;
        if (loadedStyleProfile) setStyleProfile(loadedStyleProfile);
        
        setAlbums(finalAlbums);
        seedTrackProgressBaselines(finalAlbums);
        saveVaultSnapshot(userId, finalAlbums, loadedStyleProfile);
        warmStudioRoutes(userId, finalAlbums);
        vaultLoadedUserIdRef.current = userId;

        if (!loadedStyleProfile) {
          const defaultProfile: StyleProfile = {
            id: `style-${userId}`,
            ownerId: userId,
            history: [{ timestamp: new Date().toISOString(), analysis: 'Initial neutral style profile. Train on existing lyrics to customize co-writer logic.' }],
            trainingRefs: [],
            updatedAt: new Date().toISOString()
          };
          setStyleProfile(defaultProfile);
        }
      } catch (e) {
        console.error('Load failed', e);
        if (cached.albums?.length) {
          applyLocalVault(cached.albums, cached.styleProfile);
        }
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [userId, authReady, applyLocalVault, seedTrackProgressBaselines]);

  useEffect(() => {
    if (user && !loading) {
      saveVaultSnapshot(user.id, albums, styleProfile);
    }
  }, [albums, styleProfile, user, loading]);

  const addAlbum = useCallback((album: Album) => {
    setAlbums(prev => [album, ...prev]);
    if (user) {
      const { tracks: _tracks, ...data } = album;
      const albumData = stripForFirestore({ ...data, ownerId: user.id });
      if (isBrowserOffline()) {
        const count = mergeAlbumOutbox(user.id, album.id, albumData);
        setSyncPendingCount(count);
        setCloudSaveStatus('offline');
        return;
      }

      const creation = createCatalogAlbum(album.id, albumData);
      pendingCatalogCreatesRef.current.set(`album:${album.id}`, creation);
      void creation
        .catch((error) => {
          setAlbums((prev) => prev.filter((item) => item.id !== album.id));
          toast({ variant: 'destructive', title: 'Album not saved', description: error.message });
        })
        .finally(() => pendingCatalogCreatesRef.current.delete(`album:${album.id}`));
    }
  }, [user, toast]);

  const addTrack = useCallback((albumId: string, track: Omit<Track, 'id'> & { id?: string }): Track => {
    if (!canUserAddTrack(albums, user)) {
      throw new FreeTrackLimitError();
    }
    const id = track.id || `track-${Date.now()}`;
    const now = new Date().toISOString();
    const newTrack = stripForFirestore({ ...track, id, ownerId: user!.id, albumId, updatedAt: now }) as Track;
    setAlbums(prev => {
      const next = prev.map(a => (a.id === albumId ? { ...a, tracks: [...a.tracks, newTrack] } : a));
      if (user && albumId !== UNASSIGNED_ALBUM_ID) {
        const album = next.find((a) => a.id === albumId);
        const albumTrackCount = album?.tracks?.length || 0;
        if (albumTrackCount >= 3) {
          queueMicrotask(() => {
            void postGamificationEvent('track_saved', {
              trackId: id,
              albumId,
              barCount: countNonEmptyBars(newTrack.sections),
              prevBarCount: countNonEmptyBars(newTrack.sections),
              trackComplete: false,
              albumTrackCount,
              sessionBarCount: countNonEmptyBars(newTrack.sections),
            });
          });
        }
      }
      return next;
    });
    if (user) {
      if (isBrowserOffline()) {
        const count = mergeTrackOutbox(
          user.id,
          id,
          albumId,
          newTrack as unknown as Record<string, unknown>
        );
        setSyncPendingCount(count);
        setCloudSaveStatus('offline');
      } else {
        const creation = createCatalogTrack(
          albumId,
          id,
          newTrack as unknown as Record<string, unknown>
        );
        pendingCatalogCreatesRef.current.set(`track:${albumId}:${id}`, creation);
        void creation
          .catch((error) => {
            setAlbums((prev) =>
              prev.map((album) =>
                album.id === albumId
                  ? { ...album, tracks: album.tracks.filter((item) => item.id !== id) }
                  : album
              )
            );
            toast({ variant: 'destructive', title: 'Track not saved', description: error.message });
          })
          .finally(() => pendingCatalogCreatesRef.current.delete(`track:${albumId}:${id}`));
      }
      prevBarCountsRef.current[id] = countNonEmptyBars(newTrack.sections);
      prevTrackCompleteRef.current[id] = newTrack.status === 'complete';
      prevLineBaselinesRef.current[id] = buildLineBaseline(newTrack.sections);
    }
    return newTrack;
  }, [user, albums, toast]);

  const updateTrack = useCallback((albumId: string, trackId: string, updates: Partial<Track>) => {
    const now = new Date().toISOString();
    setAlbums((prev) => {
      const next = prev.map((a) =>
        a.id === albumId
          ? { ...a, tracks: a.tracks.map((t) => (t.id === trackId ? { ...t, ...updates, updatedAt: now } : t)) }
          : a
      );
      albumsRef.current = next;
      if (!user && isGuestTryAlbumId(albumId) && isGuestTrySheetEnabled()) {
        const guestTrack = next
          .find((a) => a.id === albumId)
          ?.tracks.find((t) => t.id === trackId);
        if (guestTrack) persistGuestTrack(guestTrack);
      }
      return next;
    });
    if (user) {
      pendingTrackUpdates.current[trackId] = { albumId, updates: { ...(pendingTrackUpdates.current[trackId]?.updates || {}), ...updates } };
      if (isBrowserOffline()) {
        const count = mergeTrackOutbox(user.id, trackId, albumId, pendingTrackUpdates.current[trackId].updates);
        setSyncPendingCount(count);
        setCloudSaveStatus('offline');
        return;
      }
      setCloudSaveStatus('pending');
      if (syncTrackTimeout.current) clearTimeout(syncTrackTimeout.current);
      syncTrackTimeout.current = setTimeout(performTrackSync, 1500);
    }
  }, [user, performTrackSync]);

  const updateAlbum = useCallback((albumId: string, updates: Partial<Album>) => {
    const now = new Date().toISOString();
    setAlbums((prev) => {
      const next = prev.map((a) => (a.id === albumId ? { ...a, ...updates, updatedAt: now } : a));
      albumsRef.current = next;
      return next;
    });
    if (user) {
      pendingAlbumUpdates.current[albumId] = { ...pendingAlbumUpdates.current[albumId], ...updates };
      if (isBrowserOffline()) {
        const count = mergeAlbumOutbox(user.id, albumId, pendingAlbumUpdates.current[albumId]);
        setSyncPendingCount(count);
        setCloudSaveStatus('offline');
        return;
      }
      setCloudSaveStatus('pending');
      if (syncAlbumTimeout.current) clearTimeout(syncAlbumTimeout.current);
      syncAlbumTimeout.current = setTimeout(performAlbumSync, 1500);
    }
  }, [user, performAlbumSync]);

  const deleteAlbum = useCallback((albumId: string) => {
    setAlbums(prev => prev.filter(a => a.id !== albumId));
    if (!user) return;
    if (isBrowserOffline()) {
      const count = pushDeleteAlbumOutbox(user.id, albumId);
      setSyncPendingCount(count);
      setCloudSaveStatus('offline');
      return;
    }
    void deleteDoc(doc(db, 'users', user.id, 'albums', albumId));
  }, [user]);

  const deleteTrack = useCallback((albumId: string, trackId: string) => {
    let takePaths: string[] = [];
    setAlbums((prev) => {
      const doomed = prev.find((a) => a.id === albumId)?.tracks.find((t) => t.id === trackId);
      takePaths = (doomed?.sheetTakes ?? [])
        .map((take) => take.storagePath)
        .filter((path): path is string => Boolean(path));
      const next = prev.map((a) =>
        a.id === albumId ? { ...a, tracks: a.tracks.filter((t) => t.id !== trackId) } : a
      );
      if (user && !hasUnlimitedCatalog(user) && user.freeEditableSelectionAt) {
        const nextIds = computeRotatedFreeEditableTrackIds(user, next, trackId);
        if (nextIds) {
          void persistFreeEditableTrackIds(user.id, nextIds);
        }
      }
      return next;
    });
    if (takePaths.length) {
      void Promise.all(takePaths.map((path) => deleteVoiceStorage(path)));
    }
    if (!user) return;
    if (isBrowserOffline()) {
      const count = pushDeleteTrackOutbox(user.id, albumId, trackId);
      setSyncPendingCount(count);
      setCloudSaveStatus('offline');
      return;
    }
    void deleteDoc(doc(db, 'users', user.id, 'albums', albumId, 'tracks', trackId));
  }, [user]);

  const getAlbumById = useCallback((id: string) => albums.find(a => a.id === id), [albums]);
  const getTrackById = useCallback((aId: string, tId: string) => {
    const album = albums.find(a => a.id === aId);
    return { album, track: album?.tracks.find(t => t.id === tId) };
  }, [albums]);

  const updateStyleProfile = useCallback((analysis: string, metrics?: any) => {
    const newProfile = { 
      id: styleProfile?.id || `style-${user?.id}`, ownerId: user!.id, history: analysis ? [{ timestamp: new Date().toISOString(), analysis, metrics }, ...(styleProfile?.history || [])].slice(0, 10) : [], trainingRefs: [], updatedAt: new Date().toISOString()
    };
    setStyleProfile(newProfile as any);
    if (!user) return;
    if (isBrowserOffline()) {
      const count = pushStyleOutbox(user.id, stripForFirestore(newProfile) as Record<string, unknown>);
      setSyncPendingCount(count);
      setCloudSaveStatus('offline');
      return;
    }
    void setDoc(doc(db, 'users', user.id, 'styleProfile', 'main'), newProfile);
  }, [styleProfile, user]);

  const resolveTrackForDrop = useCallback(
    (trackId: string, albumId?: string) => {
      const vault = albumsRef.current;
      if (albumId) {
        const album = vault.find((a) => a.id === albumId);
        const track = album?.tracks?.find((t) => t.id === trackId);
        if (track && album) return { track, album };
      }
      const found = findTrackInVault(vault, trackId);
      if (found) return found;
      return { track: undefined, album: undefined };
    },
    []
  );

  const buildDropPayload = useCallback(
    (type: 'album' | 'track', id: string, albumId?: string) => {
      if (type === 'album') {
        const album = albumsRef.current.find((a) => a.id === id);
        if (!album) throw new Error('Album not found in your vault.');
        return buildAlbumDropPayload(album, styleProfile);
      }
      const { track, album } = resolveTrackForDrop(id, albumId);
      if (!track) throw new Error('Track not found in your vault.');
      return buildTrackDropPayload(track, album, styleProfile);
    },
    [resolveTrackForDrop, styleProfile]
  );

  const persistProjectShareId = useCallback(
    (type: 'album' | 'track', id: string, shareId: string, albumId?: string) => {
      if (type === 'album') {
        updateAlbum(id, { shareId, dnaStatus: 'live' });
        return;
      }
      const resolved = resolveTrackForDrop(id, albumId);
      if (resolved.album) {
        updateTrack(resolved.album.id, id, { shareId, dnaStatus: 'live' });
      }
    },
    [resolveTrackForDrop, updateAlbum, updateTrack]
  );

  const clearProjectShareId = useCallback(
    async (type: 'album' | 'track', id: string, albumId?: string) => {
      if (type === 'album') {
        updateAlbum(id, { shareId: undefined, dnaStatus: 'unlisted' });
        if (user) {
          await setDoc(doc(db, 'users', user.id, 'albums', id), { shareId: deleteField(), dnaStatus: 'unlisted' }, { merge: true });
        }
        return;
      }
      const resolved = resolveTrackForDrop(id, albumId);
      if (resolved.album) {
        updateTrack(resolved.album.id, id, { shareId: undefined, dnaStatus: 'unlisted' });
        if (user) {
          await setDoc(
            doc(db, 'users', user.id, 'albums', resolved.album.id, 'tracks', id),
            { shareId: deleteField(), dnaStatus: 'unlisted' },
            { merge: true }
          );
        }
      }
    },
    [resolveTrackForDrop, updateAlbum, updateTrack, user]
  );

  const updateDNA = useCallback(
    async (type: 'album' | 'track', id: string, shareId: string, options?: { albumId?: string }): Promise<string> => {
      if (!user) throw new Error('Artist Session Required.');
      const albumId = options?.albumId;
      const data = stripForFirestore({ ...buildDropPayload(type, id, albumId), dnaStatus: 'live' });
      const now = new Date().toISOString();
      const shareRef = doc(db, 'shares', shareId);
      const existing = await getDoc(shareRef);

      if (existing.exists() && existing.data()?.ownerId === user.id) {
        await setDoc(
          shareRef,
          {
            data,
            updatedAt: now,
            ownerName: user.displayName,
            dnaStatus: 'live',
            ...shareDocCommerceFlags(type, data as { dropAudio?: unknown; dropPrice?: unknown }),
          },
          { merge: true }
        );
      } else {
        await setDoc(shareRef, {
          id: shareId,
          type,
          projectId: id,
          ownerId: user.id,
          ownerName: user.displayName,
          dnaStatus: 'live',
          data,
          createdAt: now,
          updatedAt: now,
          views: existing.exists() ? existing.data()?.views ?? 0 : 0,
          imports: existing.exists() ? existing.data()?.imports ?? 0 : 0,
          ...shareDocCommerceFlags(type, data as { dropAudio?: unknown; dropPrice?: unknown }),
        });
      }

      persistProjectShareId(type, id, shareId, albumId);
      void postGamificationEvent('share_created', { shareId });
      return shareId;
    },
    [user, buildDropPayload, persistProjectShareId]
  );

  const dropDNA = useCallback(
    async (type: 'album' | 'track', id: string, options?: { albumId?: string }): Promise<string> => {
      if (!user) throw new Error('Artist Session Required.');
      const albumId = options?.albumId;
      const existingShareId =
        type === 'album'
          ? albumsRef.current.find((a) => a.id === id)?.shareId
          : resolveTrackForDrop(id, albumId).track?.shareId;

      if (existingShareId) {
        return updateDNA(type, id, existingShareId, options);
      }

      const shareId = Math.random().toString(36).substring(2, 12).toUpperCase();
      const data = stripForFirestore({ ...buildDropPayload(type, id, albumId), dnaStatus: 'live' });
      const now = new Date().toISOString();

      await setDoc(doc(db, 'shares', shareId), {
        id: shareId,
        type,
        projectId: id,
        ownerId: user.id,
        ownerName: user.displayName,
        dnaStatus: 'live',
        data,
        createdAt: now,
        updatedAt: now,
        views: 0,
        imports: 0,
        ...shareDocCommerceFlags(type, data as { dropAudio?: unknown; dropPrice?: unknown }),
      });

      persistProjectShareId(type, id, shareId, albumId);
      void postGamificationEvent('share_created', { shareId });
      return shareId;
    },
    [user, resolveTrackForDrop, buildDropPayload, persistProjectShareId, updateDNA]
  );

  const revokeDNA = useCallback(
    async (type: 'album' | 'track', id: string, shareId: string, options?: { albumId?: string }) => {
      if (!user) throw new Error('Artist Session Required.');
      const shareRef = doc(db, 'shares', shareId);
      const existing = await getDoc(shareRef);
      if (existing.exists() && existing.data()?.ownerId !== user.id) {
        throw new Error('You can only take offline your own DNA Drops.');
      }
      if (existing.exists()) {
        const existingData = existing.data()?.data;
        await setDoc(
          shareRef,
          {
            dnaStatus: 'unlisted',
            updatedAt: new Date().toISOString(),
            data: {
              ...(existingData && typeof existingData === 'object' ? existingData : {}),
              dnaStatus: 'unlisted',
            },
          },
          { merge: true }
        );
      }
      await clearProjectShareId(type, id, options?.albumId);
    },
    [user, clearProjectShareId]
  );

  const applyImportedStyle = useCallback(
    (tracks: Array<DnaDropTrackPayload | Track>) => {
      const styled = tracks.find((t) => t.styleEnabled && (t as DnaDropTrackPayload).sharedStyle?.analysis);
      const snapshot = styled ? (styled as DnaDropTrackPayload).sharedStyle : undefined;
      if (snapshot?.analysis) {
        updateStyleProfile(snapshot.analysis, snapshot.metrics);
      }
    },
    [updateStyleProfile]
  );

  const mergeData = useCallback(async (
    importedAlbums: Album[],
    importedTracks: Track[],
    options?: {
      styleProfile?: StyleProfile | null;
      copyOnConflict?: boolean;
      applyImportedTrackStyle?: boolean;
    }
  ) => {
    if (!user) return;

    await flushCloudNow();

    let batch = writeBatch(db);
    let opCount = 0;
    const commitIfNeeded = async (force = false) => {
      if (opCount === 0) return;
      if (force || opCount >= 450) {
        await batch.commit();
        batch = writeBatch(db);
        opCount = 0;
      }
    };

    const persistedAlbums: Album[] = [];
    const persistedLooseTracks: Track[] = [];

    const looseFromUnassignedAlbum = importedAlbums
      .filter((album) => album.id === UNASSIGNED_ALBUM_ID)
      .flatMap((album) => album.tracks ?? []);
    const looseTrackMap = new Map<string, Track>();
    [...importedTracks, ...looseFromUnassignedAlbum].forEach((track, index) => {
      const id = ensureTrackId(track, index);
      looseTrackMap.set(id, { ...track, id });
    });
    const allLooseTracks = Array.from(looseTrackMap.values());

    try {
      for (const album of importedAlbums) {
        if (album.id === UNASSIGNED_ALBUM_ID) continue;
        const { tracks = [], ...albumData } = album;
        let albumId = album.id;
        let albumRef = doc(db, 'users', user.id, 'albums', albumId);
        let existingAlbum = await getDoc(albumRef);
        let albumCopiedForConflict = false;
        if (options?.copyOnConflict && existingAlbum.exists()) {
          albumCopiedForConflict = true;
          let copy = 1;
          do {
            albumId = `${album.id}-import-${Date.now().toString(36)}${copy > 1 ? `-${copy}` : ''}`;
            albumRef = doc(db, 'users', user.id, 'albums', albumId);
            existingAlbum = await getDoc(albumRef);
            copy += 1;
          } while (existingAlbum.exists());
        }
        const stampedAlbum = stripForFirestore({
          ...albumData,
          id: albumId,
          ownerId: user.id,
          ...(albumCopiedForConflict ? { shareId: undefined } : {}),
          updatedAt: new Date().toISOString(),
        });
        if (existingAlbum.exists()) {
          batch.set(albumRef, stampedAlbum, { merge: true });
          opCount++;
        } else {
          await createCatalogAlbum(albumId, stampedAlbum);
        }

        const persistedTracks: Track[] = [];
        for (const track of tracks) {
          const trackId = ensureTrackId(track, persistedTracks.length);
          const trackData = stripForFirestore({
            ...track,
            id: trackId,
            ownerId: user.id,
            albumId,
            ...(albumCopiedForConflict ? { shareId: undefined, collabSheetId: undefined } : {}),
            updatedAt: new Date().toISOString(),
          });
          const trackRef = doc(db, 'users', user.id, 'albums', albumId, 'tracks', trackId);
          if ((await getDoc(trackRef)).exists()) {
            batch.set(trackRef, trackData, { merge: true });
            opCount++;
          } else {
            await createCatalogTrack(albumId, trackId, trackData);
          }
          persistedTracks.push(trackData as Track);
          await commitIfNeeded();
        }
        persistedAlbums.push({ ...stampedAlbum, id: albumId, tracks: persistedTracks });
      }

      if (allLooseTracks.length > 0) {
        for (const track of allLooseTracks) {
          let trackId = ensureTrackId(track, persistedLooseTracks.length);
          let trackRef = doc(
            db,
            'users',
            user.id,
            'albums',
            UNASSIGNED_ALBUM_ID,
            'tracks',
            trackId
          );
          let existingTrack = await getDoc(trackRef);
          let trackCopiedForConflict = false;
          if (options?.copyOnConflict && existingTrack.exists()) {
            trackCopiedForConflict = true;
            let copy = 1;
            do {
              trackId = `${track.id}-import-${Date.now().toString(36)}${copy > 1 ? `-${copy}` : ''}`;
              trackRef = doc(db, 'users', user.id, 'albums', UNASSIGNED_ALBUM_ID, 'tracks', trackId);
              existingTrack = await getDoc(trackRef);
              copy += 1;
            } while (existingTrack.exists());
          }
          const trackData = stripForFirestore({
            ...track,
            id: trackId,
            ownerId: user.id,
            albumId: UNASSIGNED_ALBUM_ID,
            ...(trackCopiedForConflict ? { shareId: undefined, collabSheetId: undefined } : {}),
            updatedAt: new Date().toISOString(),
          });
          if (existingTrack.exists()) {
            batch.set(trackRef, trackData, { merge: true });
            opCount++;
          } else {
            await createCatalogTrack(UNASSIGNED_ALBUM_ID, trackId, trackData);
          }
          persistedLooseTracks.push(trackData as Track);
          await commitIfNeeded();
        }
      }

      await commitIfNeeded(true);

      if (options?.styleProfile && !styleProfile) {
        const styleRef = doc(db, 'users', user.id, 'styleProfile', 'main');
        const existingStyle = await getDoc(styleRef);
        if (!existingStyle.exists()) {
          const restoredStyle = stripForFirestore({
            ...options.styleProfile,
            id: `style-${user.id}`,
            ownerId: user.id,
            updatedAt: new Date().toISOString(),
          }) as StyleProfile;
          await setDoc(styleRef, restoredStyle);
          setStyleProfile(restoredStyle);
        }
      }
    } catch (error) {
      console.error('Vault merge failed:', error);
      throw error;
    }

    setAlbums((prev) => {
      let next = [...prev];

      for (const imported of persistedAlbums) {
        const idx = next.findIndex((a) => a.id === imported.id);
        if (idx >= 0) {
          const existing = next[idx];
          const trackMap = new Map(existing.tracks.map((t) => [t.id, t]));
          imported.tracks.forEach((t) => trackMap.set(t.id, t));
          next[idx] = { ...existing, ...imported, tracks: Array.from(trackMap.values()) };
        } else {
          next = [imported, ...next];
        }
      }

      if (persistedLooseTracks.length > 0) {
        const unassignedIdx = next.findIndex((a) => a.id === UNASSIGNED_ALBUM_ID);
        if (unassignedIdx >= 0) {
          const existing = next[unassignedIdx];
          const trackMap = new Map(existing.tracks.map((t) => [t.id, t]));
          persistedLooseTracks.forEach((t) => trackMap.set(t.id, t));
          next[unassignedIdx] = { ...existing, tracks: Array.from(trackMap.values()) };
        } else {
          next = [{ ...createUnassignedShell(user.id), tracks: persistedLooseTracks }, ...next];
        }
      }

      seedTrackProgressBaselines(next);
      return next;
    });

    setCloudSaveStatus('saved');

    const tracksForStyleImport: Array<DnaDropTrackPayload | Track> = [
      ...persistedLooseTracks,
      ...persistedAlbums.flatMap((a) => a.tracks ?? []),
    ];
    if (options?.applyImportedTrackStyle !== false) {
      applyImportedStyle(tracksForStyleImport);
    }
  }, [user, flushCloudNow, seedTrackProgressBaselines, applyImportedStyle, styleProfile]);

  const clearVault = useCallback(async () => {
    if (!user) return;

    await flushCloudNow();

    const albumsSnap = await getDocs(collection(db, 'users', user.id, 'albums'));
    for (const albumDoc of albumsSnap.docs) {
      let batch = writeBatch(db);
      let opCount = 0;

      const tracksSnap = await getDocs(collection(db, 'users', user.id, 'albums', albumDoc.id, 'tracks'));
      for (const trackDoc of tracksSnap.docs) {
        batch.delete(trackDoc.ref);
        opCount++;
        if (opCount >= 450) {
          await batch.commit();
          batch = writeBatch(db);
          opCount = 0;
        }
      }

      batch.delete(albumDoc.ref);
      await batch.commit();
    }

    const orphanLooseSnap = await getDocs(collection(db, 'users', user.id, 'albums', UNASSIGNED_ALBUM_ID, 'tracks'));
    if (!orphanLooseSnap.empty) {
      const batch = writeBatch(db);
      orphanLooseSnap.docs.forEach((trackDoc) => batch.delete(trackDoc.ref));
      await batch.commit();
    }

    const freshUnassigned: Album = {
      ...createUnassignedShell(user.id),
      tracks: [],
    };

    setAlbums([freshUnassigned]);
    seedTrackProgressBaselines([freshUnassigned]);
    saveVaultSnapshot(user.id, [freshUnassigned], styleProfile);
    setCloudSaveStatus('saved');
  }, [user, flushCloudNow, seedTrackProgressBaselines, styleProfile]);

  const moveTrack = useCallback((tId: string, fromId: string, toId: string) => {
    const { track } = getTrackById(fromId, tId);
    if (!track || fromId === toId) return;

    const movingToAlbum = toId !== UNASSIGNED_ALBUM_ID;
    const movingFromLoose = fromId === UNASSIGNED_ALBUM_ID;
    const movingToLoose = toId === UNASSIGNED_ALBUM_ID;
    const nextDirection = { ...track.direction };
    if (movingToAlbum && movingFromLoose) {
      nextDirection.enabled = track.direction?.enabled === true;
      nextDirection.inheritFromAlbum = true;
    } else if (movingToLoose) {
      nextDirection.inheritFromAlbum = false;
    }

    const movedTrack = stripForFirestore({
      ...track,
      albumId: toId,
      direction: nextDirection,
    }) as Track;

    setAlbums((prev) =>
      prev.map((a) => {
        if (a.id === fromId) {
          return { ...a, tracks: a.tracks.filter((t) => t.id !== tId) };
        }
        if (a.id === toId) {
          return { ...a, tracks: [...a.tracks, movedTrack] };
        }
        return a;
      })
    );

    if (!user) return;

    if (isBrowserOffline()) {
      pushDeleteTrackOutbox(user.id, fromId, tId);
      const count = mergeTrackOutbox(user.id, tId, toId, movedTrack as unknown as Record<string, unknown>);
      setSyncPendingCount(count);
      setCloudSaveStatus('offline');
      return;
    }

    void (async () => {
      if (toId === UNASSIGNED_ALBUM_ID) {
        await setDoc(
          doc(db, 'users', user.id, 'albums', UNASSIGNED_ALBUM_ID),
          stripForFirestore({ ...createUnassignedShell(user.id), updatedAt: new Date().toISOString() }),
          { merge: true }
        );
      }
      await setDoc(doc(db, 'users', user.id, 'albums', toId, 'tracks', tId), movedTrack, { merge: true });
      await deleteDoc(doc(db, 'users', user.id, 'albums', fromId, 'tracks', tId));
    })();
  }, [getTrackById, user]);

  return (
    <DataContext.Provider value={{
      albums, styleProfile, loading, isCloudSyncActive, cloudSaveStatus, syncPendingCount, isOfflineMode,
      flushCloudNow, syncVaultToCloud,
      addAlbum, updateAlbum, deleteAlbum, getAlbumById,
      addTrack, updateTrack, deleteTrack, getTrackById, mergeData, clearVault, moveTrack, updateStyleProfile, dropDNA, updateDNA, revokeDNA
    }}>{children}</DataContext.Provider>
  );
};
