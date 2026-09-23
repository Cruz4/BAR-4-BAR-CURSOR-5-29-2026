'use client';

import { LoginStudioAtmosphere } from '@/components/marketing/login-studio-atmosphere';

/** Living chamber — no flashing overlays. */
export function RenderStudioAtmosphere() {
  return (
    <>
      <LoginStudioAtmosphere />
      <div
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
        aria-hidden
        style={{
          background:
            'radial-gradient(ellipse 65% 48% at 8% 92%, rgba(88,28,135,0.18), transparent 58%), radial-gradient(ellipse 50% 40% at 94% 8%, rgba(8,47,73,0.22), transparent 52%)',
        }}
      />
    </>
  );
}
