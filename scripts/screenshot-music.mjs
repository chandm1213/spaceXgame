import { chromium } from 'playwright-core';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 810 } })).newPage();
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));

// Detect that an AudioContext gets created + runs (proxy for "music plays")
await page.addInitScript(() => {
  const Orig = window.AudioContext || window.webkitAudioContext;
  window.__audioStates = [];
  window.AudioContext = class extends Orig {
    constructor(...a){ super(...a); window.__audioStarted = true; }
  };
});

await page.goto('http://localhost:3017', { waitUntil: 'networkidle' });
await page.getByText('BLACK HORIZON').waitFor({ timeout: 20000 });
await page.waitForTimeout(2000);
await page.screenshot({ path: 'screenshots/menu.png' }); // shows ♪ toggle (+ BEST if any)

await page.getByRole('button', { name: 'LAUNCH MISSION' }).click();
await page.waitForTimeout(1500);
const started = await page.evaluate(() => !!window.__audioStarted);
const ctxRunning = await page.evaluate(() => window.__audioStarted === true);
console.log('AUDIO_CONTEXT_CREATED:', started);

// Play a bit, then deliberately die fast by sitting in spawns
await page.mouse.move(800, 300);
await page.mouse.down();
await page.waitForTimeout(2500);
await page.screenshot({ path: 'screenshots/gameplay-1.png' });
// sit still to take damage until game over
for (let i = 0; i < 40; i++) {
  const over = await page.getByText('SIGNAL LOST').isVisible().catch(() => false);
  if (over) break;
  await page.waitForTimeout(1000);
}
await page.mouse.up();
await page.waitForTimeout(800);
await page.screenshot({ path: 'screenshots/gameover.png' });

console.log('ERRORS:', errors.length ? errors.slice(0,5) : 'none');
await browser.close();
