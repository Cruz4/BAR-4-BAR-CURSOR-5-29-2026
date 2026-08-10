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
page.on('console', (msg) => {
  if (msg.type() === 'error') console.log('CONSOLE', msg.text().slice(0, 250));
});
page.on('response', async (res) => {
  if (res.status() < 400) return;
  const u = res.url();
  if (/adsbygoogle|googlesyndication|tiktok|facebook|hot-update|favicon/i.test(u)) return;
  let body = '';
  try {
    body = (await res.text()).slice(0, 200);
  } catch {}
  fails.push({ status: res.status(), method: res.request().method(), url: u.slice(0, 300), body });
});

await page.goto(`${base}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.locator('#email').fill(env.AGENT_DEMO_EMAIL);
await page.locator('#password').fill(env.AGENT_DEMO_PASSWORD);
await page.getByRole('button', { name: /^Enter Studio$/i }).click();
await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 60000 });
await page.waitForTimeout(2000);

// Dismiss cookie + skip tour if present
for (const label of ['GOT IT', 'Skip', 'Skip tour', 'Next', 'Got it']) {
  const btn = page.getByRole('button', { name: new RegExp(`^${label}$`, 'i') });
  if (await btn.count()) {
    await btn.first().click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(400);
  }
}

fails.length = 0;
await page.goto(`${base}/profile/customize`, { waitUntil: 'domcontentloaded', timeout: 60000 });
for (let i = 0; i < 8; i++) {
  await page.waitForTimeout(2000);
  const text = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
  const loading = /GENERATING|OPENING WORKSTATION/i.test(text) && text.length < 400;
  console.log(`t=${(i + 1) * 2}s len=${text.length} loadingish=${loading} hint=${text.slice(0, 160)}`);
  if (text.length > 500 && !loading) break;
}
await page.screenshot({ path: resolve(root, 'tmp/qa-crawl/customize-long.png'), fullPage: true });
console.log('CUSTOMIZE_FAILS', JSON.stringify(fails, null, 2));

fails.length = 0;
await page.goto(`${base}/usage`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(5000);
console.log('USAGE_FAILS', JSON.stringify(fails, null, 2));

// Check scene tour still present after cookie dismiss
await page.goto(`${base}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(3000);
const tour = await page.getByText(/GUIDED TOUR/i).count();
const cookie = await page.getByText(/essential cookies/i).count();
console.log({ tour, cookie, url: page.url() });

await browser.close();
