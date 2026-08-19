import { NextResponse } from 'next/server';
import { UploadAuthError, verifyUploadRequest } from '@/lib/server/upload-auth';
import { completeUploadTicket } from '@/lib/server/upload-gate';

export const runtime = 'nodejs';

/** Mark an upload ticket consumed after Storage write succeeds. */
export async function POST(req: Request) {
  try {
    const { uid } = await verifyUploadRequest(req);
    const body = await req.json().catch(() => ({}));
    const ticketId = typeof body.ticketId === 'string' ? body.ticketId.trim() : '';
    if (!ticketId) {
      return NextResponse.json({ error: 'Missing upload ticket.' }, { status: 400 });
    }

    await completeUploadTicket(uid, ticketId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UploadAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : 'Could not finalize upload.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
