import { chromium } from 'playwright-core';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 810 } })).newPage();

const errors = [];
page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()));
page.on('pageerror', (err) => errors.push(String(err)));

await page.goto('http://localhost:3017', { waitUntil: 'networkidle' });
await page.getByText('BLACK HORIZON').waitFor({ timeout: 20000 });
await page.waitForTimeout(2500);

// Menu now shows hull skins + weapon picker
await page.screenshot({ path: 'screenshots/menu.png' });

// Pick the INFERNO hull and the RAILGUN
await page.getByTitle('INFERNO — VOLCANIC PLATING').click();
await page.getByRole('button', { name: /RAILGUN/ }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: 'screenshots/menu-loadout.png' });

await page.getByRole('button', { name: 'LAUNCH MISSION' }).click();
await page.waitForTimeout(1500);

// Fly + fire: pink railgun bolts, mission tracker, weapon bar
await page.mouse.move(950, 300);
await page.keyboard.down('w');
await page.keyboard.down('d');
await page.mouse.down();
await page.waitForTimeout(3000);
await page.screenshot({ path: 'screenshots/gameplay-1.png' });

// Switch to SCATTER mid-fight with hotkey 3
await page.keyboard.press('3');
await page.keyboard.up('d');
await page.keyboard.down('a');
await page.mouse.move(500, 360);
await page.waitForTimeout(3500);
await page.screenshot({ path: 'screenshots/gameplay-2.png' });

// Keep hunting to clear objectives and let waves climb toward a Behemoth
const dirs = ['w', 'a', 's', 'd'];
for (let i = 0; i < 22; i++) {
  const d = dirs[i % dirs.length];
  await page.keyboard.down(d);
  await page.mouse.move(400 + ((i * 137) % 700), 250 + ((i * 91) % 350));
  await page.waitForTimeout(3000);
  await page.keyboard.up(d);
}
await page.screenshot({ path: 'screenshots/gameplay-combat.png' });

await page.mouse.up();
await page.keyboard.up('w');
await page.keyboard.up('a');

// Report run state from the store via the DOM HUD
const wave = await page.locator('text=WAVE').first().isVisible().catch(() => false);
console.log('WAVE_HUD_VISIBLE:', wave);
console.log('CONSOLE_ERRORS:', errors.length ? errors.slice(0, 5) : 'none');
await browser.close();
