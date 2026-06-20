'use client';

import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  type User,
} from 'firebase/auth';
import { createGoogleAuthProvider } from '@/lib/google-auth-client';

export function usesGoogleSignIn(user: User): boolean {
  return user.providerData.some((p) => p.providerId === 'google.com');
}

export function usesPasswordSignIn(user: User): boolean {
  return user.providerData.some((p) => p.providerId === 'password');
}

/** Re-auth before sensitive actions (account deletion, etc.). */
export async function reauthenticateCurrentUser(user: User, password?: string): Promise<void> {
  try {
    if (usesGoogleSignIn(user)) {
      await reauthenticateWithPopup(user, createGoogleAuthProvider());
      return;
    }

    const email = user.email?.trim();
    if (!email || !password?.trim()) {
      throw new Error('Enter your password to confirm account deletion.');
    }

    await reauthenticateWithCredential(user, EmailAuthProvider.credential(email, password));
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === 'auth/popup-closed-by-user') {
      throw new Error('Confirmation cancelled. Your account was not deleted.');
    }
    if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
      throw new Error('Incorrect password. Account was not deleted.');
    }
    throw e;
  }
}
