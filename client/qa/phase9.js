import { World } from '../js/world.js';
import { Player } from '../js/player.js';
import { Buildings } from '../js/buildings.js';
import { BuildingUpgrades } from '../js/building-upgrades.js';
import { BuildingRenderer } from '../js/building-renderer.js';
import { UpgradeUI } from '../js/upgrade-ui.js';
import { Equipment } from '../js/equipment.js';
import { EquipmentShop } from '../js/equipment-shop.js';
import { EquipmentRenderer } from '../js/equipment-renderer.js';
import { ShopUI, bindShopControls } from '../js/shop-ui.js';
const markup = new DOMParser().parseFromString(await (await fetch('/')).text(),'text/html');
for(const id of ['upgrade-panel','shop-panel'])document.body.append(markup.querySelector(`#${id}`));
const inventory={wood:1000000,stone:1000000,gold:1000000},world=new World(),player=new Player(800,800);
const buildings=new Buildings(world,inventory),stash=buildings.place('stash',1024,1024,player).building;
const mines=Array.from({length:8},(_,i)=>buildings.place('field',1152+i%4*96,1024+Math.floor(i/4)*96,player).building);
const tower=buildings.place('ballista',1152,1312,player).building;
const upgrades=new BuildingUpgrades(buildings);upgrades.purchase(stash,1);
const equipment=new Equipment(),shop=new EquipmentShop(equipment,inventory,upgrades),drawing=new BuildingRenderer();
function refresh(){
 document.querySelector('#balances').textContent=`Wood ${inventory.wood} / Stone ${inventory.stone} / Gold ${inventory.gold}`;
 document.querySelector('#state').textContent=`Stash tier ${stash.tier}; Mines: ${mines.map(b=>b.tier).join(',')}; Ballista tier ${tower.tier}; Cells ${buildings.occupancy.cells.size}\nPickaxe tier ${equipment.items[0].tier}; Sword tier ${equipment.items[1].tier}; Mine positions ${mines.map(b=>`${b.id}:${b.x},${b.y}`).join(' / ')}`;
 const ctx=document.querySelector('#qa-world').getContext('2d');ctx.clearRect(0,0,640,160);
 for(const [i,b]of mines.entries()){drawing.draw(ctx,b.type,i*80,10,64,0,b.tier);ctx.fillStyle='#253426';ctx.fillText(`Mine ${i+1}: tier ${b.tier}`,i*80,96);}
}
const ui=new UpgradeUI(document.querySelector('#upgrade-panel'),upgrades,drawing,refresh,()=>{});
const shopUI=new ShopUI(document.querySelector('#shop-panel'),shop,new EquipmentRenderer(),refresh,()=>{});
bindShopControls(window,document.querySelector('#qa-shop'),shopUI,()=>!ui.open&&!shopUI.open,()=>{});
document.querySelector('#qa-first').onclick=()=>ui.show(mines[0]);document.querySelector('#qa-second').onclick=()=>ui.show(mines[1]);
document.querySelector('#qa-poor').onclick=()=>{Object.assign(inventory,{wood:27,stone:27,gold:12});refresh();};
document.querySelector('#qa-fund').onclick=()=>{Object.assign(inventory,{wood:1000000,stone:1000000,gold:1000000});refresh();};
document.querySelector('#qa-unlock').onclick=()=>{while(stash.tier<9)upgrades.purchase(stash,stash.tier);refresh();};
refresh();
