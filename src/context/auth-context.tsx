'use client';

import React, {
  createContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/client/firebase';
import { doc } from 'firebase/firestore';
import { subscribeDocument } from '@/lib/firebase/client/firestore-subscribe';
import { useRouter, usePathname } from 'next/navigation';
import type { User } from '@/lib/types';
import { StudioLoader } from '@/components/studio-loader';
import { trackStudioEvent } from '@/lib/analytics-client';
import { ANALYTICS_EVENTS } from '@/lib/analytics-events';
import { clearWhatsNewLoginSession } from '@/lib/whats-new-session';
import { isBrowserOffline, onNetworkChange } from '@/lib/offline/network';
import {
  loadCachedUserProfile,
  saveCachedUserProfile,
  type CachedUserProfile,
} from '@/lib/offline/vault-cache';
import { isMasterAdminEmail } from '@/lib/master-admin';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authReady: boolean;
  offlineAuth: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  authReady: false,
  offlineAuth: false,
});

const PROTECTED_ROUTES = ['/usage', '/albums', '/admin', '/studio-progress'];
const PUBLIC_ROUTES = ['/login', '/pricing'];
const AUTH_BOOT_TIMEOUT_MS = 4500;

function userFromFirebase(
  firebaseUser: FirebaseUser,
  data?: Partial<User> | null,
  isMaster = false
): User {
  return {
    id: firebaseUser.uid,
    displayName: firebaseUser.displayName || data?.displayName || 'Anonymous',
    email: firebaseUser.email || data?.email || '',
    createdAt: firebaseUser.metadata.creationTime || data?.createdAt || new Date().toISOString(),
    role: isMaster ? 'admin' : (data?.role || 'artist'),
    status: data?.status || 'active',
    subscriptionStatus: data?.subscriptionStatus || 'none',
    subscriptionTier: data?.subscriptionTier || 'none',
    trialStartedAt: data?.trialStartedAt ?? null,
    lyricsTutorialCompletedAt: data?.lyricsTutorialCompletedAt,
    vaultTutorialCompletedAt: data?.vaultTutorialCompletedAt,
    studioPrivacyIntroCompletedAt: data?.studioPrivacyIntroCompletedAt,
  };
}

