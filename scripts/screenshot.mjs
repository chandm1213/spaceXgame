import { chromium } from 'playwright-core';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 810 } })).newPage();

const errors = [];
page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()));
page.on('pageerror', (err) => errors.push(String(err)));

await page.goto('http://localhost:3017', { waitUntil: 'networkidle' });
await page.getByText('BLACK HORIZON').waitFor({ timeout: 20000 });
await page.waitForTimeout(2500); // let WebGL warm up behind the menu
await page.screenshot({ path: 'screenshots/menu.png' });

// Launch the mission
await page.getByRole('button', { name: 'LAUNCH MISSION' }).click();
await page.waitForTimeout(2000);

// Fly forward-right while aiming and firing
await page.mouse.move(900, 300);
await page.keyboard.down('w');
await page.keyboard.down('d');
await page.mouse.down();
await page.waitForTimeout(2600);
await page.screenshot({ path: 'screenshots/gameplay-1.png' });

// Keep flying so aliens close in, fire some more
await page.keyboard.up('d');
await page.keyboard.down('a');
await page.mouse.move(500, 350);
await page.waitForTimeout(3500);
await page.screenshot({ path: 'screenshots/gameplay-2.png' });

await page.mouse.up();
await page.keyboard.up('w');
await page.keyboard.up('a');

console.log('CONSOLE_ERRORS:', errors.length ? errors.slice(0, 5) : 'none');
await browser.close();
