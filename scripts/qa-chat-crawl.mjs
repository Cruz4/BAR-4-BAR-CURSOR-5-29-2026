/**
 * One-shot QA chat crawl — report only, no fixes.
 * Uses AGENT_DEMO_* from .env.local
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const base = process.env.QA_BASE_URL || 'http://127.0.0.1:9002';
const outDir = resolve(root, 'tmp/qa-crawl');
mkdirSync(outDir, { recursive: true });

function loadEnvLocal() {
  const env = {};
  try {
    const raw = readFileSync(resolve(root, '.env.local'), 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {
    /* ignore */
  }
  return env;
}

const env = loadEnvLocal();
const email = process.env.AGENT_DEMO_EMAIL || env.AGENT_DEMO_EMAIL;
const password = process.env.AGENT_DEMO_PASSWORD || env.AGENT_DEMO_PASSWORD;

if (!email || !password) {
  console.error('Missing AGENT_DEMO_EMAIL / AGENT_DEMO_PASSWORD in .env.local');
  process.exit(1);
}

const ROUTES = [
  { path: '/', name: 'Scene home' },
  { path: '/vault', name: 'Vault' },
  { path: '/vault?create=track', name: 'Vault create track' },
  { path: '/leaderboard', name: 'Leaderboard' },
  { path: '/activity', name: 'Activity' },
  { path: '/friends', name: 'Friends / circle' },
  { path: '/usage', name: 'Usage / Ink' },
  { path: '/usage?tab=buy-ink', name: 'Ink store tab' },
  { path: '/pricing', name: 'Pricing' },
  { path: '/discover', name: 'Discover' },
  { path: '/profile/customize', name: 'Profile customize' },
  { path: '/try', name: 'Guest try' },
  { path: '/welcome', name: 'Welcome' },
  { path: '/studio-progress', name: 'Studio progress' },
  { path: '/feed', name: 'Feed' },
  { path: '/terms', name: 'Terms' },
  { path: '/privacy', name: 'Privacy' },
];

const NOISE = [
  /Download the React DevTools/i,
  /\[HMR\]/i,
  /\[Fast Refresh\]/i,
  /favicon\.ico/i,
  /ResizeObserver loop/i,
  /net::ERR_BLOCKED_BY_CLIENT/i,
  /Failed to load resource: net::ERR_CONNECTION_REFUSED/i,
  /adsbygoogle|googlesyndication|pagead|doubleclick/i,
  /tiktok|analytics\.tiktok|connect\.facebook/i,
  /hot-update/i,
  /webpack/i,
];

function isNoise(text) {
  return NOISE.some((re) => re.test(text));
}

function summarizeBody(text) {
  if (!text) return '';
  return text.replace(/\s+/g, ' ').trim().slice(0, 220);
}

