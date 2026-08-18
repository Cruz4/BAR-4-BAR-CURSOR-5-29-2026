/** Public First Drop heat copy — spins (plays+previews), unlocks, loves. */

export type DropPulseKind = 'preview' | 'play';

export function formatDropPulseLine(input: {
  playCount?: number;
  previewCount?: number;
  purchaseCount?: number;
  loveCount?: number;
}): string {
  const spins = Math.max(0, Number(input.playCount) || 0) + Math.max(0, Number(input.previewCount) || 0);
  const unlocks = Math.max(0, Number(input.purchaseCount) || 0);
  const loves = Math.max(0, Number(input.loveCount) || 0);
  const bits: string[] = [];
  if (spins > 0) bits.push(`${spins} spin${spins === 1 ? '' : 's'}`);
  if (unlocks > 0) bits.push(`${unlocks} unlock${unlocks === 1 ? '' : 's'}`);
  if (loves > 0) bits.push(`${loves} love${loves === 1 ? '' : 's'}`);
  return bits.join(' · ');
}
