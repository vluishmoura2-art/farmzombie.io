import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GameRoom, NETWORK_RULES } from '../server/game-room.js';
import { ResourceField } from '../client/js/resources.js';
import { equipmentTier } from '../client/js/equipment-config.js';
import { buildingStats } from '../client/js/tier-config.js';
const cmd=(r,p,op,data={})=>r.command(p,{op,seq:p.lastSeq+1,...data});
function setup(){const r=new GameRoom();r.world.resources=new ResourceField(r.world.width);r.world.resources.feedback=r.world.feedback;return r;}
function funded(r){const p=r.join();Object.assign(p.harvesting.inventory,{wood:100000,stone:100000,gold:100000});p.player.x=p.player.y=800;cmd(r,p,'input',{x:0,y:0,angle:0,slot:1,auto:false,blocked:false});return p;}
function clan(r,p){assert.equal(cmd(r,p,'createClan',{name:'Team'}).ok,true);return r.clans.get(p.clanId);}
function member(r,leader,p){assert.equal(cmd(r,leader,'invite',{target:p.id}).ok,true);assert.equal(cmd(r,p,'invitation',{clan:leader.clanId,accept:true}).ok,true);}
function base(r,p){assert.equal(cmd(r,p,'place',{type:'stash',x:1024,y:1024}).ok,true);}

