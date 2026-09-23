import 'server-only';

import { getAuth } from '@/lib/firebase/server';

export async function requireBearerUid(request: Request): Promise<string> {
  const header = request.headers.get('authorization') || '';
  if (!header.startsWith('Bearer ')) {
    throw new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  const auth = await getAuth();
  const decoded = await auth.verifyIdToken(header.slice('Bearer '.length).trim());
  return decoded.uid;
}

export async function requireCompanionDeviceToken(
  request: Request
): Promise<{ uid: string; deviceId: string }> {
  const deviceId = request.headers.get('x-render-device-id')?.trim();
  const token = request.headers.get('x-render-device-token')?.trim();
  const header = request.headers.get('authorization') || '';
  if (!deviceId || !token || !header.startsWith('Bearer ')) {
    throw new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  const auth = await getAuth();
  const decoded = await auth.verifyIdToken(header.slice('Bearer '.length).trim());
  return { uid: decoded.uid, deviceId };
}
