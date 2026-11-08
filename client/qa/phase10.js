import { World } from '../js/world.js';
import { Player } from '../js/player.js';
import { Camera } from '../js/camera.js';
import { Buildings } from '../js/buildings.js';
import { BuildingPlacement } from '../js/building-placement.js';
import { Equipment } from '../js/equipment.js';
import { EquipmentRenderer } from '../js/equipment-renderer.js';
import { Renderer } from '../js/renderer.js';
import { Combat } from '../js/combat.js';
import { VisualEffects } from '../js/visual-effects.js';
import { Minimap } from '../js/minimap.js';
import { generateResources } from '../js/world-generation.js';
import { BUILDING_TYPES } from '../js/building-config.js';
import { buildingStats } from '../js/tier-config.js';
import { applyFormationHit } from '../js/resource-hit.js';
const world=new World();generateResources(world);
const player=new Player(3072,3072),equipment=new Equipment(),inventory={wood:1000000000,stone:1000000000,gold:1000000000};
const renderer=new Renderer(document.querySelector('#game'),new EquipmentRenderer());world.feedback=new VisualEffects(renderer.profile);world.resources.feedback=world.feedback;
const buildings=new Buildings(world,inventory),placement=new BuildingPlacement(buildings),combat=new Combat(world,player,buildings,inventory),camera=new Camera(3072,3072);
const minimap=new Minimap(document.querySelector('#qa-minimap'),renderer.profile);
for(let y=2848;y<3296&&!buildings.stash;y+=32)for(let x=2848;x<3296&&!buildings.stash;x+=32)buildings.place('stash',x,y,player);
for(const type of Object.keys(BUILDING_TYPES).filter(t=>t!=='stash'))for(let y=buildings.base.top;y+64<=buildings.base.bottom&&buildings.remaining(type)>0;y+=96)for(let x=buildings.base.left;x+64<=buildings.base.right&&buildings.remaining(type)>0;x+=96)buildings.place(type,x,y,player);
for(const [i,b]of buildings.items.entries()){b.tier=i%9+1;b.health=b.maxHealth=buildingStats(b.type,b.tier).maxHealth;b.angle=b.type==='stash'||b.type==='mine'||b.type==='harvester'?0:i*.3;}
for(let i=0;i<64;i++){const angle=i*Math.PI*2/64,radius=170+i%5*55;combat.zombies.spawn(['green','diamond','yellow'][i%4],player.x+Math.cos(angle)*radius,player.y+Math.sin(angle)*radius);}
combat.cycle.phase='day';combat.cycle.wave=14;
document.querySelector('#qa-status').textContent=`${world.resources.items.length} resources / ${buildings.items.length} buildings / ${combat.zombies.items.length} enemies`;
document.querySelector('#qa-hit').onclick=()=>{for(const z of combat.zombies.items.slice(0,8))combat.zombies.damage(z,5);};
document.querySelector('#qa-harvest').onclick=()=>{const formation=world.resources.formations.find(f=>f.type==='E');camera.x=formation.x;camera.y=formation.y;applyFormationHit(formation,world.resources,inventory);};
document.querySelector('#qa-night').onclick=()=>{camera.x=player.x;camera.y=player.y;combat.cycle.phase=combat.cycle.phase==='night'?'day':'night';};
document.querySelector('#qa-base').onclick=()=>{camera.x=buildings.stash.x+32;camera.y=buildings.base.top+340;};
let benchmark=null,previous=null;
document.querySelector('#qa-benchmark').onclick=()=>{benchmark={index:0,frames:0,cpu:[],results:[],elapsed:0};setMode('quality');document.querySelector('#qa-results').textContent='Running: Quality → Balanced → Performance';};
function setMode(mode){renderer.setMode(mode);world.feedback.setProfile(renderer.profile);minimap.profile=renderer.profile;minimap.last=-Infinity;}
function frame(timestamp){
 const realDt=previous===null?0:(timestamp-previous)/1000,dt=Math.min(realDt,.05);previous=timestamp;world.resources.update(dt);world.feedback.update(dt);combat.zombies.update(dt);
 for(const z of combat.zombies.items){z.angle+=dt*.12;z.walkPhase+=dt*4;}
 const started=performance.now();renderer.render(world,player,camera,equipment,placement,combat);const cpu=performance.now()-started;minimap.update(timestamp,world,player,combat);
 if(benchmark){benchmark.frames++;if(benchmark.frames>30){benchmark.cpu.push(cpu);benchmark.elapsed+=realDt;}
 if(benchmark.frames>=150){const sorted=[...benchmark.cpu].sort((a,b)=>a-b),mode=['quality','balanced','performance'][benchmark.index];benchmark.results.push({mode,width:renderer.width,height:renderer.height,dpr:renderer.pixelRatio,meanRenderMs:Number((benchmark.cpu.reduce((a,b)=>a+b,0)/benchmark.cpu.length).toFixed(3)),p95RenderMs:Number(sorted[Math.floor(sorted.length*.95)].toFixed(3)),observedFps:Number((benchmark.cpu.length/benchmark.elapsed).toFixed(1)),samples:benchmark.cpu.length,cacheSprites:renderer.buildingDrawing.cache.size});benchmark.index++;
 if(benchmark.index===3){document.querySelector('#qa-results').textContent=JSON.stringify(benchmark.results,null,2);benchmark=null;}else{benchmark.frames=0;benchmark.cpu=[];benchmark.elapsed=0;setMode(['quality','balanced','performance'][benchmark.index]);}}
 }
 requestAnimationFrame(frame);
}
window.addEventListener('resize',()=>renderer.resize());requestAnimationFrame(frame);
