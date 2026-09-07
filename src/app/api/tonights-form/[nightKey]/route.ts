import { NextResponse } from 'next/server';
import { getTonightsFormByNightKey } from '@/lib/server/tonights-form';

export const runtime = 'nodejs';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ nightKey: string }> }
) {
  try {
    const { nightKey } = await params;
    const key = (nightKey || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) {
      return NextResponse.json({ error: 'Invalid form date.' }, { status: 400 });
    }
    const { searchParams } = new URL(req.url);
    const userId = (searchParams.get('userId') || '').trim() || undefined;
    const form = await getTonightsFormByNightKey(key, userId);
    if (!form) {
      return NextResponse.json({ error: 'Form not found.' }, { status: 404 });
    }
    return NextResponse.json(form);
  } catch (error) {
    console.error('[tonights-form/[nightKey] GET]', error);
    return NextResponse.json({ error: 'Could not load form.' }, { status: 500 });
  }
}
