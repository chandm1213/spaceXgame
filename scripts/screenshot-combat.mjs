import { chromium } from 'playwright-core';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 810 } })).newPage();

await page.goto('http://localhost:3017', { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'LAUNCH MISSION' }).click({ timeout: 20000 });

// Hold still and let the hunters close in, firing toward them
await page.waitForTimeout(11000);
await page.mouse.move(720, 250);
await page.mouse.down();
await page.waitForTimeout(1800);
await page.screenshot({ path: 'screenshots/gameplay-combat.png' });
await page.mouse.up();

await browser.close();
