'use client';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { StudioLoader } from '@/components/studio-loader';
import { InviteGateScreen } from '@/components/invite-gate-screen';
import { isInviteGateExemptPath, type InviteGateCopy } from '@/lib/invite-gate';
import { DEFAULT_INVITE_GATE_COPY } from '@/lib/invite-gate';
import {
  clearStoredInviteGateUnlock,
  isLocallyUnlockedForVersion,
  persistInviteGateStatus,
  readCachedInviteGateStatus,
  readStoredInviteGateVersion,
} from '@/lib/invite-gate-client';

type GateState = {
  checking: boolean;
  gateEnabled: boolean;
  unlocked: boolean;
  copy: InviteGateCopy;
};

function resolveUnlocked(
  gateEnabled: boolean,
  gateVersion: number,
  sessionUnlocked: boolean | undefined,
  optimistic: boolean
): boolean {
  if (!gateEnabled) return true;
  if (sessionUnlocked === true) return true;
  if (optimistic) return true;
  if (isLocallyUnlockedForVersion(gateVersion)) return true;
  return false;
}

function initialGateState(): GateState {
  const cached = readCachedInviteGateStatus();
  const stored = readStoredInviteGateVersion();
  if (!cached) {
    return {
      checking: stored === null,
      gateEnabled: stored !== null,
      unlocked: stored !== null,
      copy: DEFAULT_INVITE_GATE_COPY,
    };
  }
  if (!cached.enabled) {
    return { checking: false, gateEnabled: false, unlocked: true, copy: DEFAULT_INVITE_GATE_COPY };
  }
  const unlocked = stored !== null && stored === cached.version;
  return {
    checking: false,
    gateEnabled: true,
    unlocked,
    copy: DEFAULT_INVITE_GATE_COPY,
  };
}

export function InviteGateGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();
  const optimisticRef = useRef(false);
  const [state, setState] = useState<GateState>({
    checking: true,
    gateEnabled: false,
    unlocked: true,
    copy: DEFAULT_INVITE_GATE_COPY,
  });

  useLayoutEffect(() => {
    setState(initialGateState());
  }, []);

  const refreshSession = useCallback(async (optimisticUnlock = false) => {
    if (optimisticUnlock) {
      optimisticRef.current = true;
      setState((s) => ({ ...s, checking: false, unlocked: true }));
    }

    try {
      const sessionRes = await fetch('/api/invite-gate/session', {
        cache: 'default',
        credentials: 'include',
      });
      const session = await sessionRes.json().catch(() => ({}));

      const gateEnabled = Boolean(session.gateEnabled);
      const gateVersion = Number(session.version ?? 1);
      persistInviteGateStatus(gateEnabled, Number.isFinite(gateVersion) ? gateVersion : 1);

      if (!gateEnabled) {
        clearStoredInviteGateUnlock();
        optimisticRef.current = false;
      } else {
        const stored = readStoredInviteGateVersion();
        if (stored !== null && stored !== gateVersion) {
          clearStoredInviteGateUnlock();
        }
      }

      const sessionUnlocked = sessionRes.ok ? Boolean(session.unlocked) : undefined;
      const unlocked = resolveUnlocked(
        gateEnabled,
        gateVersion,
        sessionUnlocked,
        optimisticRef.current || optimisticUnlock
      );

      if (unlocked) {
        optimisticRef.current = false;
      }

      setState({
        checking: false,
        gateEnabled,
        unlocked,
        copy: { ...DEFAULT_INVITE_GATE_COPY, ...(session.copy || {}) },
      });
    } catch {
      const localVersion = readStoredInviteGateVersion();
      setState((s) => ({
        ...s,
        checking: false,
        unlocked:
          optimisticRef.current ||
          optimisticUnlock ||
          s.unlocked ||
          (s.gateEnabled && localVersion !== null),
      }));
    }
  }, []);

  const handleUnlocked = useCallback(
    (_version: number) => {
      optimisticRef.current = true;
      setState((s) => ({ ...s, checking: false, unlocked: true, gateEnabled: true }));
      void refreshSession(true);
    },
    [refreshSession]
  );

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const isAdmin = user?.role === 'admin';
  const exempt = isInviteGateExemptPath(pathname);

  if (state.checking && !exempt) {
    return <StudioLoader size="lg" fullscreen className="bg-[#030712]" />;
  }

  if (state.gateEnabled && !state.unlocked && !isAdmin && !exempt) {
    if (authLoading && !user) {
      return <StudioLoader size="lg" fullscreen className="bg-[#030712]" />;
    }
    return <InviteGateScreen copy={state.copy} onUnlocked={handleUnlocked} />;
  }

  return <>{children}</>;
}
