
'use server';

import { revalidatePath } from 'next/cache';
import { getDb } from '@/lib/firebase/server';
import type { Album, Track, TrackSection } from './types';

// Album Actions
export async function updateAlbum(albumId: string, updates: Partial<Album>) {
  try {
    const db = await getDb();
    const albumRef = db.collection('albums').doc(albumId);
    await albumRef.update(updates);
    revalidatePath(`/albums/${albumId}`);
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error updating album:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function addThingToSay(albumId: string, thingsToSay: string[], newThing: string) {
    if (!newThing.trim()) return { success: false, error: "New idea cannot be empty."};
    const updatedThings = [...thingsToSay, newThing];
    return await updateAlbum(albumId, { thingsToSay: updatedThings });
}

export async function removeThingToSay(albumId: string, thingsToSay: string[], index: number) {
    const updatedThings = thingsToSay.filter((_, i) => i !== index);
    return await updateAlbum(albumId, { thingsToSay: updatedThings });
}

// Track Actions
export async function createTrack(albumId: string, ownerId: string, title: string) {
  try {
    const db = await getDb();
    const newTrackRef = db.collection('tracks').doc();
    const newTrackData: Omit<Track, 'id'> = {
      albumId,
      ownerId,
      title,
      vibe: { genre: 'Lofi-Hop', tempoBPM: 90, feeling: ['hopeful'] },
      intentRefs: [],
      sections: [{ id: `section-${Date.now()}`, type: 'verse', bars: [] }],
      status: 'in_progress',
      createdAt: new Date().toISOString(),
    };
    await newTrackRef.set(newTrackData);
    
    const newTrack = {
      ...newTrackData,
      id: newTrackRef.id,
    }

    revalidatePath(`/albums/${albumId}`);
    return {
      success: true,
      newTrack,
    };
  } catch (error) {
    console.error('Error creating track:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function deleteTrack(trackId: string, albumId: string) {
    try {
        const db = await getDb();
        await db.collection('tracks').doc(trackId).delete();
        revalidatePath(`/albums/${albumId}`);
        return { success: true };
    } catch (error) {
        console.error('Error deleting track:', error);
        return { success: false, error: (error as Error).message };
    }
}


export async function updateTrack(trackId: string, updates: Partial<Track>) {
    try {
        const db = await getDb();
        const trackRef = db.collection('tracks').doc(trackId);
        await trackRef.update(updates);
        // We need to get the albumId to revalidate the correct path
        const trackDoc = await trackRef.get();
        const trackData = trackDoc.data();
        if (trackData?.albumId) {
            revalidatePath(`/albums/${trackData.albumId}`);
            revalidatePath(`/albums/${trackData.albumId}/tracks/${trackId}`);
        }
        return { success: true };
    } catch (error) {
        console.error('Error updating track:', error);
        return { success: false, error: (error as Error).message };
    }
}

export async function updateTrackSections(trackId: string, sections: TrackSection[]) {
    return await updateTrack(trackId, { sections });
}
