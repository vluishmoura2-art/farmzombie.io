import { test } from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../client/js/world.js';
import { Player } from '../client/js/player.js';
import { Buildings } from '../client/js/buildings.js';
import { BuildingUpgrades } from '../client/js/building-upgrades.js';
import { Equipment } from '../client/js/equipment.js';
import { EquipmentShop } from '../client/js/equipment-shop.js';
import { EQUIPMENT_TIERS, equipmentTier } from '../client/js/equipment-config.js';
import { Harvesting } from '../client/js/harvesting.js';
import { createResource } from '../client/js/resources.js';
import { Combat } from '../client/js/combat.js';
import { COMBAT_RULES } from '../client/js/combat-config.js';
import { upgradeCost } from '../client/js/tier-config.js';
import { bindShopControls } from '../client/js/shop-ui.js';
function setup() {
 const world=new World(),player=new Player(800,800),inventory={wood:1000000,stone:1000000,gold:1000000};
 const buildings=new Buildings(world,inventory),stash=buildings.place('stash',1024,1024,player).building;
 const upgrades=new BuildingUpgrades(buildings),equipment=new Equipment(),shop=new EquipmentShop(equipment,inventory,upgrades);
 return {world,player,inventory,buildings,stash,upgrades,equipment,shop};
}
function unlock(s,tier) { while(s.stash.tier<tier) assert.equal(s.upgrades.purchase(s.stash,s.stash.tier).ok,true); }
function mines(s,count=8) { return Array.from({length:count},(_,i)=>s.buildings.place('field',1152+i%4*96,1024+Math.floor(i/4)*96,s.player).building); }

