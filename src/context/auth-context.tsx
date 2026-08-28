'use client';

import React, {
  createContext,
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
  ReactNode,
} from 'react';
import { flushSync } from 'react-dom';
import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/client/firebase';
import { doc } from 'firebase/firestore';
import { subscribeDocument } from '@/lib/firebase/client/firestore-subscribe';
import { waitForAuthUser } from '@/lib/firebase/client/auth-ready';
import { useRouter, usePathname } from 'next/navigation';
import type { User } from '@/lib/types';
import { StudioLoader } from '@/components/studio-loader';
import { trackStudioEvent } from '@/lib/analytics-client';
import { ANALYTICS_EVENTS } from '@/lib/analytics-events';
import { clearWhatsNewLoginSession } from '@/lib/whats-new-session';
import { isBrowserOffline, onNetworkChange } from '@/lib/offline/network';
import {
  loadCachedUserProfile,
  loadLastCachedUserProfile,
  saveCachedUserProfile,
  saveLastAuthUserId,
  clearCachedUserProfile,
  type CachedUserProfile,
} from '@/lib/offline/vault-cache';
import { isMasterAdminEmail } from '@/lib/master-admin';
import { resolvePostLoginPath } from '@/lib/post-login-redirect';
import { isGuestTryPath, isGuestTrySheetEnabled } from '@/lib/guest-try';
import { vaultHref } from '@/lib/scene-home';
import {
  clearCurrentDeviceSessionIdentity,
  DeviceSessionEndedError,
  endCurrentDeviceSession,
  touchCurrentDeviceSession,
} from '@/lib/device-sessions-client';
import { DEVICE_SESSION_HEARTBEAT_MS } from '@/lib/device-sessions';
import {
  prepareFirestoreForSignOut,
  restoreFirestoreNetwork,
} from '@/lib/firebase/client/firestore-sign-out';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authReady: boolean;
  offlineAuth: boolean;
  signOutStudio: (redirectTo?: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  authReady: false,
  offlineAuth: false,
  signOutStudio: async () => undefined,
});

const PROTECTED_ROUTES = ['/usage', '/albums', '/admin', '/studio-progress', '/vault'];
/** Routes that bounce authenticated users away (login only — pricing stays open). */
const LOGGED_IN_BOUNCE_ROUTES = ['/login'];
const AUTH_BOOT_TIMEOUT_MS = 4500;
/** Hold loader briefly when Firestore profile doc is not ready yet (avoids free-tier flash). */
const PROFILE_DOC_WAIT_MS = 3000;
function userFromFirebase(
  firebaseUser: FirebaseUser,
  data?: Partial<User> | null,
  isMaster = false
): User {
  return {
    id: firebaseUser.uid,
    displayName: data?.displayName || firebaseUser.displayName || 'Anonymous',
    email: firebaseUser.email || data?.email || '',
    createdAt: firebaseUser.metadata.creationTime || data?.createdAt || new Date().toISOString(),
    role: isMaster ? 'admin' : (data?.role || 'artist'),
    status: data?.status || 'active',
    subscriptionStatus: data?.subscriptionStatus || 'none',
    subscriptionTier: data?.subscriptionTier || 'none',
    trialStartedAt: data?.trialStartedAt ?? null,
    returningIdentity: data?.returningIdentity === true,
    lyricsTutorialCompletedAt: data?.lyricsTutorialCompletedAt,
    vaultTutorialCompletedAt: data?.vaultTutorialCompletedAt,
    sceneTutorialCompletedAt: data?.sceneTutorialCompletedAt,
    proTrialWinCompletedAt: data?.proTrialWinCompletedAt,
    proTrialWinDismissedAt: data?.proTrialWinDismissedAt,
    studioPrivacyIntroCompletedAt: data?.studioPrivacyIntroCompletedAt,
    proFeaturePreviewExpiresAt: data?.proFeaturePreviewExpiresAt ?? null,
    pendingWelcomeInk: data?.pendingWelcomeInk,
    activatedAt: data?.activatedAt ?? null,
    freeEditableTrackIds: data?.freeEditableTrackIds,
    freeEditableSelectionAt: data?.freeEditableSelectionAt,
  };
}

function userFromCachedProfile(
  firebaseUser: FirebaseUser,
  cached: CachedUserProfile,
  isMaster = false
): User {
  return userFromFirebase(firebaseUser, cached, isMaster);
}

