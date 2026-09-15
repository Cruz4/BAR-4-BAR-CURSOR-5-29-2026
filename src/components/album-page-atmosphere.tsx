'use client';

import { VaultChamberAtmosphere } from '@/components/vault-chamber-atmosphere';

/** Album room — warm vinyl chamber. Distinct from lyric-lab DNA snapshots. */
export function AlbumPageAtmosphere() {
  return (
    <>
      <VaultChamberAtmosphere />
      <div className="pointer-events-none fixed inset-0 z-[1] overflow-hidden album-page-lab" aria-hidden>
        <div className="album-page-orb-a absolute -left-[12%] top-[-8%] h-[46%] w-[52%] rounded-full" />
        <div className="album-page-orb-b absolute -right-[10%] bottom-[-6%] h-[40%] w-[48%] rounded-full" />
        <div className="album-page-vinyl absolute right-[-8%] top-[18%] h-[min(58vw,420px)] w-[min(58vw,420px)] rounded-full" />
        <div className="album-page-dust absolute inset-0" />
      </div>
    </>
  );
}
