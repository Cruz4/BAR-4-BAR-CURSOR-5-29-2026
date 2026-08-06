'use client';

import type { RhymeFingerprint } from '@/lib/profile/modules';

/** Abstract rhyme + cadence bars — shared by Artist Home and Edit Public Page preview. */
export function FingerprintSvg({ fingerprint }: { fingerprint: RhymeFingerprint }) {
  const { rhyme, syllables } = fingerprint;
  const rows = rhyme.length;
  const maxSyl = Math.max(...syllables, 8);
  const width = 280;
  const rowH = 16;
  const height = rows * rowH + 8;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full max-w-sm"
      role="img"
      aria-label="Rhyme fingerprint — abstract cadence pattern"
    >
      {rhyme.map((group, i) => {
        const barW = Math.max(24, (syllables[i] / maxSyl) * (width - 60));
        const hueShift = (group * 47) % 360;
        return (
          <g key={i} transform={`translate(0, ${i * rowH + 4})`}>
            <rect
              x={0}
              y={0}
              width={barW}
              height={rowH - 6}
              rx={4}
              fill={`hsl(calc(var(--ph-hue, 200) + ${hueShift}) 70% 60% / 0.75)`}
            />
            <circle
              cx={barW + 12}
              cy={(rowH - 6) / 2}
              r={4}
              fill={`hsl(calc(var(--ph-hue, 200) + ${hueShift}) 80% 65%)`}
            />
          </g>
        );
      })}
    </svg>
  );
}
