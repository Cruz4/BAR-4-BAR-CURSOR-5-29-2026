import { NextResponse } from 'next/server';
import { AdminAuthError, verifyAdminRequest } from '@/lib/server/admin-auth';
import {
  getProductSurfaces,
  setProductSurfaces,
} from '@/lib/server/product-surfaces';
import { parseProductSurfacesPatch } from '@/lib/product-surface-modes';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    await verifyAdminRequest(req);
    return NextResponse.json(await getProductSurfaces());
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('[admin/product-surfaces GET]', error);
    return NextResponse.json({ error: 'Failed to load product surfaces' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = await verifyAdminRequest(req);
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const parsed = parseProductSurfacesPatch(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    return NextResponse.json(await setProductSurfaces(parsed.patch, admin.uid));
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('[admin/product-surfaces POST]', error);
    const message = error instanceof Error ? error.message : 'Failed to save product surfaces';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
