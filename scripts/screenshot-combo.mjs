import { chromium } from 'playwright-core';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 810 } })).newPage();

await page.goto('http://localhost:3017', { waitUntil: 'domcontentloaded' });
await page.getByRole('button', { name: 'LAUNCH MISSION' }).click({ timeout: 30000 });
await page.waitForTimeout(2500);

// Stage a high combo and keep its timer topped up, firing for atmosphere
await page.evaluate(() => {
  const g = window.__game;
  const pump = () =>
    g.setState({ combo: 21, comboMult: 6, comboExpire: performance.now() + 3000, bestCombo: 21 });
  pump();
  window.__combo = setInterval(pump, 500);
});
await page.mouse.move(760, 240);
await page.mouse.down();
await page.waitForTimeout(1000);
await page.screenshot({ path: 'screenshots/update-combo.png' });
await page.mouse.up();

await browser.close();
console.log('done');
