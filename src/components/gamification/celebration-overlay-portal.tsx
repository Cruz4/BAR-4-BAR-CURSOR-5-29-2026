'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** Above Generation Workstation (2100), studio tips (2000), guided tour (6000). */
export const CELEBRATION_OVERLAY_Z_CLASS = 'z-[7000]';
export const CELEBRATION_MODAL_Z_CLASS = 'z-[7001]';
export const CELEBRATION_EMOJI_Z_CLASS = 'z-[7002]';

export function CelebrationOverlayPortal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}
