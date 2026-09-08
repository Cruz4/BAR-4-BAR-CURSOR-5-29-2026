import { syncAppBadge } from '@/lib/activity/app-badge';

let activity = 0;
let folds = 0;

function flush() {
  syncAppBadge(activity + folds);
}

export function getAppBadgeTotal() {
  return activity + folds;
}

export function setActivityBadgeCount(n: number) {
  activity = Math.max(0, Math.floor(n) || 0);
  flush();
}

export function setFoldBadgeCount(n: number) {
  folds = Math.max(0, Math.floor(n) || 0);
  flush();
}
