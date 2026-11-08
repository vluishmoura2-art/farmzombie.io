// Dedicated manual/browser QA page. It is never imported by the game.
// Buttons drive the real modules at deterministic timesteps; no debug globals.
import { World } from '../js/world.js';
import { Player } from '../js/player.js';
import { Camera } from '../js/camera.js';
import { Buildings } from '../js/buildings.js';
import { BuildingPlacement } from '../js/building-placement.js';
import { Equipment } from '../js/equipment.js';
import { EquipmentRenderer } from '../js/equipment-renderer.js';
import { Renderer } from '../js/renderer.js';
import { Combat } from '../js/combat.js';
import { ZOMBIE_ORDER, ZOMBIE_TYPES } from '../js/zombie-config.js';

const renderer = new Renderer(document.querySelector('#game'), new EquipmentRenderer());
let world, player, buildings, placement, combat, inventory, equipment, camera, scenario;
function setup(name) {
  scenario = name; world = new World(); player = new Player(2800,3072); inventory={wood:10000,stone:10000,gold:1000};
  buildings=new Buildings(world,inventory); placement=new BuildingPlacement(buildings); equipment=new Equipment();
  combat=new Combat(world,player,buildings,inventory);camera=new Camera(3072,3072); inventory.gold=0;
}
function render() {
  renderer.render(world,player,camera,equipment,placement,combat);
  const states=combat.zombies.items.map(z=>`${z.type}: ${z.health}/${z.maxHealth}${z.active?'':' dead'}`).join(' · ');
  document.querySelector('#result').textContent=`\n${scenario} | gold ${inventory.gold} | kills ${combat.zombies.kills} | ${combat.cycle.phase} wave ${combat.cycle.wave} | gameOver ${combat.gameOver}\n${states}`;
}
function categories() {
  setup('Categories'); player.angle=Math.PI/2;
  ZOMBIE_ORDER.forEach((type,i)=>combat.zombies.spawn(type,2940+i*145,3072));
  document.querySelector('#legend').replaceChildren();
  for(const type of ZOMBIE_ORDER){const c=ZOMBIE_TYPES[type],span=document.createElement('span');span.textContent=`${type.toUpperCase()} · ×${c.size}\nHP ${c.health} · speed ${c.speed}\nDamage ${c.playerDamage}/${c.buildingDamage}/${c.stashDamage} · gold ${c.goldReward}`;document.querySelector('#legend').append(span);}
  render();
}
document.querySelector('#categories').addEventListener('click',categories);
document.querySelector('#sword').addEventListener('click',()=>{
  setup('Sword');player.x=3072;player.angle=0;equipment.select(1);
  ZOMBIE_ORDER.forEach((type,i)=>combat.zombies.spawn(type,3170,3027+i*30));render();
});
document.querySelector('#towers').addEventListener('click',()=>{
  setup('Towers'); buildings.place('stash',3072,3264,player);inventory.gold=1000;
  const type=document.querySelector('#tower-type').value;
  for(let i=0;i<ZOMBIE_ORDER.length;i++){const x=2880+i*160; buildings.place(type,x,3072,player);combat.zombies.spawn(ZOMBIE_ORDER[i],x+32,2990);}
  inventory.gold=0;render();
});
document.querySelector('#swing').addEventListener('click',()=>{combat.sword(equipment);render();});
document.querySelector('#tick').addEventListener('click',()=>{
  for(let i=0;i<60;i++) {
    // Keep gallery targets stationary to inspect each tower's real impacts.
    if(scenario==='Towers'){combat.towers.update(1/60);combat.zombies.update(1/60);}
    else if(scenario==='Sword'){combat.swordCooldown=Math.max(0,combat.swordCooldown-1/60);combat.zombies.update(1/60);}
    else combat.update(1/60);
  } render();
});
document.querySelector('#night').addEventListener('click',()=>{
  setup('Night cycle'); buildings.place('stash',3072,3264,player);
  for(let i=0;i<61*60;i++)combat.update(1/60);render();
});
document.querySelector('#defeat').addEventListener('click',()=>{
  setup('Stash defeat');const stash=buildings.place('stash',3072,3072,player).building;
  stash.health=1;combat.zombies.spawn('yellow',3104,3008);player.x=2400;render();
});
window.addEventListener('resize',()=>{renderer.resize();render();});
categories();
