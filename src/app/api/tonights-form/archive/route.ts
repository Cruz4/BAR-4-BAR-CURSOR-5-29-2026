import { NextResponse } from 'next/server';
import { listTonightsFormArchive } from '@/lib/server/tonights-form';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get('limit') || 12);
    const entries = await listTonightsFormArchive(limit);
    return NextResponse.json({ entries });
  } catch (error) {
    console.error('[tonights-form/archive GET]', error);
    return NextResponse.json({ error: 'Could not load archive.' }, { status: 500 });
  }
}
