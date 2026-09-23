import { NextResponse } from 'next/server';
import { getProductSurfacesPublicStatus } from '@/lib/server/product-surfaces';
import { PRODUCT_SURFACES_DEFAULTS } from '@/lib/product-surface-modes';
import { isDevSongGenUiOverrideEnabled } from '@/lib/server/render/dev-worker';

export const runtime = 'nodejs';

/** Public product-surface modes — no admin identity / secrets. */
export async function GET() {
  try {
    const status = await getProductSurfacesPublicStatus();
    const body =
      process.env.NODE_ENV === 'development' && isDevSongGenUiOverrideEnabled()
        ? { ...status, devSongGenerationWorkbench: true }
        : status;
    return NextResponse.json(body, {
      headers: {
        'Cache-Control': 'public, max-age=0, s-maxage=5, stale-while-revalidate=10',
      },
    });
  } catch (error) {
    console.error('[product-surfaces]', error);
    return NextResponse.json({
      ...PRODUCT_SURFACES_DEFAULTS,
      source: 'default',
      updatedAt: null,
    });
  }
}
