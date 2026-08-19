'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TrackSection } from '@/lib/types';
import {
  subscribeCollabPresence,
  subscribeCollabSheet,
  syncCollabClient,
  writeCollabPresence,
} from '@/lib/collab-sheet/client';
import {
  activePresenceCount,
  type CollabPresence,
  type CollabSheetDoc,
} from '@/lib/collab-sheet/types';

function logCollabListenError(scope: string, err: unknown) {
  if (process.env.NODE_ENV === 'development') {
    console.warn(`[collab-sheet] ${scope}`, err);
  }
}

export function useCollabSheet(opts: {
  collabId?: string | null;
  userId?: string;
  userName?: string;
  sections: TrackSection[];
  enabled: boolean;
  onRemoteSections: (sections: TrackSection[], revision: number) => void;
}) {
  const [sheet, setSheet] = useState<CollabSheetDoc | null>(null);
  const [presence, setPresence] = useState<Record<string, CollabPresence>>({});
  const [syncing, setSyncing] = useState(false);
  const localRevisionRef = useRef(0);
  const lastAppliedRevisionRef = useRef(0);
  const applyingRemoteRef = useRef(false);
  const syncTimerRef = useRef<number | null>(null);
  const sectionsRef = useRef(opts.sections);
  const onRemoteRef = useRef(opts.onRemoteSections);
  sectionsRef.current = opts.sections;
  onRemoteRef.current = opts.onRemoteSections;

  useEffect(() => {
    if (!opts.enabled || !opts.collabId) {
      setSheet(null);
      setPresence({});
      localRevisionRef.current = 0;
      lastAppliedRevisionRef.current = 0;
      return;
    }

    const collabId = opts.collabId;
    const unsubSheet = subscribeCollabSheet(
      collabId,
      (next) => {
        setSheet(next?.active ? next : null);
        if (next?.active) {
          localRevisionRef.current = Math.max(localRevisionRef.current, next.revision);
          lastAppliedRevisionRef.current = Math.max(lastAppliedRevisionRef.current, next.revision);
        }
      },
      (err) => logCollabListenError('sheet listen', err)
    );
    const unsubPresence = subscribeCollabPresence(
      collabId,
      setPresence,
      (err) => logCollabListenError('presence listen', err)
    );

    return () => {
      unsubSheet();
      unsubPresence();
      if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
    };
  }, [opts.collabId, opts.enabled]);

  useEffect(() => {
    if (!opts.enabled || !opts.collabId || !opts.userId || !sheet?.active) return;

    void writeCollabPresence(opts.collabId, opts.userId, opts.userName || 'Artist').catch(
      () => undefined
    );
    const timer = window.setInterval(() => {
      void writeCollabPresence(opts.collabId!, opts.userId!, opts.userName || 'Artist').catch(
        () => undefined
      );
    }, 25_000);
    return () => window.clearInterval(timer);
  }, [opts.collabId, opts.enabled, opts.userId, opts.userName, sheet?.active]);

  useEffect(() => {
    if (!sheet?.active || applyingRemoteRef.current) return;
    if (sheet.revision <= lastAppliedRevisionRef.current) return;
    if (sheet.lastEditBy === opts.userId) {
      lastAppliedRevisionRef.current = sheet.revision;
      localRevisionRef.current = Math.max(localRevisionRef.current, sheet.revision);
      return;
    }
    lastAppliedRevisionRef.current = sheet.revision;
    localRevisionRef.current = sheet.revision;
    applyingRemoteRef.current = true;
    onRemoteRef.current(sheet.liveSections, sheet.revision);
    window.setTimeout(() => {
      applyingRemoteRef.current = false;
    }, 100);
  }, [sheet, opts.userId]);

  const pushSections = useCallback(
    (sections: TrackSection[], summary?: string) => {
      if (!opts.enabled || !opts.collabId || !opts.userId || applyingRemoteRef.current) return;
      if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
      syncTimerRef.current = window.setTimeout(() => {
        localRevisionRef.current += 1;
        const revision = localRevisionRef.current;
        setSyncing(true);
        void syncCollabClient({
          collabId: opts.collabId!,
          userId: opts.userId!,
          userName: opts.userName || 'Artist',
          sections,
          revision,
          summary,
        })
          .then((res) => {
            if (res.applied) lastAppliedRevisionRef.current = revision;
          })
          .catch(() => undefined)
          .finally(() => setSyncing(false));
      }, 900);
    },
    [opts.collabId, opts.enabled, opts.userId, opts.userName]
  );

  useEffect(() => {
    if (!opts.enabled || !opts.collabId || !sheet?.active || applyingRemoteRef.current) return;
    pushSections(sectionsRef.current);
  }, [opts.sections, opts.enabled, opts.collabId, sheet?.active, pushSections]);

  const liveCount = useMemo(() => {
    if (!sheet) return 0;
    return activePresenceCount(presence, sheet.memberIds, sheet.revoked);
  }, [presence, sheet]);

  const totalShared = useMemo(() => {
    if (!sheet) return 0;
    return sheet.memberIds.filter((id) => !sheet.revoked[id]).length;
  }, [sheet]);

  return {
    sheet,
    presence,
    syncing,
    liveCount,
    totalShared,
    pushSections,
  };
}
