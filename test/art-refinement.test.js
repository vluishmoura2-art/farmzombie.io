import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PlayerRenderer} from '../client/js/player-renderer.js';
import {EquipmentRenderer} from '../client/js/equipment-renderer.js';
import {BuildingIcons} from '../client/js/building-icons.js';
import {ResourceRenderer} from '../client/js/resource-renderer.js';
import {VisualEffects} from '../client/js/visual-effects.js';
import {PERFORMANCE_MODES} from '../client/js/visual-config.js';
import {PLAYER_ART,TOOL_ATTACHMENT,TOOL_ART,INK,TREE_ART,ROCK_ART,resourceImpactScale} from '../client/js/art-config.js';
import {TREE_CANOPY,TREE_LIGHT_CANOPY,drawResourceArt,drawResourceShadow} from '../client/js/resource-art.js';
import {World} from '../client/js/world.js';
import {Player,PLAYER_RADIUS} from '../client/js/player.js';
import {createResource,RESOURCE_TYPES} from '../client/js/resources.js';
import {applyFormationHit} from '../client/js/resource-hit.js';
import {EQUIPMENT_TIERS} from '../client/js/equipment-config.js';
function context(){
 const calls=[];const ctx={calls};for(const name of ['save','restore','translate','scale','rotate','beginPath','closePath','moveTo','lineTo','arc','ellipse','fillRect','strokeRect','drawImage'])ctx[name]=(...args)=>calls.push({name,args});
 ctx.fill=path=>calls.push({name:'fill',path,color:ctx.fillStyle});ctx.stroke=path=>calls.push({name:'stroke',path,color:ctx.strokeStyle,width:ctx.lineWidth});return ctx;
}
function canvasEnvironment(t){const created=[];const previous=globalThis.document;globalThis.document={createElement:()=>{const ctx=context(),canvas={ctx,getContext:()=>ctx};created.push(canvas);return canvas;}};t.after(()=>{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;});return created;}
test('circular player body and directional eyes preserve the original 35-unit physics radius',()=>{
 const ctx=context();PlayerRenderer.prototype.drawGeometry.call({},ctx);
 const arcs=ctx.calls.filter(c=>c.name==='arc');assert.equal(arcs.length,3);assert.deepEqual(arcs[0].args.slice(0,3),[0,0,24]);assert.equal(ctx.calls.filter(c=>c.name==='ellipse').length,0);
 assert.deepEqual(arcs.slice(1).map(c=>c.args.slice(0,3)),[[-7,11,2.5],[7,11,2.5]]);
 assert.equal(ctx.calls.find(c=>c.name==='stroke').color,INK);assert.equal(ctx.calls.find(c=>c.name==='stroke').width,4);
 assert.equal(PLAYER_ART.skin,'#E8B18A');assert.equal(PLAYER_RADIUS,35);assert.equal(new Player(1,2).radius,35);
 assert.equal(RESOURCE_TYPES.tree.radius,45.5);assert.equal(RESOURCE_TYPES.stone.radius,29.5);
});
test('tool grip stays attached through all facing quadrants and swings, without affecting player or equipment state',()=>{
 for(const angle of [0,Math.PI/2,Math.PI,-Math.PI/2,Math.PI*2-.001])for(const swing of [-.6,0,.6]){
  let matrix=[1,0,0,1,0,0];const stack=[];let grip;
  const ctx={save:()=>stack.push([...matrix]),restore:()=>{matrix=stack.pop();},rotate:r=>{const[a,b,c,d,e,f]=matrix,co=Math.cos(r),si=Math.sin(r);matrix=[a*co+c*si,b*co+d*si,c*co-a*si,d*co-b*si,e,f];},translate:(x,y)=>{matrix[4]+=matrix[0]*x+matrix[2]*y;matrix[5]+=matrix[1]*x+matrix[3]*y;}};
  const item=EQUIPMENT_TIERS.pickaxe[0],before=JSON.stringify(item),renderer={draw(){}};
  PlayerRenderer.prototype.drawEquipped.call(renderer,ctx,{draw(){grip=[matrix[4],matrix[5]];}},item,angle,swing);
  const r=angle-Math.PI/2;assert.ok(Math.abs(grip[0]-(TOOL_ATTACHMENT.x*Math.cos(r)-TOOL_ATTACHMENT.y*Math.sin(r)))<1e-9);assert.ok(Math.abs(grip[1]-(TOOL_ATTACHMENT.x*Math.sin(r)+TOOL_ATTACHMENT.y*Math.cos(r)))<1e-9);
  assert.deepEqual(matrix,[1,0,0,1,0,0]);assert.equal(JSON.stringify(item),before);
 }
});
test('tools use caramel handles, steel base heads, white highlights and black outlines at every progression tier',t=>{
 const previous=globalThis.Path2D;globalThis.Path2D=class{constructor(data){this.data=data;}roundRect(){}rect(){}};t.after(()=>{if(previous===undefined)delete globalThis.Path2D;else globalThis.Path2D=previous;});
 const tools=new EquipmentRenderer();
 for(const id of ['pickaxe','sword'])for(let tier=1;tier<=9;tier++){
  const ctx=context();tools.draw(ctx,id,tier);const fills=ctx.calls.filter(c=>c.name==='fill'),strokes=ctx.calls.filter(c=>c.name==='stroke');
  assert.equal(fills[0].color,'#8B5A2B');assert.equal(fills[1].color,tier===1?'#95A5A6':EQUIPMENT_TIERS[id][tier-1].color);assert.ok(fills.some(c=>c.color==='#FFFFFF'));assert.ok(strokes.every(c=>c.color===INK&&c.width===TOOL_ART.outline));
 }
});
test('trees have deterministic layered stars, rocks have six angular vertices and both draw solid contact shadows',()=>{
 assert.equal(TREE_CANOPY.length,16);for(let i=0;i<16;i++){assert.ok(Math.abs(Math.hypot(...TREE_CANOPY[i])-(i%2?TREE_ART.inner:TREE_ART.outer))<1e-8);assert.ok(Math.abs(TREE_CANOPY[i][0]+TREE_CANOPY[(i+8)%16][0])<1e-8);}
 assert.equal(TREE_LIGHT_CANOPY.length,16);assert.equal(ROCK_ART.points.length,6);
 for(const [x,y]of ROCK_ART.points)assert.ok(Math.hypot(x,y)+ROCK_ART.outline/2<RESOURCE_TYPES.stone.radius);
 const tree=context();drawResourceArt(tree,'tree');assert.ok(tree.calls.some(c=>c.name==='fillRect'&&c.args[2]===10));assert.ok(tree.calls.some(c=>c.color===TREE_ART.dark));assert.ok(tree.calls.some(c=>c.color===TREE_ART.light));
 const rock=context();drawResourceArt(rock,'stone');assert.ok(rock.calls.some(c=>c.color==='#34495E'));assert.ok(rock.calls.some(c=>c.color==='#7F8C8D'));
 for(const type of ['tree','stone']){const ctx=context();drawResourceShadow(ctx,type);assert.equal(ctx.calls.filter(c=>c.name==='ellipse').length,1);assert.equal(ctx.calls.find(c=>c.name==='fill').color,'#1B2818');}
});
test('every successful tree member emits exactly three squares with different outward directions in every quality preset',()=>{
 for(const profile of Object.values(PERFORMANCE_MODES))for(const types of [['tree'],['tree','tree'],['tree','stone']]){
  const fx=new VisualEffects(profile),members=types.map((type,i)=>createResource(String(i),type,400+i*103,400));fx.harvest(members);
  for(const node of members.filter(n=>n.material==='wood')){const particles=fx.particles.filter(p=>p.time>0&&p.sourceId===node.id);assert.equal(particles.length,3);assert.equal(new Set(particles.map(p=>p.vx)).size,3);assert.ok(particles.every(p=>p.color==='#8D6E63'&&p.time===.25));}
  for(let i=0;i<1000;i++)fx.harvest(members);assert.equal(fx.particles.length,64);assert.ok(fx.particles.filter(p=>p.time>0).length<=64);
  fx.update(1);assert.ok(fx.particles.every(p=>p.time<=0));
 }
});
test('one rendered white frame and 1.05 midpoint affect all formation members without new rewards or collision changes',t=>{
 canvasEnvironment(t);const renderer=new ResourceRenderer(),world=new World(),field=world.resources,inventory={wood:0,stone:0,gold:0};
 const members=[createResource('a','tree',400,400),createResource('b','tree',503,400)];for(const node of members)field.add(node);
 field.feedback=new VisualEffects(PERFORMANCE_MODES.balanced);applyFormationHit({members},field,inventory);
 assert.deepEqual(inventory,{wood:6,stone:0,gold:0});assert.equal(field.feedback.particles.filter(p=>p.time>0).length,6);
 const ctx=context();renderer.draw(ctx,field,0,0,1000,1000);
 let images=ctx.calls.filter(c=>c.name==='drawImage');assert.equal(images[0].args[0],renderer.shadows.tree);assert.equal(images[1].args[0],renderer.sprites['tree:true']);assert.equal(images[3].args[0],renderer.sprites['tree:true']);assert.ok(members.every(n=>n.flashPending===false));
 ctx.calls.length=0;renderer.draw(ctx,field,0,0,1000,1000);images=ctx.calls.filter(c=>c.name==='drawImage');assert.equal(images[1].args[0],renderer.sprites['tree:false']);assert.equal(images[3].args[0],renderer.sprites['tree:false']);
 field.update(.08);ctx.calls.length=0;renderer.draw(ctx,field,0,0,1000,1000);images=ctx.calls.filter(c=>c.name==='drawImage');assert.ok(Math.abs(images[1].args[3]-104*1.05)<1e-9);assert.equal(images[0].args[3],104);
 assert.equal(resourceImpactScale(.16,0),1);assert.equal(resourceImpactScale(.16,.08),1.05);assert.equal(resourceImpactScale(.16,.16),1);
 assert.ok(members.every(n=>n.active&&n.radius===45.5&&n.rewardPerHit===3&&!('health'in n)));assert.deepEqual(inventory,{wood:6,stone:0,gold:0});
});
test('all eight hotbar icons have distinct cached geometry and reuse their sprites on later renders',t=>{
 const created=canvasEnvironment(t),icons=new BuildingIcons(),ctx=context(),types=['stash','ballista','cannon','melee','bomb','mage','mine','harvester'];
 for(const type of types)icons.draw(ctx,type,0,0,38);assert.equal(created.length,8);assert.equal(icons.cache.size,8);
 const programs=created.map(c=>JSON.stringify(c.ctx.calls));assert.equal(new Set(programs).size,8);
 for(const type of types)icons.draw(ctx,type,0,0,38);assert.equal(created.length,8);assert.equal(ctx.calls.filter(c=>c.name==='drawImage').length,16);
});