async function main() {
  const report = {
    startedAt: new Date().toISOString(),
    base,
    email,
    loginOk: false,
    routes: [],
    clicks: [],
    discoveries: [],
    issues: [],
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
  };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (isNoise(text)) return;
    report.consoleErrors.push({
      text: text.slice(0, 500),
      url: page.url(),
      at: new Date().toISOString(),
    });
  });

  page.on('pageerror', (err) => {
    const text = String(err?.message || err);
    if (isNoise(text)) return;
    report.pageErrors.push({
      text: text.slice(0, 500),
      url: page.url(),
      at: new Date().toISOString(),
    });
  });

  page.on('response', async (res) => {
    try {
      const status = res.status();
      if (status < 400) return;
      const url = res.url();
      if (isNoise(url)) return;
      if (!url.includes('127.0.0.1:9002') && !url.includes('localhost:9002')) {
        // Still note first-party API failures only for clarity
        if (!url.includes('/api/')) return;
      }
      const req = res.request();
      const resourceType = req.resourceType();
      if (!['document', 'xhr', 'fetch'].includes(resourceType)) return;
      report.failedRequests.push({
        status,
        method: req.method(),
        url: url.slice(0, 400),
        page: page.url(),
        at: new Date().toISOString(),
      });
    } catch {
      /* ignore */
    }
  });

  async function visit(path, name) {
    const entry = {
      name,
      path,
      ok: false,
      finalUrl: '',
      title: '',
      bodyHint: '',
      waitMs: 0,
      error: null,
    };
    const t0 = Date.now();
    try {
      const res = await page.goto(`${base}${path}`, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });
      await page.waitForTimeout(1800);
      entry.waitMs = Date.now() - t0;
      entry.finalUrl = page.url();
      entry.title = await page.title();
      entry.status = res?.status() ?? null;
      entry.bodyHint = summarizeBody(await page.locator('body').innerText().catch(() => ''));
      entry.ok = (res?.status() ?? 500) < 400;

      const redirectedToLogin =
        report.loginOk &&
        path !== '/login' &&
        /\/login(?:\?|$)/.test(entry.finalUrl) &&
        !path.startsWith('/try') &&
        !path.startsWith('/pricing') &&
        !path.startsWith('/terms') &&
        !path.startsWith('/privacy') &&
        !path.startsWith('/welcome');

      if (redirectedToLogin) {
        entry.ok = false;
        report.issues.push({
          severity: 'high',
          route: path,
          name,
          kind: 'auth_redirect_while_logged_in',
          detail: `Expected authenticated page, got ${entry.finalUrl}`,
          url: entry.finalUrl,
        });
      }

      const crash =
        /Application error|Something went wrong|Unhandled Runtime Error|This page could not be found/i.test(
          entry.bodyHint
        );
      if (crash) {
        report.issues.push({
          severity: 'high',
          route: path,
          name,
          kind: 'page_crash_or_not_found',
          detail: entry.bodyHint.slice(0, 280),
          url: entry.finalUrl,
        });
      }
      if (!entry.ok && !redirectedToLogin) {
        report.issues.push({
          severity: 'high',
          route: path,
          name,
          kind: 'http_error',
          detail: `HTTP ${entry.status}`,
          url: entry.finalUrl,
        });
      }
    } catch (err) {
      entry.waitMs = Date.now() - t0;
      entry.error = String(err?.message || err).slice(0, 400);
      report.issues.push({
        severity: 'high',
        route: path,
        name,
        kind: 'navigation_failed',
        detail: entry.error,
        url: page.url(),
      });
    }
    report.routes.push(entry);
    console.log(
      `${entry.ok ? 'OK' : 'FAIL'} ${path} (${entry.waitMs}ms)${entry.error ? ' — ' + entry.error : ''}`
    );
    return entry;
  }

  // --- Login ---
  console.log(`Logging in as ${email}…`);
  await visit('/login', 'Login page');

  try {
    // TabsTrigger also says "Sign In"; submit CTA is "Enter Studio"
    await page.getByRole('tab', { name: /^Sign In$/i }).click({ timeout: 10000 }).catch(() => {});
    await page.locator('#email').waitFor({ state: 'visible', timeout: 20000 });
    await page.locator('#email').fill(email);
    await page.locator('#password').fill(password);
    await page.getByRole('button', { name: /^Enter Studio$/i }).click({ timeout: 15000 });
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60000 });
    await page.waitForTimeout(3000);
    report.loginOk = !page.url().includes('/login');
    if (!report.loginOk) {
      report.issues.push({
        severity: 'critical',
        route: '/login',
        name: 'Login',
        kind: 'login_stuck',
        detail: `Still on ${page.url()} after Enter Studio`,
        url: page.url(),
      });
    } else {
      console.log(`Login OK → ${page.url()}`);
    }
  } catch (err) {
    const toastText = await page
      .locator('[data-sonner-toast], [role="status"], .destructive')
      .allInnerTexts()
      .then((t) => t.join(' | ').slice(0, 300))
      .catch(() => '');
    report.issues.push({
      severity: 'critical',
      route: '/login',
      name: 'Login',
      kind: 'login_failed',
      detail: `${String(err?.message || err).slice(0, 350)}${toastText ? ` | UI: ${toastText}` : ''}`,
      url: page.url(),
    });
    console.error('Login failed:', err?.message || err, toastText);
  }

  // Screenshot after login attempt
  await page.screenshot({ path: resolve(outDir, 'after-login.png'), fullPage: false }).catch(() => {});

  // --- Route crawl ---
  for (const route of ROUTES) {
    if (route.path === '/login') continue;
    await visit(route.path, route.name);
  }

  // --- Discover album/track links from vault ---
  await page.goto(`${base}/vault`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(2000);
  const albumHrefs = await page
    .locator('a[href*="/albums/"]')
    .evaluateAll((els) =>
      [...new Set(els.map((e) => e.getAttribute('href')).filter(Boolean))].slice(0, 6)
    )
    .catch(() => []);
  report.discoveries.push({ kind: 'album_links', hrefs: albumHrefs });

  for (const href of albumHrefs.slice(0, 3)) {
    const path = href.startsWith('http') ? new URL(href).pathname : href;
    await visit(path, `Discovered ${path}`);
  }

  // Open first track if any
  const trackHrefs = await page
    .locator('a[href*="/tracks/"]')
    .evaluateAll((els) =>
      [...new Set(els.map((e) => e.getAttribute('href')).filter(Boolean))].slice(0, 4)
    )
    .catch(() => []);
  report.discoveries.push({ kind: 'track_links', hrefs: trackHrefs });
  for (const href of trackHrefs.slice(0, 2)) {
    const path = href.startsWith('http') ? new URL(href).pathname + (new URL(href, base).search || '') : href;
    await visit(path.split('?')[0], `Discovered track ${path}`);
  }

  // --- Click Scene nav shortcuts from home ---
  await page.goto(`${base}/`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(2000);
  const nav = page.locator('[data-tour="scene-nav-desktop"] a, [data-tour="scene-nav-mobile"] a');
  const navCount = await nav.count().catch(() => 0);
  const clickBudget = Math.min(navCount, 8);
  for (let i = 0; i < clickBudget; i++) {
    const link = nav.nth(i);
    const label = summarizeBody(await link.innerText().catch(() => ''));
    const href = (await link.getAttribute('href').catch(() => '')) || '';
    const clickEntry = { label, href, ok: false, error: null, urlAfter: '' };
    try {
      await Promise.all([
        page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {}),
        link.click({ timeout: 10000 }),
      ]);
      await page.waitForTimeout(1500);
      clickEntry.urlAfter = page.url();
      clickEntry.ok = true;
      const body = summarizeBody(await page.locator('body').innerText().catch(() => ''));
      if (/Application error|Something went wrong|Unhandled Runtime Error/i.test(body)) {
        report.issues.push({
          severity: 'high',
          route: href,
          name: `Nav click: ${label}`,
          kind: 'click_led_to_error_ui',
          detail: body.slice(0, 280),
          url: clickEntry.urlAfter,
        });
        clickEntry.ok = false;
      }
      // Return home for next click
      await page.goto(`${base}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(800);
    } catch (err) {
      clickEntry.error = String(err?.message || err).slice(0, 300);
      report.issues.push({
        severity: 'medium',
        route: href,
        name: `Nav click: ${label}`,
        kind: 'click_failed',
        detail: clickEntry.error,
        url: page.url(),
      });
      await page.goto(`${base}/`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    }
    report.clicks.push(clickEntry);
    console.log(`${clickEntry.ok ? 'CLICK OK' : 'CLICK FAIL'} ${label || href}`);
  }

  // Deduplicate issues / console by text
  const uniq = (arr, keyFn) => {
    const seen = new Set();
    return arr.filter((item) => {
      const k = keyFn(item);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  };
  report.consoleErrors = uniq(report.consoleErrors, (e) => `${e.text}@@${e.url}`);
  report.pageErrors = uniq(report.pageErrors, (e) => `${e.text}@@${e.url}`);
  report.failedRequests = uniq(report.failedRequests, (e) => `${e.status} ${e.method} ${e.url}`);
  report.finishedAt = new Date().toISOString();
  report.summary = {
    loginOk: report.loginOk,
    routesTried: report.routes.length,
    routesFailed: report.routes.filter((r) => !r.ok || r.error).length,
    clicksTried: report.clicks.length,
    clicksFailed: report.clicks.filter((c) => !c.ok).length,
    issueCount: report.issues.length,
    consoleErrorCount: report.consoleErrors.length,
    pageErrorCount: report.pageErrors.length,
    failedRequestCount: report.failedRequests.length,
  };

  const outPath = resolve(outDir, 'report.json');
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`\nReport written: ${outPath}`);
  console.log(JSON.stringify(report.summary, null, 2));

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
