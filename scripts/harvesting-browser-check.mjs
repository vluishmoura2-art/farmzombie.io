import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
export const readHarvestState = tab => tab.playwright.evaluate(() => ({
  x:Number(document.querySelector('#game').dataset.playerX),y:Number(document.querySelector('#game').dataset.playerY),
  width:innerWidth,height:innerHeight,wood:Number(document.querySelector('#wood-count').value),stone:Number(document.querySelector('#stone-count').value),gold:Number(document.querySelector('#gold-count').value),
  feedback:document.querySelector('#harvest-feedback').textContent,
}));
export async function offTargetClick(tab) {
  const s=await readHarvestState(tab);
  await tab.click([Math.round(s.width/2-160),Math.round(s.height/2+80)]);
  await tab.getAXState({emit:false});
  return readHarvestState(tab);
}
export async function checkWood(tab,outputDir) {
  assert.equal((await offTargetClick(tab)).wood,0);
  await tab.pressKey(null,'d',{durationMs:450});await tab.getAXState({emit:false});
  await tab.pressKey(null,'2');await tab.getAXState({emit:false});
  assert.equal((await offTargetClick(tab)).wood,0);
  await tab.pressKey(null,'1');await tab.getAXState({emit:false});
  for(let i=1;i<=9;i++)assert.equal((await offTargetClick(tab)).wood,i*3);
  const before=await readHarvestState(tab);
  await tab.playwright.locator('[data-slot="0"]').click();await tab.getAXState({emit:false});
  await tab.playwright.locator('#resource-counters').click();await tab.getAXState({emit:false});
  assert.equal((await readHarvestState(tab)).wood,before.wood);
  await writeFile(`${outputDir}/phase7-tree.png`,await tab.getScreenshot({emit:false}));
  return 'Distant clicks and sword rejected; nine off-target pickaxe clicks give 27 wood; HUD gives nothing';
}
export async function checkStone(tab,outputDir) {
  let s=await readHarvestState(tab);
  await tab.pressKey(null,'w',{durationMs:Math.round((s.y-3019)/240*1000)});await tab.getAXState({emit:false});
  s=await readHarvestState(tab);
  await tab.pressKey(null,'a',{durationMs:Math.round((s.x-2970)/240*1000)});await tab.getAXState({emit:false});
  for(let i=1;i<=9;i++)assert.equal((await offTargetClick(tab)).stone,i*3);
  assert.equal((await readHarvestState(tab)).wood,27);
  await writeFile(`${outputDir}/phase7-stone.png`,await tab.getScreenshot({emit:false}));
  return 'Camera movement preserves proximity targeting; nine off-target clicks give 27 stone';
}
