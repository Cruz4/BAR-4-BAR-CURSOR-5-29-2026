import { NextResponse } from 'next/server';
import { isFirstDropsEnabled } from '@/lib/server/first-drops-feature';
import { streamDropAudioFile, verifyDropAudioTicket } from '@/lib/server/drop-audio-stream';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  if (!(await isFirstDropsEnabled())) {
    return NextResponse.json({ error: 'First Drops is off' }, { status: 404 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const ticket = (searchParams.get('t') || '').trim();
    if (!ticket) return NextResponse.json({ error: 'Missing stream ticket.' }, { status: 400 });

    const payload = verifyDropAudioTicket(ticket);
    return await streamDropAudioFile(payload.p, req.headers.get('range'), payload.c);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Stream failed';
    const expired = message.toLowerCase().includes('expired') || message.toLowerCase().includes('ticket');
    console.error('[drops/audio/file]', err);
    return NextResponse.json({ error: message }, { status: expired ? 401 : 500 });
  }
}
