import {
  LOVE_INK_REWARD_AMOUNT,
  LOVE_INK_REWARD_INTERVAL,
  isLoveInkRewardMilestone,
  loveInkRewardDescription,
  loveInkRewardUnlockId,
} from '../src/lib/gamification/love-rewards';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`OK: ${message}`);
}

assert(LOVE_INK_REWARD_INTERVAL === 20, 'Love Ink interval is 20 verified Loves');
assert(LOVE_INK_REWARD_AMOUNT === 2, 'Love Ink reward is exactly 2 Ink');

for (const count of [0, 1, 2, 5, 19, 21, 39, 41, -20, 20.5]) {
  assert(!isLoveInkRewardMilestone(count), `${count} Loves does not grant Ink`);
}

for (const count of [20, 40, 60, 100]) {
  assert(isLoveInkRewardMilestone(count), `${count} Loves grants one milestone reward`);
  assert(loveInkRewardUnlockId(count) === `love_milestone_${count}`, `${count}-Love reward has a stable id`);
  assert(loveInkRewardDescription(count).includes(`${count} verified Loves`), `${count}-Love notification names the milestone`);
}

console.log('\nAll Love reward verification checks passed.');
