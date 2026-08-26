'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** Above Generation Workstation (2100), studio tips (2000), guided tour (6000). */
export const CELEBRATION_OVERLAY_Z_CLASS = 'z-[7000]';
export const CELEBRATION_MODAL_Z_CLASS = 'z-[7001]';
export const CELEBRATION_EMOJI_Z_CLASS = 'z-[7002]';

export type CelebrationModalKind = 'achievement' | 'progress';

const CELEBRATION_MODAL_STATE_EVENT = 'b4b-celebration-modal-state';
const activeCelebrationModals = new Set<CelebrationModalKind>();

/** Prevent independent reward queues from opening dialogs on top of each other. */
export function setCelebrationModalActive(kind: CelebrationModalKind, active: boolean): void {
  if (active) activeCelebrationModals.add(kind);
  else activeCelebrationModals.delete(kind);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CELEBRATION_MODAL_STATE_EVENT));
  }
}

export function isOtherCelebrationModalActive(kind: CelebrationModalKind): boolean {
  return [...activeCelebrationModals].some((activeKind) => activeKind !== kind);
}

export function subscribeToCelebrationModalState(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener(CELEBRATION_MODAL_STATE_EVENT, listener);
  return () => window.removeEventListener(CELEBRATION_MODAL_STATE_EVENT, listener);
}

export function CelebrationOverlayPortal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}
