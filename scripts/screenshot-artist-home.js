// One-off script: capture a real screenshot of a live Artist Home page for
// marketing use, replacing the AI-generated hype poster on the landing hero.
const { chromium } = require('playwright');
const path = require('path');

const URL = process.argv[2] || 'http://localhost:9002/profile/neomaiya-sol-paQXxm';
const OUT = process.argv[3] || path.join(__dirname, '..', 'public', 'marketing', 'feature-artist-home-real.png');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2,
  });
  await page.goto(URL, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(8000);
  try {
    await page.getByRole('button', { name: /got it/i }).click({ timeout: 3000 });
    await page.waitForTimeout(500);
  } catch {
    // no cookie banner present
  }
  // Hide the guest "claim this page" bar for a clean marketing shot.
  await page.addStyleTag({
    content: '[aria-label="Claim your free Artist Home"] { display: none !important; }',
  });
  await page.screenshot({ path: OUT, fullPage: false });
  await browser.close();
  console.log('Saved screenshot to', OUT);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
