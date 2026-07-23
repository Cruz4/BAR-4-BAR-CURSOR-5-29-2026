#!/usr/bin/env node
/**
 * TikTok DM outreach helper (manual or computer-use assisted).
 * Rotates templates, clipboard copy, tracker queue.
 * Does NOT scrape TikTok or send messages by itself.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { spawnSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUTREACH_DIR = join(ROOT, 'docs', 'tiktok-outreach');
const TEMPLATES_PATH = join(OUTREACH_DIR, 'dm-templates.json');
const TRACKER_PATH = join(OUTREACH_DIR, 'tracker.csv');
const TARGETS_PATH = join(OUTREACH_DIR, 'targets.txt');
const HEADER = 'date,handle,template_id,status,note,replied';

function loadTemplates() {
  const data = JSON.parse(readFileSync(TEMPLATES_PATH, 'utf8'));
  if (!Array.isArray(data.templates) || data.templates.length === 0) {
    throw new Error('No templates found in dm-templates.json');
  }
  return data;
}

function ensureTracker() {
  if (!existsSync(TRACKER_PATH)) {
    writeFileSync(TRACKER_PATH, `${HEADER}\n`, 'utf8');
  }
}

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function csvEscape(value) {
  const s = String(value ?? '');
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function loadTrackerRows() {
  ensureTracker();
  const raw = readFileSync(TRACKER_PATH, 'utf8').trim();
  if (!raw) return [];
  const lines = raw.split(/\r?\n/).filter(Boolean);
  if (lines.length <= 1) return [];
  return lines.slice(1).map((line) => {
    const [date, handle, template_id, status, note, replied] = parseCsvLine(line);
    return {
      date: date || '',
      handle: handle || '',
      template_id: Number(template_id) || 0,
      status: (status || '').toLowerCase(),
      note: note || '',
      replied: replied || '',
    };
  });
}

function writeTracker(rows) {
  const body = rows
    .map((r) =>
      [r.date, r.handle, r.template_id || '', r.status, r.note, r.replied].map(csvEscape).join(',')
    )
    .join('\n');
  writeFileSync(TRACKER_PATH, `${HEADER}\n${body}${body ? '\n' : ''}`, 'utf8');
}

function addRow(row) {
  const rows = loadTrackerRows();
  rows.push({
    date: row.date || '',
    handle: row.handle,
    template_id: row.template_id || 0,
    status: (row.status || '').toLowerCase(),
    note: row.note || '',
    replied: row.replied || '',
  });
  writeTracker(rows);
}

function usageCounts(rows) {
  const counts = new Map();
  for (const r of rows) {
    if (!r.template_id) continue;
    if (r.status !== 'sent' && r.status !== 'queued') continue;
    counts.set(r.template_id, (counts.get(r.template_id) || 0) + 1);
  }
  return counts;
}

function pickLeastUsed(templates, rows) {
  const counts = usageCounts(rows);
  let best = templates[0];
  let bestCount = counts.get(best.id) || 0;
  for (const t of templates) {
    const c = counts.get(t.id) || 0;
    if (c < bestCount || (c === bestCount && t.id < best.id)) {
      best = t;
      bestCount = c;
    }
  }
  return { template: best, uses: bestCount };
}

function normalizeHandle(raw) {
  if (!raw) return '';
  const h = String(raw).trim().replace(/^@/, '');
  return h ? `@${h}` : '';
}

function handleKey(handle) {
  return normalizeHandle(handle).toLowerCase();
}

function findLatestRowIndex(rows, handle) {
  const key = handleKey(handle);
  for (let i = rows.length - 1; i >= 0; i--) {
    if (handleKey(rows[i].handle) === key) return i;
  }
  return -1;
}

function hasActiveOrDone(rows, handle) {
  const key = handleKey(handle);
  return rows.some((r) => {
    if (handleKey(r.handle) !== key) return false;
    return ['todo', 'sent', 'queued', 'skipped', 'failed', 'blocked'].includes(r.status);
  });
}

function copyToClipboard(text) {
  if (process.platform === 'win32') {
    const ps = spawnSync(
      'powershell',
      ['-NoProfile', '-Command', 'Set-Clipboard -Value $input'],
      { input: text, encoding: 'utf8' }
    );
    if (ps.status === 0) return true;
    const clip = spawnSync('cmd', ['/c', 'clip'], { input: text, encoding: 'utf8' });
    return clip.status === 0;
  }
  if (process.platform === 'darwin') {
    const p = spawnSync('pbcopy', [], { input: text, encoding: 'utf8' });
    return p.status === 0;
  }
  const p = spawnSync('xclip', ['-selection', 'clipboard'], { input: text, encoding: 'utf8' });
  if (p.status === 0) return true;
  const p2 = spawnSync('xsel', ['--clipboard', '--input'], { input: text, encoding: 'utf8' });
  return p2.status === 0;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function todoRows(rows) {
  return rows.filter((r) => r.status === 'todo');
}

function printHelp() {
  console.log(`
TikTok DM outreach helper (you or a computer-use agent still click Send in TikTok)

Manual:
  npm run tiktok:dm
  npm run tiktok:dm -- next "@handle" [note...]
  npm run tiktok:dm -- log "@handle" [template_id] [note...]
  npm run tiktok:dm -- show <id>
  npm run tiktok:dm -- list
  npm run tiktok:dm -- stats
  npm run tiktok:dm -- replied "@handle"

Queue / computer-use:
  npm run tiktok:dm -- import-targets
  npm run tiktok:dm -- queue
  npm run tiktok:dm -- peek
  npm run tiktok:dm -- mark-sent "@handle" [note...]
  npm run tiktok:dm -- mark-skip "@handle" [reason...]
  npm run tiktok:dm -- mark-failed "@handle" [reason...]
  npm run tiktok:dm -- mark-blocked "@handle" [reason...]

Windows: always quote "@handle".
See docs/tiktok-outreach/COMPUTER-USE-PLAYBOOK.md
`);
}

function cmdList() {
  const { templates, link } = loadTemplates();
  console.log(`Link: ${link}\n`);
  for (const t of templates) {
    console.log(`── #${t.id} ──`);
    console.log(t.text);
    console.log('');
  }
}

function cmdStats() {
  const { templates } = loadTemplates();
  const rows = loadTrackerRows();
  const counts = usageCounts(rows);
  console.log('Template usage (sent/queued):\n');
  for (const t of templates) {
    const n = counts.get(t.id) || 0;
    console.log(`  #${String(t.id).padStart(2, ' ')}  ${n}×`);
  }
  const byStatus = {};
  for (const r of rows) {
    const s = r.status || '(blank)';
    byStatus[s] = (byStatus[s] || 0) + 1;
  }
  console.log(`\nTracker rows: ${rows.length}`);
  console.log('By status:', byStatus);
  const replied = rows.filter((r) => String(r.replied).toLowerCase() === 'yes').length;
  console.log(`Replies marked: ${replied}`);
}

function cmdShow(idRaw) {
  const id = Number(idRaw);
  const { templates } = loadTemplates();
  const t = templates.find((x) => x.id === id);
  if (!t) {
    console.error(`No template #${idRaw}`);
    process.exit(1);
  }
  const copied = copyToClipboard(t.text);
  console.log(`── #${t.id} ──`);
  console.log(t.text);
  console.log(copied ? '\n(Copied to clipboard)' : '\n(Clipboard copy failed — select & copy above)');
}

function cmdNext(handleRaw, noteParts) {
  const { templates } = loadTemplates();
  const rows = loadTrackerRows();
  const { template, uses } = pickLeastUsed(templates, rows);
  const handle = normalizeHandle(handleRaw);
  const note = noteParts.join(' ').trim();
  const copied = copyToClipboard(template.text);

  console.log(`Template #${template.id} (used ${uses}× before)\n`);
  console.log(template.text);
  console.log(copied ? '\n✓ Copied to clipboard' : '\n! Clipboard copy failed — select & copy above');

  if (handle) {
    addRow({
      date: today(),
      handle,
      template_id: template.id,
      status: 'sent',
      note,
      replied: '',
    });
    console.log(`\n✓ Logged ${handle} → template #${template.id}${note ? ` (${note})` : ''}`);
    console.log('Paste into TikTok, personalize if you can, then Send.');
  } else {
    console.log('\nTip: npm run tiktok:dm -- next "@handle" "personal note"  to log the send');
  }
}

function cmdLog(handleRaw, templateIdRaw, noteParts) {
  const handle = normalizeHandle(handleRaw);
  if (!handle) {
    console.error('Usage: npm run tiktok:dm -- log "@handle" [template_id] [note...]');
    process.exit(1);
  }
  const { templates } = loadTemplates();
  let templateId = Number(templateIdRaw);
  let note = noteParts.join(' ').trim();

  if (templateIdRaw && Number.isNaN(templateId)) {
    note = [templateIdRaw, ...noteParts].join(' ').trim();
    templateId = 0;
  }

  if (!templateId) {
    const { template } = pickLeastUsed(templates, loadTrackerRows());
    templateId = template.id;
    console.log(`No template id given — logging with least-used #${templateId}`);
  } else if (!templates.some((t) => t.id === templateId)) {
    console.error(`No template #${templateId}`);
    process.exit(1);
  }

  addRow({
    date: today(),
    handle,
    template_id: templateId,
    status: 'sent',
    note,
    replied: '',
  });
  console.log(`✓ Logged ${handle} → template #${templateId}${note ? ` (${note})` : ''}`);
}

function cmdReplied(handleRaw) {
  const handle = normalizeHandle(handleRaw);
  if (!handle) {
    console.error('Usage: npm run tiktok:dm -- replied "@handle"');
    process.exit(1);
  }
  const rows = loadTrackerRows();
  const idx = findLatestRowIndex(rows, handle);
  if (idx < 0) {
    console.error(`No tracker row for ${handle}`);
    process.exit(1);
  }
  rows[idx].replied = 'yes';
  writeTracker(rows);
  console.log(`✓ Marked ${handle} as replied`);
}

function cmdImportTargets() {
  if (!existsSync(TARGETS_PATH)) {
    console.error(`Missing ${TARGETS_PATH}`);
    process.exit(1);
  }
  const raw = readFileSync(TARGETS_PATH, 'utf8');
  const handles = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map(normalizeHandle)
    .filter(Boolean);

  const rows = loadTrackerRows();
  let added = 0;
  let skipped = 0;
  for (const handle of handles) {
    if (hasActiveOrDone(rows, handle)) {
      skipped++;
      continue;
    }
    rows.push({
      date: '',
      handle,
      template_id: 0,
      status: 'todo',
      note: '',
      replied: '',
    });
    added++;
  }
  writeTracker(rows);
  console.log(`✓ Imported targets → added ${added} todo, skipped ${skipped} already in tracker`);
  console.log(`Queue size: ${todoRows(rows).length}`);
}

function cmdQueue() {
  const rows = loadTrackerRows();
  const todos = todoRows(rows);
  console.log(`todo: ${todos.length}`);
  for (const r of todos) {
    console.log(`  ${r.handle}${r.note ? ` — ${r.note}` : ''}`);
  }
  const summary = {};
  for (const r of rows) {
    summary[r.status || '(blank)'] = (summary[r.status || '(blank)'] || 0) + 1;
  }
  console.log('\nAll statuses:', summary);
}

function cmdPeek() {
  const { templates } = loadTemplates();
  const rows = loadTrackerRows();
  const todos = todoRows(rows);
  if (todos.length === 0) {
    console.log('QUEUE_EMPTY');
    process.exit(0);
  }
  const next = todos[0];
  const { template, uses } = pickLeastUsed(templates, rows);
  const copied = copyToClipboard(template.text);

  // Stash chosen template on the todo row so mark-sent can reuse it
  const idx = findLatestRowIndex(rows, next.handle);
  if (idx >= 0 && rows[idx].status === 'todo') {
    rows[idx].template_id = template.id;
    rows[idx].note = rows[idx].note || `peeked template #${template.id}`;
    writeTracker(rows);
  }

  console.log(`HANDLE=${next.handle}`);
  console.log(`TEMPLATE_ID=${template.id}`);
  console.log(`TEMPLATE_USES_BEFORE=${uses}`);
  console.log(`REMAINING_TODO=${todos.length}`);
  console.log('---MESSAGE---');
  console.log(template.text);
  console.log('---END---');
  console.log(copied ? 'CLIPBOARD=ok' : 'CLIPBOARD=fail');
  console.log('Next: send in TikTok, then npm run tiktok:dm -- mark-sent "' + next.handle + '"');
}

function markStatus(handleRaw, status, noteParts) {
  const handle = normalizeHandle(handleRaw);
  if (!handle) {
    console.error(`Usage: npm run tiktok:dm -- mark-${status} "@handle" [note...]`);
    process.exit(1);
  }
  const rows = loadTrackerRows();
  const idx = findLatestRowIndex(rows, handle);
  if (idx < 0) {
    console.error(`No tracker row for ${handle}`);
    process.exit(1);
  }
  const note = noteParts.join(' ').trim();
  rows[idx].status = status;
  rows[idx].date = today();
  if (note) rows[idx].note = note;
  if (status === 'sent' && !rows[idx].template_id) {
    const { templates } = loadTemplates();
    const { template } = pickLeastUsed(templates, rows);
    rows[idx].template_id = template.id;
  }
  writeTracker(rows);
  const remaining = todoRows(rows).length;
  console.log(`✓ ${handle} → ${status}${note ? ` (${note})` : ''}`);
  console.log(`Remaining todo: ${remaining}`);
  if (status === 'blocked') {
    console.log('STOP_SESSION=1  (platform challenge — end computer-use loop)');
  }
}

function main() {
  const args = process.argv.slice(2);
  const cmd = (args[0] || 'next').toLowerCase();

  try {
    switch (cmd) {
      case 'help':
      case '-h':
      case '--help':
        printHelp();
        break;
      case 'list':
        cmdList();
        break;
      case 'stats':
        cmdStats();
        break;
      case 'show':
        cmdShow(args[1]);
        break;
      case 'next':
        cmdNext(args[1], args.slice(2));
        break;
      case 'log':
        cmdLog(args[1], args[2], args.slice(3));
        break;
      case 'replied':
        cmdReplied(args[1]);
        break;
      case 'import-targets':
        cmdImportTargets();
        break;
      case 'queue':
        cmdQueue();
        break;
      case 'peek':
        cmdPeek();
        break;
      case 'mark-sent':
        markStatus(args[1], 'sent', args.slice(2));
        break;
      case 'mark-skip':
        markStatus(args[1], 'skipped', args.slice(2));
        break;
      case 'mark-failed':
        markStatus(args[1], 'failed', args.slice(2));
        break;
      case 'mark-blocked':
        markStatus(args[1], 'blocked', args.slice(2));
        break;
      default:
        if (cmd.startsWith('@')) {
          cmdNext(cmd, args.slice(1));
        } else {
          console.error(`Unknown command: ${cmd}`);
          printHelp();
          process.exit(1);
        }
        break;
    }
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
