import {test} from 'node:test';
import assert from 'node:assert/strict';
import {hordeSpec,chooseSize} from '../client/js/horde-config.js';
import {WaveCycle} from '../client/js/waves.js';
import {COMBAT_RULES} from '../client/js/combat-config.js';
import {createZombie,Zombies} from '../client/js/zombies.js';
import {World} from '../client/js/world.js';
import {GameRoom} from '../server/game-room.js';
import {performance} from 'node:perf_hooks';

test('all horde bands schedule exact quotas at 20/60/144Hz with bounded intervals',()=>{
 for(const [wave,category,size,duration,rate] of [[1,'green','normal',10,1],[5,'green','normal',10,1],[10,'green',null,10,5],[15,'green',null,10,5],[16,'green','large',20,10],[20,'green','large',20,10],[21,'diamond','normal',30,5],[25,'diamond','normal',30,5],[26,'diamond','large',40,5],[30,'diamond','large',40,5],[31,'yellow','normal',40,5],[35,'yellow','normal',40,5],[36,'yellow','large',40,5],[1000,'yellow','large',40,5]]){
  const spec=hordeSpec(wave);assert.equal(spec.category,category);assert.equal(spec.duration,duration);assert.equal(spec.rate,rate);if(size)assert.deepEqual(Object.keys(spec.sizes),[size]);
  for(const fps of [20,60,144]){
   const cycle=new WaveCycle();cycle.phase='day';cycle.wave=wave-1;cycle.remaining=0;let count=0;
   cycle.update(1/fps,true,()=>{throw Error('must not spawn at boundary');});
   for(let i=0;i<duration*fps;i++)cycle.update(1/fps,true,()=>{count++;return true;});
   assert.equal(count,duration*rate,`${wave}/${fps}`);assert.equal(cycle.pending,0);
  }
 }
 assert.deepEqual([.1,.4,.9].map(random=>chooseSize(hordeSpec(10),()=>random)),['small','normal','large']);
});
test('stalls and capacity defer quota without frame bursts or lost spawns; no stash freezes progression',()=>{
 const c=new WaveCycle();c.update(500,false,()=>true);assert.equal(c.phase,'preparation');
 c.phase='day';c.wave=15;c.remaining=0;c.update(.05,true,()=>true);
 c.update(30,true,()=>false);assert.equal(c.pending,200);assert.equal(c.phase,'night');
 let count=0;c.update(50,true,()=>{count++;return true;});assert.ok(count<=4);
 for(let i=0;i<1000&&c.phase==='night';i++)c.update(.05,true,()=>{count++;return true;});
 assert.equal(count,200);assert.equal(c.phase,'day');
});
test('sizes affect real world collision, health, damage and once-only rewards',()=>{
 const world=new World();let previous=0;
 for(const size of ['small','normal','large']){
  const inv={gold:0},field=new Zombies(inv),spec={...hordeSpec(16),size};const z=field.spawn('green',100,100,spec);
  assert.ok(z.radius>previous);previous=z.radius;world.move(z,-1000,0);assert.ok(z.x>=z.radius);
  assert.ok(z.health>0&&z.playerDamage>0);const reward=z.goldReward;field.damage(z,z.health);field.damage(z,1e9);assert.equal(inv.gold,reward);
 }
});
test('endless stats grow safely, finite and with bounded collision/rewards at extreme hordes',()=>{
 let previous;
 for(const wave of [36,37,100,1000000,Number.MAX_SAFE_INTEGER]){
  const spec=hordeSpec(wave),z=createZombie(1,'yellow',0,0,{...spec,size:'large'});
  for(const key of ['radius','health','playerDamage','buildingDamage','stashDamage','goldReward']){assert.ok(Number.isFinite(z[key]));if(previous)assert.ok(z[key]>=previous[key]);}
  if(previous)assert.ok(z.health>previous.health);
  previous=z;
 }
});
test('server snapshots synchronize clan horde state and zombie radii, reject client spawn commands',()=>{
 const r=new GameRoom(),a=r.join(undefined,'Owner_15'),b=r.join(undefined,'Guest_15');
 r.baseFor=()=>a;
 a.combat.cycle.phase='day';a.combat.cycle.wave=20;a.combat.cycle.remaining=0;
 a.combat.cycle.update(.05,true,()=>true);a.zombies.spawn('diamond',b.player.x,b.player.y,{...hordeSpec(21),size:'large'});
 assert.deepEqual(r.snapshot(a).self.cycle,r.snapshot(b).self.cycle);
 assert.deepEqual(r.snapshot(a).zombies,r.snapshot(b).zombies);
 assert.equal(r.command(a,{op:'spawn',seq:1,type:'yellow'}).ok,false);
});
test('512 live enemies: authoritative updates and JSON snapshots remain bounded',t=>{
 const r=new GameRoom(),a=r.join(undefined,'Load_15'),b=r.join(undefined,'Load_16');
 for(const p of [a,b]){p.player.x=4100;p.player.y=4000;assert.ok(p.buildings.place('stash',p===a?3072:3776,3072,p.player).building);for(let i=0;i<256;i++)p.zombies.spawn('yellow',2200+(i%16)*90,2200+Math.floor(i/16)*90,{...hordeSpec(50),size:'large'});}
 const start=performance.now();for(let i=0;i<20;i++)r.tick(.05);
 const bytes=JSON.stringify(r.snapshot(a)).length;const elapsed=performance.now()-start;
 assert.equal(r.allZombies.items.length,512);assert.ok(bytes<262144);assert.ok(r.allZombies.items.every(z=>Number.isFinite(z.health)&&Number.isFinite(z.x)));
 t.diagnostic(`512 enemies, 20 server ticks + snapshot: ${elapsed.toFixed(1)}ms, ${bytes} JSON characters (local CPU measurement)`);
});
