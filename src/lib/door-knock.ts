/** Artist Home door knock — Discover "Recently live" only. */

/** How many times one person may knock the same door in a day. */
export const DOOR_KNOCK_MAX_PER_VISITOR_PER_DOOR = 3;
/** How many different doors one person may knock in a day. */
export const DOOR_KNOCK_MAX_DOORS_PER_VISITOR_DAY = 5;

/** How many different visitors may knock one artist's door in a day. */
export const DOOR_KNOCK_MAX_VISITORS_PER_DOOR_DAY = 5;
/** Hard cap on knocks one artist's door may receive in a day (5 × 3). */
export const DOOR_KNOCK_MAX_KNOCKS_PER_DOOR_DAY = 15;

/** @deprecated Use DOOR_KNOCK_MAX_PER_VISITOR_PER_DOOR */
export const DOOR_KNOCK_MAX_PER_TARGET_PER_DAY = DOOR_KNOCK_MAX_PER_VISITOR_PER_DOOR;
/** @deprecated Use DOOR_KNOCK_MAX_DOORS_PER_VISITOR_DAY */
export const DOOR_KNOCK_MAX_TARGETS_PER_DAY = DOOR_KNOCK_MAX_DOORS_PER_VISITOR_DAY;

export const DOOR_PRESENCE_TTL_MS = 45_000;
export const DOOR_PRESENCE_HEARTBEAT_MS = 20_000;

export type DoorKnockBlockReason =
  | 'your_knocks_here'
  | 'your_doors_today'
  | 'door_visitors_full'
  | 'door_knocks_full'
  | 'visitor_knocks_full';

export type DoorKnockQuota = {
  targetUserId: string;
  yourKnocksHere: number;
  yourKnocksLeftHere: number;
  yourDoorsToday: number;
  yourDoorsLeftToday: number;
  visitorsAtDoor: number;
  visitorsLeftAtDoor: number;
  knocksAtDoor: number;
  knocksLeftAtDoor: number;
  canKnock: boolean;
  blockReason?: DoorKnockBlockReason;
};

export function doorKnockDayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function doorKnockBlockMessage(reason: DoorKnockBlockReason | undefined): string {
  switch (reason) {
    case 'your_knocks_here':
    case 'visitor_knocks_full':
      return `You already knocked ${DOOR_KNOCK_MAX_PER_VISITOR_PER_DOOR} times here today.`;
    case 'your_doors_today':
      return `You already visited ${DOOR_KNOCK_MAX_DOORS_PER_VISITOR_DAY} doors today.`;
    case 'door_visitors_full':
      return `Their door already had ${DOOR_KNOCK_MAX_VISITORS_PER_DOOR_DAY} visitors today.`;
    case 'door_knocks_full':
      return 'Their door is quiet for today — check back tomorrow.';
    default:
      return 'Knock unavailable right now.';
  }
}

export function doorKnockLedgerLines(quota: DoorKnockQuota): {
  doorLine: string;
  youLine: string;
} {
  const doorLine =
    quota.visitorsAtDoor === 0 && quota.knocksAtDoor === 0
      ? `Door today — open (${DOOR_KNOCK_MAX_VISITORS_PER_DOOR_DAY} visitors · up to ${DOOR_KNOCK_MAX_KNOCKS_PER_DOOR_DAY} knocks)`
      : `Door today — ${quota.visitorsAtDoor} visitor${quota.visitorsAtDoor === 1 ? '' : 's'} · ${quota.knocksAtDoor} knock${quota.knocksAtDoor === 1 ? '' : 's'}`;

  const youLine =
    quota.yourKnocksHere === 0
      ? `You — not yet (${DOOR_KNOCK_MAX_PER_VISITOR_PER_DOOR} per door)`
      : `You — ${quota.yourKnocksHere} knock${quota.yourKnocksHere === 1 ? '' : 's'} here`;

  return { doorLine, youLine };
}
