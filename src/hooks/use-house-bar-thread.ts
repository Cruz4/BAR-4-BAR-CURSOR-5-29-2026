'use client';

import { useEffect, useState } from 'react';
import { LOCK_HOUSE_ID } from '@/lib/lock-feature';
import type { LockDoc, LockEcho } from '@/lib/lock/types';
import { HOUSE_BAR_THREAD_UPDATED_EVENT } from '@/lib/scene/house-bar-pin';
import { auth } from '@/lib/firebase/client/firebase';

const POLL_MS = 20_000;

type Snapshot = {
  lock: LockDoc | null;
  echoes: LockEcho[];
  loading: boolean;
};

const EMPTY: Snapshot = { lock: null, echoes: [], loading: false };

let snapshot: Snapshot = EMPTY;
const listeners = new Set<() => void>();
let enabledCount = 0;
let pollId: number | null = null;
let inFlight = false;

function emit() {
  listeners.forEach((fn) => fn());
}

async function fetchThread(silent: boolean) {
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
  if (inFlight) return;
  inFlight = true;
  if (!silent) {
    snapshot = { ...snapshot, loading: true };
    emit();
  }
  try {
    const headers: Record<string, string> = {};
    const token = await auth.currentUser?.getIdToken().catch(() => null);
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`/api/lock/${LOCK_HOUSE_ID}`, { cache: 'no-store', headers });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      snapshot = {
        lock: (data.lock as LockDoc) || null,
        echoes: Array.isArray(data.echoes) ? (data.echoes as LockEcho[]) : [],
        loading: false,
      };
      emit();
    } else if (!silent) {
      snapshot = { ...snapshot, loading: false };
      emit();
    }
  } catch {
    if (!silent) {
      snapshot = { ...snapshot, loading: false };
      emit();
    }
  } finally {
    inFlight = false;
  }
}

function startPolling() {
  if (pollId != null) return;
  void fetchThread(false);
  pollId = window.setInterval(() => void fetchThread(true), POLL_MS);
  document.addEventListener('visibilitychange', onVis);
  window.addEventListener(HOUSE_BAR_THREAD_UPDATED_EVENT, onUpdated);
}

function stopPolling() {
  if (pollId != null) {
    window.clearInterval(pollId);
    pollId = null;
  }
  document.removeEventListener('visibilitychange', onVis);
  window.removeEventListener(HOUSE_BAR_THREAD_UPDATED_EVENT, onUpdated);
  snapshot = EMPTY;
  emit();
}

function onVis() {
  if (document.visibilityState === 'visible') void fetchThread(true);
}

function onUpdated() {
  void fetchThread(true);
}

export function patchHouseBarEcho(echoId: string, patch: Partial<LockEcho>) {
  if (!snapshot.echoes.some((e) => e.id === echoId)) return;
  snapshot = {
    ...snapshot,
    echoes: snapshot.echoes.map((e) => (e.id === echoId ? { ...e, ...patch } : e)),
  };
  emit();
}

export function useHouseBarThread(enabled: boolean) {
  const [, bump] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const onChange = () => bump((n) => n + 1);
    listeners.add(onChange);
    enabledCount += 1;
    if (enabledCount === 1) startPolling();
    else onChange();
    return () => {
      listeners.delete(onChange);
      enabledCount = Math.max(0, enabledCount - 1);
      if (enabledCount === 0) stopPolling();
    };
  }, [enabled]);

  const current = enabled ? snapshot : EMPTY;
  return {
    lock: current.lock,
    echoes: current.echoes,
    echoCount: current.lock?.echoCount ?? current.echoes.length,
    loading: current.loading,
  };
}
