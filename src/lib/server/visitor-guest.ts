import 'server-only';

import { normalizeGuestId } from '@/lib/guest-identity';
import { clientIpFromRequest, hashVisitorIp } from '@/lib/server/visit-fingerprint';

/** Stable anonymous id for reach ticks when localStorage guest id is missing. */
export function resolveVisitorGuestId(req: Request, bodyGuest: unknown): string | null {
  const fromBody = normalizeGuestId(bodyGuest);
  if (fromBody) return fromBody;
  const ip = clientIpFromRequest(req);
  const hash = hashVisitorIp(ip);
  if (!hash) return null;
  const compact = hash.replace(/[^a-f0-9]/gi, '').slice(0, 48);
  return compact.length >= 8 ? `iph_${compact}` : null;
}
