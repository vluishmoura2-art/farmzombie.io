import { test } from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../client/js/world.js';
import { Player } from '../client/js/player.js';
import { Buildings } from '../client/js/buildings.js';
import { Equipment } from '../client/js/equipment.js';
import { Combat } from '../client/js/combat.js';
import { COMBAT_RULES, TOWER_ATTACKS } from '../client/js/combat-config.js';
import { ZOMBIE_TYPES, ZOMBIE_ORDER, waveWeights, chooseZombieType } from '../client/js/zombie-config.js';
import { createZombie, Zombies } from '../client/js/zombies.js';
import { WaveCycle } from '../client/js/waves.js';
import { HUMANOID_PARTS, HUMANOID_RADIUS, HumanoidRenderer } from '../client/js/humanoid.js';
import { Navigation } from '../client/js/navigation.js';
import { createResource } from '../client/js/resources.js';

function setup(rules = COMBAT_RULES) {
  const world = new World(), player = new Player(4000, 4000), inventory = { wood: 10000, stone: 10000, gold: 0 };
  const buildings = new Buildings(world, inventory);
  buildings.place('stash', 3072, 3072, player);
  const combat = new Combat(world, player, buildings, inventory, { rules });
  return { world, player, inventory, buildings, combat };
}

test('all four categories use original three-part silhouette, exact colors, strictly increasing stats and scaled radius', () => {
  assert.deepEqual(HUMANOID_PARTS, [[0, -2, 20, 22, 0], [-20, 8, 10, 11, -.2], [20, 8, 10, 11, .2]]);
  assert.equal(HUMANOID_RADIUS, new Player(0, 0).radius);
  const colors = [['#48B94C','#287C32'], ['#F2BD39','#A87512'], ['#55A8EA','#27639B'], ['#24B77C','#08754B']];
  for (let i = 0; i < ZOMBIE_ORDER.length; i++) {
    const type = ZOMBIE_ORDER[i], c = ZOMBIE_TYPES[type], z = createZombie(i, type, 100, 100);
    assert.deepEqual([c.color, c.outline], colors[i]);
    assert.equal(z.radius, HUMANOID_RADIUS * c.size); assert.equal(z.health, c.health); assert.equal(z.speed, c.speed);
    if (i) for (const key of ['size','health','speed','playerDamage','buildingDamage','stashDamage','goldReward']) assert.ok(c[key] > ZOMBIE_TYPES[ZOMBIE_ORDER[i-1]][key], key);
  }
  // Shared renderer always strokes those same three paths, then their union.
  const strokes = []; let fill;
  const ctx = { stroke: p => strokes.push(p), fill: p => { fill = p; } };
  HumanoidRenderer.prototype.drawGeometry.call({ parts: ['body','left','right'], silhouette: 'union' }, ctx, '#48B94C', '#287C32');
  assert.deepEqual(strokes, ['body','left','right']); assert.equal(fill, 'union'); assert.equal(ctx.lineWidth, 5);
});

test('wave unlocks are 1/4/7/10; old categories remain and higher tiers become more common', () => {
  for (let wave = 1; wave <= 40; wave++) {
    const weights = waveWeights(wave);
    for (let i = 0; i < 4; i++) assert.equal(weights[i] > 0, wave >= ZOMBIE_TYPES[ZOMBIE_ORDER[i]].unlockWave);
    for (let sample = 0; sample < 1000; sample++) {
      const type = chooseZombieType(wave, () => sample / 1000);
      assert.ok(ZOMBIE_TYPES[type].unlockWave <= wave);
    }
  }
  for (const wave of [14, 20, 100]) assert.ok(waveWeights(wave).every(w => w > 0));
  for (let rank = 1; rank < 4; rank++) {
    const unlock = ZOMBIE_TYPES[ZOMBIE_ORDER[rank]].unlockWave;
    const share = wave => { const w = waveWeights(wave); return w[rank] / w.reduce((a,b) => a+b,0); };
    assert.ok(share(unlock + 2) > share(unlock));
  }
  assert.ok(waveWeights(30)[3] > waveWeights(14)[3]);
});

