/** Ink costs for render studio actions (anti-arbitrage aligned with lyric economy). */

export const RENDER_INK_COSTS = {
  localFullRender4Min: 44,
  localRepaintPer30Sec: 6,
  stemBundle: 40,
  midiPerStem: 12,
  voiceMatchPass: 36,
  artistSignatureTrainLocal: 220,
  cloudRenderInkAddon: 0, // creative ink same as local; cloud pass separate
} as const;

export const DEFAULT_FULL_RENDER_DURATION_SEC = 240;

export function computeRepaintInkCost(selectedDurationSec: number): number {
  const blocks = Math.max(1, Math.ceil(selectedDurationSec / 30));
  return blocks * RENDER_INK_COSTS.localRepaintPer30Sec;
}

export function computeFullRenderInkCost(_durationSec = DEFAULT_FULL_RENDER_DURATION_SEC): number {
  // Flat up to 4 minutes per plan; advanced longer jobs use multiplier in server gate.
  if (_durationSec <= 240) return RENDER_INK_COSTS.localFullRender4Min;
  const extraMin = Math.ceil((_durationSec - 240) / 60);
  return RENDER_INK_COSTS.localFullRender4Min + extraMin * 11;
}
