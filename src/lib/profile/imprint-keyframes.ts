/** Shared imprint animation keyframes — injected once in document head. */
export const IMPRINT_KEYFRAMES_CSS = `
@keyframes qp-scan {
  0% { transform: translateY(-8%); opacity: 0.15; }
  50% { opacity: 0.5; }
  100% { transform: translateY(108%); opacity: 0.15; }
}
@keyframes qp-aurora {
  0%, 100% { transform: translate3d(-4%, -2%, 0) rotate(0deg) scale(1.05); filter: hue-rotate(0deg); }
  50% { transform: translate3d(4%, 3%, 0) rotate(6deg) scale(1.12); filter: hue-rotate(28deg); }
}
@keyframes qp-pulse {
  0%, 100% { transform: scale(0.92); opacity: 0.2; }
  50% { transform: scale(1.08); opacity: 0.55; }
}
@keyframes qp-drift {
  0%, 100% { transform: translate(-6%, -4%) scale(1); }
  50% { transform: translate(8%, 6%) scale(1.14); }
}
@keyframes qp-ripple {
  0% { transform: scale(0.65); opacity: 0.45; }
  100% { transform: scale(1.35); opacity: 0; }
}
@keyframes qp-chroma {
  0% { transform: translateX(-30%) rotate(0deg); }
  100% { transform: translateX(30%) rotate(8deg); }
}
@keyframes qp-twinkle {
  0%, 100% { opacity: 0.15; transform: scale(0.8); }
  50% { opacity: 0.95; transform: scale(1.2); }
}
@keyframes qp-breathe {
  0%, 100% { opacity: 0.18; transform: scale(1); }
  50% { opacity: 0.42; transform: scale(1.06); }
}
@keyframes qp-orbit {
  0% { transform: rotate(0deg) translateX(18%) rotate(0deg); }
  100% { transform: rotate(360deg) translateX(18%) rotate(-360deg); }
}
@keyframes qp-wave {
  0%, 100% { transform: translateY(0); opacity: 0.25; }
  50% { transform: translateY(-8%); opacity: 0.5; }
}
@keyframes qp-prism {
  0% { filter: hue-rotate(0deg); opacity: 0.12; }
  50% { filter: hue-rotate(45deg); opacity: 0.28; }
  100% { filter: hue-rotate(0deg); opacity: 0.12; }
}
@keyframes qp-halo {
  0%, 100% { transform: scale(0.9); opacity: 0.2; }
  50% { transform: scale(1.15); opacity: 0.5; }
}
@keyframes qp-noise-drift {
  0% { transform: translate(0, 0); }
  100% { transform: translate(-12%, -8%); }
}
@keyframes qp-grid {
  0% { background-position: 0 0, 0 0; }
  100% { background-position: 40px 40px, 40px 40px; }
}
@keyframes qp-ember {
  0% { transform: translateY(0); opacity: 0; }
  15% { opacity: 0.85; }
  100% { transform: translateY(-120%); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .qp-anim { animation: none !important; }
}
[data-imprint-motion="paused"] .qp-anim {
  animation-play-state: paused !important;
}
[data-imprint-card][data-imprint-exporting] [data-imprint-signature] {
  z-index: 4 !important;
}
`;

const STYLE_ID = 'qp-imprint-keyframes';

export function ensureImprintKeyframesInjected(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = IMPRINT_KEYFRAMES_CSS;
  document.head.appendChild(el);
}
