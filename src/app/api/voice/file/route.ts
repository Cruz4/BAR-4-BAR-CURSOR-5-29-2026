import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/firebase/server';
import { streamDropAudioFile } from '@/lib/server/drop-audio-stream';
import { isSafeVoiceStoragePath } from '@/lib/audio-mime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function uidFromRequest(req: Request, tokenParam: string): Promise<string | null> {
  const header = req.headers.get('authorization');
  const raw = header?.startsWith('Bearer ')
    ? header.slice('Bearer '.length).trim()
    : tokenParam.trim();
  if (!raw) return null;
  try {
    const auth = await getAuth();
    const decoded = await auth.verifyIdToken(raw);
    return decoded.uid;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const path = (searchParams.get('path') || '').trim();
  const token = searchParams.get('token') || '';
  if (!isSafeVoiceStoragePath(path)) {
    return NextResponse.json({ error: 'Invalid voice path.' }, { status: 400 });
  }

  if (path.startsWith('sheet-takes/')) {
    const uid = await uidFromRequest(req, token);
    const ownerId = path.split('/')[1] || '';
    if (!uid || uid !== ownerId) {
      return NextResponse.json({ error: 'Sign in to play this take.' }, { status: 401 });
    }
  }

  const ctype = (searchParams.get('ctype') || '').trim();
  try {
    return await streamDropAudioFile(path, req.headers.get('range'), ctype || undefined);
  } catch (err) {
    console.error('[voice/file]', err);
    return NextResponse.json({ error: 'Could not stream this recording.' }, { status: 500 });
  }
}
