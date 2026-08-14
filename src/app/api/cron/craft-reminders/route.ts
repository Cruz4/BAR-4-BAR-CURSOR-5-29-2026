import { NextResponse } from 'next/server';
import { runCraftReminders } from '@/lib/server/craft-reminders';

export const runtime = 'nodejs';
export const maxDuration = 120;

/** Cloud Scheduler: Authorization: Bearer $CRON_SECRET — evening run recommended. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 });
  }

  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runCraftReminders();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('[cron/craft-reminders]', err);
    return NextResponse.json({ error: 'Craft reminders failed' }, { status: 500 });
  }
}
