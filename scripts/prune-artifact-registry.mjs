#!/usr/bin/env node
/**
 * Prune old Firebase App Hosting / Cloud Run container images from Artifact Registry.
 *
 * Invoice driver: ~$6/mo for 65 GiB of stale deploy images (Aug 2026).
 *
 * Usage:
 *   node scripts/prune-artifact-registry.mjs
 *   node scripts/prune-artifact-registry.mjs --keep 3 --dry-run
 *   GCP_PROJECT=lyricai-studio-otgxn node scripts/prune-artifact-registry.mjs
 *
 * Requires: gcloud CLI authenticated with artifactregistry.repositories.deleteArtifacts
 */
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const keepIdx = args.indexOf('--keep');
const keep = keepIdx >= 0 ? Math.max(1, Number(args[keepIdx + 1]) || 3) : 3;
const project = process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT || 'lyricai-studio-otgxn';
const location = process.env.GCP_REGION || 'us-central1';

function run(cmd, cmdArgs) {
  const result = spawnSync(cmd, cmdArgs, { encoding: 'utf8' });
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout);
    process.exit(result.status ?? 1);
  }
  return result.stdout.trim();
}

function listRepos() {
  const out = run('gcloud', [
    'artifacts',
    'repositories',
    'list',
    `--project=${project}`,
    `--location=${location}`,
    '--format=json',
  ]);
  return JSON.parse(out || '[]');
}

function listPackages(repo) {
  const out = run('gcloud', [
    'artifacts',
    'docker',
    'images',
    'list',
    `${location}-docker.pkg.dev/${project}/${repo}`,
    '--include-tags',
    '--sort-by=~UPDATE_TIME',
    '--format=json',
  ]);
  try {
    return JSON.parse(out || '[]');
  } catch {
    return [];
  }
}

function deletePackage(pkgUri) {
  if (dryRun) {
    console.log(`[dry-run] would delete ${pkgUri}`);
    return;
  }
  console.log(`Deleting ${pkgUri}`);
  run('gcloud', ['artifacts', 'docker', 'images', 'delete', pkgUri, '--quiet', '--delete-tags']);
}

const repos = listRepos();
const hostingRepos = repos
  .map((r) => r.name?.split('/').pop())
  .filter((name) => name && /firebase|gcf|cloud-run|ssr|framework/i.test(name));

const targets = hostingRepos.length ? hostingRepos : repos.map((r) => r.name?.split('/').pop()).filter(Boolean);

if (!targets.length) {
  console.log('No Artifact Registry repositories found. Open GCP Console → Artifact Registry manually.');
  process.exit(0);
}

let pruned = 0;
for (const repo of targets) {
  const packages = listPackages(repo);
  if (!packages.length) continue;
  console.log(`\n${repo}: ${packages.length} image(s), keeping newest ${keep}`);
  const stale = packages.slice(keep);
  for (const pkg of stale) {
    const uri = pkg.package || pkg.name;
    if (!uri) continue;
    deletePackage(uri);
    pruned += 1;
  }
}

console.log(`\nDone. ${dryRun ? 'Would prune' : 'Pruned'} ${pruned} image(s).`);
if (pruned === 0) {
  console.log('Tip: list all repos in console — Firebase Hosting may use gcf-artifacts or similar names.');
}
