
'use client';

import { db } from './firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import type { Album, Track } from '@/lib/types';

/**
 * Fetches a single album from Firestore.
 * @param albumId The ID of the album to fetch.
 * @returns A promise that resolves to the Album object or null if not found.
 */
export async function getAlbum(albumId: string): Promise<Album | null> {
  try {
    const albumRef = doc(db, 'albums', albumId);
    const albumSnap = await getDoc(albumRef);

    if (!albumSnap.exists()) {
      console.warn(`Album with ID ${albumId} not found.`);
      return null;
    }
    const data = albumSnap.data();
    const createdAt = (data?.createdAt?.toDate ? data.createdAt.toDate() : new Date()).toISOString();

    return { id: albumSnap.id, ...data, createdAt } as Album;

  } catch (error) {
    console.error(`Error fetching album ${albumId}:`, error);
    throw error;
  }
}

/**
 * Fetches all tracks for a given album from Firestore.
 * @param albumId The ID of the album to fetch tracks for.
 * @returns A promise that resolves to an array of Track objects.
 */
export async function getTracksForAlbum(albumId: string): Promise<Track[]> {
    try {
        const tracksRef = collection(db, 'tracks');
        const q = query(tracksRef, where('albumId', '==', albumId), orderBy('createdAt', 'asc'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
             const data = doc.data();
             const createdAt = (data?.createdAt?.toDate ? data.createdAt.toDate() : new Date()).toISOString();
             return { id: doc.id, ...data, createdAt } as Track;
        });
    } catch (error) {
        console.error(`Error fetching tracks for album ${albumId}:`, error);
        throw error;
    }
}


/**
 * Fetches a single track from Firestore.
 * @param trackId The ID of the track to fetch.
 * @returns A promise that resolves to the Track object or null if not found.
 */
export async function getTrack(trackId: string): Promise<Track | null> {
  try {
    const trackRef = doc(db, 'tracks', trackId);
    const trackSnap = await getDoc(trackRef);

    if (!trackSnap.exists()) {
      console.warn(`Track with ID ${trackId} not found.`);
      return null;
    }

    const trackData = trackSnap.data() as Omit<Track, 'id'>;
    
    // Fetch the album to embed its details
    let albumDetails: Partial<Album> = {};
    if (trackData.albumId) {
        const album = await getAlbum(trackData.albumId);
        if (album) {
            albumDetails = {
                title: album.title,
                theme: album.theme,
                thingsToSay: album.thingsToSay,
            }
        }
    }

    return {
      id: trackSnap.id,
      ...trackData,
      album: albumDetails
    };
  } catch (error) {
    console.error(`Error fetching track ${trackId}:`, error);
    // In a real app, you might want to handle this more gracefully
    throw error;
  }
}
