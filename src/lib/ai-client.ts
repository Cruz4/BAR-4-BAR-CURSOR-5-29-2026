'use client';

import { auth } from '@/lib/firebase/client/firebase';
import { withAsyncTimeout } from '@/lib/async-timeout';
import { API_KEY_STORAGE_KEY } from '@/lib/byo-api';

export type AiAuthPayload = {
  idToken: string;
  userId: string;
};

export async function getAiAuth(): Promise<AiAuthPayload> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Sign in required for AI actions.');
  }
  const idToken = await withAsyncTimeout(
    user.getIdToken(),
    20_000,
    'Auth token'
  );
  return { idToken, userId: user.uid };
}

function readStoredCustomApiKey(userId: string): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const saved = localStorage.getItem(`${API_KEY_STORAGE_KEY}-${userId}`);
    return saved?.trim() || undefined;
  } catch {
    return undefined;
  }
}

export async function withAiAuth<T extends Record<string, unknown>>(
  payload: T
): Promise<T & AiAuthPayload & { customApiKey?: string }> {
  const authPayload = await getAiAuth();
  const customApiKey = readStoredCustomApiKey(authPayload.userId);
  return {
    ...payload,
    ...authPayload,
    ...(customApiKey ? { customApiKey } : {}),
  };
}
