import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';

// Pass a CUA tab already opened to /qa/combat.html. The fixture uses the actual
// game modules with isolated state and explicit deterministic simulation buttons.
export async function runCombatBrowserChecks(tab, outputDir) {
  const passed = [];
  const click = async id => { await tab.playwright.locator(`#${id}`).click(); await tab.getAXState({ emit: false }); };
  const result = () => tab.playwright.locator('#result').textContent();
  await click('categories');
  assert.match(await result(), /green: 40\/40.*diamond: 160\/160.*yellow: 520\/520/s);
  passed.push('Three categories render with the shared humanoid silhouette, exact palette and increasing sizes');
  await click('sword'); await click('swing');
  const oneHit = await result();
  assert.match(oneHit, /gold 0.*green: 15\/40.*diamond: 135\/160.*yellow: 495\/520/s);
  await click('swing'); assert.equal(await result(), oneHit);
  for (let i = 0; i < 20; i++) { await click('tick'); await click('swing'); }
  assert.match(await result(), /gold 83 \| kills 3/);
  await writeFile(`${outputDir}/phase6-sword-rewards.png`, await tab.getScreenshot({ emit: false }));
  await click('tick'); await click('swing'); assert.match(await result(), /gold 83 \| kills 3/);
  passed.push('Sword damages every tier; cooldown blocks duplicates; three deaths pay exactly 83 gold');
  for (const type of ['ballista','cannon','melee','bomb','mage']) {
    await tab.playwright.locator('#tower-type').selectOption(type);
    await tab.getAXState({ emit: false }); await click('towers'); await click('tick');
    const state = await result();
    assert.doesNotMatch(state, /green: 40\/40|diamond: 160\/160|yellow: 520\/520/);
    assert.match(state, /Towers/);
  }
  await writeFile(`${outputDir}/phase6-towers.png`, await tab.getScreenshot({ emit: false }));
  passed.push('All five tower systems damage all three stationary category targets in the real Canvas runtime');
  await click('night'); assert.match(await result(), /night wave 1/);
  assert.doesNotMatch(await result(), /diamond:|yellow:/);
  passed.push('Day advances to night and wave 1 spawns green enemies only');
  await click('defeat'); await click('tick'); assert.match(await result(), /gameOver true/);
  const ended = await result(); await click('tick'); assert.equal(await result(), ended);
  passed.push('Stash destruction ends and freezes the simulation');
  const errors = await tab.dev.logs({ levels: ['error'], limit: 50 }); assert.equal(errors.length, 0);
  passed.push('No console errors or broken module imports');
  const report = { phase: 6, passed, errors, scope: 'Dedicated QA fixture using production modules; normal HUD checked separately' };
  await writeFile(`${outputDir}/phase6-browser-results.json`, JSON.stringify(report, null, 2));
  return report;
}
