import type { User } from '@/lib/types';
import { isProOrTrial } from '@/lib/subscription';
import {
  isStudioMaxUser,
  type SubscriptionProduct,
} from '@/lib/subscription-products';

export type RenderTier = 'visitor' | 'pro_writer' | 'studio_max';

export function resolveRenderTier(
  user: Pick<User, 'subscriptionStatus' | 'subscriptionTier' | 'subscriptionProduct' | 'proFeaturePreviewExpiresAt'> | null
): RenderTier {
  if (isStudioMaxUser(user)) return 'studio_max';
  if (isProOrTrial(user)) return 'pro_writer';
  return 'visitor';
}

export const APPROVED_GENERATED_TAKE_LIMITS: Record<RenderTier, number> = {
  visitor: 6,
  pro_writer: 60,
  studio_max: 600,
};

export const LOCAL_RENDER_MONTHLY_CAPS: Record<RenderTier, number> = {
  visitor: 2,
  pro_writer: 25,
  studio_max: 500,
};

export const CLOUD_RENDER_MONTHLY_CAPS: Record<RenderTier, number> = {
  visitor: 0,
  pro_writer: 0,
  studio_max: 20,
};

export const CLOUD_MASTER_EXPORT_MONTHLY: Record<RenderTier, number> = {
  visitor: 2,
  pro_writer: 20,
  studio_max: 40,
};

export const MAX_UNAPPROVED_VARIANTS_PER_TRACK = 8;

export const ARTIST_SIGNATURE_LIMITS: Record<RenderTier, number> = {
  visitor: 0,
  pro_writer: 2,
  studio_max: 10,
};

export const VOICE_MATCH_LIMITS: Record<RenderTier, number> = {
  visitor: 0,
  pro_writer: 0,
  studio_max: 3,
};

export function canAccessSongGeneration(
  user: Pick<User, 'subscriptionStatus' | 'subscriptionProduct' | 'proFeaturePreviewExpiresAt'> | null,
  surfaceEnabled: boolean
): boolean {
  if (!surfaceEnabled) return false;
  return isStudioMaxUser(user);
}

export function subscriptionProductLabel(product?: SubscriptionProduct): string {
  if (product === 'max') return 'Studio Max';
  if (product === 'writer') return 'Pro Writer';
  return 'Visitor';
}
