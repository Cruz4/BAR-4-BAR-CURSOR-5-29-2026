import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/firebase/server';
import { getDb } from '@/lib/firebase/server';
import { getMasterAdminEmail } from '@/lib/master-admin';
import { MODERATION_REPORT_REASONS, type ModerationReportPayload } from '@/lib/moderation-report';
import { sendStudioEmail } from '@/lib/server/mail/mailer';
import { getPublicAppUrl } from '@/lib/app-url';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const header = req.headers.get('authorization');
    if (!header?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Sign in to report' }, { status: 401 });
    }
    const decoded = await (await getAuth()).verifyIdToken(header.slice('Bearer '.length));
    const body = (await req.json()) as Partial<ModerationReportPayload>;
    const targetKind = body.targetKind === 'user' ? 'user' : body.targetKind === 'post' ? 'post' : null;
    const targetId = typeof body.targetId === 'string' ? body.targetId.trim() : '';
    const reasonId = typeof body.reasonId === 'string' ? body.reasonId.trim() : '';
    const detail = typeof body.detail === 'string' ? body.detail.trim().slice(0, 2000) : '';
    const contextUrl = typeof body.contextUrl === 'string' ? body.contextUrl.trim().slice(0, 500) : '';
    if (!targetKind || !targetId || !reasonId) {
      return NextResponse.json({ error: 'Missing report fields' }, { status: 400 });
    }
    if (!MODERATION_REPORT_REASONS.some((r) => r.id === reasonId)) {
      return NextResponse.json({ error: 'Invalid reason' }, { status: 400 });
    }
    if (reasonId === 'other' && detail.length < 8) {
      return NextResponse.json({ error: 'Add a short description' }, { status: 400 });
    }

    const reasonLabel =
      MODERATION_REPORT_REASONS.find((r) => r.id === reasonId)?.label || reasonId;
    const db = await getDb();
    const doc = {
      reporterId: decoded.uid,
      reporterEmail: decoded.email || '',
      targetKind,
      targetId,
      ...(body.targetUserId ? { targetUserId: String(body.targetUserId).slice(0, 128) } : {}),
      ...(body.targetUserName ? { targetUserName: String(body.targetUserName).slice(0, 120) } : {}),
      reasonId,
      reasonLabel,
      ...(detail ? { detail } : {}),
      ...(contextUrl ? { contextUrl } : {}),
      status: 'new',
      createdAt: new Date().toISOString(),
    };
    const ref = await db.collection('moderation_reports').add(doc);

    const adminEmail = getMasterAdminEmail();
    const appUrl = getPublicAppUrl();
    const subject = `[AKAsheet] ${targetKind === 'post' ? 'Post' : 'User'} report · ${reasonLabel}`;
    const html = `
      <p><strong>New moderation report</strong></p>
      <p>Kind: ${targetKind}<br/>
      Target id: ${targetId}<br/>
      ${body.targetUserName ? `Reported: ${body.targetUserName}<br/>` : ''}
      Reason: ${reasonLabel}<br/>
      ${detail ? `Detail: ${detail}<br/>` : ''}
      ${contextUrl ? `Context: <a href="${contextUrl}">${contextUrl}</a><br/>` : ''}
      Reporter: ${decoded.email || decoded.uid}<br/>
      Report doc: ${ref.id}</p>
      <p><a href="${appUrl}/admin">Open admin</a></p>
    `;
    await sendStudioEmail({
      to: adminEmail,
      subject,
      html,
      text: `${subject}\n${targetKind} ${targetId}\n${detail || reasonLabel}`,
    }).catch(() => undefined);

    return NextResponse.json({ ok: true, id: ref.id });
  } catch (err) {
    console.error('[moderation/report]', err);
    return NextResponse.json({ error: 'Could not submit report' }, { status: 500 });
  }
}
