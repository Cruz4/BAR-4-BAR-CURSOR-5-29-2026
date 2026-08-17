import 'server-only';

import { createHmac, timingSafeEqual } from 'crypto';
import { Readable } from 'node:stream';
import { NextResponse } from 'next/server';
import { getAdminBucket } from '@/lib/firebase/server';
import { DROP_AUDIO_MAX_BYTES } from '@/lib/drop-commerce';
import { headerAudioContentType } from '@/lib/audio-mime';

const TICKET_TTL_MS = {
  preview: 12 * 60 * 1000,
  full: 30 * 60 * 1000,
};

type DropAudioTicketPayload = {
  p: string;
  c: string;
  f: 0 | 1;
  e: number;
};

function ticketSecret(): string {
  return (
    process.env.DROP_AUDIO_STREAM_SECRET?.trim() ||
    process.env.INVITE_GATE_SECRET?.trim() ||
    process.env.STRIPE_WEBHOOK_SECRET?.trim()?.slice(0, 32) ||
    'b4b-dev-drop-audio-secret-change-me'
  );
}

export function isSafeDropStoragePath(path: string): boolean {
  if (!path.startsWith('drops/')) return false;
  if (path.includes('..') || path.includes('\\') || path.includes('\0')) return false;
  if (path.length > 500) return false;
  return true;
}

function signPayload(payloadB64: string): string {
  return createHmac('sha256', ticketSecret()).update(payloadB64).digest('base64url');
}

export function mintDropAudioTicket(input: {
  storagePath: string;
  contentType: string;
  full: boolean;
}): string {
  if (!isSafeDropStoragePath(input.storagePath)) {
    throw new Error('Invalid audio path.');
  }
  const payload: DropAudioTicketPayload = {
    p: input.storagePath,
    c: input.contentType || 'application/octet-stream',
    f: input.full ? 1 : 0,
    e: Date.now() + (input.full ? TICKET_TTL_MS.full : TICKET_TTL_MS.preview),
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${payloadB64}.${signPayload(payloadB64)}`;
}

export function dropAudioFileUrl(ticket: string): string {
  return `/api/drops/audio/file?t=${encodeURIComponent(ticket)}`;
}

export function verifyDropAudioTicket(raw: string): DropAudioTicketPayload {
  const token = raw.trim();
  const dot = token.lastIndexOf('.');
  if (dot <= 0) throw new Error('Invalid stream ticket.');
  const payloadB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = signPayload(payloadB64);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error('Invalid stream ticket.');
  }
  const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as DropAudioTicketPayload;
  if (!payload?.p || typeof payload.e !== 'number') throw new Error('Invalid stream ticket.');
  if (Date.now() > payload.e) throw new Error('Stream expired. Play again.');
  if (!isSafeDropStoragePath(payload.p)) throw new Error('Invalid audio path.');
  return payload;
}

function parseRange(
  header: string | null,
  size: number
): { start: number; end: number } | { unsatisfiable: true } | null {
  if (!header || size <= 0) return null;
  const m = /^bytes=(\d*)-(\d*)$/i.exec(header.trim());
  if (!m) return null;
  const startRaw = m[1];
  const endRaw = m[2];
  if (startRaw === '' && endRaw === '') return null;
  if (startRaw === '') {
    const suffix = Number(endRaw);
    if (!Number.isFinite(suffix) || suffix <= 0) return { unsatisfiable: true };
    const start = Math.max(0, size - suffix);
    return { start, end: size - 1 };
  }
  const start = Number(startRaw);
  const end = endRaw === '' ? size - 1 : Number(endRaw);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= size) {
    return { unsatisfiable: true };
  }
  return { start, end: Math.min(end, size - 1) };
}

export async function streamDropAudioFile(
  storagePath: string,
  rangeHeader: string | null,
  contentTypeHint?: string
): Promise<Response> {
  const file = getAdminBucket().file(storagePath);
  const [exists] = await file.exists();
  if (!exists) {
    return NextResponse.json({ error: 'Audio is gone.' }, { status: 404 });
  }

  const [metadata] = await file.getMetadata();
  const size = Number(metadata.size || 0);
  if (!Number.isFinite(size) || size <= 0) {
    return NextResponse.json({ error: 'Audio is empty.' }, { status: 404 });
  }
  if (size > DROP_AUDIO_MAX_BYTES) {
    return NextResponse.json({ error: 'Audio is too large to stream.' }, { status: 413 });
  }

  const contentType = headerAudioContentType(
    contentTypeHint ||
      (typeof metadata.contentType === 'string' ? metadata.contentType : '') ||
      'application/octet-stream'
  );

  const parsed = parseRange(rangeHeader, size);
  if (parsed && 'unsatisfiable' in parsed) {
    return new NextResponse(null, {
      status: 416,
      headers: {
        'Content-Range': `bytes */${size}`,
        'Accept-Ranges': 'bytes',
      },
    });
  }

  const start = parsed?.start ?? 0;
  const end = parsed?.end ?? size - 1;
  const chunkSize = end - start + 1;
  const nodeStream = file.createReadStream({ start, end });
  const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;

  const headers: Record<string, string> = {
    'Content-Type': contentType,
    'Content-Length': String(chunkSize),
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'private, max-age=60, no-transform',
    'X-Content-Type-Options': 'nosniff',
  };
  if (parsed) {
    headers['Content-Range'] = `bytes ${start}-${end}/${size}`;
  }

  return new NextResponse(webStream, {
    status: parsed ? 206 : 200,
    headers,
  });
}
