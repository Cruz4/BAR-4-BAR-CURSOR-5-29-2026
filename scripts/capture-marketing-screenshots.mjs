#!/usr/bin/env node
/**
 * Capture marketing screenshots from /marketing/capture/[scene] routes.
 * Usage: npm run dev (port 9002) then node scripts/capture-marketing-screenshots.mjs
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'public', 'marketing');
const BASE_URL = process.env.MARKETING_CAPTURE_URL || 'http://localhost:9002';

const SCENES = [
  { scene: 'hero-workstation', file: 'hero-workstation.png', fullFrame: true },
  { scene: 'feature-dna-suite', file: 'feature-dna-suite.png' },
  { scene: 'feature-vault', file: 'feature-vault.png' },
  { scene: 'feature-album-blueprint', file: 'feature-album-blueprint.png' },
  { scene: 'feature-guardrails', file: 'feature-guardrails.png' },
  { scene: 'feature-studio-progress', file: 'feature-studio-progress.png' },
  { scene: 'how-step-dna', file: 'how-step-dna.png' },
  { scene: 'how-step-workstation', file: 'how-step-workstation.png' },
  { scene: 'how-step-progress', file: 'how-step-progress.png' },
];

async function waitForServer(page, url) {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 5000 });
      if (res && res.ok()) return;
    } catch {
      /* retry */
    }
    await page.waitForTimeout(2000);
  }
  throw new Error(`Server not reachable at ${url}. Start with: npm run dev`);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1400, height: 1000 },
    deviceScaleFactor: 3,
  });
  const page = await context.newPage();

  const probeUrl = `${BASE_URL}/marketing/capture/hero-workstation`;
  console.log(`Waiting for ${BASE_URL} ...`);
  await waitForServer(page, probeUrl);

  for (const { scene, file, fullFrame } of SCENES) {
    const url = `${BASE_URL}/marketing/capture/${scene}`;
    console.log(`Capturing ${scene} -> public/marketing/${file}`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('[data-marketing-capture-ready="true"]', { timeout: 30000 });
    await page.waitForTimeout(1200);

    const outPath = path.join(OUT_DIR, file);
    let target;
    if (fullFrame) {
      target = page.locator('[data-marketing-capture-full="true"]');
    } else {
      const crop = page.locator('[data-marketing-ui-crop]');
      target = (await crop.count()) > 0 ? crop.first() : page.locator('[data-marketing-capture-ready="true"]');
    }
    await target.screenshot({ path: outPath, type: 'png' });
  }

  await browser.close();
  console.log(`Done. ${SCENES.length} screenshots saved to public/marketing/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
