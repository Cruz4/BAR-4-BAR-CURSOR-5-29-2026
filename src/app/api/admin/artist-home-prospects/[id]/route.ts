import { NextResponse } from 'next/server';
import { AdminAuthError, verifyAdminRequest } from '@/lib/server/admin-auth';
import { hasAdminFirestoreCredentials } from '@/lib/firebase/server';
import {
  getArtistHomeProspectById,
  publishArtistHomeProspect,
  regenerateProspectClaimSecret,
  unpublishArtistHomeProspect,
  updateArtistHomeProspect,
} from '@/lib/server/artist-home-prospects';
import { getPublicAppUrl } from '@/lib/app-url';

export const runtime = 'nodejs';

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: RouteCtx) {
  try {
    await verifyAdminRequest(req);
    if (!hasAdminFirestoreCredentials()) {
      return NextResponse.json({ error: 'Firebase Admin required' }, { status: 503 });
    }
    const { id } = await params;
    const prospect = await getArtistHomeProspectById(id);
    if (!prospect) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const base = getPublicAppUrl().replace(/\/$/, '');
    return NextResponse.json({
      prospect,
      draftPreviewUrl: `${base}/invite/home/${prospect.viewToken}`,
      publishedPreviewUrl: `${base}/${prospect.slug}`,
    });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to load prospect' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: RouteCtx) {
  try {
    await verifyAdminRequest(req);
    if (!hasAdminFirestoreCredentials()) {
      return NextResponse.json({ error: 'Firebase Admin required' }, { status: 503 });
    }
    const { id } = await params;
    const body = await req.json();
    const prospect = await updateArtistHomeProspect(id, {
      displayName: typeof body.displayName === 'string' ? body.displayName : undefined,
      slug: typeof body.slug === 'string' ? body.slug : undefined,
      status: body.status,
      inviteEmails: Array.isArray(body.inviteEmails) ? body.inviteEmails : undefined,
      artistHome: body.artistHome,
      wallPosts: Array.isArray(body.wallPosts) ? body.wallPosts : undefined,
      profilePhotoUrl: body.profilePhotoUrl,
      profilePhotoMode: body.profilePhotoMode,
      internalNotes: typeof body.internalNotes === 'string' ? body.internalNotes : undefined,
      contactLabel: typeof body.contactLabel === 'string' ? body.contactLabel : undefined,
      markSent: Boolean(body.markSent),
    });
    return NextResponse.json({ prospect });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : 'Failed to update prospect';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(req: Request, { params }: RouteCtx) {
  try {
    await verifyAdminRequest(req);
    if (!hasAdminFirestoreCredentials()) {
      return NextResponse.json({ error: 'Firebase Admin required' }, { status: 503 });
    }
    const { id } = await params;
    const body = await req.json();
    const action = typeof body.action === 'string' ? body.action : '';

    if (action === 'publish') {
      const prospect = await publishArtistHomeProspect(id);
      const base = getPublicAppUrl().replace(/\/$/, '');
      return NextResponse.json({
        prospect,
        publishedPreviewUrl: `${base}/${prospect.slug}`,
      });
    }
    if (action === 'unpublish') {
      const prospect = await unpublishArtistHomeProspect(id);
      return NextResponse.json({ prospect });
    }
    if (action === 'regenerate_claim_secret') {
      const { claimSecret } = await regenerateProspectClaimSecret(id);
      const prospect = await getArtistHomeProspectById(id);
      const base = getPublicAppUrl().replace(/\/$/, '');
      return NextResponse.json({
        claimSecret,
        claimUrl: prospect
          ? `${base}/${prospect.slug}?claim=${encodeURIComponent(claimSecret)}`
          : null,
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : 'Action failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
