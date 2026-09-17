import { NextResponse } from 'next/server';
import { UploadAuthError, verifyUploadRequest } from '@/lib/server/upload-auth';
import { issueUploadTicket } from '@/lib/server/upload-gate';
import { checkRateLimit } from '@/lib/server/rate-limit';
import type { UploadKind } from '@/lib/upload-gate-types';

export const runtime = 'nodejs';

const TICKET_MAX_PER_WINDOW = 30;
const TICKET_WINDOW_MS = 60 * 1000;

const KINDS = new Set<UploadKind>([
  'wall_image',
  'wall_video',
  'voice',
  'drop_audio',
  'sheet_take',
  'profile_preview',
  'fold_image',
  'fold_voice',
]);

/** Issue a short-lived upload ticket after quota + App Check gates. */
export async function POST(req: Request) {
  try {
    const { uid } = await verifyUploadRequest(req);
    const { allowed, retryAfterMs } = await checkRateLimit(`upload-ticket:${uid}`, TICKET_MAX_PER_WINDOW, TICKET_WINDOW_MS);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many upload attempts. Wait a moment and try again.' },
        { status: 429, headers: retryAfterMs ? { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) } : undefined }
      );
    }

    const body = await req.json().catch(() => ({}));
    const kind = typeof body.kind === 'string' ? body.kind : '';
    if (!KINDS.has(kind as UploadKind)) {
      return NextResponse.json({ error: 'Invalid upload kind.' }, { status: 400 });
    }

    const storagePath = typeof body.storagePath === 'string' ? body.storagePath.trim() : '';
    const byteSize = Number(body.byteSize);
    const contentType = typeof body.contentType === 'string' ? body.contentType.trim() : '';
    const companionPath = typeof body.companionPath === 'string' ? body.companionPath.trim() : undefined;
    const companionByteSize =
      body.companionByteSize != null ? Number(body.companionByteSize) : undefined;

    const ticket = await issueUploadTicket({
      uid,
      kind: kind as UploadKind,
      storagePath,
      byteSize,
      contentType,
      companionPath,
      companionByteSize,
    });

    return NextResponse.json(ticket);
  } catch (err) {
    if (err instanceof UploadAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : 'Upload ticket failed.';
    const status = message.includes('limit reached') ? 429 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
