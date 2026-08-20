import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/firebase/server';
import { isValidDeviceSessionId } from '@/lib/device-sessions';
import {
  DeviceSessionAuthError,
  endDeviceSession,
  listDeviceSessions,
  revokeAllDeviceSessions,
  revokeDeviceSession,
  setDeviceSessionRevocationCutoff,
  touchDeviceSession,
  verifyDeviceSessionRequest,
} from '@/lib/server/device-sessions';

export const runtime = 'nodejs';

function authError(error: unknown) {
  if (error instanceof DeviceSessionAuthError) {
    return NextResponse.json(
      { error: error.message, code: 'AUTH_SESSION_ENDED' },
      { status: 401 }
    );
  }
  return null;
}

export async function GET(req: Request) {
  try {
    const decoded = await verifyDeviceSessionRequest(req);
    const currentSessionId = req.headers.get('x-ba-device-session') || '';
    if (!isValidDeviceSessionId(currentSessionId)) {
      return NextResponse.json({ error: 'Invalid device session.' }, { status: 400 });
    }
    const sessions = await listDeviceSessions(decoded.uid, currentSessionId);
    return NextResponse.json({ sessions });
  } catch (error) {
    const response = authError(error);
    if (response) return response;
    console.error('[account/sessions:get]', error);
    return NextResponse.json({ error: 'Could not load signed-in devices.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const decoded = await verifyDeviceSessionRequest(req);
    const body = await req.json().catch(() => ({}));
    const sessionId = body?.sessionId;
    if (!isValidDeviceSessionId(sessionId)) {
      return NextResponse.json({ error: 'Invalid device session.' }, { status: 400 });
    }

    const session = await touchDeviceSession({
      decoded,
      sessionId,
      userAgent: req.headers.get('user-agent') || '',
    });
    if (!session) {
      return NextResponse.json(
        { error: 'This device was signed out.', code: 'DEVICE_SESSION_REVOKED' },
        { status: 403 }
      );
    }
    return NextResponse.json({ session });
  } catch (error) {
    const response = authError(error);
    if (response) return response;
    console.error('[account/sessions:post]', error);
    return NextResponse.json({ error: 'Could not register this device.' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const decoded = await verifyDeviceSessionRequest(req);
    const body = await req.json().catch(() => ({}));
    const currentSessionId = body?.currentSessionId;
    const action = body?.action;
    if (!isValidDeviceSessionId(currentSessionId)) {
      return NextResponse.json({ error: 'Invalid current device session.' }, { status: 400 });
    }

    if (action === 'end-current') {
      await endDeviceSession(decoded.uid, currentSessionId);
      return NextResponse.json({ ok: true });
    }

    if (action === 'revoke-one') {
      const revoked = await revokeDeviceSession({
        userId: decoded.uid,
        targetSessionId: body?.targetSessionId,
        currentSessionId,
      });
      if (!revoked) {
        return NextResponse.json({ error: 'Device session was not found.' }, { status: 404 });
      }
      return NextResponse.json({ ok: true, revoked: 1 });
    }

    if (action === 'revoke-others') {
      const revoked = await revokeAllDeviceSessions({
        userId: decoded.uid,
        currentSessionId,
        includeCurrent: false,
      });
      return NextResponse.json({ ok: true, revoked });
    }

    if (action === 'revoke-all') {
      await setDeviceSessionRevocationCutoff(decoded.uid);
      const revoked = await revokeAllDeviceSessions({
        userId: decoded.uid,
        currentSessionId,
        includeCurrent: true,
      });
      const auth = await getAuth();
      await auth.revokeRefreshTokens(decoded.uid);
      return NextResponse.json({ ok: true, revoked });
    }

    return NextResponse.json({ error: 'Unknown session action.' }, { status: 400 });
  } catch (error) {
    const response = authError(error);
    if (response) return response;
    console.error('[account/sessions:patch]', error);
    return NextResponse.json({ error: 'Could not update signed-in devices.' }, { status: 500 });
  }
}
