export const OPEN_FIRST_DROP_LATHE = 'b4b:open-first-drop-lathe';

export type FirstDropLatheDetail = {
  albumId?: string;
  trackId?: string;
};

export function openFirstDropLathe(detail: FirstDropLatheDetail = {}): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(OPEN_FIRST_DROP_LATHE, { detail }));
}
