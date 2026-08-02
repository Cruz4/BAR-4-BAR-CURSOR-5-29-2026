'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { StudioLoader } from '@/components/studio-loader';
import { InviteGateScreen } from '@/components/invite-gate-screen';
import { isInviteGateExemptPath, type InviteGateCopy } from '@/lib/invite-gate';
import { DEFAULT_INVITE_GATE_COPY } from '@/lib/invite-gate';
import {
  clearStoredInviteGateUnlock,
  isLocallyUnlockedForVersion,
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

  const refreshSession = useCallback(async (optimisticUnlock = false) => {
    if (optimisticUnlock) {
      optimisticRef.current = true;
      setState((s) => ({ ...s, checking: false, unlocked: true }));
    }

    try {
      const fetchOpts: RequestInit = { cache: 'no-store', credentials: 'include' };
      const [statusRes, sessionRes] = await Promise.all([
        fetch('/api/invite-gate/status', fetchOpts),
        fetch('/api/invite-gate/session', fetchOpts),
      ]);
      const status = await statusRes.json().catch(() => ({}));
      const session = await sessionRes.json().catch(() => ({}));

      const gateEnabled = Boolean(session.gateEnabled ?? status.enabled);
      const gateVersion = Number(status.version ?? session.version ?? 1);

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
        copy: { ...DEFAULT_INVITE_GATE_COPY, ...(status.copy || {}) },
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

  if (state.checking || (authLoading && state.gateEnabled && !state.unlocked && !isAdmin)) {
    return <StudioLoader size="lg" fullscreen className="bg-[#030712]" />;
  }

  if (state.gateEnabled && !state.unlocked && !isAdmin && !exempt) {
    return <InviteGateScreen copy={state.copy} onUnlocked={handleUnlocked} />;
  }

  return <>{children}</>;
}
