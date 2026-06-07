#!/usr/bin/env node
/**
 * Record marketing GIF loops from /marketing/capture/gif-* routes.
 * Uses ?capture=1 to freeze steps (no timer desync during frame capture).
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import gifencPkg from 'gifenc';
import pngjsPkg from 'pngjs';

const { GIFEncoder, quantize, applyPalette } = gifencPkg;
const { PNG } = pngjsPkg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'public', 'marketing');
const BASE_URL = process.env.MARKETING_CAPTURE_URL || 'http://localhost:9002';

const FRAMES_PER_STEP = 12;

const GIF_SCENES = [
  { scene: 'gif-dna-remix', file: 'gif-dna-remix.gif', steps: 5, stepMs: 2600, holdSteps: 2 },
  { scene: 'gif-co-writer-next-line', file: 'gif-co-writer-next-line.gif', steps: 5, stepMs: 1800, holdSteps: 3 },
  { scene: 'gif-rhyme-pulse', file: 'gif-rhyme-pulse.gif', steps: 5, stepMs: 2200, holdSteps: 2 },
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

function pngBufferToRgba(buffer) {
  const png = PNG.sync.read(buffer);
  return { width: png.width, height: png.height, data: png.data };
}

async function setGifStep(page, step) {
  await page.evaluate((s) => {
    window.dispatchEvent(new CustomEvent('marketing-gif-set-step', { detail: s }));
  }, step);
  await page.waitForFunction(
    (expected) =>
      document.querySelector('[data-marketing-gif-ready="true"]')?.getAttribute('data-marketing-gif-step') === String(expected),
    step,
    { timeout: 15000 }
  );
  await page.waitForTimeout(350);
}

async function captureStepFrames(page, target, gif, stepMs, extraFrames = 0) {
  const frameMs = Math.round(stepMs / FRAMES_PER_STEP);
  const totalFrames = FRAMES_PER_STEP + extraFrames;

  for (let f = 0; f < totalFrames; f++) {
    const buffer = await target.screenshot({ type: 'png' });
    const { width, height, data } = pngBufferToRgba(buffer);
    const palette = quantize(data, 256);
    const index = applyPalette(data, palette);
    gif.writeFrame(index, width, height, {
      palette,
      delay: frameMs,
      dispose: 2,
    });
    await page.waitForTimeout(frameMs);
  }
}

async function captureGif(page, url, outPath, steps, stepMs, holdSteps = 0) {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector('[data-marketing-gif-ready="true"]', { timeout: 30000 });
  await page.waitForTimeout(600);

  const locator = page.locator('[data-marketing-ui-crop]');
  const target = (await locator.count()) > 0 ? locator.first() : page.locator('[data-marketing-capture-ready="true"]');

  const gif = GIFEncoder();

  for (let step = 0; step < steps; step++) {
    await setGifStep(page, step);
    const extraFrames = step === steps - 1 ? holdSteps * FRAMES_PER_STEP : 0;
    await captureStepFrames(page, target, gif, stepMs, extraFrames);
  }

  gif.finish();
  await writeFile(outPath, Buffer.from(gif.bytes()));
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1400, height: 920 },
    deviceScaleFactor: 3,
  });
  const page = await context.newPage();

  const probeUrl = `${BASE_URL}/marketing/capture/gif-dna-remix?capture=1`;
  console.log(`Waiting for ${BASE_URL} ...`);
  await waitForServer(page, probeUrl);

  for (const { scene, file, steps, stepMs, holdSteps = 0 } of GIF_SCENES) {
    const url = `${BASE_URL}/marketing/capture/${scene}?capture=1`;
    const outPath = path.join(OUT_DIR, file);
    console.log(`Recording ${scene} -> public/marketing/${file} (${stepMs}ms/step, frozen)`);
    await captureGif(page, url, outPath, steps, stepMs, holdSteps);
  }

  await browser.close();
  console.log(`Done. ${GIF_SCENES.length} GIFs saved to public/marketing/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
