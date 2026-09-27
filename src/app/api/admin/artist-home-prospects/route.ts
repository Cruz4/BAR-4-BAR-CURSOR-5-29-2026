import { NextResponse } from 'next/server';
import { AdminAuthError, verifyAdminRequest } from '@/lib/server/admin-auth';
import { hasAdminFirestoreCredentials } from '@/lib/firebase/server';
import {
  createArtistHomeProspect,
  listArtistHomeProspects,
} from '@/lib/server/artist-home-prospects';
import { getPublicAppUrl } from '@/lib/app-url';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    await verifyAdminRequest(req);
    if (!hasAdminFirestoreCredentials()) {
      return NextResponse.json({ prospects: [] });
    }
    const prospects = await listArtistHomeProspects();
    return NextResponse.json({ prospects });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to list prospects' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = await verifyAdminRequest(req);
    if (!hasAdminFirestoreCredentials()) {
      return NextResponse.json({ error: 'Firebase Admin required' }, { status: 503 });
    }
    const body = await req.json();
    const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : '';
    if (!displayName) {
      return NextResponse.json({ error: 'Display name is required.' }, { status: 400 });
    }
    const { record, claimSecret } = await createArtistHomeProspect({
      displayName,
      slug: typeof body.slug === 'string' ? body.slug : undefined,
      inviteEmails: Array.isArray(body.inviteEmails) ? body.inviteEmails : undefined,
      contactLabel: typeof body.contactLabel === 'string' ? body.contactLabel : undefined,
      internalNotes: typeof body.internalNotes === 'string' ? body.internalNotes : undefined,
      createdByAdminUid: admin.uid,
    });
    const base = getPublicAppUrl().replace(/\/$/, '');
    return NextResponse.json({
      prospect: record,
      claimSecret,
      draftPreviewUrl: `${base}/invite/home/${record.viewToken}`,
      publishedPreviewUrl: `${base}/${record.slug}`,
      claimUrl: `${base}/${record.slug}?claim=${encodeURIComponent(claimSecret)}`,
    });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : 'Failed to create prospect';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
