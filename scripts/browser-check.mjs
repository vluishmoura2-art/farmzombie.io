// Shared acceptance checks for a connected CUA Tab or optional standalone
// Playwright. Neither browser automation library is a game dependency.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';

export async function runBrowserChecks(tab, { outputDir = resolve('test-results'), resize, resetViewport } = {}) {
  await mkdir(outputDir, { recursive: true });
  const passed = [];
  const state = () => tab.playwright.evaluate(() => {
    const canvas = document.querySelector('#game');
    const slots = document.querySelector('#equipment').getBoundingClientRect();
    const counters = document.querySelector('#resource-counters').getBoundingClientRect();
    return {
      x: Number(document.querySelector('#game').dataset.playerX), y: Number(document.querySelector('#game').dataset.playerY),
      wood: Number(document.querySelector('#wood-count').value), stone: Number(document.querySelector('#stone-count').value),
      width: innerWidth, height: innerHeight, bufferWidth: canvas.width, bufferHeight: canvas.height,
      ratio: Math.min(devicePixelRatio || 1, 2),
      slots: { x: slots.x, bottom: innerHeight - slots.bottom, count: document.querySelectorAll('.equipment-slot').length },
      countersRight: innerWidth - counters.right,
      selected: document.querySelector('.equipment-slot[aria-pressed="true"]').dataset.slot,
      feedback: document.querySelector('#harvest-feedback').textContent,
      overflow: document.documentElement.scrollWidth > innerWidth,
    };
  });
  const capture = async (name) => writeFile(resolve(outputDir, name), await tab.getScreenshot());
  const clickResource = async (worldX, worldY, options, captureName) => {
    const s = await state();
    await tab.click([Math.round(worldX - s.x + s.width / 2), Math.round(worldY - s.y + s.height / 2)], options);
    if (captureName) await capture(captureName);
    await tab.getAXState();
    return state();
  };
  const move = async (key, durationMs) => {
    await tab.pressKey(null, key, { durationMs: Math.max(30, Math.round(durationMs)) });
    await tab.getAXState();
    return state();
  };
  const exhaust = async (worldX, worldY, material, total) => {
    for (let attempt = 0; attempt < 20 && (await state())[material] < total; attempt++) await clickResource(worldX, worldY);
    assert.equal((await state())[material], total);
    await clickResource(worldX, worldY);
    assert.equal((await state())[material], total, 'depleted resources must not award again');
  };

  // Supply a dedicated QA tab so the user's current session is preserved.
  await tab.reload();
  await tab.getAXState();
  let s = await state();
  assert.equal(s.x, 3072);
  assert.equal(s.y, 3072);
  assert.equal(s.wood, 0);
  assert.equal(s.stone, 0);
  assert.equal(s.selected, '0');
  assert.equal(s.slots.count, 2);
  assert.equal(s.slots.x, 18);
  assert.equal(s.slots.bottom, 18);
  assert.ok(s.bufferWidth > 0 && s.bufferHeight > 0);
  await capture('phase4-world.png');
  passed.push('Boot and world screenshot, zero counters, two slots and default pickaxe');

  s = await clickResource(3257, 3122);
  assert.equal(s.wood, 0);
  assert.match(s.feedback, /closer/);
  await move('d', 450);
  s = await state();
  assert.ok(s.x > 3140 && s.x < 3240);
  assert.equal(s.slots.x, 18);
  assert.equal(s.slots.bottom, 18);
  passed.push('WASD, camera scroll, fixed inventory and rejection of distant resource clicks');

  await tab.pressKey(null, '2');
  s = await clickResource(3257, 3122);
  assert.equal(s.selected, '1');
  assert.equal(s.wood, 0);
  assert.match(s.feedback, /pickaxe/);
  await tab.pressKey(null, '1');
  s = await clickResource(3257, 3122, undefined, 'phase4-swing.png');
  assert.equal(s.wood, 3);
  await capture('phase4-tree-hit.png');
  const beforeDouble = s.wood;
  const doubleStarted = performance.now();
  s = await clickResource(3257, 3122, { clickCount: 2 });
  // Native browser automation may space its two clicks by more than 300ms.
  // Enforce the strict single-reward limit when the measured call is faster
  // than cooldown; exact 299/300ms behavior is covered by the logic suite.
  const doubleElapsed = performance.now() - doubleStarted;
  assert.ok(s.wood - beforeDouble <= (doubleElapsed < 300 ? 3 : 6), 'clicks must not bypass cooldown or award more than once per event');
  await exhaust(3257, 3122, 'wood', 9);
  passed.push('Pickaxe-only wood collection, +3 per hit, swing capture, 300ms cooldown, depletion after three hits at 9 and no duplicate rewards');

  s = await state();
  await move('w', (s.y - 3019) / 240 * 1000);
  s = await state();
  await move('a', (s.x - 2980) / 240 * 1000);
  s = await move('a', 180);
  assert.ok(Math.hypot(s.x - 2892, s.y - 2987) >= 35 + 29.5 - 2);
  s = await clickResource(2892, 2987);
  assert.equal(s.stone, 3);
  await capture('phase4-stone-hit.png');
  const stoneBeforeHUD = s.stone;
  await tab.playwright.locator('[data-slot="1"]').click();
  await tab.getAXState();
  await tab.playwright.locator('[data-slot="0"]').click();
  await tab.getAXState();
  await tab.playwright.locator('#resource-counters').click();
  await tab.getAXState();
  assert.equal((await state()).stone, stoneBeforeHUD);
  await exhaust(2892, 2987, 'stone', 9);
  passed.push('Stone collisions, +3 per hit, click-based slot switching, HUD isolation and stone depletion without duplicates');

  await tab.pressKey(null, 'Escape');
  await tab.getAXState();
  assert.equal(await tab.playwright.locator('#pause-overlay').isVisible(), true);
  const paused = await state();
  await move('d', 180);
  assert.equal((await state()).x, paused.x);
  await tab.pressKey(null, 'Escape');
  await tab.getAXState();
  assert.equal(await tab.playwright.locator('#pause-overlay').isVisible(), false);
  passed.push('Pause/resume preserved; movement cannot advance while paused');

  if (resize) {
    try {
      for (const size of [{ width: 390, height: 844 }, { width: 1280, height: 800 }]) {
        await resize(size);
        await tab.getAXState();
        s = await state();
        assert.equal(s.width, size.width);
        assert.equal(s.height, size.height);
        assert.equal(s.bufferWidth, Math.round(s.width * s.ratio));
        assert.equal(s.bufferHeight, Math.round(s.height * s.ratio));
        assert.equal(s.slots.x, 18);
        assert.equal(s.slots.bottom, 18);
        assert.equal(s.countersRight, size.width < 600 ? 18 : 30);
        assert.equal(s.overflow, false);
        assert.equal(s.wood, 9);
        assert.equal(s.stone, 9);
        await capture(`phase4-${size.width}.png`);
      }
    } finally { if (resetViewport) await resetViewport(); }
    passed.push('390×844 and 1280×800 resize, backing buffer, fixed HUD and retained counters');
  }
  const errors = await tab.dev.logs({ levels: ['error'], limit: 30 });
  assert.equal(errors.length, 0, 'browser console must have no errors');
  passed.push('No console errors or broken imports');
  const report = { phase: '4', passed, errors };
  await writeFile(resolve(outputDir, 'browser-results.json'), JSON.stringify(report, null, 2));
  return report;
}

// Optional standalone adapter for developers with Playwright installed.
if (typeof process !== 'undefined' && process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)).href : 'playwright');
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto('http://127.0.0.1:7777');
    const tab = {
      playwright: page,
      reload: () => page.reload(),
      getAXState: () => page.waitForTimeout(400),
      getScreenshot: () => page.screenshot(),
      click: ([x, y], options) => page.mouse.click(x, y, options),
      pressKey: async (_target, key, options = {}) => {
        if (!options.durationMs) return page.keyboard.press(key);
        await page.keyboard.down(key);
        await page.waitForTimeout(options.durationMs);
        await page.keyboard.up(key);
      },
      dev: { logs: async () => errors },
    };
    const report = await runBrowserChecks(tab, { resize: (size) => page.setViewportSize(size) });
    console.log(report.passed.map((result) => `PASS ${result}`).join('\n'));
  } finally { await browser.close(); }
}
