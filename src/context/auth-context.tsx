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

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authReady: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  authReady: false,
});

const PROTECTED_ROUTES = ['/usage', '/albums', '/admin', '/studio-progress'];
const PUBLIC_ROUTES = ['/login', '/pricing'];
const MASTER_ADMIN_EMAIL = 'plotformaiplan@gmail.com';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let unsubscribeDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (unsubscribeDoc) {
        unsubscribeDoc();
        unsubscribeDoc = null;
      }

      if (!firebaseUser) {
        clearWhatsNewLoginSession();
        setUser(null);
        setAuthReady(false);
        setLoading(false);
        return;
      }

      const isMaster = firebaseUser.email === MASTER_ADMIN_EMAIL;

      try {
        await firebaseUser.getIdToken();
      } catch (error) {
        console.error('Auth token error:', error);
        setUser(null);
        setAuthReady(false);
        setLoading(false);
        return;
      }

      setAuthReady(true);

        const hydrateFromFirebase = () => ({
          id: firebaseUser.uid,
          displayName: firebaseUser.displayName || 'Anonymous',
          email: firebaseUser.email || '',
          createdAt: firebaseUser.metadata.creationTime || new Date().toISOString(),
          role: (isMaster ? 'admin' : 'artist') as User['role'],
          status: 'active' as const,
          subscriptionStatus: 'none' as const,
          subscriptionTier: 'none' as const,
        });

        unsubscribeDoc = subscribeDocument(
          doc(db, 'users', firebaseUser.uid),
          (data) => {
          if (data) {
              // BLACKLIST ENFORCEMENT
              if (data.status === 'blocked') {
                  setIsBlocked(true);
                  signOut(auth);
                  setUser(null);
                  setLoading(false);
                  return;
              }

              setIsBlocked(false);
              setUser({
                id: firebaseUser.uid,
                displayName: firebaseUser.displayName || data.displayName || 'Anonymous',
                email: firebaseUser.email || data.email || '',
                createdAt: firebaseUser.metadata.creationTime || data.createdAt || new Date().toISOString(),
                role: isMaster ? 'admin' : (data?.role || 'artist'),
                status: data?.status || 'active',
                subscriptionStatus: data?.subscriptionStatus || 'none',
                subscriptionTier: data?.subscriptionTier || 'none',
                trialStartedAt: data.trialStartedAt || null,
                lyricsTutorialCompletedAt: data.lyricsTutorialCompletedAt || undefined,
              });
          } else {
              setUser(hydrateFromFirebase());
          }
          setLoading(false);
        }, (error) => {
            console.error("Auth profile listener error:", error);
            setUser(hydrateFromFirebase());
            setLoading(false);
        });
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, []);

  useEffect(() => {
    if (loading) return;

    if (isBlocked) {
        router.push('/login?error=restricted');
        return;
    }

    const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route));
    const isAuthRoute = PUBLIC_ROUTES.includes(pathname);
    const isHomePage = pathname === '/';

    if (pathname.startsWith('/admin') && user?.role !== 'admin') {
      router.push('/');
      return;
    }

    if (!user && (isProtectedRoute || isHomePage)) {
      setIsRedirecting(true);
      router.push('/login');
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

  const showLoader = loading || isRedirecting;

  return (
    <AuthContext.Provider value={{ user, loading, authReady }}>
      {showLoader ? (
        <div className="flex h-screen w-full items-center justify-center">
          <div className="flex flex-col items-center gap-6">
            <StudioLoader size="lg" />
            <p className="text-xs font-code uppercase tracking-widest text-muted-foreground animate-pulse">Initializing Studio...</p>
          </div>
        </div>
      ) : children}
    </AuthContext.Provider>
  );
};
