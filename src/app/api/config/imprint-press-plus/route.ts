import { NextResponse } from 'next/server';
import { isImprintPressPlusEnabled } from '@/lib/server/imprint-press-plus-feature';

export const runtime = 'nodejs';

/** Public read — whether expanded imprint layers are active. */
export async function GET() {
  try {
    const enabled = await isImprintPressPlusEnabled();
    return NextResponse.json({ enabled });
  } catch (err) {
    console.error('[config/imprint-press-plus]', err);
    return NextResponse.json({ enabled: false });
  }
}
