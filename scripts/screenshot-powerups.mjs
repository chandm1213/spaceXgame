import { chromium } from 'playwright-core';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 810 } })).newPage();

await page.goto('http://localhost:3017', { waitUntil: 'domcontentloaded' });
await page.getByRole('button', { name: 'LAUNCH MISSION' }).click({ timeout: 30000 });
await page.waitForTimeout(2500);

// Drop a fan of power-ups in front of the ship and light up active buffs
await page.evaluate(() => {
  const g = window.__game;
  const THREE = window.__THREE;
  const kinds = ['rapid', 'triple', 'damage', 'magnet', 'shield'];
  const ups = kinds.map((kind, i) => ({
    id: 9000 + i,
    pos: new THREE.Vector3(-9 + i * 4.5, 2.2, -10),
    kind,
    seed: i * 13,
  }));
  const now = performance.now();
  g.setState({
    powerups: ups,
    buffs: { rapid: now + 7000, triple: now + 5200, damage: now + 6400, magnet: now + 3000 },
    lastPower: 'rapid',
    powerFlash: now,
  });
});
await page.mouse.move(720, 250);
await page.mouse.down();
await page.waitForTimeout(900);
await page.screenshot({ path: 'screenshots/update-powerups.png' });
await page.mouse.up();

await browser.close();
console.log('done');
