import { HumanoidRenderer } from '../client/js/humanoid.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { worldToMinimap } from '../client/js/minimap.js';
import { PERFORMANCE_MODES, performanceProfile, effectiveDpr, FrameMetrics } from '../client/js/visual-config.js';
import { VisualEffects } from '../client/js/visual-effects.js';
import { World } from '../client/js/world.js';
import { generateResources } from '../client/js/world-generation.js';
import { nearestFormation, applyFormationHit } from '../client/js/resource-hit.js';
import { createResource } from '../client/js/resources.js';
import { buildingStats, TIERS } from '../client/js/tier-config.js';
import { BUILDING_TYPES } from '../client/js/building-config.js';
import { COMBAT_RULES, TOWER_ATTACKS } from '../client/js/combat-config.js';

test('minimap fits square and rectangular world corners inside the circle, preserves center and north-up direction',()=>{
 for(const [width,height] of [[6144,6144],[4000,2000],[2000,4000]])for(const size of [96,132,180]){
  assert.deepEqual(worldToMinimap(width/2,height/2,width,height,size),{x:size/2,y:size/2});
  for(const x of [0,width])for(const y of [0,height]){const p=worldToMinimap(x,y,width,height,size);assert.ok(Math.hypot(p.x-size/2,p.y-size/2)<=size/2-9.999);}
  assert.ok(worldToMinimap(width/2,0,width,height,size).y<size/2);
  assert.ok(worldToMinimap(width,height/2,width,height,size).x>size/2);
 }
 const output={};assert.equal(worldToMinimap(0,0,6144,6144,132,output),output);
});
test('quality modes cap DPR and optional effects without changing simulation rules',()=>{
 assert.deepEqual(Object.keys(PERFORMANCE_MODES),['quality','balanced','performance']);
 assert.equal(effectiveDpr(3,performanceProfile('quality')),2);assert.equal(effectiveDpr(3,performanceProfile('balanced')),1.5);assert.equal(effectiveDpr(3,performanceProfile('performance')),1);
 assert.equal(effectiveDpr(NaN,performanceProfile('balanced')),1);assert.equal(performanceProfile('invalid'),PERFORMANCE_MODES.balanced);
 assert.equal(PERFORMANCE_MODES.performance.particles,0);for(const profile of Object.values(PERFORMANCE_MODES))assert.ok(profile.numbers>0&&profile.minimapHz>0);
});
test('effect pools remain bounded, expire, and performance mode clears optional particles without consuming resources',()=>{
 const fx=new VisualEffects(PERFORMANCE_MODES.quality),members=[createResource('a','tree',100,100),createResource('b','stone',187,100)];
 for(let i=0;i<1000;i++){fx.harvest(members);fx.damage(100,100,25);}
 assert.equal(fx.particles.length,64);assert.equal(fx.numbers.length,24);assert.ok(members.every(m=>m.active&&m.rewardPerHit===3));
 fx.setProfile(PERFORMANCE_MODES.performance);assert.equal(fx.particles.filter(p=>p.time>0).length,0);assert.ok(fx.numbers.filter(n=>n.time>0).length<=8);
 fx.update(1);assert.ok(fx.particles.every(p=>p.time<=0));assert.ok(fx.numbers.every(n=>n.time<=0));
});
test('formation feedback emits one complete membership event and never duplicates accounting',()=>{
 const world=new World();const members=[createResource('a','tree',100,100),createResource('b','stone',187,100)];let count=0;
 world.resources.feedback={harvest:nodes=>{assert.equal(nodes,members);count++;}};
 const inventory={wood:0,stone:0,gold:0};applyFormationHit({members},world.resources,inventory,2);
 assert.equal(count,1);assert.deepEqual(inventory,{wood:6,stone:6,gold:0});assert.equal(members[0].hitUntil,members[1].hitUntil);
});
test('spatial formation lookup matches an exhaustive oracle over 800 world positions and reuses buffers',()=>{
 const world=new World();generateResources(world);const field=world.resources,buffer=field.harvestCandidates,seen=field.harvestSeen;
 for(let i=0;i<800;i++){
  const x=(i*151.7)%world.width,y=(i*287.3)%world.height,range=i%2?100:260;
  let expected=null,distance=range**2;
  for(const formation of field.formations){let best=Infinity;for(const node of formation.members)best=Math.min(best,(node.x-x)**2+(node.y-y)**2);if(best<=distance&&(!expected||best<distance)){distance=best;expected=formation;}}
  assert.equal(nearestFormation(field,x,y,range),expected);assert.equal(field.harvestCandidates,buffer);assert.equal(field.harvestSeen,seen);assert.ok(buffer.length<30);
 }
});
test('formation index updates after equal-count node replacement and explicit maintenance removal',()=>{
 const world=new World(),field=world.resources,a=createResource('a','tree',200,200);field.add(a);
 assert.equal(nearestFormation(field,200,200,100).members[0],a);
 field.remove(a);const b=createResource('b','stone',200,200);field.add(b);
 assert.equal(nearestFormation(field,200,200,100).members[0],b);
 field.remove(b);assert.equal(nearestFormation(field,200,200,100),null);
});
test('cached building statistics reuse references while retaining every original balance formula',()=>{
 for(const type of Object.keys(BUILDING_TYPES))for(const tier of TIERS){
  const step=tier.level-1,stats=buildingStats(type,tier.level);assert.equal(stats,buildingStats(type,tier.level));assert.ok(Object.isFrozen(stats));
  assert.equal(stats.maxHealth,Math.round((type==='stash'?COMBAT_RULES.stashHealth:COMBAT_RULES.buildingHealth)*(1+step*.5)));
  assert.equal(stats.production,1+step*.5);assert.equal(stats.harvestSpeed,1+step*.2);
  if(TOWER_ATTACKS[type]){const original=TOWER_ATTACKS[type];assert.equal(stats.attack.damage,original.damage*(1+step*.4));assert.equal(stats.attack.cooldown,original.cooldown/(1+step*.08));assert.equal(stats.attack.splash,original.splash*(1+step*.06));assert.ok(Object.isFrozen(stats.attack));}
 }
});
test('frame metrics use bounded samples and discard suspension gaps from FPS',()=>{
 const metrics=new FrameMetrics();for(let i=0;i<600;i++)metrics.record(2,1/60);
 assert.equal(metrics.samples.length,180);assert.equal(metrics.count,180);assert.equal(metrics.renderMs,2);assert.equal(metrics.fps,60);
 metrics.tick(5);assert.equal(metrics.fps,60);
});

