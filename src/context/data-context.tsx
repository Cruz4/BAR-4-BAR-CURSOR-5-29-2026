'use client';

import React, { createContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import type { Album, StyleProfile, Track, ProjectShare, Direction } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase/client/firebase';
import { waitForAuthUser } from '@/lib/firebase/client/auth-ready';
import { doc, setDoc, getDoc, collection, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';
import { stripForFirestore } from '@/lib/utils';
import { countNonEmptyBars } from '@/lib/gamification/bar-count';
import { postGamificationEvent } from '@/lib/gamification-client';

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
  cloudSaveStatus: 'saved' | 'pending' | 'saving';
  flushCloudNow: () => Promise<void>;
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
  dropDNA: (type: 'album' | 'track', id: string) => Promise<string>;
}

export const DataContext = createContext<DataContextType>({
  albums: [],
  styleProfile: null,
  loading: true,
  isCloudSyncActive: false,
  cloudSaveStatus: 'saved' as const,
  flushCloudNow: async () => {},
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
});

const ALBUM_STORAGE_KEY = 'bar4bar-albums';
const STYLE_STORAGE_KEY = 'bar4bar-style';

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const { user, authReady } = useAuth();
  const { toast } = useToast();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [styleProfile, setStyleProfile] = useState<StyleProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCloudSyncActive, setIsCloudSyncActive] = useState(false);
  const [cloudSaveStatus, setCloudSaveStatus] = useState<'saved' | 'pending' | 'saving'>('saved');

  useEffect(() => {
    setIsCloudSyncActive(user?.subscriptionStatus === 'active');
  }, [user?.subscriptionStatus]);

  const pendingTrackUpdates = useRef<Record<string, { albumId: string, updates: any }>>({});
  const syncTrackTimeout = useRef<NodeJS.Timeout | null>(null);
  const pendingAlbumUpdates = useRef<Record<string, any>>({});
  const syncAlbumTimeout = useRef<NodeJS.Timeout | null>(null);
  const albumsRef = useRef<Album[]>([]);
  const prevBarCountsRef = useRef<Record<string, number>>({});

  useEffect(() => {
    albumsRef.current = albums;
  }, [albums]);

  const performTrackSync = useCallback(async () => {
    if (!user) return;
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
      const barCount = countNonEmptyBars(track.sections);
      const prevBarCount = prevBarCountsRef.current[trackId] ?? barCount;
      prevBarCountsRef.current[trackId] = barCount;
      void postGamificationEvent('track_saved', {
        barCount,
        prevBarCount,
        trackComplete: track.status === 'complete',
        albumTrackCount: album?.id !== UNASSIGNED_ALBUM_ID ? (album?.tracks?.length || 0) : 0,
        sessionBarCount: barCount,
      }).then(({ unlocks }) => {
        if (unlocks?.length) {
          window.dispatchEvent(new CustomEvent('b4b-achievement-unlock', { detail: { unlocks } }));
        }
      });
    }
  }, [user]);

  const performAlbumSync = useCallback(async () => {
    if (!user) return;
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

  const flushCloudNow = useCallback(async () => {
    if (syncTrackTimeout.current) {
      clearTimeout(syncTrackTimeout.current);
      syncTrackTimeout.current = null;
    }
    if (syncAlbumTimeout.current) {
      clearTimeout(syncAlbumTimeout.current);
      syncAlbumTimeout.current = null;
    }
    await Promise.all([performTrackSync(), performAlbumSync()]);
    setCloudSaveStatus('saved');
  }, [performTrackSync, performAlbumSync]);

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

  useEffect(() => {
    const loadData = async () => {
      if (!user || !authReady) {
        setLoading(false);
        return;
      }
      setLoading(true);
      
      try {
        const firebaseUser = await waitForAuthUser();
        if (!firebaseUser || firebaseUser.uid !== user.id) {
          throw new Error('Auth session not ready');
        }

        const userRef = doc(db, 'users', user.id);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            displayName: firebaseUser.displayName || 'Anonymous Artist',
            email: firebaseUser.email || '',
            createdAt: new Date().toISOString(),
            role: 'artist',
            subscriptionStatus: 'none',
            subscriptionTier: 'none',
          }, { merge: true });
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
          const savedLocal = localStorage.getItem(`${ALBUM_STORAGE_KEY}-${user.id}`);
          if (savedLocal) {
            const localAlbums = JSON.parse(savedLocal) as Album[];
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
        console.error("Load failed", e);
        const savedLocal = localStorage.getItem(`${ALBUM_STORAGE_KEY}-${user.id}`);
        if (savedLocal) setAlbums(JSON.parse(savedLocal));
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user?.id, authReady]);

  useEffect(() => {
    if (user && !loading) {
      try { 
        localStorage.setItem(`${ALBUM_STORAGE_KEY}-${user.id}`, JSON.stringify(albums)); 
        if (styleProfile) localStorage.setItem(`${STYLE_STORAGE_KEY}-${user.id}`, JSON.stringify(styleProfile));
      } catch (e) { console.warn("Local storage write failed"); }
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

  const addTrack = useCallback((albumId: string, track: Omit<Track, 'id'>): Track => {
    const id = track.id || `track-${Date.now()}`;
    const newTrack = stripForFirestore({ ...track, id, ownerId: user!.id, albumId }) as Track;
    setAlbums(prev => prev.map(a => (a.id === albumId ? { ...a, tracks: [...a.tracks, newTrack] } : a)));
    if (user) {
      if (albumId === UNASSIGNED_ALBUM_ID) {
        void setDoc(
          doc(db, 'users', user.id, 'albums', UNASSIGNED_ALBUM_ID),
          stripForFirestore({ ...createUnassignedShell(user.id), updatedAt: new Date().toISOString() }),
          { merge: true },
        );
      }
      void setDoc(doc(db, 'users', user.id, 'albums', albumId, 'tracks', id), newTrack, { merge: true });
    }
    return newTrack;
  }, [user]);

  const updateTrack = useCallback((albumId: string, trackId: string, updates: Partial<Track>) => {
    setAlbums(prev => prev.map(a => (a.id === albumId ? { ...a, tracks: a.tracks.map(t => t.id === trackId ? { ...t, ...updates } : t) } : a)));
    if (user) {
      pendingTrackUpdates.current[trackId] = { albumId, updates: { ...(pendingTrackUpdates.current[trackId]?.updates || {}), ...updates } };
      setCloudSaveStatus('pending');
      if (syncTrackTimeout.current) clearTimeout(syncTrackTimeout.current);
      syncTrackTimeout.current = setTimeout(performTrackSync, 1500);
    }
  }, [user, performTrackSync]);

  const updateAlbum = useCallback((albumId: string, updates: Partial<Album>) => {
    setAlbums(prev => prev.map(a => (a.id === albumId ? { ...a, ...updates } : a)));
    if (user) {
      pendingAlbumUpdates.current[albumId] = { ...pendingAlbumUpdates.current[albumId], ...updates };
      setCloudSaveStatus('pending');
      if (syncAlbumTimeout.current) clearTimeout(syncAlbumTimeout.current);
      syncAlbumTimeout.current = setTimeout(performAlbumSync, 1500);
    }
  }, [user, performAlbumSync]);

  const deleteAlbum = useCallback((albumId: string) => {
    setAlbums(prev => prev.filter(a => a.id !== albumId));
    if (user) deleteDoc(doc(db, 'users', user.id, 'albums', albumId));
  }, [user]);

  const deleteTrack = useCallback((albumId: string, trackId: string) => {
    setAlbums(prev => prev.map(a => (a.id === albumId ? { ...a, tracks: a.tracks.filter(t => t.id !== trackId) } : a)));
    if (user) deleteDoc(doc(db, 'users', user.id, 'albums', albumId, 'tracks', trackId));
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
    if (user) setDoc(doc(db, 'users', user.id, 'styleProfile', 'main'), newProfile);
  }, [styleProfile, user]);

  const dropDNA = useCallback(async (type: 'album' | 'track', id: string): Promise<string> => {
    if (!user) throw new Error("Artist Session Required.");
    const shareId = Math.random().toString(36).substring(2, 12).toUpperCase();
    const data = type === 'album' ? getAlbumById(id) : getTrackById('unassigned', id).track;
    await setDoc(doc(db, 'shares', shareId), { id: shareId, type, projectId: id, ownerId: user.id, ownerName: user.displayName, data: JSON.parse(JSON.stringify(data)), createdAt: new Date().toISOString(), views: 0, imports: 0 });
    void postGamificationEvent('share_created').then(({ unlocks }) => {
      if (unlocks?.length) {
        window.dispatchEvent(new CustomEvent('b4b-achievement-unlock', { detail: { unlocks } }));
      }
    });
    return shareId;
  }, [user, getAlbumById, getTrackById]);

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

      return next;
    });

    setCloudSaveStatus('saved');
  }, [user, flushCloudNow]);

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
    try {
      localStorage.setItem(`${ALBUM_STORAGE_KEY}-${user.id}`, JSON.stringify([freshUnassigned]));
    } catch {
      // ignore quota errors
    }
    setCloudSaveStatus('saved');
  }, [user, flushCloudNow]);

  const moveTrack = useCallback((tId: string, fromId: string, toId: string) => {
    const { track } = getTrackById(fromId, tId);
    if (track) { deleteTrack(fromId, tId); addTrack(toId, { ...track, albumId: toId }); }
  }, [deleteTrack, addTrack, getTrackById]);

  return (
    <DataContext.Provider value={{ 
      albums, styleProfile, loading, isCloudSyncActive, cloudSaveStatus, flushCloudNow,
      addAlbum, updateAlbum, deleteAlbum, getAlbumById,
      addTrack, updateTrack, deleteTrack, getTrackById, mergeData, clearVault, moveTrack, updateStyleProfile, dropDNA
    }}>{children}</DataContext.Provider>
  );
};
