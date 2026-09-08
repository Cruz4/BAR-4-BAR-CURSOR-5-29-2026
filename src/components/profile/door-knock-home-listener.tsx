'use client';

import React, { useEffect, useRef, useState } from 'react';
import { collection, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase/client/firebase';
import { subscribeQuery } from '@/lib/firebase/client/firestore-subscribe';
import { isFirestoreInternalAssertion } from '@/lib/firebase/client/firestore-dev-recovery';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import {
  deliverDoorKnocksAtHome,
  startDoorPresenceHeartbeat,
  type DoorKnockLiveEvent,
} from '@/lib/door-knock-client';
import { DoorKnockAnswerDialog } from '@/components/profile/door-knock-answer-dialog';
import { refreshActivityAlerts } from '@/hooks/use-activity-alerts';
import { playDoorKnockSound } from '@/lib/door-knock-sound';

/**
 * When the profile owner is on their Artist Home: heartbeat presence,
 * deliver queued knocks to Activity, and surface live knocks with the answer dialog.
 */
export function DoorKnockHomeListener({
  ownerUserId,
  ownerSlug,
  enabled,
}: {
  ownerUserId: string;
  ownerSlug?: string;
  enabled: boolean;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [liveKnock, setLiveKnock] = useState<DoorKnockLiveEvent | null>(null);
  const handledRef = useRef<Set<string>>(new Set());
  const deliveredRef = useRef(false);

  useEffect(() => {
    if (!enabled || !user?.id || user.id !== ownerUserId) return;
    return startDoorPresenceHeartbeat();
  }, [enabled, user?.id, ownerUserId]);

  useEffect(() => {
    if (!enabled || !user?.id || user.id !== ownerUserId || deliveredRef.current) return;
    deliveredRef.current = true;
    void deliverDoorKnocksAtHome().then((result) => {
      if (result.delivered > 0) {
        void refreshActivityAlerts();
        const who =
          result.knockerNames.length === 1
            ? result.knockerNames[0]
            : `${result.delivered} visitor${result.delivered === 1 ? '' : 's'}`;
        toast({
          title: 'Knocks at the door',
          description: `${who} knocked while you were away. Check Activity for the full list.`,
        });
      }
    });
  }, [enabled, user?.id, ownerUserId, toast]);

  useEffect(() => {
    if (!enabled || !user?.id || user.id !== ownerUserId) return;
    const q = query(
      collection(db, `users/${ownerUserId}/doorKnockLive`),
      orderBy('createdAt', 'desc')
    );
    return subscribeQuery(
      q,
      (rows) => {
        for (const row of rows) {
          const knockId = typeof row.knockId === 'string' ? row.knockId : row.id;
          if (handledRef.current.has(knockId)) continue;
          const knockerId = typeof row.knockerId === 'string' ? row.knockerId : '';
          if (!knockerId || knockerId === user.id) continue;
          handledRef.current.add(knockId);
          playDoorKnockSound(0.18);
          setLiveKnock({
            knockId,
            knockerId,
            knockerName: typeof row.knockerName === 'string' ? row.knockerName : 'Artist',
            knockerSlug: typeof row.knockerSlug === 'string' ? row.knockerSlug : undefined,
            activityId: typeof row.activityId === 'string' ? row.activityId : undefined,
            createdAt: typeof row.createdAt === 'string' ? row.createdAt : '',
          });
          void refreshActivityAlerts();
          break;
        }
      },
      (err) => {
        if (!isFirestoreInternalAssertion(err)) return;
        window.dispatchEvent(new ErrorEvent('error', { error: err instanceof Error ? err : new Error(String(err)) }));
      }
    );
  }, [enabled, user?.id, ownerUserId]);

  if (!liveKnock || !user?.id) return null;

  return (
    <DoorKnockAnswerDialog
      knock={liveKnock}
      ownerUserId={user.id}
      ownerSlug={ownerSlug}
      onDismiss={() => setLiveKnock(null)}
    />
  );
}
