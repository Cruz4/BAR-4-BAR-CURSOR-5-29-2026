import { AI_COSTS } from '../src/lib/costs';
import { RENDER_INK_COSTS } from '../src/lib/song-generation/costs';
import { MAX_MONTHLY_RESIDENCY } from '../src/lib/stripe-catalog';
import { INK_PACK_DEFINITIONS } from '../src/lib/studio-tiers';

const BARS = 52;
const draftInk = BARS * AI_COSTS.generateDraftPerBar;
const renderInk = RENDER_INK_COSTS.localFullRender4Min;
const cycleInk = draftInk + renderInk;
const maxCycles = Math.floor(MAX_MONTHLY_RESIDENCY / cycleInk);

if (AI_COSTS.generateNextLine !== AI_COSTS.generateDraftPerBar) {
  throw new Error('Per-bar line vs draft mismatch');
}
if (cycleInk !== 200) {
  throw new Error(`Expected 200 Ink per easy-path cycle, got ${cycleInk}`);
}
if (maxCycles < 400) {
  throw new Error(`Studio Max should support >=400 cycles, got ${maxCycles}`);
}

const packs = INK_PACK_DEFINITIONS.map((p) => p.ink / p.priceAmount);
for (let i = 1; i < packs.length; i++) {
  if (packs[i] < packs[i - 1]) {
    throw new Error('Ink pack $/ink should be monotonic');
  }
}

console.log('verify-ink-economy: ok', { cycleInk, maxCycles });
