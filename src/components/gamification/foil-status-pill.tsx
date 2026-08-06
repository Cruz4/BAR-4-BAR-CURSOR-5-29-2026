'use client';

/**
 * Status pills for foil cards.
 * Use line-height === height (not flex) — screenshot libs mis-center flex text.
 */

type FoilStatusPillProps = {
  label: string;
  color: string;
  background: string;
  borderColor: string;
};

export function FoilStatusPill({ label, color, background, borderColor }: FoilStatusPillProps) {
  const text = label.toUpperCase();
  return (
    <span
      data-foil-pill
      className="inline-block shrink-0 rounded-full border px-2.5 text-center text-[8px] font-bold uppercase tracking-wide"
      style={{
        color,
        background,
        borderColor,
        height: 22,
        lineHeight: '22px',
        verticalAlign: 'middle',
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </span>
  );
}