test('damage pays no gold; lethal damage pays exactly once across all categories and attackers', () => {
  const inventory = { gold: 0 }, field = new Zombies(inventory);
  let expected = 0;
  for (const type of ZOMBIE_ORDER) {
    const z = field.spawn(type, 100, 100);
    field.damage(z, z.maxHealth - 1); assert.equal(inventory.gold, expected);
    assert.equal(field.damage(z, 1), true); expected += ZOMBIE_TYPES[type].goldReward;
    for (let i = 0; i < 10; i++) assert.equal(field.damage(z, 1000), false);
    assert.equal(inventory.gold, expected); assert.equal(z.rewarded, true);
  }
  assert.equal(field.rewards.length, 4); assert.equal(field.kills, 4);
  field.update(2); assert.equal(field.items.length, 0); assert.equal(field.rewards.length, 0);
});

test('sword damages every category only in range/cone, respects cooldown and pickaxe exclusion', () => {
  for (const type of ZOMBIE_ORDER) {
    const s = setup(); s.player.x = 2000; s.player.y = 2000; s.player.angle = 0;
    const e = new Equipment(), z = s.combat.zombies.spawn(type, 2080, 2000);
    assert.equal(s.combat.sword(e), 0); e.select(1);
    assert.equal(s.combat.sword(e), 1); assert.equal(z.health, z.maxHealth - COMBAT_RULES.swordDamage);
    assert.equal(s.inventory.gold, 0); assert.equal(s.combat.sword(e), 0);
    s.combat.swordCooldown = 0; z.x = 1800;
    assert.equal(s.combat.sword(e), 0);
    s.combat.swordCooldown = 0; z.x = 2400;
    assert.equal(s.combat.sword(e), 0);
  }
});

test('all five towers damage all four categories; repeated impacts never double-reward a death', () => {
  for (const towerType of Object.keys(TOWER_ATTACKS)) for (const type of ZOMBIE_ORDER) {
    const s = setup(); s.inventory.gold = 100;
    const tower = s.buildings.place(towerType, 3200, 3072, s.player).building;
    assert.ok(tower);
    const z = s.combat.zombies.spawn(type, 3232, 3000);
    const before = z.health, gold = s.inventory.gold;
    for (let i = 0; i < 60; i++) s.combat.towers.update(1/60);
    assert.ok(z.health < before, `${towerType}/${type}`);
    if (z.active) z.health = 1;
    tower.attackCooldown = 0;
    for (let i = 0; i < 600; i++) s.combat.towers.update(1/60);
    assert.equal(s.inventory.gold, gold + ZOMBIE_TYPES[type].goldReward);
  }
});

test('category-specific player, building and stash damage applies once per attack interval', () => {
  for (const type of ZOMBIE_ORDER) {
    const s = setup(), c = ZOMBIE_TYPES[type], z = s.combat.zombies.spawn(type, 3000, 3000);
    const stash = s.buildings.stash;
    const mine = s.buildings.place('mine', 3200, 3072, s.player).building;
    for (const [target, damage] of [[s.player,c.playerDamage],[stash,c.stashDamage],[mine,c.buildingDamage]]) {
      z.attackCooldown = 0; const health = target.health;
      s.combat.attack(z, target); assert.equal(target.health, health - damage);
      s.combat.attack(z, target); assert.equal(target.health, health - damage);
    }
  }
});

test('destruction frees building cells/capacity; stash and player deaths end and freeze simulation', () => {
  const s = setup(), z = s.combat.zombies.spawn('emerald', 3000, 3000);
  const mine = s.buildings.place('mine', 3200, 3072, s.player).building;
  mine.health = 1; s.combat.attack(z, mine);
  assert.equal(mine.active, false); assert.equal(s.buildings.remaining('mine'), 8);
  assert.ok(s.buildings.occupancy.isFree(100,96,2));
  const stash = s.buildings.stash; stash.health = 1; z.attackCooldown = 0; s.combat.attack(z, stash);
  assert.equal(s.combat.gameOver, true); assert.equal(s.buildings.stash, null); assert.equal(stash.active, false);
  const before = s.combat.cycle.remaining; s.combat.update(100); assert.equal(s.combat.cycle.remaining, before);
  const other = setup(), enemy = other.combat.zombies.spawn('green',4000,4000);
  other.player.health = 1; other.combat.attack(enemy,other.player); assert.equal(other.combat.gameOver,true);
});

