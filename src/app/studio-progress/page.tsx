'use client';

import React from 'react';
import { StudioProgressBoard } from '@/components/gamification/studio-progress-board';
import { StudioProgressAtmosphere } from '@/components/gamification/studio-progress-atmosphere';

export default function StudioProgressPage() {
  return (
    <div className="relative min-h-[calc(100vh-3.5rem)]">
      <StudioProgressAtmosphere />
      <div className="relative z-10 container max-w-6xl py-7 md:py-11 px-4 md:px-6">
        <StudioProgressBoard />
      </div>
    </div>
  );
}
