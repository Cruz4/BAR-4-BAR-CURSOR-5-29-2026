import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/firebase/server';
import {
  createShareCampaign,
  resolveShareCampaign,
  ShareAttributionError,
} from '@/lib/server/share-attribution';
import type { ShareCampaignKind } from '@/lib/share-attribution';
import { isSafeShareTargetPath } from '@/lib/share-attribution';

export const runtime = 'nodejs';

async function uidFromRequest(req: Request): Promise<string | null> {
  const header = req.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  try {
    const decoded = await (await getAuth()).verifyIdToken(header.slice('Bearer '.length));
    return decoded.uid;
  } catch {
    return null;
  }
}

/** GET /api/share/campaign?code= — resolve opaque campaign (no auth). */
export async function GET(req: Request) {
  try {
    const code = new URL(req.url).searchParams.get('code');
    if (!code) {
      return NextResponse.json({ error: 'Missing code' }, { status: 400 });
    }
    const campaign = await resolveShareCampaign(code);
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }
    return NextResponse.json({ campaign });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Resolve failed';
    console.error('[share/campaign GET]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** POST /api/share/campaign — mint campaign (auth, sharing===v2). */
export async function POST(req: Request) {
  try {
    const uid = await uidFromRequest(req);
    if (!uid) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const kind: ShareCampaignKind | null =
      body.kind === 'release' || body.kind === 'profile' || body.kind === 'achievement'
        ? body.kind
        : null;
    const targetPath = typeof body.targetPath === 'string' ? body.targetPath.trim() : '';
    if (!kind || !isSafeShareTargetPath(targetPath)) {
      return NextResponse.json({ error: 'Invalid campaign payload' }, { status: 400 });
    }

    const campaign = await createShareCampaign({
      ownerId: uid,
      kind,
      targetPath,
      title: typeof body.title === 'string' ? body.title : undefined,
      channel: typeof body.channel === 'string' ? body.channel : undefined,
    });

    return NextResponse.json({
      campaign: {
        code: campaign.code,
        kind: campaign.kind,
        targetPath: campaign.targetPath,
        title: campaign.title,
        channel: campaign.channel,
      },
    });
  } catch (error) {
    if (error instanceof ShareAttributionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : 'Create failed';
    console.error('[share/campaign POST]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
