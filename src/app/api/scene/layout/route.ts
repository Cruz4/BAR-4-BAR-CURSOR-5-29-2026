import { NextResponse } from 'next/server';
import { getSceneLayoutPublicStatus } from '@/lib/server/scene-layout';
import { SCENE_PORTAL_HUB_DEFAULT_ENABLED } from '@/lib/scene/portal-hub-config';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const status = await getSceneLayoutPublicStatus();
    return NextResponse.json(status, {
      headers: {
        'Cache-Control': 'public, max-age=0, s-maxage=5, stale-while-revalidate=10',
      },
    });
  } catch (error) {
    console.error('[scene/layout]', error);
    return NextResponse.json({
      portalHubEnabled: SCENE_PORTAL_HUB_DEFAULT_ENABLED,
      source: 'default_portal',
      updatedAt: null,
    });
  }
}
