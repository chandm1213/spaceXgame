import { chromium } from 'playwright-core';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 810 } })).newPage();

await page.goto('http://localhost:3017', { waitUntil: 'domcontentloaded' });
await page.getByRole('button', { name: 'LAUNCH MISSION' }).click({ timeout: 30000 });
await page.waitForTimeout(2500);

// --- Mothership ---
await page.evaluate(() => window.__spawnMother());
await page.waitForTimeout(1600);
// Fire toward the saucer so bolts streak in the shot
await page.mouse.move(720, 230);
await page.mouse.down();
await page.waitForTimeout(900);
await page.screenshot({ path: 'screenshots/update-mothership.png' });
await page.mouse.up();

// --- OVERDRIVE ready meter (charge to full) ---
await page.evaluate(() => window.__game.setState({ overdrive: 100 }));
await page.waitForTimeout(600);
await page.screenshot({ path: 'screenshots/update-overdrive-ready.png' });

// --- OVERDRIVE supernova detonation ---
await page.evaluate(() => window.__game.getState().detonateOverdrive());
await page.waitForTimeout(280);
await page.screenshot({ path: 'screenshots/update-overdrive-blast.png' });

await browser.close();
console.log('done');