test('day/night waits for stash and advances waves consistently at different update rates', () => {
  const rules = { ...COMBAT_RULES, daySeconds: 2, nightSeconds: 3, spawnInterval: .2 };
  for (const fps of [30,60,144]) {
    const cycle = new WaveCycle(rules), waves = [];
    cycle.update(100,false,() => true); assert.equal(cycle.phase,'preparation');
    for (let i = 0; i < fps * 16; i++) cycle.update(1/fps,true,w => {waves.push(w);return true;});
    assert.equal(cycle.wave,3); assert.equal(cycle.phase,'day');
    assert.equal(waves.filter(w=>w===1).length,4); assert.equal(waves.filter(w=>w===2).length,6); assert.equal(waves.filter(w=>w===3).length,8);
  }
});

test('navigation avoids resources, respects each radius and refreshes after obstacle removal', () => {
  const s = setup(), nav = new Navigation(s.world);
  const tree = createResource('obstacle','tree',2048,2048); s.world.resources.add(tree);
  for (const type of ZOMBIE_ORDER) {
    const z = createZombie(1,type,1808,2064);
    assert.equal(nav.canStand(tree.x + tree.radius + z.radius - 1,tree.y,z.radius),false);
    assert.equal(nav.canStand(tree.x + tree.radius + z.radius + 1,tree.y,z.radius),true);
    const path = nav.find(z,2300,2064,30); assert.ok(path.length>0);
    for (const point of path) assert.ok(nav.canStand(point.x,point.y,z.radius));
    assert.ok(Math.hypot(path.at(-1).x-2300,path.at(-1).y-2064)<=30);
    assert.equal(nav.lineClear(1808,2064,2300,2064,z.radius),false);
  }
  const old = nav.obstacleMap(35); s.world.resources.remove(tree); assert.notEqual(nav.obstacleMap(35),old);
  assert.equal(nav.lineClear(1808,2064,2300,2064,35),true);
});

test('all scaled enemies collide with trees and buildings and cannot spawn inside obstacles', () => {
  for (const type of ZOMBIE_ORDER) {
    const s = setup(), z = s.combat.zombies.spawn(type,3104,2700);
    s.world.move(z,0,800); assert.ok(z.y <= 3072-z.radius);
    z.x = 2000; z.y = 1700; const tree = createResource('tree','tree',2000,2000); s.world.resources.add(tree);
    s.world.move(z,0,600); assert.ok(z.y <= tree.y-tree.radius-z.radius+.01);
    assert.match(s.buildings.validate('mine',Math.floor(z.x/32)*32,Math.floor(z.y/32)*32,s.player),/Outside your base|enemy/);
  }
});

test('zombies target player nearby, otherwise approach stash; pathfinding work is bounded', () => {
  const s = setup(); s.player.x=4000; s.player.y=4000;
  const z = s.combat.zombies.spawn('green',3500,3104), oldX=z.x;
  for(let i=0;i<60;i++) {s.combat.update(1/60);assert.ok(s.combat.pathsUsed<=COMBAT_RULES.pathsPerFrame);}
  assert.equal(z.target,s.buildings.stash); assert.ok(z.x<oldX);
  s.player.x=z.x+120;s.player.y=z.y;s.combat.update(1/60); assert.equal(z.target,s.player);
});

test('spawn selects only eligible categories and stays within caps and clear world positions', () => {
  const s=setup(); let state=1234;
  s.combat.random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
  for (let i=0;i<80;i++) s.combat.spawn(3);
  assert.ok(s.combat.zombies.items.length<=COMBAT_RULES.maxZombies);
  for(const z of s.combat.zombies.items) {assert.equal(z.type,'green');assert.ok(s.combat.navigation.canStand(z.x,z.y,z.radius));}
});

test('actual unobstructed zombie travel matches category speed at 30, 60 and 144 updates per second', () => {
  for (const type of ZOMBIE_ORDER) for (const fps of [30,60,144]) {
    const s=setup(),z=s.combat.zombies.spawn(type,3500,3104);
    for(let frame=0;frame<fps;frame++)s.combat.update(1/fps);
    assert.ok(Math.abs((3500-z.x)-ZOMBIE_TYPES[type].speed)<.01,`${type} at ${fps} Hz`);
    assert.ok(Math.abs(z.y-3104)<.01);
  }
});
