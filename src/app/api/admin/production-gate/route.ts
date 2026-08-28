import { NextResponse } from 'next/server';
import { spawnSync } from 'child_process';
import path from 'path';
import { AdminAuthError, verifyAdminRequest } from '@/lib/server/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await verifyAdminRequest(req);
    const root = process.cwd();
    const result = spawnSync('node', [path.join(root, 'scripts', 'production-gate.mjs')], {
      cwd: root,
      encoding: 'utf8',
      shell: false,
      env: process.env,
    });
    const reportPath = path.join(root, 'docs', 'PRODUCTION_GATE_REPORT.json');
    let report: unknown = null;
    try {
      const fs = await import('fs');
      if (fs.existsSync(reportPath)) {
        report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      }
    } catch {
      report = null;
    }
    if (!report) {
      return NextResponse.json(
        {
          error: 'Gate did not produce a report.',
          detail: `${result.stdout || ''}${result.stderr || ''}`.slice(0, 1200),
        },
        { status: 500 }
      );
    }
    return NextResponse.json(report);
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('[admin/production-gate]', error);
    return NextResponse.json({ error: 'Production gate failed.' }, { status: 500 });
  }
}
