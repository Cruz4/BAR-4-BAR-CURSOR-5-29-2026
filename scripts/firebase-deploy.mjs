/**
 * Firebase deploy wrapper — raises functions discovery timeout.
 * Default CLI window is 10s; Next frameworks backends often need longer.
 *
 * Usage: node scripts/firebase-deploy.mjs [--only hosting,...]
 */
import { spawnSync } from 'node:child_process';

const timeoutSec = process.env.FUNCTIONS_DISCOVERY_TIMEOUT || '120';
process.env.FUNCTIONS_DISCOVERY_TIMEOUT = String(timeoutSec);

const extra = process.argv.slice(2);
const args = ['firebase', 'deploy', ...extra];

console.log(`[firebase-deploy] FUNCTIONS_DISCOVERY_TIMEOUT=${timeoutSec}s`);

const result = spawnSync('npx', args, {
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

process.exit(result.status === null ? 1 : result.status);
