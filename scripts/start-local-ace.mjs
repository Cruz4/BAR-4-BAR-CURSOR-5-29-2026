/**
 * Start local ACE-Step REST API on http://127.0.0.1:8001
 */
import { existsSync } from 'fs';
import { resolve } from 'path';
import { spawn, spawnSync } from 'child_process';

function resolveUvExecutable() {
  const localUv = resolve(process.env.USERPROFILE || '', '.local', 'bin', 'uv.exe');
  if (existsSync(localUv)) return localUv;
  const check = spawnSync('uv', ['--version'], { shell: false, encoding: 'utf8' });
  if (check.status === 0) return 'uv';
  return null;
}

const aceDir = resolve(process.cwd(), 'vendor', 'ACE-Step-1.5');
if (!existsSync(aceDir)) {
  console.error('ACE-Step not installed. Run: npm run render:install-local-ace');
  process.exit(1);
}

const uv = resolveUvExecutable();
if (!uv) {
  console.error('uv not found. Run: npm run render:install-local-ace');
  process.exit(1);
}

console.log('Starting ACE-Step API at http://127.0.0.1:8001 (first launch downloads models)...');
const child = spawn(uv, ['run', 'acestep-api'], {
  cwd: aceDir,
  stdio: 'inherit',
  shell: false,
  env: {
    ...process.env,
    ACESTEP_API_HOST: '127.0.0.1',
    ACESTEP_API_PORT: '8001',
  },
});

child.on('exit', (code) => process.exit(code ?? 1));
