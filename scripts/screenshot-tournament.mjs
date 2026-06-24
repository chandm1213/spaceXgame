import { chromium } from 'playwright-core';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();

await page.goto('http://localhost:3017', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(4000);

// Scroll the tournament panel into view
const panel = page.getByText('WEEKLY TOURNAMENT', { exact: false }).first();
try {
  await panel.scrollIntoViewIfNeeded({ timeout: 8000 });
  await page.waitForTimeout(800);
  await panel.screenshot({ path: 'screenshots/tournament-panel.png' });
} catch (e) {
  console.log('panel not found:', e.message);
}
await page.screenshot({ path: 'screenshots/tournament-menu.png' });

await browser.close();
console.log('done');
