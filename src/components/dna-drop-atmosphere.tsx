'use client';

import { cn } from '@/lib/utils';

export type DnaDropAtmosphereVariant = 'strand' | 'release-hub';

/** Strand = lyric-lab helix. Release hub = lacquer / groove room (same neon family, different read). */
export function DnaDropAtmosphere({
  className,
  variant = 'strand',
}: {
  className?: string;
  variant?: DnaDropAtmosphereVariant;
}) {
  if (variant === 'release-hub') {
    return (
      <div
        className={cn('pointer-events-none fixed inset-0 z-0 overflow-hidden release-hub-room', className)}
        aria-hidden
      >
        <div className="release-hub-wash absolute inset-0" />
        <div className="release-hub-orb-a absolute -right-[10%] top-[-8%] h-[55%] w-[58%] rounded-full" />
        <div className="release-hub-orb-b absolute -left-[14%] bottom-[-12%] h-[50%] w-[52%] rounded-full" />
        <div className="release-hub-vinyl absolute right-[-6%] top-[12%] h-[min(72vw,520px)] w-[min(72vw,520px)] rounded-full" />
        <div className="release-hub-grooves absolute inset-0" />
        <div className="release-hub-shelf absolute inset-x-0 bottom-0 h-[38%]" />
        <div className="release-hub-grain absolute inset-0" />
        <div className="release-hub-vignette absolute inset-0" />
      </div>
    );
  }

  return (
    <div
      className={cn('pointer-events-none fixed inset-0 z-0 overflow-hidden dna-drop-lab', className)}
      aria-hidden
    >
      <div className="dna-drop-lab-wash absolute inset-0" />
      <div className="dna-drop-lab-orb-a absolute -left-[18%] top-[-12%] h-[58%] w-[62%] rounded-full" />
      <div className="dna-drop-lab-orb-b absolute -right-[16%] top-[18%] h-[48%] w-[54%] rounded-full" />
      <div className="dna-drop-lab-orb-c absolute bottom-[-18%] left-[22%] h-[42%] w-[50%] rounded-full" />
      <div className="dna-drop-lab-scan absolute inset-x-0 h-1/3" />
      <svg
        className="dna-drop-lab-helix absolute left-[6%] top-[8%] h-[84%] w-[28%] opacity-70"
        viewBox="0 0 160 640"
        fill="none"
      >
        <path
          d="M40 8 C 128 80, 32 160, 120 240 C 32 320, 128 400, 40 480 C 128 560, 40 632, 40 632"
          stroke="rgb(34 211 238 / 0.45)"
          strokeWidth="2.2"
        />
        <path
          d="M120 8 C 32 80, 128 160, 40 240 C 128 320, 32 400, 120 480 C 32 560, 120 632, 120 632"
          stroke="rgb(217 70 239 / 0.42)"
          strokeWidth="2.2"
        />
        {Array.from({ length: 18 }, (_, i) => {
          const y = 28 + i * 33;
          const phase = (i / 18) * Math.PI * 2;
          const x1 = 80 + Math.cos(phase) * 42;
          const x2 = 80 - Math.cos(phase) * 42;
          return (
            <line
              key={i}
              x1={x1}
              y1={y}
              x2={x2}
              y2={y}
              stroke="rgb(165 243 252 / 0.28)"
              strokeWidth="1.2"
            />
          );
        })}
      </svg>
      <div className="dna-drop-lab-grain absolute inset-0" />
      <div className="dna-drop-lab-vignette absolute inset-0" />
    </div>
  );
}