function userFromCachedProfile(
  firebaseUser: FirebaseUser,
  cached: CachedUserProfile,
  isMaster = false
): User {
  return userFromFirebase(firebaseUser, cached, isMaster);
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [offlineAuth, setOfflineAuth] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let unsubscribeDoc: (() => void) | null = null;
    let bootTimer: ReturnType<typeof setTimeout> | null = null;

    const finishLoading = () => {
      if (bootTimer) {
        clearTimeout(bootTimer);
        bootTimer = null;
      }
      setLoading(false);
    };

    const applyCachedOfflineUser = (firebaseUser: FirebaseUser) => {
      const cached = loadCachedUserProfile(firebaseUser.uid);
      if (!cached) return false;
      const isMaster = isMasterAdminEmail(firebaseUser.email);
      setUser(userFromCachedProfile(firebaseUser, cached, isMaster));
      setAuthReady(true);
      setOfflineAuth(true);
      finishLoading();
      return true;
    };

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (unsubscribeDoc) {
        unsubscribeDoc();
        unsubscribeDoc = null;
      }
      if (bootTimer) {
        clearTimeout(bootTimer);
        bootTimer = null;
      }

      if (!firebaseUser) {
        clearWhatsNewLoginSession();
        setUser(null);
        setAuthReady(false);
        setOfflineAuth(false);
        finishLoading();
        return;
      }

      const isMaster = isMasterAdminEmail(firebaseUser.email);
      const offline = isBrowserOffline();

      if (offline) {
        applyCachedOfflineUser(firebaseUser);
      }

      bootTimer = setTimeout(() => {
        if (!auth.currentUser) return;
        applyCachedOfflineUser(auth.currentUser);
      }, AUTH_BOOT_TIMEOUT_MS);

      try {
        await firebaseUser.getIdToken(false);
        setOfflineAuth(false);
      } catch (error) {
        console.warn('Auth token error:', error);
        if (offline && applyCachedOfflineUser(firebaseUser)) {
          return;
        }
        if (offline) {
          setUser(null);
          setAuthReady(false);
          finishLoading();
          return;
        }
        setUser(null);
        setAuthReady(false);
        finishLoading();
        return;
      }

      setAuthReady(true);

      const hydrateFromFirebase = () => userFromFirebase(firebaseUser, null, isMaster);

      unsubscribeDoc = subscribeDocument(
        doc(db, 'users', firebaseUser.uid),
        (data) => {
          if (data) {
            if (data.status === 'blocked') {
              setIsBlocked(true);
              signOut(auth);
              setUser(null);
              finishLoading();
              return;
            }

            setIsBlocked(false);
            const nextUser = userFromFirebase(firebaseUser, data as Partial<User>, isMaster);
            setUser(nextUser);
            saveCachedUserProfile({
              id: nextUser.id,
              displayName: nextUser.displayName,
              email: nextUser.email,
              role: nextUser.role,
              status: nextUser.status,
              subscriptionStatus: nextUser.subscriptionStatus,
              subscriptionTier: nextUser.subscriptionTier,
              trialStartedAt: nextUser.trialStartedAt ?? null,
              lyricsTutorialCompletedAt: nextUser.lyricsTutorialCompletedAt,
              vaultTutorialCompletedAt: nextUser.vaultTutorialCompletedAt,
            });
          } else {
            const fallback = hydrateFromFirebase();
            setUser(fallback);
            saveCachedUserProfile({
              id: fallback.id,
              displayName: fallback.displayName,
              email: fallback.email,
              role: fallback.role,
              status: fallback.status,
              subscriptionStatus: fallback.subscriptionStatus,
              subscriptionTier: fallback.subscriptionTier,
              trialStartedAt: fallback.trialStartedAt ?? null,
              lyricsTutorialCompletedAt: fallback.lyricsTutorialCompletedAt,
              vaultTutorialCompletedAt: fallback.vaultTutorialCompletedAt,
            });
          }
          finishLoading();
        },
        (error) => {
          console.error('Auth profile listener error:', error);
          if (applyCachedOfflineUser(firebaseUser)) return;
          const fallback = hydrateFromFirebase();
          setUser(fallback);
          finishLoading();
        }
      );
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
      if (bootTimer) clearTimeout(bootTimer);
    };
  }, []);

  useEffect(() => {
    return onNetworkChange((online) => {
      if (!online || !auth.currentUser) return;
      setOfflineAuth(false);
    });
  }, []);

  useEffect(() => {
    if (loading) return;

    if (isBlocked) {
      router.push('/login?error=restricted');
      return;
    }

    const isProtectedRoute = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
    const isAuthRoute = PUBLIC_ROUTES.includes(pathname);
    const isHomePage = pathname === '/';

    if (pathname.startsWith('/admin') && user?.role !== 'admin') {
      router.push('/');
      return;
    }

    if (!user && (isProtectedRoute || isHomePage)) {
      if (isBrowserOffline()) return;
      setIsRedirecting(true);
      const search = typeof window !== 'undefined' ? window.location.search : '';
      const returnPath = `${pathname}${search}`;
      const loginUrl =
        returnPath && returnPath !== '/login'
          ? `/login?next=${encodeURIComponent(returnPath)}`
          : '/login';
      router.push(loginUrl);
    } else if (user && isAuthRoute) {
      const nextParam =
        typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search).get('next')
          : null;
      const safeNext =
        nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/';
      const timer = setTimeout(() => {
        setIsRedirecting(true);
        router.push(safeNext);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setIsRedirecting(false);
    }
  }, [user, loading, pathname, router, isBlocked]);

  useEffect(() => {
    if (!user || !authReady || loading) return;
    trackStudioEvent(ANALYTICS_EVENTS.SESSION_START, { path: pathname });
  }, [user?.id, authReady, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const showLoader = loading || (isRedirecting && !isBrowserOffline());

  return (
    <AuthContext.Provider value={{ user, loading, authReady, offlineAuth }}>
      {showLoader ? (
        <div className="flex h-screen w-full items-center justify-center bg-background">
          <StudioLoader size="lg" />
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};
