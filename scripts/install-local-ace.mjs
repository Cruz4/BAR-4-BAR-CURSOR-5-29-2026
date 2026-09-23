/**
 * Install ACE-Step 1.5 locally (free, runs on your NVIDIA GPU).
 * Usage: npm run render:install-local-ace
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { spawnSync } from 'child_process';

const root = resolve(process.cwd());
const vendorDir = resolve(root, 'vendor');
const aceDir = resolve(vendorDir, 'ACE-Step-1.5');
const envLocal = resolve(root, '.env.local');

function run(cmd, args, opts = {}) {
  const useShell = opts.shell === true;
  const r = spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: useShell,
    ...opts,
    shell: useShell,
  });
  if (r.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')} failed (${r.status})`);
  }
}

function patchEnvLocal() {
  const lines = existsSync(envLocal) ? readFileSync(envLocal, 'utf8').split(/\r?\n/) : [];
  const set = new Map();
  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i < 1) continue;
    set.set(line.slice(0, i), line);
  }
  set.set('RENDER_ACE_MODE', 'RENDER_ACE_MODE=local');
  set.set('RENDER_ACE_LOCAL_BASE', 'RENDER_ACE_LOCAL_BASE=http://127.0.0.1:8001');
  const kept = lines.filter((line) => {
    if (!line.trim() || line.trim().startsWith('#')) return true;
    const i = line.indexOf('=');
    if (i < 1) return true;
    const key = line.slice(0, i);
    return !set.has(key);
  });
  const block = [
    '',
    '# Local ACE-Step (free GPU renders — no fal.ai billing)',
    set.get('RENDER_ACE_MODE'),
    set.get('RENDER_ACE_LOCAL_BASE'),
    '# Optional: auto-run renders in dev without a paired PC (does not show Generate UI when surfaces are off)',
    '# RENDER_DEV_AUTO_WORKER=true',
    '# Optional: show Generate UI in dev when Song generation admin toggle is off',
    '# RENDER_DEV_SONG_GEN_UI=true',
  ];
  writeFileSync(envLocal, [...kept, ...block].join('\n').replace(/\n{3,}/g, '\n\n') + '\n', 'utf8');
  console.log('Updated .env.local (RENDER_ACE_MODE=local, RENDER_ACE_LOCAL_BASE)');
}

function resolveUvExecutable() {
  const localUv = resolve(process.env.USERPROFILE || '', '.local', 'bin', 'uv.exe');
  if (existsSync(localUv)) return localUv;
  const check = spawnSync('uv', ['--version'], { shell: false, encoding: 'utf8' });
  if (check.status === 0) return 'uv';
  return null;
}

function ensureUv() {
  if (resolveUvExecutable()) return;
  console.log('Installing uv (Python package manager)...');
  run(
    'powershell',
    [
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      'irm https://astral.sh/uv/install.ps1 | iex',
    ],
    { cwd: root, shell: true }
  );
}

function uvExecutable() {
  const uv = resolveUvExecutable();
  if (!uv) throw new Error('uv is not installed. Restart the terminal and run this script again.');
  return uv;
}

mkdirSync(vendorDir, { recursive: true });

if (!existsSync(resolve(aceDir, 'pyproject.toml')) && !existsSync(resolve(aceDir, 'uv.lock'))) {
  console.log('Cloning ACE-Step-1.5 into vendor/ (MIT, ~10GB models on first run)...');
  run('git', ['clone', '--depth', '1', 'https://github.com/ACE-Step/ACE-Step-1.5.git', aceDir], {
    shell: false,
  });
} else {
  console.log('ACE-Step-1.5 already present at', aceDir);
}

ensureUv();
console.log('Syncing Python environment (first run can take 15–40 minutes)...');
run(uvExecutable(), ['sync'], { cwd: aceDir, shell: false });

patchEnvLocal();
console.log('\nDone. Next:');
console.log('  1. Terminal A: npm run render:local-ace   (wait until models load)');
console.log('  2. Terminal B: npm run dev');
console.log('  3. Render Studio → Generate from sheet');