function userFromCachedOnly(cached: CachedUserProfile): User {
  return {
    id: cached.id,
    displayName: cached.displayName || 'Anonymous',
    email: cached.email || '',
    createdAt: new Date().toISOString(),
    role: cached.role || 'artist',
    status: cached.status || 'active',
    subscriptionStatus: cached.subscriptionStatus || 'none',
    subscriptionTier: cached.subscriptionTier || 'none',
    trialStartedAt: cached.trialStartedAt ?? null,
    returningIdentity: cached.returningIdentity === true,
    lyricsTutorialCompletedAt: cached.lyricsTutorialCompletedAt,
    vaultTutorialCompletedAt: cached.vaultTutorialCompletedAt,
    sceneTutorialCompletedAt: cached.sceneTutorialCompletedAt,
    proTrialWinCompletedAt: cached.proTrialWinCompletedAt,
    proTrialWinDismissedAt: cached.proTrialWinDismissedAt,
    studioPrivacyIntroCompletedAt: undefined,
    proFeaturePreviewExpiresAt: cached.proFeaturePreviewExpiresAt ?? null,
    pendingWelcomeInk: cached.pendingWelcomeInk,
    activatedAt: cached.activatedAt ?? null,
    freeEditableTrackIds: cached.freeEditableTrackIds,
    freeEditableSelectionAt: cached.freeEditableSelectionAt,
  };
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [offlineAuth, setOfflineAuth] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const authEpochRef = useRef(0);
  const signingOutRef = useRef(false);
  const profileUnsubRef = useRef<(() => void) | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const signOutStudio = useCallback(async (redirectTo = '/login') => {
    if (signingOutRef.current) return;
    signingOutRef.current = true;
    const uid = auth.currentUser?.uid || user?.id;
    authEpochRef.current += 1;
    profileUnsubRef.current?.();
    profileUnsubRef.current = null;
    flushSync(() => {
      setUser(null);
      setAuthReady(false);
      setOfflineAuth(false);
      setIsRedirecting(false);
    });
    saveLastAuthUserId(null);
    if (uid) clearCachedUserProfile(uid);
    try {
      await endCurrentDeviceSession().catch(() => undefined);
      clearCurrentDeviceSessionIdentity();
      await prepareFirestoreForSignOut();
      await signOut(auth);
      router.replace(redirectTo);
    } finally {
      signingOutRef.current = false;
    }
  }, [router, user?.id]);

  useLayoutEffect(() => {
    const cached = loadLastCachedUserProfile();
    if (!cached) return;
    setUser((prev) => prev ?? userFromCachedOnly(cached));
    setAuthReady(true);
    setLoading(false);
  }, []);

  useEffect(() => {
    let unsubscribeDoc: (() => void) | null = null;
    let bootTimer: ReturnType<typeof setTimeout> | null = null;
    let profileWaitTimer: ReturnType<typeof setTimeout> | null = null;

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
      const epoch = ++authEpochRef.current;
      const stillCurrent = () => authEpochRef.current === epoch;
      if (unsubscribeDoc) {
        unsubscribeDoc();
        unsubscribeDoc = null;
        profileUnsubRef.current = null;
      }
      if (bootTimer) {
        clearTimeout(bootTimer);
        bootTimer = null;
      }
      if (profileWaitTimer) {
        clearTimeout(profileWaitTimer);
        profileWaitTimer = null;
      }

      if (!firebaseUser) {
        clearWhatsNewLoginSession();
        saveLastAuthUserId(null);
        setUser(null);
        setAuthReady(false);
        setOfflineAuth(false);
        finishLoading();
        return;
      }

      await restoreFirestoreNetwork();

      if (!stillCurrent()) return;

      const isMaster = isMasterAdminEmail(firebaseUser.email);
      const offline = isBrowserOffline();
      const cached = loadCachedUserProfile(firebaseUser.uid);
      if (cached) {
        setUser(userFromCachedProfile(firebaseUser, cached, isMaster));
        setAuthReady(true);
        finishLoading();
      }

      if (!stillCurrent()) return;

      if (offline) {
        applyCachedOfflineUser(firebaseUser);
      }

      bootTimer = setTimeout(() => {
        if (!stillCurrent() || !auth.currentUser) return;
        applyCachedOfflineUser(auth.currentUser);
      }, AUTH_BOOT_TIMEOUT_MS);

      try {
        await firebaseUser.getIdToken(false);
        if (!stillCurrent()) return;
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

      const readyUser = await waitForAuthUser();
      if (!stillCurrent() || !readyUser || readyUser.uid !== firebaseUser.uid) {
        finishLoading();
        return;
      }

      const cacheUserProfile = (nextUser: User) => {
        saveCachedUserProfile({
          id: nextUser.id,
          displayName: nextUser.displayName,
          email: nextUser.email,
          role: nextUser.role,
          status: nextUser.status,
          subscriptionStatus: nextUser.subscriptionStatus,
          subscriptionTier: nextUser.subscriptionTier,
          trialStartedAt: nextUser.trialStartedAt ?? null,
          returningIdentity: nextUser.returningIdentity,
          lyricsTutorialCompletedAt: nextUser.lyricsTutorialCompletedAt,
          vaultTutorialCompletedAt: nextUser.vaultTutorialCompletedAt,
          sceneTutorialCompletedAt: nextUser.sceneTutorialCompletedAt,
          proTrialWinCompletedAt: nextUser.proTrialWinCompletedAt,
          proTrialWinDismissedAt: nextUser.proTrialWinDismissedAt,
          proFeaturePreviewExpiresAt: nextUser.proFeaturePreviewExpiresAt ?? null,
          pendingWelcomeInk: nextUser.pendingWelcomeInk,
          activatedAt: nextUser.activatedAt ?? null,
          freeEditableTrackIds: nextUser.freeEditableTrackIds,
          freeEditableSelectionAt: nextUser.freeEditableSelectionAt,
        });
      };

      const settleProfile = (nextUser: User, hasFirestoreDoc: boolean) => {
        if (!stillCurrent()) return;
        setUser(nextUser);
        cacheUserProfile(nextUser);
        if (hasFirestoreDoc) {
          if (profileWaitTimer) {
            clearTimeout(profileWaitTimer);
            profileWaitTimer = null;
          }
          finishLoading();
          return;
        }
        if (!profileWaitTimer) {
          profileWaitTimer = setTimeout(() => {
            profileWaitTimer = null;
            finishLoading();
          }, PROFILE_DOC_WAIT_MS);
        }
      };

      unsubscribeDoc = subscribeDocument(
        doc(db, 'users', firebaseUser.uid),
        (data) => {
          if (!stillCurrent()) return;
          if (data) {
            if (data.status === 'blocked') {
              setIsBlocked(true);
              signOut(auth);
              setUser(null);
              finishLoading();
              return;
            }

            setIsBlocked(false);
            const nextUser = userFromFirebase(
              firebaseUser,
              data as Partial<User>,
              isMaster
            );
            settleProfile(nextUser, true);
          } else {
            const fallback = userFromFirebase(firebaseUser, null, isMaster);
            settleProfile(fallback, false);
          }
        },
        (error) => {
          if (!stillCurrent()) return;
          console.error('Auth profile listener error:', error);
          if (applyCachedOfflineUser(firebaseUser)) return;
          const fallback = userFromFirebase(firebaseUser, null, isMaster);
          settleProfile(fallback, false);
        }
      );
      profileUnsubRef.current = unsubscribeDoc;
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
      profileUnsubRef.current = null;
      if (bootTimer) clearTimeout(bootTimer);
      if (profileWaitTimer) clearTimeout(profileWaitTimer);
    };
  }, []);

  useEffect(() => {
    return onNetworkChange((online) => {
      if (!online || !auth.currentUser) return;
      setOfflineAuth(false);
    });
  }, []);

  useEffect(() => {
    if (!user?.id || !authReady || loading || offlineAuth) return;
    let disposed = false;
    let checking = false;

    const checkCurrentDevice = async () => {
      if (checking || disposed || isBrowserOffline()) return;
      const firebaseUser = auth.currentUser;
      if (!firebaseUser || firebaseUser.uid !== user.id) return;
      checking = true;
      try {
        await touchCurrentDeviceSession(firebaseUser);
      } catch (error) {
        if (error instanceof DeviceSessionEndedError) {
          if (!disposed) {
            await signOutStudio('/login?error=session-ended');
          }
        } else {
          console.warn('Device session check failed:', error);
        }
      } finally {
        checking = false;
      }
    };

    void checkCurrentDevice();
    const timer = window.setInterval(checkCurrentDevice, DEVICE_SESSION_HEARTBEAT_MS);
    const onFocus = () => void checkCurrentDevice();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void checkCurrentDevice();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      disposed = true;
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [user?.id, authReady, loading, offlineAuth, router, signOutStudio]);

  useEffect(() => {
    if (loading) return;

    if (isBlocked) {
      router.push('/login?error=restricted');
      return;
    }

    const guestTryAllowed =
      isGuestTrySheetEnabled() && isGuestTryPath(pathname);
    const isProtectedRoute = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
    const shouldBounceLoggedInUser = LOGGED_IN_BOUNCE_ROUTES.includes(pathname);

    if (pathname.startsWith('/admin') && user?.role !== 'admin') {
      router.push('/');
      return;
    }

    // Logged-in users on the anonymous try sheet → vault (handoff runs on empty vault).
    if (user && guestTryAllowed) {
      setIsRedirecting(true);
      router.replace(vaultHref());
      return;
    }

    if (!user && isProtectedRoute && !guestTryAllowed) {
      if (isBrowserOffline()) return;
      setIsRedirecting(true);
      const search = typeof window !== 'undefined' ? window.location.search : '';
      const returnPath = `${pathname}${search}`;
      const loginUrl =
        returnPath && returnPath !== '/login'
          ? `/login?next=${encodeURIComponent(returnPath)}`
          : '/login';
      router.push(loginUrl);
    } else if (user && shouldBounceLoggedInUser && !signingOutRef.current) {
      const nextParam =
        typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search).get('next')
          : null;
      const destination = resolvePostLoginPath(nextParam);
      const timer = setTimeout(() => {
        setIsRedirecting(true);
        router.push(destination);
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

  const isProtectedRoute = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
  const showLoader =
    (loading && isProtectedRoute && !user) ||
    (isRedirecting && isProtectedRoute && !isBrowserOffline());

  return (
    <AuthContext.Provider value={{ user, loading, authReady, offlineAuth, signOutStudio }}>
      {showLoader ? (
        <StudioLoader size="lg" fullscreen />
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};
