'use client';

import { auth } from '@/lib/firebase/client/firebase';
import type {
  SupportDashboard,
  SupportRelationshipState,
} from '@/lib/relationships';

async function request(path: string, init?: RequestInit): Promise<Response> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in to do that.');
  const token = await user.getIdToken();
  return fetch(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });
}

export async function fetchSupportRelationship(
  userId: string,
  targetUserId: string
): Promise<SupportRelationshipState> {
  const response = await request(
    `/api/relationships?userId=${encodeURIComponent(userId)}&targetUserId=${encodeURIComponent(targetUserId)}`
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Could not load relationship.');
  return data as SupportRelationshipState;
}

export async function updateSupportRelationship(input: {
  userId: string;
  targetUserId: string;
  action: 'follow' | 'unfollow' | 'inner_circle_on' | 'inner_circle_off';
}): Promise<SupportRelationshipState> {
  const response = await request('/api/relationships', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Could not update relationship.');
  return data as SupportRelationshipState;
}

export async function fetchSupportDashboard(userId: string): Promise<SupportDashboard> {
  const response = await request(
    `/api/relationships?userId=${encodeURIComponent(userId)}&view=dashboard`
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Could not load supporters.');
  return data as SupportDashboard;
}
