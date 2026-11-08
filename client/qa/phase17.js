import { World } from '../js/world.js';
import { Player } from '../js/player.js';
import { Buildings } from '../js/buildings.js';
import { BuildingPlacement } from '../js/building-placement.js';
import { BuildingRenderer } from '../js/building-renderer.js';
import { BuildingHUD } from '../js/building-hud.js';
import { EquipmentRenderer } from '../js/equipment-renderer.js';
import { PlayerRenderer } from '../js/player-renderer.js';
import { equipmentTier } from '../js/equipment-config.js';
const world=new World(),inventory={wood:10000,stone:10000,gold:10000},player=new Player(1600,1600);
const buildings=new Buildings(world,inventory),placement=new BuildingPlacement(buildings),drawing=new BuildingRenderer();
buildings.place('stash',1024,1024,player);
const hud=new BuildingHUD(document.querySelector('#building-bar'),placement,drawing);
const canvas=document.querySelector('#qa-world'),ctx=canvas.getContext('2d'),tools=new EquipmentRenderer(),body=new PlayerRenderer();
function draw(){
 canvas.width=innerWidth;canvas.height=innerHeight;ctx.fillStyle='#5AAE33';ctx.fillRect(0,0,innerWidth,innerHeight);
 ctx.save();ctx.translate(innerWidth/2-108,Math.max(100,innerHeight/2-64));
 for(const [i,id] of ['pickaxe','sword'].entries()){
   ctx.save();ctx.translate(i*170,0);body.drawEquipped(ctx,tools,equipmentTier(id,1),-.6,0);ctx.restore();
 }
 ctx.restore();
 ctx.save();ctx.translate(innerWidth/2-1056,innerHeight/2-1100);
 drawing.drawWorld(ctx,buildings,placement,700,700,1000,1000,{shadows:false,motion:false},1);ctx.restore();hud.refresh();
}
document.querySelector('#fund').onclick=()=>{Object.assign(inventory,{wood:10000,stone:10000,gold:10000});draw();};
document.querySelector('#poor').onclick=()=>{Object.assign(inventory,{wood:12,stone:3,gold:6});draw();};
document.querySelector('#limit').onclick=()=>{Object.assign(inventory,{wood:10000,stone:10000,gold:10000});for(let i=0;i<8;i++)if(!buildings.items.some(b=>b.type==='ballista'&&b.x===640+i*96))buildings.place('ballista',640+i*96,736,player);draw();};
document.querySelector('#remove').onclick=()=>{buildings.remove(buildings.items.find(b=>b.type==='ballista'));draw();};
for(const [id,x] of [['valid',1152],['invalid',1024]])document.querySelector('#'+id).onclick=()=>{placement.select('field');placement.update(x,1024,player);draw();};
document.querySelector('#building-bar').addEventListener('click',draw);
window.addEventListener('resize',()=>{hud.resize();draw();});draw();
