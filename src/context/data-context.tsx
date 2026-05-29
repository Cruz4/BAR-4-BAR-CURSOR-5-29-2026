'use client';

import React, { createContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import type { Album, StyleProfile, Track, ProjectShare, Direction } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase/client/firebase';
import { waitForAuthUser } from '@/lib/firebase/client/auth-ready';
import { doc, setDoc, getDoc, collection, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';

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
  mergeData: (albumsToMerge: Album[], tracksToMerge: Track[]) => void;
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
  mergeData: () => {},
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

  const performTrackSync = useCallback(async () => {
    if (!user) return;
    if (Object.keys(pendingTrackUpdates.current).length === 0) return;
    setCloudSaveStatus('saving');
    const batch = writeBatch(db);
    const updates = { ...pendingTrackUpdates.current };
    pendingTrackUpdates.current = {};
    Object.entries(updates).forEach(([trackId, data]) => {
        batch.set(doc(db, 'users', user.id, 'albums', data.albumId, 'tracks', trackId), { ...data.updates, updatedAt: new Date().toISOString() }, { merge: true });
    });
    await batch.commit();
    if (Object.keys(pendingTrackUpdates.current).length === 0 && Object.keys(pendingAlbumUpdates.current).length === 0) {
      setCloudSaveStatus('saved');
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
        batch.set(doc(db, 'users', user.id, 'albums', albumId), { ...data, updatedAt: new Date().toISOString() }, { merge: true });
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
        if (!user) setLoading(false);
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
        
        const styleSnap = await getDoc(doc(db, 'users', user.id, 'styleProfile', 'main'));
        if (styleSnap.exists()) setStyleProfile(styleSnap.data() as StyleProfile);
        
        setAlbums(loadedAlbums);

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

        setAlbums(prev => !prev.find(a => a.id === 'unassigned') ? [{ id: 'unassigned', ownerId: user.id, title: 'Loose Tracks', theme: 'Unassigned tracks.', createdAt: new Date().toISOString(), tracks: [] }, ...prev] : prev);
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
      const { tracks, ...data } = album;
      setDoc(doc(db, 'users', user.id, 'albums', album.id), data);
    }
  }, [user]);

  const addTrack = useCallback((albumId: string, track: Omit<Track, 'id'>): Track => {
    const id = track.id || `track-${Date.now()}`;
    const newTrack = { ...track, id, ownerId: user!.id, albumId };
    setAlbums(prev => prev.map(a => (a.id === albumId ? { ...a, tracks: [...a.tracks, newTrack as Track] } : a)));
    if (user) setDoc(doc(db, 'users', user.id, 'albums', albumId, 'tracks', id), newTrack);
    return newTrack as Track;
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
    return shareId;
  }, [user, getAlbumById, getTrackById]);

  const mergeData = useCallback(async (importedAlbums: Album[], importedTracks: Track[]) => {
    if (!user) return;
    importedAlbums.forEach(a => addAlbum(a));
    importedTracks.forEach(t => addTrack('unassigned', t));
  }, [user, addAlbum, addTrack]);

  const moveTrack = useCallback((tId: string, fromId: string, toId: string) => {
    const { track } = getTrackById(fromId, tId);
    if (track) { deleteTrack(fromId, tId); addTrack(toId, { ...track, albumId: toId }); }
  }, [deleteTrack, addTrack, getTrackById]);

  return (
    <DataContext.Provider value={{ 
      albums, styleProfile, loading, isCloudSyncActive, cloudSaveStatus, flushCloudNow,
      addAlbum, updateAlbum, deleteAlbum, getAlbumById,
      addTrack, updateTrack, deleteTrack, getTrackById, mergeData, moveTrack, updateStyleProfile, dropDNA
    }}>{children}</DataContext.Provider>
  );
};