test('humanoid cache keeps the original geometry and reuses one high-resolution sprite per color/outline',()=>{
 const original=globalThis.document,created=[],strokes=[];
 const cached={translate(){},scale(){},stroke:path=>strokes.push(path),fill(){}};
 globalThis.document={createElement:()=>{const canvas={getContext:()=>cached};created.push(canvas);return canvas;}};
 try{
  const renderer={cache:new Map(),parts:['body','left','right'],silhouette:'union',drawGeometry:HumanoidRenderer.prototype.drawGeometry};
  const images=[],ctx={drawImage:(...args)=>images.push(args)};
  for(let i=0;i<100;i++)HumanoidRenderer.prototype.draw.call(renderer,ctx,'#48B94C','#287C32');
  assert.equal(created.length,1);assert.equal(created[0].width,256);assert.equal(created[0].height,256);
  assert.deepEqual(strokes,['body','left','right']);assert.ok(images.every(args=>args[0]===created[0]));assert.deepEqual(images[0].slice(1),[-40,-40,80,80]);
  HumanoidRenderer.prototype.draw.call(renderer,ctx,'#48B94C','#F1F3ED');assert.equal(created.length,2);
  assert.deepEqual(strokes,['body','left','right','body','left','right']);
 }finally{if(original===undefined)delete globalThis.document;else globalThis.document=original;}
});
