#!/usr/bin/env node
/**
 * production:gate — Pass / Warning / Blocked readiness report for Bar 4 Bar.
 * Runs local verify scripts + static checks. Does not mutate production data.
 */

import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** @typedef {'pass' | 'warning' | 'blocked'} GateStatus */

/** @type {{ id: string; label: string; status: GateStatus; detail: string }[]} */
const findings = [];

function add(id, label, status, detail) {
  findings.push({ id, label, status, detail });
}

function fileExists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function runNpm(script) {
  const result = spawnSync('npm', ['run', script, '--silent'], {
    cwd: root,
    encoding: 'utf8',
    shell: true,
  });
  return {
    ok: result.status === 0,
    out: `${result.stdout || ''}${result.stderr || ''}`.trim().slice(0, 800),
  };
}

add(
  'firestore_rules',
  'Security · Firestore rules present',
  fileExists('firestore.rules') ? 'pass' : 'blocked',
  fileExists('firestore.rules') ? 'firestore.rules found' : 'Missing firestore.rules'
);
add(
  'storage_rules',
  'Security · Storage rules present',
  fileExists('storage.rules') ? 'pass' : 'blocked',
  fileExists('storage.rules') ? 'storage.rules found' : 'Missing storage.rules'
);
add(
  'security_doc',
  'Privacy · SECURITY.md',
  fileExists('docs/SECURITY.md') ? 'pass' : 'warning',
  fileExists('docs/SECURITY.md') ? 'docs/SECURITY.md present' : 'Add docs/SECURITY.md'
);

{
  const fee = runNpm('verify:drop-fee-preview');
  add(
    'fee_preview',
    'Payments · Fee tiers + artist net (Stripe not deducted)',
    fee.ok ? 'pass' : 'blocked',
    fee.ok ? 'verify:drop-fee-preview passed' : fee.out || 'verify:drop-fee-preview failed'
  );
}

{
  const counters = runNpm('verify:release-counters');
  add(
    'release_counters',
    'Discovery · Release counters',
    counters.ok ? 'pass' : 'blocked',
    counters.ok ? 'verify:release-counters passed' : counters.out || 'verify:release-counters failed'
  );
}

{
  const rel = runNpm('verify:release-management');
  add(
    'release_management',
    'Releases · Management invariants',
    rel.ok ? 'pass' : 'warning',
    rel.ok ? 'verify:release-management passed' : rel.out || 'verify:release-management failed'
  );
}

add(
  'product_surfaces',
  'Remote controls · Product surface modes',
  fileExists('src/lib/product-surface-modes.ts') && fileExists('src/lib/server/product-surfaces.ts')
    ? 'pass'
    : 'blocked',
  'config/productSurfaces + emergency modes'
);

add(
  'ceo_spec',
  'Analytics · CEO funnel spec (Phase 0)',
  fileExists('docs/CEO_FUNNEL_AUDIT_AND_DASHBOARD_SPEC.md') ? 'pass' : 'warning',
  'Accept Phase 0 before enabling ceoDashboard=v2 aggregates'
);

add(
  'weather_v2',
  'Scene · Weather V2 layers',
  fileExists('src/components/scene/scene-weather-v2-layers.tsx') ? 'pass' : 'warning',
  'Toggle sceneWeather=v2 in Admin Product Surfaces'
);

add(
  'intelligence',
  'Artist Intelligence shell',
  fileExists('src/components/intelligence/artist-intelligence-shell.tsx') ? 'pass' : 'warning',
  'Toggle supportCircle=crm'
);

add(
  'share_room',
  'Share Studio + Release Room',
  fileExists('src/components/share-studio/share-studio-dialog.tsx') &&
    fileExists('src/app/room/[roomId]/page.tsx')
    ? 'pass'
    : 'warning',
  'Toggle sharing=v2 and releaseRoom=v1'
);

{
  const tc = runNpm('typecheck');
  add(
    'typecheck',
    'Performance · Typecheck',
    tc.ok ? 'pass' : 'blocked',
    tc.ok ? 'tsc --noEmit clean' : tc.out || 'typecheck failed'
  );
}

const blocked = findings.filter((f) => f.status === 'blocked').length;
const warnings = findings.filter((f) => f.status === 'warning').length;
const passes = findings.filter((f) => f.status === 'pass').length;
const overall = blocked > 0 ? 'blocked' : warnings > 0 ? 'warning' : 'pass';

const report = {
  generatedAt: new Date().toISOString(),
  overall,
  summary: { pass: passes, warning: warnings, blocked },
  findings,
};

const outDir = path.join(root, 'docs');
fs.writeFileSync(path.join(outDir, 'PRODUCTION_GATE_REPORT.json'), JSON.stringify(report, null, 2));

const md = [
  '# Production gate report',
  '',
  `Generated: ${report.generatedAt}`,
  `Overall: **${overall.toUpperCase()}** (${passes} pass · ${warnings} warning · ${blocked} blocked)`,
  '',
  '| Status | Check | Detail |',
  '|--------|-------|--------|',
  ...findings.map((f) => `| ${f.status} | ${f.label} | ${f.detail.replace(/\|/g, '/')} |`),
  '',
  'Enable V2 surfaces independently in Admin → Config → Product Surfaces after blockers are clear.',
  '',
].join('\n');
fs.writeFileSync(path.join(outDir, 'PRODUCTION_GATE_REPORT.md'), md);

console.log(md);
console.log(`Wrote docs/PRODUCTION_GATE_REPORT.json`);

process.exit(blocked > 0 ? 1 : 0);
