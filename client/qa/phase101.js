import {PlayerRenderer} from '../js/player-renderer.js';
import {EquipmentRenderer} from '../js/equipment-renderer.js';
import {ResourceRenderer} from '../js/resource-renderer.js';
import {HumanoidRenderer} from '../js/humanoid.js';
import {World} from '../js/world.js';
import {Player} from '../js/player.js';
import {Equipment} from '../js/equipment.js';
import {EquipmentHUD} from '../js/equipment-hud.js';
import {Buildings} from '../js/buildings.js';
import {BuildingPlacement} from '../js/building-placement.js';
import {BuildingHUD} from '../js/building-hud.js';
import {BuildingRenderer} from '../js/building-renderer.js';
import {VisualEffects} from '../js/visual-effects.js';
import {PERFORMANCE_MODES} from '../js/visual-config.js';
import {createResource} from '../js/resources.js';
import {Harvesting} from '../js/harvesting.js';
import {resourceImpactScale} from '../js/art-config.js';
import {TIERS} from '../js/tier-config.js';
import {ZOMBIE_TYPES} from '../js/zombie-config.js';
const playerArt=new PlayerRenderer(),tools=new EquipmentRenderer(),resources=new ResourceRenderer(),zombies=new HumanoidRenderer();
const gallery=document.querySelector('#gallery'),gc=gallery.getContext('2d'),galleryWorld=new World();
for(const [i,x]of [130,290,450,700,830,960].entries())galleryWorld.resources.add(createResource(`gallery-${i}`,i<3?'tree':'stone',x,330));
function drawGallery(){
 gc.fillStyle='#5AAE33';gc.fillRect(0,0,1100,650);gc.fillStyle='#152012';gc.font='700 13px Inter, sans-serif';gc.fillText('CIRCULAR PLAYER · FACING / GRIP',30,24);gc.fillText('ZOMBIE DESIGNS PRESERVED',780,24);
 for(const [row,id]of ['pickaxe','sword'].entries())for(const [i,angle]of [0,Math.PI/2,Math.PI,-Math.PI/2].entries()){
  gc.save();gc.translate(110+i*170,90+row*120);playerArt.drawEquipped(gc,tools,{id,tier:1},angle,Number(document.querySelector('#qa-swing').value));gc.restore();
  gc.fillStyle='#152012';gc.font='11px Inter, sans-serif';gc.fillText(`${id} · ${['RIGHT','DOWN','LEFT','UP'][i]}`,70+i*170,150+row*120);
 }
 for(const [i,type]of Object.keys(ZOMBIE_TYPES).entries()){const c=ZOMBIE_TYPES[type];gc.save();gc.translate(820+i%2*150,90+Math.floor(i/2)*115);gc.scale(c.size,c.size);zombies.draw(gc,c.color,c.outline);gc.restore();gc.fillStyle='#152012';gc.fillText(type.toUpperCase(),790+i%2*150,145+Math.floor(i/2)*115);}
 gc.fillStyle='#152012';gc.font='700 13px Inter, sans-serif';gc.fillText('LAYERED CANOPY / TRUNK / CONTACT SHADOW · COLLISION 45.5',30,290);gc.fillText('FACETED ROCK · COLLISION 29.5',660,290);resources.draw(gc,galleryWorld.resources,0,0,1100,650);
 gc.fillText('NINE TIERS · UNCHANGED EQUIPMENT PROGRESSION',30,417);
 for(const [i,tier]of TIERS.entries()){gc.fillStyle='#152012';gc.font='700 11px Inter, sans-serif';gc.fillText(tier.name.toUpperCase(),40+i*118,442);gc.save();gc.translate(30+i*118,451);tools.drawIcon(gc,'pickaxe',64,tier.level);gc.restore();gc.save();gc.translate(30+i*118,553);tools.drawIcon(gc,'sword',64,tier.level);gc.restore();}
}
document.querySelector('#qa-swing').oninput=drawGallery;drawGallery();
const markup=new DOMParser().parseFromString(await(await fetch('/')).text(),'text/html'),dock=markup.querySelector('.game-dock');dock.id='qa-dock';document.querySelector('#dock-mount').append(dock);
const equipment=new Equipment(),hudWorld=new World(),buildings=new Buildings(hudWorld,{wood:100000,stone:100000,gold:100000});buildings.place('stash',1024,1024,new Player(800,800));
const equipmentHUD=new EquipmentHUD(document.querySelector('#equipment'),equipment,tools);new BuildingHUD(document.querySelector('#building-bar'),new BuildingPlacement(buildings),new BuildingRenderer());
let world,members,player,harvesting,effects,frame=0,lastStatus='Ready';
function reset(){world=new World();effects=new VisualEffects(PERFORMANCE_MODES.balanced);world.resources.feedback=effects;harvesting=new Harvesting();player=new Player(960,910);player.angle=Math.PI/2;frame=0;lastStatus='Ready';
 const types={tree:['tree'],stone:['stone'],trees:['tree','tree'],stones:['stone','stone'],mixed:['tree','stone']}[document.querySelector('#qa-kind').value];
 members=types.map((type,i)=>createResource(`member-${i}`,type,960+i*(types[0]==='tree'?(types[1]==='stone'?87:103):71),1000));
 for(const node of members){node.formationId='sample';world.resources.add(node);}world.resources.formations.push({id:'sample',type:'sample',members});renderFeedback();}
function renderFeedback(){
 const ctx=document.querySelector('#feedback-scene').getContext('2d'),left=850,top=850,flash=members.filter(n=>n.flashPending&&n.hitUntil>world.resources.time).map(n=>n.id);frame++;
 ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#5AAE33';ctx.fillRect(0,0,640,240);ctx.save();ctx.translate(-left,-top);resources.draw(ctx,world.resources,left,top,640,240);ctx.save();ctx.translate(player.x,player.y);playerArt.drawEquipped(ctx,tools,equipment.selected,player.angle,player.harvestSwingAngle);ctx.restore();effects.draw(ctx,left,top,640,240);ctx.restore();
 const particles=effects.particles.filter(p=>p.time>0);document.querySelector('#qa-feedback').textContent=`Frame ${frame}; status: ${lastStatus}; flash this draw: ${flash.join(',')||'none'}\nWood ${harvesting.inventory.wood}; Stone ${harvesting.inventory.stone}; particles ${particles.length}; ${members.filter(n=>n.active).length}/${members.length} nodes active\nTree scale: ${members.filter(n=>n.type==='tree').map(n=>resourceImpactScale(n.hitUntil,world.resources.time).toFixed(3)).join(',')||'n/a'}; collision radii: ${members.map(n=>n.radius).join(',')}`;
}
document.querySelector('#qa-kind').onchange=reset;document.querySelector('#qa-tool').onchange=()=>{equipment.select(document.querySelector('#qa-tool').value==='sword'?1:0);equipmentHUD.refresh();renderFeedback();};
document.querySelector('#qa-hit').onclick=()=>{world.resources.update(.3);effects.update(.3);harvesting.update(.3);const result=harvesting.attempt(player,equipment,world.resources,-9999,-9999);lastStatus=result.status;if(result.status==='hit')player.startHarvestSwing();renderFeedback();};
document.querySelector('#qa-next').onclick=renderFeedback;
document.querySelector('#qa-peak').onclick=()=>{world.resources.update(.08);effects.update(.08);player.harvestSwingTime=Math.max(0,player.harvestSwingTime-.08);renderFeedback();};
document.querySelector('#qa-finish').onclick=()=>{world.resources.update(.3);effects.update(.3);player.harvestSwingTime=0;renderFeedback();};reset();
