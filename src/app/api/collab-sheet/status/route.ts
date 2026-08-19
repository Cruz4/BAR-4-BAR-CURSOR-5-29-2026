import { NextResponse } from 'next/server';
import { getCollabSheetPublicStatus } from '@/lib/server/collab-sheet-feature';

export const runtime = 'nodejs';

export async function GET() {
  const status = await getCollabSheetPublicStatus();
  return NextResponse.json(status);
}
