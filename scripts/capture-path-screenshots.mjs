#!/usr/bin/env node
/**
 * Capture real app screenshots for Studio Manual → Paths.
 * Requires `npm run dev` on :9002 and AGENT_DEMO_EMAIL / AGENT_DEMO_PASSWORD in .env.local
 */
import { chromium } from 'playwright';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'public', 'marketing', 'paths');
const BASE_URL = process.env.PATH_CAPTURE_URL || 'http://localhost:9002';
const ONLY = new Set(
  (process.env.PATH_CAPTURE_ONLY || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
);

async function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    try {
      const text = await readFile(path.join(ROOT, file), 'utf8');
      for (const raw of text.split(/\r?\n/)) {
        const line = raw.trim();
        if (!line || line.startsWith('#')) continue;
        const eq = line.indexOf('=');
        if (eq < 1) continue;
        const key = line.slice(0, eq).trim();
        let value = line.slice(eq + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        if (process.env[key] === undefined) process.env[key] = value;
      }
    } catch {
      /* missing file */
    }
  }
}

function outFile(name) {
  return path.join(OUT_DIR, name);
}

async function dismissChrome(page) {
  for (let round = 0; round < 6; round++) {
    let clicked = false;
    const buttons = [
      page.getByRole('button', { name: /skip tour/i }),
      page.getByRole('button', { name: /remind me later/i }),
      page.getByRole('button', { name: /save preferences/i }),
      page.getByRole('button', { name: /^got it$/i }),
      page.getByRole('button', { name: /^not now$/i }),
      page.getByRole('button', { name: /maybe later/i }),
      page.getByRole('button', { name: /skip for now/i }),
      page.getByLabel(/skip tour/i),
      page.getByLabel(/^close$/i),
    ];
    for (const btn of buttons) {
      const first = btn.first();
      if ((await first.count()) === 0) continue;
      if (!(await first.isVisible().catch(() => false))) continue;
      await first.click({ timeout: 1500, force: true }).catch(() => undefined);
      clicked = true;
      await page.waitForTimeout(250);
    }
    const tourClose = page.locator('[aria-label="Skip tour"], button:has-text("Skip tour")').first();
    if (await tourClose.isVisible().catch(() => false)) {
      await tourClose.click({ timeout: 1500, force: true }).catch(() => undefined);
      clicked = true;
    }
    await page.keyboard.press('Escape').catch(() => undefined);
    const overlay = page.getByText(/sharing & visibility|welcome to the scene|leaderboard off|your studio visibility|what.?s new/i).first();
    if (!clicked && !(await overlay.isVisible().catch(() => false))) break;
    await page.waitForTimeout(400);
  }
}

async function waitReady(page, extraMs = 600) {
  await page.waitForTimeout(extraMs);
  await dismissChrome(page);
}

async function shotLocator(page, locator, file, pad = 16) {
  const el = locator.first();
  await el.waitFor({ state: 'visible', timeout: 25000 });
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  const box = await el.boundingBox();
  if (!box || box.width < 8 || box.height < 8) throw new Error(`No box for ${file}`);
  const vp = page.viewportSize() || { width: 1440, height: 920 };
  const x = Math.max(0, Math.floor(box.x - pad));
  const y = Math.max(0, Math.floor(box.y - pad));
  const width = Math.min(vp.width - x, Math.ceil(box.width + pad * 2));
  const height = Math.min(vp.height - y, Math.ceil(box.height + pad * 2));
  if (width < 8 || height < 8) throw new Error(`Tiny clip for ${file}`);
  await page.screenshot({ path: outFile(file), type: 'png', clip: { x, y, width, height } });
  console.log(`  saved ${file} (${width}x${height})`);
}

async function shotPage(page, file) {
  await page.screenshot({ path: outFile(file), type: 'png' });
  console.log(`  saved ${file} (viewport)`);
}

