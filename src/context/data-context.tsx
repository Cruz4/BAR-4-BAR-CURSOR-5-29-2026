'use client';

import React, { createContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import type { Album, StyleProfile, Track, ProjectShare, Direction } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { isGuestTryAlbumId, isGuestTrySheetEnabled } from '@/lib/guest-try';
import { loadOrCreateGuestAlbum, persistGuestTrack } from '@/lib/guest-track-session';

import { db } from '@/lib/firebase/client/firebase';
import { waitForAuthUser } from '@/lib/firebase/client/auth-ready';
import { doc, setDoc, getDoc, collection, getDocs, deleteDoc, writeBatch, deleteField } from 'firebase/firestore';
import { stripForFirestore } from '@/lib/utils';
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
import { canUserAddTrack, FreeTrackLimitError, hasUnlimitedCatalog, isProOrTrial } from '@/lib/subscription';
import { computeRotatedFreeEditableTrackIds } from '@/lib/tier-limits';
import { persistFreeEditableTrackIds } from '@/lib/free-editable-tracks';

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

async function persistLooseTracks(
  userId: string,
  tracks: Track[],
  batch?: ReturnType<typeof writeBatch>,
): Promise<{ batch: ReturnType<typeof writeBatch>; opCount: number; persisted: Track[] }> {
  let activeBatch = batch ?? writeBatch(db);
  let opCount = 0;
  const persisted: Track[] = [];

  if (tracks.length === 0) {
    return { batch: activeBatch, opCount, persisted };
  }

  activeBatch.set(
    doc(db, 'users', userId, 'albums', UNASSIGNED_ALBUM_ID),
    stripForFirestore({
      ...createUnassignedShell(userId),
      updatedAt: new Date().toISOString(),
    }),
    { merge: true },
  );
  opCount++;

  tracks.forEach((track, index) => {
    const trackId = ensureTrackId(track, index);
    const trackData = stripForFirestore({
      ...track,
      id: trackId,
      ownerId: userId,
      albumId: UNASSIGNED_ALBUM_ID,
      updatedAt: new Date().toISOString(),
    });
    activeBatch.set(
      doc(db, 'users', userId, 'albums', UNASSIGNED_ALBUM_ID, 'tracks', trackId),
      trackData,
      { merge: true },
    );
    opCount++;
    persisted.push(trackData as Track);
  });

  return { batch: activeBatch, opCount, persisted };
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
  mergeData: (albumsToMerge: Album[], tracksToMerge: Track[]) => Promise<void>;
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
  }, [user]);

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
  }, [user]);

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
        await setDoc(
          doc(db, 'users', user.id, 'albums', entry.albumId, 'tracks', entry.trackId),
          stripForFirestore({ ...entry.updates, updatedAt: new Date().toISOString() }),
          { merge: true }
        );
      } else if (entry.type === 'album') {
        await setDoc(
          doc(db, 'users', user.id, 'albums', entry.albumId),
          stripForFirestore({ ...entry.updates, updatedAt: new Date().toISOString() }),
          { merge: true }
        );
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
      }
    });
  }, [user?.id]);

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
      let finalAlbums = [...parsedAlbums];
      if (!finalAlbums.find((a) => a.id === UNASSIGNED_ALBUM_ID)) {
        finalAlbums.unshift({ ...createUnassignedShell(user!.id), tracks: [] });
      }
      setAlbums(finalAlbums);
      seedTrackProgressBaselines(finalAlbums);
      if (parsedStyle) setStyleProfile(parsedStyle);
      setSyncPendingCount(outboxCount(user!.id));
      if (isBrowserOffline()) {
        setCloudSaveStatus(outboxCount(user!.id) > 0 ? 'offline' : 'saved');
      }
    },
    [seedTrackProgressBaselines, user?.id]
  );

  useEffect(() => {
    const loadData = async () => {
      if (!authReady) {
        // Auth still settling — seed guest try vault so the sheet can open without login redirect.
        if (!user && isGuestTrySheetEnabled()) {
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

      if (!user) {
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
      setSyncPendingCount(outboxCount(user.id));

      const cached = loadVaultSnapshot(user.id);
      if (cached.albums?.length) {
        applyLocalVault(cached.albums, cached.styleProfile);
      }

      if (offline) {
        setLoading(false);
        vaultLoadedUserIdRef.current = user.id;
        return;
      }

      const isSameUserReload = vaultLoadedUserIdRef.current === user.id;
      const hasVisibleVault = albumsRef.current.length > 0;
      if (!isSameUserReload || !hasVisibleVault) {
        setLoading(true);
      }

      try {
        const firebaseUser = await waitForAuthUser();
        if (!firebaseUser || firebaseUser.uid !== user.id) {
          throw new Error('Auth session not ready');
        }

        const userRef = doc(db, 'users', user.id);
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
        const albumsSnap = await getDocs(collection(db, 'users', user.id, 'albums'));
        const loadedAlbums: Album[] = [];
        
        for (const albumDoc of albumsSnap.docs) {
          const tracksSnap = await getDocs(collection(db, 'users', user.id, 'albums', albumDoc.id, 'tracks'));
          loadedAlbums.push({ ...albumDoc.data(), id: albumDoc.id, tracks: tracksSnap.docs.map(d => ({ ...d.data(), id: d.id })) } as Album);
        }

        // Loose tracks may exist under albums/unassigned/tracks without an album doc.
        let looseTracks = (
          await getDocs(collection(db, 'users', user.id, 'albums', UNASSIGNED_ALBUM_ID, 'tracks'))
        ).docs.map((d) => ({ ...d.data(), id: d.id, albumId: UNASSIGNED_ALBUM_ID })) as Track[];

        // Self-heal: if local backup has loose tracks missing from cloud, push them back up.
        try {
          if (cached.albums?.length) {
            const localAlbums = cached.albums;
            const localLoose = localAlbums.find((a) => a.id === UNASSIGNED_ALBUM_ID)?.tracks ?? [];
            const missingLoose = localLoose.filter((lt) => lt?.id && !looseTracks.some((ct) => ct.id === lt.id));
            if (missingLoose.length > 0) {
              const { batch, persisted } = await persistLooseTracks(user.id, missingLoose);
              await batch.commit();
              looseTracks = [...looseTracks, ...persisted];
            }
          }
        } catch (recoveryError) {
          console.warn('Loose track cloud recovery skipped', recoveryError);
        }

        let finalAlbums = [...loadedAlbums];
        const unassignedIdx = finalAlbums.findIndex((a) => a.id === UNASSIGNED_ALBUM_ID);
        if (unassignedIdx >= 0) {
          finalAlbums[unassignedIdx] = { ...finalAlbums[unassignedIdx], tracks: looseTracks };
        } else if (looseTracks.length > 0) {
          finalAlbums.unshift({ ...createUnassignedShell(user.id), tracks: looseTracks });
        }

        if (!finalAlbums.find((a) => a.id === UNASSIGNED_ALBUM_ID)) {
          finalAlbums.unshift({ ...createUnassignedShell(user.id), tracks: [] });
        }
        
        const styleSnap = await getDoc(doc(db, 'users', user.id, 'styleProfile', 'main'));
        if (styleSnap.exists()) setStyleProfile(styleSnap.data() as StyleProfile);
        
        setAlbums(finalAlbums);
        seedTrackProgressBaselines(finalAlbums);
        saveVaultSnapshot(user.id, finalAlbums, styleSnap.exists() ? (styleSnap.data() as StyleProfile) : styleProfile);
        warmStudioRoutes(user.id, finalAlbums);
        vaultLoadedUserIdRef.current = user.id;

        if (!styleProfile && !styleSnap.exists()) {
          const defaultProfile: StyleProfile = {
            id: `style-${user.id}`,
            ownerId: user.id,
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
  }, [user?.id, authReady, applyLocalVault, seedTrackProgressBaselines]);

  useEffect(() => {
    if (user && !loading) {
      saveVaultSnapshot(user.id, albums, styleProfile);
    }
  }, [albums, styleProfile, user, loading]);

  const addAlbum = useCallback((album: Album) => {
    setAlbums(prev => [album, ...prev]);
    if (user) {
      const { tracks = [], ...data } = album;
      void setDoc(
        doc(db, 'users', user.id, 'albums', album.id),
        stripForFirestore({ ...data, ownerId: user.id }),
        { merge: true },
      );
      for (const t of tracks) {
        void setDoc(
          doc(db, 'users', user.id, 'albums', album.id, 'tracks', t.id),
          stripForFirestore({ ...t, ownerId: user.id, albumId: album.id }),
          { merge: true },
        );
      }
    }
  }, [user]);

  const addTrack = useCallback((albumId: string, track: Omit<Track, 'id'> & { id?: string }): Track => {
    if (!canUserAddTrack(albums, user)) {
      throw new FreeTrackLimitError();
    }
    const id = track.id || `track-${Date.now()}`;
    const newTrack = stripForFirestore({ ...track, id, ownerId: user!.id, albumId }) as Track;
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
      if (albumId === UNASSIGNED_ALBUM_ID) {
        void setDoc(
          doc(db, 'users', user.id, 'albums', UNASSIGNED_ALBUM_ID),
          stripForFirestore({ ...createUnassignedShell(user.id), updatedAt: new Date().toISOString() }),
          { merge: true },
        );
      }
      void setDoc(doc(db, 'users', user.id, 'albums', albumId, 'tracks', id), newTrack, { merge: true });
      prevBarCountsRef.current[id] = countNonEmptyBars(newTrack.sections);
      prevTrackCompleteRef.current[id] = newTrack.status === 'complete';
      prevLineBaselinesRef.current[id] = buildLineBaseline(newTrack.sections);
    }
    return newTrack;
  }, [user, albums]);

  const updateTrack = useCallback((albumId: string, trackId: string, updates: Partial<Track>) => {
    setAlbums((prev) => {
      const next = prev.map((a) =>
        a.id === albumId
          ? { ...a, tracks: a.tracks.map((t) => (t.id === trackId ? { ...t, ...updates } : t)) }
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
    setAlbums((prev) => {
      const next = prev.map((a) => (a.id === albumId ? { ...a, ...updates } : a));
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
    setAlbums((prev) => {
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
        updateAlbum(id, { shareId });
        return;
      }
      const resolved = resolveTrackForDrop(id, albumId);
      if (resolved.album) {
        updateTrack(resolved.album.id, id, { shareId });
      }
    },
    [resolveTrackForDrop, updateAlbum, updateTrack]
  );

  const clearProjectShareId = useCallback(
    async (type: 'album' | 'track', id: string, albumId?: string) => {
      if (type === 'album') {
        updateAlbum(id, { shareId: undefined });
        if (user) {
          await setDoc(doc(db, 'users', user.id, 'albums', id), { shareId: deleteField() }, { merge: true });
        }
        return;
      }
      const resolved = resolveTrackForDrop(id, albumId);
      if (resolved.album) {
        updateTrack(resolved.album.id, id, { shareId: undefined });
        if (user) {
          await setDoc(
            doc(db, 'users', user.id, 'albums', resolved.album.id, 'tracks', id),
            { shareId: deleteField() },
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
      const data = stripForFirestore(buildDropPayload(type, id, albumId));
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
          data,
          createdAt: now,
          updatedAt: now,
          views: existing.exists() ? existing.data()?.views ?? 0 : 0,
          imports: existing.exists() ? existing.data()?.imports ?? 0 : 0,
        });
      }

      persistProjectShareId(type, id, shareId, albumId);
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
      const data = stripForFirestore(buildDropPayload(type, id, albumId));
      const now = new Date().toISOString();

      await setDoc(doc(db, 'shares', shareId), {
        id: shareId,
        type,
        projectId: id,
        ownerId: user.id,
        ownerName: user.displayName,
        data,
        createdAt: now,
        updatedAt: now,
        views: 0,
        imports: 0,
      });

      persistProjectShareId(type, id, shareId, albumId);
      void postGamificationEvent('share_created');
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
        await deleteDoc(shareRef);
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

  const mergeData = useCallback(async (importedAlbums: Album[], importedTracks: Track[]) => {
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
    let persistedLooseTracks: Track[] = [];

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
        const stampedAlbum = stripForFirestore({
          ...albumData,
          ownerId: user.id,
          updatedAt: new Date().toISOString(),
        });
        batch.set(doc(db, 'users', user.id, 'albums', album.id), stampedAlbum, { merge: true });
        opCount++;

        const persistedTracks: Track[] = [];
        for (const track of tracks) {
          const trackId = ensureTrackId(track, persistedTracks.length);
          const trackData = stripForFirestore({
            ...track,
            id: trackId,
            ownerId: user.id,
            albumId: album.id,
            updatedAt: new Date().toISOString(),
          });
          batch.set(doc(db, 'users', user.id, 'albums', album.id, 'tracks', trackId), trackData, { merge: true });
          opCount++;
          persistedTracks.push(trackData as Track);
          await commitIfNeeded();
        }
        persistedAlbums.push({ ...stampedAlbum, id: album.id, tracks: persistedTracks });
      }

      if (allLooseTracks.length > 0) {
        const looseResult = await persistLooseTracks(user.id, allLooseTracks, batch);
        batch = looseResult.batch;
        opCount += looseResult.opCount;
        persistedLooseTracks = looseResult.persisted;
        await commitIfNeeded();
      }

      await commitIfNeeded(true);
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
    applyImportedStyle(tracksForStyleImport);
  }, [user, flushCloudNow, seedTrackProgressBaselines, applyImportedStyle]);

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
      let batch = writeBatch(db);
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
  }, [user, flushCloudNow, seedTrackProgressBaselines]);

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
