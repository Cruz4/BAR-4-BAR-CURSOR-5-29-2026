'use client';

import { auth } from '@/lib/firebase/client/firebase';

export type AiAuthPayload = {
  idToken: string;
  userId: string;
};

export async function getAiAuth(): Promise<AiAuthPayload> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Sign in required for AI actions.');
  }
  const idToken = await user.getIdToken();
  return { idToken, userId: user.uid };
}

export async function withAiAuth<T extends Record<string, unknown>>(
  payload: T
): Promise<T & AiAuthPayload> {
  const authPayload = await getAiAuth();
  return { ...payload, ...authPayload };
}
