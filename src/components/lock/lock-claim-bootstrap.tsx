'use client';

/**
 * After signup/login, claim LOCK echo handoff and start watching.
 */

import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { isLockEnabled } from '@/lib/lock-feature';
import { claimLockHandoff } from '@/lib/lock/session';
import { auth } from '@/lib/firebase/client/firebase';
import { useToast } from '@/hooks/use-toast';

export function LockClaimBootstrap() {
  const { user } = useAuth();
  const { toast } = useToast();
  const ran = useRef(false);

  useEffect(() => {
    if (!isLockEnabled() || !user || ran.current) return;
    const handoff = claimLockHandoff();
    if (!handoff) return;
    ran.current = true;

    void (async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) return;
        const res = await fetch(`/api/lock/${encodeURIComponent(handoff.lockId)}/watch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            userId: user.id,
            echoId: handoff.echoId,
            displayName: user.displayName || 'Artist',
          }),
        });
        if (res.ok) {
          toast({
            title: 'Echo named — watching',
            description: `LOCK ${handoff.lockScore} saved. We’ll ping you when this cast moves.`,
          });
        }
      } catch {
        /* ignore */
      }
    })();
  }, [user, toast]);

  return null;
}
