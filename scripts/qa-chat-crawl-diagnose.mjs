import { chromium } from 'playwright';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const env = Object.fromEntries(
  readFileSync(resolve(root, '.env.local'), 'utf8')
    .split(/\r?\n/)
    .map((l) => l.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')])
);
const base = 'http://127.0.0.1:9002';
const browser = await chromium.launch({ headless: true });
const page = await (
  await browser.newContext({ viewport: { width: 1440, height: 900 } })
).newPage();

const fails = [];
page.on('response', (res) => {
  if (res.status() < 400) return;
  const u = res.url();
  if (/adsbygoogle|googlesyndication|tiktok|facebook|hot-update/i.test(u)) return;
  fails.push({
    status: res.status(),
    url: u.slice(0, 350),
    type: res.request().resourceType(),
    method: res.request().method(),
    page: page.url(),
  });
});

await page.goto(`${base}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.getByRole('tab', { name: /^Sign In$/i }).click().catch(() => {});
await page.locator('#email').fill(env.AGENT_DEMO_EMAIL);
await page.locator('#password').fill(env.AGENT_DEMO_PASSWORD);
await page.getByRole('button', { name: /^Enter Studio$/i }).click();
await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 60000 });
await page.waitForTimeout(5000);
await page.screenshot({ path: resolve(root, 'tmp/qa-crawl/home-after-wait.png') });

const overlays = await page.evaluate(() => {
  const big = [];
  for (const el of document.querySelectorAll('body *')) {
    const s = getComputedStyle(el);
    if (s.position !== 'fixed' && s.position !== 'sticky') continue;
    const r = el.getBoundingClientRect();
    if (r.width < 200 || r.height < 80) continue;
    if (s.pointerEvents === 'none' || s.visibility === 'hidden' || s.display === 'none') continue;
    big.push({
      tag: el.tagName,
      id: el.id,
      cls: String(el.className || '').slice(0, 140),
      z: s.zIndex,
      pe: s.pointerEvents,
      text: (el.innerText || '').replace(/\s+/g, ' ').slice(0, 100),
    });
  }
  return big.slice(0, 25);
});
console.log('OVERLAYS', JSON.stringify(overlays, null, 2));

fails.length = 0;
await page.goto(`${base}/usage`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(4000);
console.log('USAGE_FAILS', JSON.stringify(fails, null, 2));
await page.screenshot({ path: resolve(root, 'tmp/qa-crawl/usage.png') });

await page.goto(`${base}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(5000);
const nav = page.locator('[data-tour="scene-nav-desktop"] a').first();
console.log('NAV_BOX', await nav.boundingBox().catch(() => null));
try {
  await nav.click({ timeout: 5000 });
  console.log('CLICK_NORMAL', page.url());
} catch (e) {
  console.log('CLICK_NORMAL_FAIL', String(e.message).split('\n')[0]);
  const blocked = await page.evaluate(() => {
    const el = document.querySelector('[data-tour="scene-nav-desktop"] a');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return {
      target: el.tagName + '.' + String(el.className).slice(0, 40),
      topTag: top?.tagName,
      topCls: String(top?.className || '').slice(0, 120),
      topText: (top?.innerText || '').replace(/\s+/g, ' ').slice(0, 80),
    };
  });
  console.log('BLOCKER', JSON.stringify(blocked, null, 2));
  await nav.click({ force: true, timeout: 5000 });
  await page.waitForTimeout(1500);
  console.log('CLICK_FORCE', page.url());
}

await page.goto(`${base}/vault`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(7000);
const albumCount = await page.locator('a[href*="/albums/"]').count();
const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 400);
console.log('ALBUM_LINKS', albumCount);
console.log('VAULT_HINT', body);
await page.screenshot({ path: resolve(root, 'tmp/qa-crawl/vault.png') });

await page.goto(`${base}/profile/customize`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(6000);
const customize = (await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 400);
console.log('CUSTOMIZE_HINT', customize);
await page.screenshot({ path: resolve(root, 'tmp/qa-crawl/customize.png') });

await browser.close();
