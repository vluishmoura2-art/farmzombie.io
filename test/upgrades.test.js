import { test } from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../client/js/world.js';
import { Player } from '../client/js/player.js';
import { Buildings } from '../client/js/buildings.js';
import { BUILDING_TYPES, BUILDING_RULES } from '../client/js/building-config.js';
import { BuildingUpgrades } from '../client/js/building-upgrades.js';
import { TIERS, MAX_TIER, upgradeCost, buildingStats } from '../client/js/tier-config.js';
import { payResources } from '../client/js/inventory.js';
import { GoldEconomy, millRange } from '../client/js/gold-economy.js';
import { AutomaticHarvester } from '../client/js/automatic-harvester.js';
import { createResource } from '../client/js/resources.js';
import { TowerCombat } from '../client/js/tower-combat.js';
import { Zombies } from '../client/js/zombies.js';

function setup() {
  const world = new World(), inventory = { wood: 1000000, stone: 1000000, gold: 1000000 };
  const player = new Player(800, 800), buildings = new Buildings(world, inventory);
  const stash = buildings.place('stash', 1024, 1024, player).building;
  return { world, inventory, player, buildings, stash, upgrades: new BuildingUpgrades(buildings) };
}
test('exactly nine ordered tiers with distinct material colors and increasing centralized costs', () => {
  assert.deepEqual(TIERS.map(t => t.name), ['Wood','Stone','Copper','Iron','Gold','Sulfur','Diamond','Ruby','Emerald']);
  assert.equal(MAX_TIER,9);assert.equal(new Set(TIERS.map(t => t.color)).size,9);
  for (const type of Object.keys(BUILDING_TYPES)) {
    let previous={wood:0,stone:0,gold:0};
    for(let tier=2;tier<=9;tier++) {
      const cost=upgradeCost(type,tier);
      if(type==='stash') { assert.equal(cost.wood,0);assert.equal(cost.stone,0); }
      for(const m of type==='stash'?['gold']:['wood','stone','gold']) assert.ok(cost[m]>previous[m]);
      previous=cost;
    }
    assert.equal(upgradeCost(type,10),null);
  }
});
test('new bases and buildings start at Wood; stash gold-only upgrades unlock exactly one tier and stop at Emerald', () => {
  const s=setup();assert.equal(s.stash.tier,1);assert.equal(s.upgrades.unlockedTier,1);
  const wood=s.inventory.wood,stone=s.inventory.stone;
  for(let tier=1;tier<9;tier++) {
    const before=s.inventory.gold,health=s.stash.maxHealth;
    assert.equal(s.upgrades.purchase(s.stash,tier).ok,true);
    assert.equal(s.stash.tier,tier+1);assert.equal(s.upgrades.unlockedTier,tier+1);
    assert.equal(s.inventory.gold,before-upgradeCost('stash',tier+1).gold);
    assert.equal(s.inventory.wood,wood);assert.equal(s.inventory.stone,stone);assert.ok(s.stash.maxHealth>health);
  }
  const before={...s.inventory};assert.equal(s.upgrades.purchase(s.stash,9).ok,false);assert.deepEqual(s.inventory,before);
  assert.equal(s.buildings.place('field',1152,1024,s.player).building.tier,1);
  assert.equal(s.buildings.remaining('stash'),0);
});
test('each building upgrades individually, pays all three costs, keeps identity, position, cells and limits', () => {
  for(const type of Object.keys(BUILDING_TYPES).filter(t=>t!=='stash')) {
    const s=setup(),b=s.buildings.place(type,1152,1024,s.player).building;
    const identity={id:b.id,type:b.type,x:b.x,y:b.y,cellX:b.cellX,cellY:b.cellY};
    const cells=[...s.buildings.occupancy.cells],remaining=s.buildings.remaining(type);
    assert.equal(s.upgrades.purchase(b,1).ok,false);
    for(let tier=1;tier<9;tier++) {
      s.upgrades.purchase(s.stash,tier);
      const before={...s.inventory},cost=upgradeCost(type,tier+1);
      assert.equal(s.upgrades.purchase(b,tier).ok,true);assert.equal(b.tier,tier+1);
      for(const m of ['wood','stone','gold'])assert.equal(s.inventory[m],before[m]-cost[m]);
      assert.deepEqual(Object.fromEntries(Object.keys(identity).map(k=>[k,b[k]])),identity);
      assert.deepEqual([...s.buildings.occupancy.cells],cells);assert.equal(s.buildings.remaining(type),remaining);
    }
    assert.equal(s.upgrades.purchase(b,9).ok,false);
  }
});
test('insufficient balances and stale offers never partially pay or double-apply; removed buildings reject', () => {
  const s=setup(), b=s.buildings.place('field',1152,1024,s.player).building;
  s.upgrades.purchase(s.stash,1);
  for(const m of ['wood','stone','gold']) {
    Object.assign(s.inventory,{wood:1000,stone:1000,gold:1000});s.inventory[m]=upgradeCost('field',2)[m]-1;
    const before={...s.inventory};assert.equal(s.upgrades.purchase(b,1).ok,false);assert.deepEqual(s.inventory,before);assert.equal(b.tier,1);
  }
  Object.assign(s.inventory,{wood:1000,stone:1000,gold:1000});assert.equal(s.upgrades.purchase(b,1).ok,true);
  const before={...s.inventory};assert.equal(s.upgrades.purchase(b,1).ok,false);assert.deepEqual(s.inventory,before);
  s.buildings.remove(b);assert.equal(s.upgrades.purchase(b,2).ok,false);
  const invalid={wood:NaN,stone:4,gold:4};assert.equal(payResources(invalid,{wood:3,stone:3,gold:3}),false);assert.ok(Number.isNaN(invalid.wood));assert.equal(invalid.stone,4);
});
test('upgrades preserve health ratio rather than repairing damage', () => {
  const s=setup();s.stash.health=s.stash.maxHealth/2;
  s.upgrades.purchase(s.stash,1);assert.equal(s.stash.health,s.stash.maxHealth/2);
});
test('all tower tiers improve actual damage, speed and applicable splash; all buildings gain durability', () => {
  for(const type of Object.keys(BUILDING_TYPES)) for(let tier=2;tier<=9;tier++) {
    const before=buildingStats(type,tier-1),after=buildingStats(type,tier);assert.ok(after.maxHealth>before.maxHealth);
    if(before.attack) { assert.ok(after.attack.damage>before.attack.damage);assert.ok(after.attack.cooldown<before.attack.cooldown);if(before.attack.splash)assert.ok(after.attack.splash>before.attack.splash); }
  }
  for (const type of ['ballista','cannon','melee','bomb','mage']) {
    const damage=[];
    for(const tier of [1,2]) {
      const s=setup(),b=s.buildings.place(type,1152,1024,s.player).building;b.tier=tier;
      const zombies=new Zombies(s.inventory),z=zombies.spawn('green',1240,1056);z.health=z.maxHealth=10000;
      const towers=new TowerCombat(s.buildings,zombies);towers.update(.01);
      if(towers.projectiles.length)damage.push(towers.projectiles[0].damage);else damage.push(10000-z.health);
    }
    assert.ok(damage[1]>damage[0],type);
  }
});
test('upgraded fields yield more gold per harvest, upgraded windmills reach farther, harvesters collect faster', () => {
  const s=setup(),field=s.buildings.place('field',1152,1024,s.player).building;
  const h=s.buildings.place('harvester',1152,1152,s.player).building;
  const mill=s.buildings.place('windmill',1024,1152,s.player).building;
  s.upgrades.purchase(s.stash,1);s.upgrades.purchase(field,1);s.upgrades.purchase(h,1);
  assert.ok(millRange({tier:2},BUILDING_RULES)>millRange(mill,BUILDING_RULES));
  Object.assign(s.inventory,{wood:0,stone:0,gold:0});new GoldEconomy(s.buildings).update(BUILDING_RULES.growSeconds+BUILDING_RULES.millInterval);
  assert.equal(s.inventory.gold,Math.round(BUILDING_RULES.wheatGold*buildingStats('field',2).production));
  assert.ok(s.inventory.gold>BUILDING_RULES.wheatGold);
  const nodes=[createResource('a','tree',1320,1184),createResource('b','stone',1407,1184)];
  for(const node of nodes){node.formationId='mixed';s.world.resources.add(node);}
  s.world.resources.formations.push({id:'mixed',type:'E',members:nodes});
  const automatic=new AutomaticHarvester(s.buildings);automatic.update(1.67);assert.equal(s.inventory.wood,3);assert.equal(s.inventory.stone,3);
  assert.equal(nodes[0].hitUntil,nodes[1].hitUntil);assert.ok(nodes.every(n=>n.active));
});