test('shop contains exactly nine ordered tiers per slot with increasing prices, rewards, damage and speed',()=>{
 for(const id of ['pickaxe','sword']) {
  const list=EQUIPMENT_TIERS[id];assert.equal(list.length,9);assert.equal(list[0].cost,0);
  assert.deepEqual(list.map(i=>i.tier),[1,2,3,4,5,6,7,8,9]);
  for(let i=1;i<9;i++) { assert.ok(list[i].cost>list[i-1].cost);assert.ok(list[i].rewardPerMember>list[i-1].rewardPerMember);assert.ok(list[i].harvestSpeed>list[i-1].harvestSpeed);assert.ok(list[i].damageMultiplier>list[i-1].damageMultiplier);assert.ok(list[i].attackSpeed>list[i-1].attackSpeed); }
 }
 assert.equal(equipmentTier('sword',10),null);
});
test('equipment purchases are gold-only, one tier at a time, base-gated and immediately visible in either selected slot',()=>{
 const s=setup();
 for(let tier=1;tier<9;tier++) {
  const before={...s.inventory};assert.equal(s.shop.purchase('pickaxe',tier).ok,false);assert.deepEqual(s.inventory,before);
  unlock(s,tier+1);
  for(const [slot,id] of ['pickaxe','sword'].entries()) {
   s.equipment.select(slot);const balance={...s.inventory};
   assert.equal(s.shop.purchase(id,tier).ok,true);assert.equal(s.equipment.selected,equipmentTier(id,tier+1));
   assert.equal(s.equipment.selectedSlot,slot);assert.equal(s.inventory.gold,balance.gold-equipmentTier(id,tier+1).cost);
   assert.equal(s.inventory.wood,balance.wood);assert.equal(s.inventory.stone,balance.stone);
   const paid={...s.inventory};assert.equal(s.shop.purchase(id,tier).ok,false);assert.deepEqual(s.inventory,paid);
  }
 }
 assert.equal(s.equipment.items.length,2);assert.equal(s.shop.purchase('sword',9).ok,false);
});
test('shop rejects insufficient or invalid gold, unknown tools and locked base tiers without any payment',()=>{
 const s=setup();unlock(s,2);
 for(const gold of [0,29,NaN,-10]) {
  s.inventory.gold=gold;const before={...s.inventory};assert.equal(s.shop.purchase('pickaxe',1).ok,false);assert.deepEqual(s.inventory,before);assert.equal(s.equipment.items[0].tier,1);
 }
 s.inventory.gold=30;assert.equal(s.shop.purchase('unknown',1).ok,false);assert.equal(s.shop.purchase('pickaxe',1).ok,true);assert.equal(s.inventory.gold,0);
});
for(const types of [['tree'],['stone'],['tree','tree'],['stone','stone'],['tree','stone']]) {
 test(`pickaxe tiers harvest complete ${types.join('+')} formations with exact boosted rewards and shorter cooldown`,()=>{
  const s=setup(),h=new Harvesting();s.player.x=1000;s.player.y=920;
  const members=types.map((type,i)=>createResource(String(i),type,1000+i*103,1000));
  for(const node of members){node.formationId='group';s.world.resources.add(node);}
  const formation={id:'group',type:'test',members};s.world.resources.formations.push(formation);
  const unrelated=createResource('other','tree',1000,1005);s.world.resources.add(unrelated);
  for(let tier=1;tier<=9;tier++) {
   s.equipment.items[0]=equipmentTier('pickaxe',tier);const before={...h.inventory};
   const hit=h.attempt(s.player,s.equipment,s.world.resources,-9999,-9999);
   assert.equal(hit.formation,formation);assert.equal(hit.amount,types.length*(tier+2));
   for(const [material,type] of [['wood','tree'],['stone','stone']]) assert.equal(h.inventory[material],before[material]+types.filter(t=>t===type).length*(tier+2));
   assert.ok(members.every(node=>node.active&&node.hitUntil===members[0].hitUntil));assert.equal(unrelated.hitUntil,0);
   const cooldown=.3/s.equipment.selected.harvestSpeed;assert.equal(h.cooldown,cooldown);
   h.update(cooldown-.001);assert.equal(h.attempt(s.player,s.equipment,s.world.resources).status,'cooldown');h.update(.001);
  }
  s.equipment.select(1);assert.equal(h.attempt(s.player,s.equipment,s.world.resources).status,'wrong-tool');
 });
}
test('each sword tier applies higher actual facing-based damage and a shorter cooldown, preserving range and tool exclusions',()=>{
 const s=setup(),combat=new Combat(s.world,s.player,s.buildings,s.inventory);s.player.angle=0;s.equipment.select(1);
 const zombie=combat.zombies.spawn('green',870,800);zombie.health=zombie.maxHealth=100000;
 let previous=0,previousCooldown=Infinity;
 for(let tier=1;tier<=9;tier++) {
  s.equipment.items[1]=equipmentTier('sword',tier);combat.swordCooldown=0;const before=zombie.health;
  assert.equal(combat.sword(s.equipment),1);const damage=before-zombie.health;
  assert.ok(damage>previous);assert.ok(combat.swordCooldown<previousCooldown);assert.ok(Math.abs(damage-COMBAT_RULES.swordDamage*s.equipment.selected.damageMultiplier)<1e-8);
  assert.equal(combat.sword(s.equipment),0);previous=damage;previousCooldown=combat.swordCooldown;
 }
 combat.swordCooldown=0;s.player.angle=Math.PI;assert.equal(combat.sword(s.equipment),0);
 s.equipment.select(0);assert.equal(combat.sword(s.equipment),0);
});
test('B and HUD shop controls open once, ignore repeats/editable/modifier keys and honor modal gating',()=>{
 const listeners={},button={addEventListener:(name,fn)=>listeners.button=fn},target={addEventListener:(name,fn)=>listeners[name]=fn};
 let opened=0,cleared=0,allowed=true;
 bindShopControls(target,button,{show:()=>opened++},()=>allowed,()=>cleared++);
 const event={code:'KeyB',target:{tagName:'CANVAS'},preventDefault(){}};
 listeners.keydown(event);assert.equal(opened,1);assert.equal(cleared,1);
 for(const patch of [{repeat:true},{ctrlKey:true},{metaKey:true},{altKey:true},{target:{tagName:'INPUT'}},{target:{isContentEditable:true}}])listeners.keydown({...event,...patch});
 assert.equal(opened,1);allowed=false;listeners.button();assert.equal(opened,1);allowed=true;listeners.button();assert.equal(opened,2);
});
test('Upgrade All advances all eight mines exactly once with complete costs and unchanged positions, IDs, cells and limits',()=>{
 const s=setup(),list=mines(s);unlock(s,2);const before={...s.inventory},cells=[...s.buildings.occupancy.cells];
 const identities=list.map(b=>[b.id,b.x,b.y,b.type]),remaining=s.buildings.remaining('field');
 const offer=s.upgrades.inspectAll(list[0]);assert.equal(offer.count,8);
 for(const m of ['wood','stone','gold'])assert.equal(offer.cost[m],upgradeCost('field',2)[m]*8);
 const ids=offer.targets.map(b=>b.id);assert.equal(s.upgrades.purchaseAll(list[0],1,ids).ok,true);
 assert.ok(list.every(b=>b.tier===2));for(const m of ['wood','stone','gold'])assert.equal(s.inventory[m],before[m]-offer.cost[m]);
 assert.deepEqual(list.map(b=>[b.id,b.x,b.y,b.type]),identities);assert.deepEqual([...s.buildings.occupancy.cells],cells);assert.equal(s.buildings.remaining('field'),remaining);
 const paid={...s.inventory};assert.equal(s.upgrades.purchaseAll(list[0],1,ids).ok,false);assert.deepEqual(s.inventory,paid);
});
test('normal upgrades affect one building; mass eligibility excludes other types, other current tiers and locked tiers',()=>{
 const s=setup(),list=mines(s),tower=s.buildings.place('ballista',1152,1312,s.player).building;unlock(s,3);
 assert.equal(s.upgrades.purchase(list[1],1).ok,true);assert.equal(list[1].tier,2);assert.equal(list[0].tier,1);
 let offer=s.upgrades.inspectAll(list[0]);assert.equal(offer.count,7);assert.equal(s.upgrades.purchaseAll(list[0],1,offer.targets.map(b=>b.id)).ok,true);
 assert.ok(list.every(b=>b.tier===2));assert.equal(tower.tier,1);
 offer=s.upgrades.inspectAll(list[0]);assert.equal(offer.count,8);s.upgrades.purchaseAll(list[0],2,offer.targets.map(b=>b.id));
 assert.ok(list.every(b=>b.tier===3));assert.equal(s.upgrades.inspectAll(list[0]).count,0);
 assert.equal(s.upgrades.purchaseAll(s.stash,3,[s.stash.id]).ok,false);assert.equal(s.stash.tier,3);
});
test('mass upgrades never partially execute when any total resource is insufficient, even when one upgrade is affordable',()=>{
 for(const material of ['wood','stone','gold']) {
  const s=setup(),list=mines(s);unlock(s,2);const cost=s.upgrades.inspectAll(list[0]).cost;
  s.inventory[material]=cost[material]-1;const before={...s.inventory},tiers=list.map(b=>b.tier);
  const offer=s.upgrades.inspectAll(list[0]);assert.match(offer.reason,/entire group/);
  assert.equal(s.upgrades.purchaseAll(list[0],1,offer.targets.map(b=>b.id)).ok,false);
  assert.deepEqual(s.inventory,before);assert.deepEqual(list.map(b=>b.tier),tiers);
 }
});
test('stale mass membership cannot silently change the displayed transaction',()=>{
 const s=setup(),list=mines(s,3);unlock(s,2);const offer=s.upgrades.inspectAll(list[0]);s.buildings.remove(list[1]);
 const before={...s.inventory};assert.equal(s.upgrades.purchaseAll(list[0],1,offer.targets.map(b=>b.id)).ok,false);assert.deepEqual(s.inventory,before);assert.equal(list[0].tier,1);
});
test('every supported non-stash type can mass-upgrade; Emerald and stash groups are rejected',()=>{
 for(const type of ['field','windmill','ballista','cannon','melee','bomb','mage','harvester']) {
  const s=setup(),a=s.buildings.place(type,1152,1024,s.player).building,b=s.buildings.place(type,1248,1024,s.player).building;
  unlock(s,9);
  for(let tier=1;tier<9;tier++) { const offer=s.upgrades.inspectAll(a);assert.equal(offer.count,2);assert.equal(s.upgrades.purchaseAll(a,tier,offer.targets.map(b=>b.id)).ok,true);assert.equal(a.tier,tier+1);assert.equal(b.tier,tier+1); }
  assert.equal(s.upgrades.purchaseAll(a,9,[a.id,b.id]).ok,false);
 }
});
