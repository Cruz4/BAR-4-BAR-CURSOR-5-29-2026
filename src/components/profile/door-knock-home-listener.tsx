'use client';

import React, { useEffect, useRef, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase/client/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import {
  deliverDoorKnocksAtHome,
  startDoorPresenceHeartbeat,
  type DoorKnockLiveEvent,
} from '@/lib/door-knock-client';
import { DoorKnockAnswerDialog } from '@/components/profile/door-knock-answer-dialog';
import { refreshActivityAlerts } from '@/hooks/use-activity-alerts';

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
    return onSnapshot(q, (snap) => {
      for (const doc of snap.docs) {
        const data = doc.data();
        const knockId = typeof data.knockId === 'string' ? data.knockId : doc.id;
        if (handledRef.current.has(knockId)) continue;
        const knockerId = typeof data.knockerId === 'string' ? data.knockerId : '';
        if (!knockerId || knockerId === user.id) continue;
        handledRef.current.add(knockId);
        setLiveKnock({
          knockId,
          knockerId,
          knockerName: typeof data.knockerName === 'string' ? data.knockerName : 'Artist',
          knockerSlug: typeof data.knockerSlug === 'string' ? data.knockerSlug : undefined,
          activityId: typeof data.activityId === 'string' ? data.activityId : undefined,
          createdAt: typeof data.createdAt === 'string' ? data.createdAt : '',
        });
        void refreshActivityAlerts();
        break;
      }
    });
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