async function tryShot(label, fn) {
  if (ONLY.size && !ONLY.has(label)) return;
  try {
    await fn();
  } catch (err) {
    console.warn(`  skip ${label}:`, err instanceof Error ? err.message : err);
  }
}

async function waitForBody(page, pattern, timeout = 25000) {
  await page.waitForFunction(
    (re) => new RegExp(re, 'i').test(document.body.innerText || ''),
    pattern,
    { timeout }
  );
}

async function settleJumpHints(page) {
  // SceneFeedJumpHints stay awake for 1850ms after scrollIntoView.
  await page.waitForTimeout(2200);
}

async function clickFirstVisible(locator) {
  const n = await locator.count();
  for (let i = 0; i < n; i++) {
    const item = locator.nth(i);
    if (await item.isVisible().catch(() => false)) {
      await item.click();
      return true;
    }
  }
  return false;
}

async function waitGone(page, pattern, timeout = 40000) {
  await page.waitForFunction(
    (re) => !new RegExp(re, 'i').test(document.body.innerText || ''),
    pattern,
    { timeout }
  ).catch(() => undefined);
}

async function openFirstSheet(page) {
  await page.goto(`${BASE_URL}/vault`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitReady(page, 1800);
  const hrefs = await page.evaluate(() =>
    [...document.querySelectorAll('a[href*="/albums/"]')].map((a) => a.getAttribute('href')).filter(Boolean)
  );
  const trackHref = hrefs.find((h) => /\/albums\/(?!unassigned).+\/tracks\//.test(h));
  const albumHref = hrefs.find((h) => /^\/albums\/(?!unassigned)[^/]+$/.test(h));
  if (trackHref) {
    await page.goto(`${BASE_URL}${trackHref}`, { waitUntil: 'domcontentloaded' });
  } else if (albumHref) {
    await page.goto(`${BASE_URL}${albumHref}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1600);
    await dismissChrome(page);
    const inner = await page.evaluate(() =>
      [...document.querySelectorAll('a[href*="/tracks/"]')].map((a) => a.getAttribute('href')).filter(Boolean)
    );
    if (inner[0]) await page.goto(`${BASE_URL}${inner[0]}`, { waitUntil: 'domcontentloaded' });
  } else {
    const loose = page.locator('a[href*="/albums/unassigned/tracks/"]').first();
    if (await loose.count()) await loose.click();
  }
  await page.waitForURL(/\/albums\/.+\/tracks\/.+/, { timeout: 30000 }).catch(() => undefined);
  await waitReady(page, 2000);
  await page.locator('[data-tour="lyrics-sheet"]').first().waitFor({ state: 'visible', timeout: 20000 }).catch(() => undefined);
}

async function main() {
  await loadEnv();
  const email = process.env.AGENT_DEMO_EMAIL;
  const password = process.env.AGENT_DEMO_PASSWORD;
  if (!email || !password) {
    throw new Error('Set AGENT_DEMO_EMAIL and AGENT_DEMO_PASSWORD in .env.local');
  }

  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({
    channel: process.env.PATH_CAPTURE_CHANNEL || 'chrome',
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 920 },
    deviceScaleFactor: 2,
  });
  await context.addInitScript(() => {
    try {
      localStorage.setItem('b4b-cookie-consent', 'accepted');
      localStorage.setItem('b4b-try-sheet-tour-seen', '1');
      sessionStorage.setItem('b4b-privacy-intro-snoozed', '1');
    } catch {
      /* ignore */
    }
  });
  const page = await context.newPage();

  console.log(`Signing in at ${BASE_URL}/login`);
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#email', { timeout: 30000 });
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.getByRole('button', { name: /enter studio/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 45000 });
  await waitReady(page, 2200);
  await waitReady(page, 800);

  console.log('The Scene / Booth / Block / Discover / Refer / Post');
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitReady(page, 2000);
  await waitReady(page, 800);

  await tryShot('the-scene', async () => {
    const header = page.locator('[data-tour="scene-header"]');
    if (await header.count()) await shotLocator(page, header, 'the-scene.png', 20);
    else await shotPage(page, 'the-scene.png');
  });

  await tryShot('go-public', async () => {
    const booth = page.locator('[data-tour="scene-booth"]');
    await booth.first().waitFor({ state: 'visible', timeout: 20000 });
    await shotLocator(page, booth, 'go-public.png', 16);
  });

  await tryShot('post-clip', async () => {
    let composer = page.locator('[data-tour="scene-composer"]');
    if (!(await composer.first().isVisible().catch(() => false))) {
      const live = page.locator('[data-path="booth-live"] button, [data-path="booth-live"] [role="switch"]').first();
      if (await live.isVisible().catch(() => false)) {
        await live.click();
        await page.waitForTimeout(1800);
        await dismissChrome(page);
      }
      composer = page.locator('[data-tour="scene-composer"]');
    }
    if (await composer.first().isVisible().catch(() => false)) {
      await shotLocator(page, composer, 'post-clip.png', 18);
      const live = page.locator('[data-path="booth-live"] button, [data-path="booth-live"] [role="switch"]').first();
      if (await live.isVisible().catch(() => false)) {
        const label = await page.locator('[data-path="booth-live"]').innerText().catch(() => '');
        if (/^live$/im.test(label) || /\blive\b/i.test(label)) {
          await live.click().catch(() => undefined);
          await page.waitForTimeout(600);
        }
      }
      return;
    }
    await page.goto(`${BASE_URL}/u/agent_demo_pro`, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 1600);
    const wall = page.locator('[data-path="wall-camera"]').first();
    if (await wall.isVisible().catch(() => false)) {
      await shotLocator(page, wall.locator('xpath=ancestor::*[contains(@class,"rounded") or self::section or self::form][1]'), 'post-clip.png', 20);
      return;
    }
    await page.goto(`${BASE_URL}/profile/customize`, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 1400);
    const cam = page.locator('[data-path="wall-camera"]').first();
    if (await cam.isVisible().catch(() => false)) {
      await shotLocator(page, cam.locator('xpath=ancestor::*[.//textarea][1]'), 'post-clip.png', 16);
    } else {
      throw new Error('composer not visible');
    }
  });

  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitReady(page, 1400);

  await tryShot('your-block', async () => {
    const portalBlock = page.locator('[aria-label="Scene Portal"]').getByRole('button', { name: /your block/i }).first();
    if (await portalBlock.isVisible().catch(() => false)) {
      await page.waitForFunction(
        () => {
          const btn = [...document.querySelectorAll('[aria-label="Scene Portal"] button')].find((el) =>
            /your block/i.test(el.textContent || '')
          );
          const text = btn?.textContent || '';
          return text.length > 48 && !/warming up/i.test(text);
        },
        null,
        { timeout: 40000 }
      ).catch(() => undefined);
      await portalBlock.click();
      await page.waitForTimeout(1500);
      const dialog = page.getByRole('dialog').first();
      if (await dialog.isVisible().catch(() => false)) {
        const loaded = await page
          .waitForFunction(
            () => {
              const text = document.body.innerText || '';
              return (
                /share/i.test(text) ||
                /love/i.test(text) ||
                /reply/i.test(text) ||
                /\d+ of \d+ · swipe/i.test(text)
              );
            },
            null,
            { timeout: 40000 }
          )
          .then(() => true)
          .catch(() => false);
        if (loaded) {
          await page.waitForTimeout(900);
          await shotLocator(page, dialog, 'your-block.png', 4);
          await page.keyboard.press('Escape').catch(() => undefined);
          return;
        }
        await page.keyboard.press('Escape').catch(() => undefined);
        await page.waitForTimeout(400);
      }
      await shotLocator(page, portalBlock, 'your-block.png', 10);
      return;
    }

    const header = page.getByRole('button', { name: /your block/i }).first();
    if (await header.isVisible().catch(() => false)) {
      const expanded = await header.getAttribute('aria-expanded');
      if (expanded === 'false') {
        await header.click();
        await page.waitForTimeout(800);
      }
    }
    const feed = page.locator('[data-tour="scene-feed"]');
    await feed.first().waitFor({ state: 'visible', timeout: 20000 });
    await page.waitForFunction(
      () => {
        const text = document.querySelector('[data-tour="scene-feed"]')?.textContent || '';
        return /share/i.test(text) || /love/i.test(text) || /reply/i.test(text);
      },
      null,
      { timeout: 45000 }
    );
    await feed.first().scrollIntoViewIfNeeded().catch(() => undefined);
    await page.waitForTimeout(400);
    await settleJumpHints(page);
    await shotLocator(page, feed, 'your-block.png', 16);
  });

  await tryShot('find-artists', async () => {
    await page.goto(`${BASE_URL}/discover`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitReady(page, 2000);
    await page.locator('[data-tour="scene-search"]').first().waitFor({ state: 'visible', timeout: 20000 });
    await page.getByRole('heading', { name: /^discover$/i }).first().waitFor({ state: 'visible', timeout: 20000 });
    await waitForBody(page, 'recently live|rising this week|visit|artist home|from the scene');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(900);
    const heading = page.getByRole('heading', { name: /^discover$/i }).first();
    await shotLocator(
      page,
      heading.locator('xpath=ancestor::*[contains(@class,"container") or self::main][1]'),
      'find-artists.png',
      12
    ).catch(async () => {
      await shotPage(page, 'find-artists.png');
    });
  });

  const sceneHomeOnly =
    ONLY.size > 0 &&
    [...ONLY].every((id) =>
      ['the-scene', 'go-public', 'post-clip', 'your-block', 'find-artists', 'refer'].includes(id)
    );
  if (sceneHomeOnly) {
    await browser.close();
    console.log(`Done. Screenshots in ${OUT_DIR}`);
    return;
  }

  await tryShot('refer', async () => {
    await page.goto(`${BASE_URL}/#refer-a-friend`, { waitUntil: 'domcontentloaded' });
    await waitReady(page, 1000);
    const refer = page.locator('#refer-a-friend');
    if (await refer.count()) await shotLocator(page, refer, 'refer.png', 16);
    else await shotPage(page, 'refer.png');
  });

  console.log('New release dialog');
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await waitReady(page, 1200);
  await tryShot('press-song', async () => {
    const clicked = await clickFirstVisible(page.getByRole('button', { name: /new release/i }));
    if (!clicked) {
      await page.goto(`${BASE_URL}/vault`, { waitUntil: 'domcontentloaded' });
      await waitReady(page, 1400);
      await clickFirstVisible(page.getByRole('button', { name: /new release/i }));
    }
    await page.waitForTimeout(900);
    const dialog = page.getByRole('dialog').filter({ hasText: /new release|press|audio|price/i }).first();
    if (await dialog.isVisible().catch(() => false)) {
      await shotLocator(page, dialog, 'press-song.png', 8);
      await page.keyboard.press('Escape').catch(() => undefined);
      return;
    }
    const anyDialog = page.getByRole('dialog').first();
    if (await anyDialog.isVisible().catch(() => false)) {
      await shotLocator(page, anyDialog, 'press-song.png', 8);
      await page.keyboard.press('Escape').catch(() => undefined);
      return;
    }
    throw new Error('New release dialog did not open');
  });

  console.log('Vault + lyric sheet');
  await tryShot('write-lyrics', async () => {
    await openFirstSheet(page);
    const sheet = page.locator('[data-tour="lyrics-sheet"]');
    if (await sheet.count()) await shotLocator(page, sheet, 'write-lyrics.png', 10);
    else await shotPage(page, 'write-lyrics.png');
  });

  await tryShot('dna-drop', async () => {
    if (!/\/tracks\//.test(page.url())) await openFirstSheet(page);
    const dna = page.locator('[data-tour="dna-drop"]');
    const left = page.locator('[data-tour="left-panel"]');
    if (await dna.first().isVisible().catch(() => false)) {
      await shotLocator(page, dna, 'dna-drop.png', 28);
    } else if (await left.first().isVisible().catch(() => false)) {
      await shotLocator(page, left, 'dna-drop.png', 8);
    } else {
      throw new Error('DNA Drop control not on this sheet');
    }
  });

  await tryShot('collab', async () => {
    if (!/\/tracks\//.test(page.url())) await openFirstSheet(page);
    const collab = page.locator('[data-tour="collab-sheet"]');
    if (await collab.first().isVisible().catch(() => false)) {
      await shotLocator(page, collab, 'collab.png', 28);
    } else {
      throw new Error('Collab Sheet control not visible');
    }
  });

  await tryShot('freestyle', async () => {
    if (!/\/tracks\//.test(page.url())) await openFirstSheet(page);
    const free = page.getByRole('button', { name: /freestyle/i }).first();
    const station = page.locator('[data-tour="bar-workstation"]');
    if (await station.first().isVisible().catch(() => false)) {
      await shotLocator(page, station, 'freestyle.png', 12);
    } else if (await free.isVisible().catch(() => false)) {
      await shotLocator(page, free, 'freestyle.png', 32);
    } else {
      throw new Error('Freestyle / Bar Workstation not visible');
    }
  });

  console.log('Library, earnings, pricing, lock, pressing');
  await page.goto(`${BASE_URL}/library`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitGone(page, 'OPENING LIBRARY');
  await page.getByRole('heading', { name: /^library/i }).first().waitFor({ state: 'visible', timeout: 40000 }).catch(() => undefined);
  await waitReady(page, 800);
  await tryShot('play-buy', async () => {
    const deck = page.locator('h1').filter({ hasText: /library/i }).first();
    if (await deck.isVisible().catch(() => false)) {
      await shotLocator(page, deck.locator('xpath=ancestor::*[contains(@class,"container") or self::main][1]'), 'play-buy.png', 12).catch(async () => {
        await shotPage(page, 'play-buy.png');
      });
    } else {
      await shotPage(page, 'play-buy.png');
    }
  });

  await page.goto(`${BASE_URL}/earnings`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitGone(page, 'OPENING EARNINGS');
  await page.getByRole('heading', { name: /^earnings/i }).first().waitFor({ state: 'visible', timeout: 40000 }).catch(() => undefined);
  await waitReady(page, 800);
  await tryShot('get-paid', async () => {
    const heading = page.getByRole('heading', { name: /^earnings/i }).first();
    if (await heading.isVisible().catch(() => false)) {
      await shotLocator(page, heading.locator('xpath=ancestor::*[contains(@class,"container") or self::main][1]'), 'get-paid.png', 12).catch(async () => {
        await shotPage(page, 'get-paid.png');
      });
    } else {
      await shotPage(page, 'get-paid.png');
    }
  });

  await page.goto(`${BASE_URL}/pricing`, { waitUntil: 'domcontentloaded' });
  await waitReady(page, 1200);
  await tryShot('ink-store', async () => {
    const title = page.getByText(/studio memberships|studio pro/i).first();
    if (await title.isVisible().catch(() => false)) {
      await shotLocator(page, title.locator('xpath=ancestor::*[contains(@class,"container") or self::main][1]'), 'ink-store.png', 10).catch(async () => {
        await shotPage(page, 'ink-store.png');
      });
    } else {
      await shotPage(page, 'ink-store.png');
    }
  });

  await page.goto(`${BASE_URL}/profile/customize`, { waitUntil: 'domcontentloaded' });
  await waitReady(page, 1800);
  await tryShot('the-pressing', async () => {
    const pressing = page.locator('#the-pressing');
    if (await pressing.count()) await shotLocator(page, pressing, 'the-pressing.png', 10);
    else await shotPage(page, 'the-pressing.png');
  });

  await browser.close();
  console.log(`Done. Screenshots in ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