test('capacity, server identity, reconnect grace and session cleanup',()=>{
 const r=setup(),list=Array.from({length:50},()=>r.join());assert.throws(()=>r.join(),/full/);assert.equal(r.online,50);
 const p=list[0];r.disconnect(p);assert.equal(r.join(p.token),p);assert.throws(()=>r.join(p.token),/full/);assert.throws(()=>r.join('forged'),/full/);
 r.disconnect(p);r.time+=61;r.cleanup();assert.equal(r.tokens.has(p.token),false);assert.throws(()=>r.join(p.token),/Invalid/);
});
test('10 clans maximum, 4 members maximum, invitations accept/reject and one membership only',()=>{
 const r=setup(),leader=funded(r),c=clan(r,leader),members=Array.from({length:4},()=>funded(r));
 for(const p of members.slice(0,3))member(r,leader,p);assert.equal(c.members.length,4);
 assert.equal(cmd(r,leader,'invite',{target:members[3].id}).ok,false);
 for(let i=1;i<10;i++)clan(r,funded(r));assert.equal(cmd(r,members[3],'createClan',{name:'Extra'}).ok,false);
 assert.equal(cmd(r,members[0],'createClan',{name:'Second'}).ok,false);
 const target=members[3],other=[...r.clans.values()][1],owner=r.players.get(other.leader);
 cmd(r,owner,'invite',{target:target.id});cmd(r,target,'invitation',{clan:other.id,accept:false});assert.equal(target.clanId,null);
 assert.equal(cmd(r,target,'invitation',{clan:other.id,accept:true}).ok,false);
});
test('leader-only permissions, normal member costs, shared limits and ownership, denied forged placement',()=>{
 const r=setup(),leader=funded(r),p=funded(r);clan(r,leader);member(r,leader,p);base(r,leader);
 const before={...p.harvesting.inventory};assert.equal(cmd(r,p,'place',{type:'mine',x:1120,y:1024}).ok,false);
 assert.equal(cmd(r,p,'permission',{target:p.id,allow:true}).ok,false);
 assert.equal(cmd(r,leader,'permission',{target:p.id,allow:true}).ok,true);
 assert.equal(cmd(r,p,'place',{type:'mine',x:1120,y:1024}).ok,true);
 assert.equal(p.harvesting.inventory.wood,before.wood-9);assert.equal(p.harvesting.inventory.stone,before.stone-9);
 assert.equal(leader.buildings.items.length,2);assert.equal(p.buildings.items.length,0);assert.equal(r.baseFor(p),leader);
 cmd(r,leader,'permission',{target:p.id,allow:false});assert.equal(cmd(r,p,'place',{type:'mine',x:1216,y:1024}).ok,false);
 assert.equal(cmd(r,p,'upgrade',{id:`${leader.baseId}:2`,tier:1}).ok,false);
 assert.equal(cmd(r,p,'place',{type:'stash',x:3008,y:3008,canBuild:true,ownerId:leader.id}).ok,false);
});
test('base territories do not overlap; building upgrade authorization and server-paid shop',()=>{
 const r=setup(),a=funded(r),b=funded(r);base(r,a);
 assert.equal(cmd(r,b,'place',{type:'stash',x:1536,y:1024}).ok,false);
 const id=`${a.baseId}:${a.buildings.stash.id}`;
 assert.equal(cmd(r,b,'upgrade',{id,tier:1}).ok,false);
 const before=a.harvesting.inventory.gold;assert.equal(cmd(r,a,'upgrade',{id,tier:1}).ok,true);assert.equal(a.buildings.stash.tier,2);assert.equal(a.harvesting.inventory.gold,before-60);
 assert.equal(cmd(r,a,'upgrade',{id,tier:1}).ok,false);
 assert.equal(cmd(r,a,'buy',{item:'sword',tier:1}).ok,true);assert.equal(a.equipment.items[1].tier,2);
});
test('disconnect preserves leadership, permanent leave transfers base intact without healing successor',()=>{
 const r=setup(),a=funded(r),b=funded(r);clan(r,a);member(r,a,b);base(r,a);const stash=a.buildings.stash,baseId=a.baseId;b.player.health=32;
 r.disconnect(a);r.tick();assert.equal(r.clans.get(a.clanId).leader,a.id);r.join(a.token);
 cmd(r,a,'leaveClan');const c=r.clans.get(b.clanId);assert.equal(c.leader,b.id);assert.equal(b.baseId,baseId);assert.equal(b.buildings.stash,stash);assert.equal(b.player.health,32);assert.equal(b.canBuild,true);assert.equal(a.clanId,null);
 cmd(r,b,'leaveClan');assert.equal(r.clans.size,0);
});
test('movement intent cannot teleport or accelerate; duplicate and malicious commands do not mutate state',()=>{
 const r=setup(),p=funded(r);const x=p.player.x;
 assert.equal(cmd(r,p,'input',{x:100,y:0,angle:0,slot:0,auto:false,blocked:false}).ok,false);
 assert.equal(cmd(r,p,'input',{x:1,y:1,angle:0,slot:0,auto:false,blocked:false}).ok,true);r.tick(.05);
 assert.ok(Math.hypot(p.player.x-x,p.player.y-800)<=12.001);
 for(const op of ['__proto__','constructor','toString'])assert.equal(r.command(p,{op,seq:p.lastSeq+1}).ok,false);
 const seq=p.lastSeq;assert.equal(r.command(p,{op:'action',seq,angle:0}).ok,false);
 assert.equal(cmd(r,p,'action',{angle:0,damage:999999}).ok,false);
});
test('PvP uses exact upgraded sword damage, cone/range/cooldown, death and clan protection; pickaxe cannot PvP',()=>{
 const r=setup(),a=funded(r),b=funded(r);b.player.x=880;a.equipment.items[1]=equipmentTier('sword',3);
 cmd(r,a,'action',{angle:0});const expected=25*a.equipment.selected.damageMultiplier;assert.equal(b.player.health,100-expected);
 cmd(r,a,'action',{angle:0});assert.equal(b.player.health,100-expected);
 a.combat.swordCooldown=0;cmd(r,a,'action',{angle:Math.PI});assert.equal(b.player.health,100-expected);
 a.combat.swordCooldown=0;b.player.x=1400;cmd(r,a,'action',{angle:0});assert.equal(b.player.health,100-expected);
 b.player.x=880;a.combat.swordCooldown=0;a.equipment.select(0);cmd(r,a,'action',{angle:0});assert.equal(b.player.health,100-expected);
 a.equipment.select(1);clan(r,a);member(r,a,b);a.combat.swordCooldown=0;cmd(r,a,'action',{angle:0});assert.equal(b.player.health,100-expected);
 cmd(r,b,'leaveClan');b.player.health=1;a.combat.swordCooldown=0;cmd(r,a,'action',{angle:0});assert.equal(b.player.active,false);assert.equal(r.snapshot(b).players.find(p=>p.id===b.id).health,0);
});
for(const type of ['ballista','cannon','melee','bomb','mage'])test(`${type} protects owner and clan, attacks invaders with normal tier damage and preserves zombie balancing`,()=>{
 const r=setup(),a=funded(r),b=funded(r);base(r,a);assert.equal(cmd(r,a,'place',{type,x:1152,y:1024}).ok,true);const tower=a.buildings.items[1];tower.tier=5;
 a.combat.cycle.phase='night';b.player.health=10000;b.player.x=1184;b.player.y=950;const before=b.player.health;r.tick(.05);tower.attackCooldown=100;for(let i=0;i<20;i++)r.tick(.05);assert.ok(b.player.health<before,type);
 const damage=buildingStats(type,5).attack.damage;assert.ok(Math.abs(before-b.player.health-damage)<1e-7,type);
 clan(r,a);member(r,a,b);b.player.health=100;tower.attackCooldown=0;for(let i=0;i<60;i++)r.tick(.05);assert.equal(b.player.health,100);
 const z=a.combat.zombies.spawn('yellow',1184,950);z.health=10000;tower.attackCooldown=100;a.combat.towers.fire(tower,z,buildingStats(type,5).attack);a.combat.towers.update(1);assert.ok(Math.abs(10000-z.health-damage*.15)<1e-7);
});
test('hostility persists after leaving territory, expires, and sword aggression marks allied bases',()=>{
 const r=setup(),a=funded(r),b=funded(r);base(r,a);b.player.x=1100;b.player.y=1100;r.tick(.05);b.player.x=b.player.y=4000;assert.equal(r.hostile(a,b),true);
 r.time+=NETWORK_RULES.hostilitySeconds+1;assert.equal(r.hostile(a,b),false);
 b.player.x=880;b.player.y=800;a.player.angle=0;cmd(r,b,'action',{angle:Math.PI});assert.equal(r.hostile(a,b),true);
});
test('authoritative auto harvesting shares manual cooldown and rewards exact original formations',()=>{
 const r=new GameRoom(),p=r.join(),f=r.world.resources.formations.find(f=>f.type==='E');p.player.x=f.members[0].x-70;p.player.y=f.members[0].y;
 cmd(r,p,'input',{x:0,y:0,angle:0,slot:0,auto:true,blocked:false});r.tick(.05);const expected={wood:3,stone:3,gold:0};assert.deepEqual(p.harvesting.inventory,expected);
 cmd(r,p,'action',{angle:0});assert.deepEqual(p.harvesting.inventory,expected);
 for(let i=0;i<5;i++)r.tick(.05);assert.deepEqual(p.harvesting.inventory,expected);r.tick(.05);assert.deepEqual(p.harvesting.inventory,{wood:6,stone:6,gold:0});
 cmd(r,p,'input',{x:0,y:0,angle:0,slot:0,auto:true,blocked:true});for(let i=0;i<20;i++)r.tick(.05);assert.deepEqual(p.harvesting.inventory,{wood:6,stone:6,gold:0});
});
