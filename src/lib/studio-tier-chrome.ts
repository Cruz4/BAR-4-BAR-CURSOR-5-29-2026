/** Shared Pro / Visitor name + avatar chrome for feed, header, and Studio Tier. */

import { cn } from '@/lib/utils';
import { isProUser } from '@/lib/subscription';
import type { User } from '@/lib/types';

export type StudioNameChrome = 'pro' | 'free';

/** Feed / profile names for Visitor — sky blue, never animated. */
export const STUDIO_FREE_NAME_CLASS = 'text-[rgb(125,211,252)]';
/** Feed / profile names for paid Pro (monthly + yearly). */
export const STUDIO_PRO_NAME_CLASS = 'text-accent';

export function parseStudioBadge(raw: unknown): StudioNameChrome | undefined {
  if (raw === 'pro' || raw === 'free') return raw;
  return undefined;
}

export function studioChromeFromUser(
  user: Pick<User, 'subscriptionStatus'> | null | undefined
): StudioNameChrome {
  return isProUser(user) ? 'pro' : 'free';
}

export function studioChromeFromSubscriptionStatus(
  subscriptionStatus?: string | null
): StudioNameChrome {
  return subscriptionStatus === 'active' ? 'pro' : 'free';
}

/** Display names — Pro hot pink, Visitor rgb(125 211 252). No flash. */
export function studioNameClass(chrome?: StudioNameChrome | null, extra?: string): string {
  return cn(
    chrome === 'pro' ? STUDIO_PRO_NAME_CLASS : STUDIO_FREE_NAME_CLASS,
    extra
  );
}

/** Header avatar bubble — original yearly weight (ring-2 + offset gap). */
export function studioAvatarRingClass(chrome?: StudioNameChrome | null): string {
  if (chrome === 'pro') {
    return 'border border-accent ring-2 ring-accent ring-offset-2 ring-offset-background shadow-[0_0_15px_rgba(217,70,239,0.5)]';
  }
  return 'border studio-free-avatar-flash';
}

/** Header FREE / PRO / YEARLY pill — original contrast (white type on solid fills). */
export function studioHeaderBadgeClass(
  chrome?: StudioNameChrome | null,
  yearly?: boolean
): string {
  if (chrome === 'pro') {
    return yearly
      ? 'bg-accent text-white border-accent/20'
      : 'bg-primary text-white border-primary-foreground/20';
  }
  return 'bg-orange-500 text-white border-orange-600';
}

/** Only the header dropdown "Studio Tier" row flashes for Visitor. */
export function studioTierMenuClass(chrome?: StudioNameChrome | null): string {
  if (chrome === 'pro') return STUDIO_PRO_NAME_CLASS;
  return 'studio-free-tier-flash';
}

export function studioCurrentPlanRingClass(chrome?: StudioNameChrome | null): string {
  if (chrome === 'pro') return 'ring-4 ring-accent/35';
  if (chrome === 'free') return 'ring-4 ring-[rgb(125,211,252)]/40';
  return '';
}
