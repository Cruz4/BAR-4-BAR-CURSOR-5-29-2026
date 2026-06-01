import confetti from 'canvas-confetti';

type FireFn = ReturnType<typeof confetti.create>;

let confettiFire: FireFn | null = null;
let confettiCanvas: HTMLCanvasElement | null = null;
const pendingTimers = new Set<number>();

const ACHIEVEMENT_COLORS = ['#fbbf24', '#a855f7', '#22d3ee', '#f472b6', '#34d399'];

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function getFire(): FireFn | null {
  if (typeof window === 'undefined' || prefersReducedMotion()) return null;

  if (!confettiFire) {
    confettiCanvas = document.createElement('canvas');
    confettiCanvas.setAttribute('aria-hidden', 'true');
    Object.assign(confettiCanvas.style, {
      position: 'fixed',
      inset: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: '9999',
    });
    document.body.appendChild(confettiCanvas);
    confettiFire = confetti.create(confettiCanvas, {
      resize: true,
      useWorker: true,
      disableForReducedMotion: true,
    });
  }

  return confettiFire;
}

function schedule(fn: () => void, delayMs: number) {
  const id = window.setTimeout(() => {
    pendingTimers.delete(id);
    fn();
  }, delayMs);
  pendingTimers.add(id);
}

/** Stop active bursts and clear pending timers (e.g. on dismiss). */
export function stopCelebrationConfetti() {
  pendingTimers.forEach((id) => window.clearTimeout(id));
  pendingTimers.clear();
  confettiFire?.reset();
}

/**
 * Achievement burst: a few timed shots instead of a per-frame loop.
 * Keeps total particles ~140 instead of thousands.
 */
export function fireAchievementConfetti(colors: string[] = ACHIEVEMENT_COLORS) {
  const fire = getFire();
  if (!fire) return;

  stopCelebrationConfetti();

  fire({
    particleCount: 70,
    spread: 95,
    origin: { x: 0.5, y: 0.45 },
    colors,
    startVelocity: 36,
    gravity: 0.92,
    scalar: 1,
    ticks: 160,
  });

  schedule(() => {
    fire({ particleCount: 28, angle: 60, spread: 52, origin: { x: 0.05, y: 0.72 }, colors, ticks: 140 });
    fire({ particleCount: 28, angle: 120, spread: 52, origin: { x: 0.95, y: 0.72 }, colors, ticks: 140 });
  }, 120);

  schedule(() => {
    fire({
      particleCount: 20,
      spread: 70,
      origin: { x: 0.5, y: 0.58 },
      colors,
      startVelocity: 22,
      ticks: 120,
    });
  }, 320);
}

/** Lighter single burst for weekly goals / milestones. */
export function fireProgressConfetti(colors: string[]) {
  const fire = getFire();
  if (!fire) return;

  fire({
    particleCount: 40,
    spread: 68,
    origin: { x: 0.5, y: 0.48 },
    colors,
    startVelocity: 30,
    gravity: 0.88,
    scalar: 0.95,
    ticks: 150,
  });

  schedule(() => {
    fire({
      particleCount: 16,
      spread: 55,
      origin: { x: 0.5, y: 0.55 },
      colors,
      startVelocity: 18,
      ticks: 110,
    });
  }, 180);
}
