import { World } from '../js/world.js';
import { Player } from '../js/player.js';
import { Buildings } from '../js/buildings.js';
import { BuildingUpgrades } from '../js/building-upgrades.js';
import { BuildingRenderer } from '../js/building-renderer.js';
import { UpgradeUI } from '../js/upgrade-ui.js';
import { TIERS } from '../js/tier-config.js';
import { BUILDING_TYPES } from '../js/building-config.js';
const markup = new DOMParser().parseFromString(await (await fetch('/')).text(), 'text/html');
document.body.append(markup.querySelector('#upgrade-panel'));
const world = new World(), player = new Player(800,800), inventory = {wood:1000000,stone:1000000,gold:1000000};
const buildings = new Buildings(world,inventory), drawing = new BuildingRenderer();
const stash = buildings.place('stash',1024,1024,player).building;
const mine = buildings.place('field',1152,1024,player).building;
const upgrades = new BuildingUpgrades(buildings);
function refresh() {
 document.querySelector('#balances').textContent = `Wood ${inventory.wood} / Stone ${inventory.stone} / Gold ${inventory.gold}`;
 document.querySelector('#state').textContent = `Stash tier ${stash.tier}; Mine tier ${mine.tier}; Mine position ${mine.x},${mine.y}; Occupied cells ${buildings.occupancy.cells.size}`;
}
const ui = new UpgradeUI(document.querySelector('#upgrade-panel'),upgrades,drawing,refresh,()=>{});
document.querySelector('#stash').onclick=()=>ui.show(stash);
document.querySelector('#mine').onclick=()=>ui.show(mine);
const ctx=document.querySelector('#materials').getContext('2d');
ctx.fillStyle='#f4f1df';ctx.fillRect(0,0,900,850);ctx.font='12px sans-serif';
for(const [column,tier] of TIERS.entries()) {
 ctx.fillStyle='#253426';ctx.fillText(tier.name,column*100+14,24);
 for(const [row,type] of Object.keys(BUILDING_TYPES).entries()) {
  drawing.draw(ctx,type,column*100+15,row*100+38,64,0,tier.level);
  ctx.fillStyle='#253426';ctx.font='10px sans-serif';ctx.fillText(BUILDING_TYPES[type].name,column*100+4,row*100+116);
 }
}
refresh();
