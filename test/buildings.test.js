import { test } from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../client/js/world.js';
import { Player } from '../client/js/player.js';
import { Buildings, circleOverlapsSquare } from '../client/js/buildings.js';
import { BUILDING_TYPES, BUILDING_RULES } from '../client/js/building-config.js';
import { BuildingPlacement } from '../client/js/building-placement.js';
import { GoldEconomy } from '../client/js/gold-economy.js';
import { AutomaticHarvester } from '../client/js/automatic-harvester.js';
import { Harvesting } from '../client/js/harvesting.js';
import { Equipment } from '../client/js/equipment.js';
import { createResource } from '../client/js/resources.js';

function setup(rules) {
  const world = new World();
  const inventory = { wood: 10000, stone: 10000, gold: 10000 };
  const buildings = new Buildings(world, inventory, rules);
  const player = new Player(4000, 4000);
  return { world, inventory, buildings, player };
}
function base(s) { assert.ok(s.buildings.place('stash', 1024, 1024, s.player).ok); return s; }

test('stash is free, unique, permanent and required before other types', () => {
  const s = setup(); Object.assign(s.inventory, { wood: 0, stone: 0, gold: 0 });
  assert.match(s.buildings.validate('field', 1024, 1024, s.player), /Stash first/);
  base(s);
  assert.deepEqual(s.inventory, { wood: 0, stone: 0, gold: 0 });
  assert.equal(s.buildings.place('stash', 1120, 1024, s.player).ok, false);
  assert.equal(s.buildings.remove(s.buildings.stash), false);
  assert.equal(s.buildings.items.length, 1);
});

test('preview snaps on the current 32-unit grid; every footprint owns exactly four cells', () => {
  const s = setup(), preview = new BuildingPlacement(s.buildings);
  preview.select('stash'); preview.update(1055.9, 1030, s.player);
  assert.equal(preview.x, 1024); assert.equal(preview.y, 1024);
  assert.equal(preview.reason, '');
  assert.ok(preview.place(1055.9, 1030, s.player).ok);
  assert.equal(s.buildings.size, 64);
  assert.equal(s.buildings.occupancy.cells.size, 4);
  assert.equal(preview.selected, null);
  for (const [type] of Object.entries(BUILDING_TYPES).slice(1)) {
    const n = s.buildings.items.length;
    assert.ok(s.buildings.place(type, 608 + n * 96, 736, s.player).ok);
    assert.equal(s.buildings.occupancy.cells.size, 4 * s.buildings.items.length);
  }
  preview.select('field'); preview.update(1024, 1024, s.player);
  assert.match(preview.reason, /occupied/);
  preview.cancel(); assert.equal(preview.visible, false);
});

test('invalid placement never charges: world, base edge, grid, resource, player, overlap and insufficient funds', () => {
  const s = base(setup()); const original = { ...s.inventory };
  const { buildings: b, world, player } = s;
  const span = b.base.right - b.base.left;
  assert.equal(span, 36 * world.gridSize);
  assert.equal((b.base.left + b.base.right) / 2, b.stash.x + 32);
  world.resources.add(createResource('tree', 'tree', 800, 800));
  world.resources.add(createResource('stone', 'stone', 896, 800));
  for (const [x, y, p] of [[-32, 1024, player], [world.width, 1024, player], [b.base.right - 32, 1024, player], [b.base.left - 32, 1024, player], [1025, 1200, player], [768, 768, player], [864, 768, player], [1024, 1024, player], [1200, 1200, player], [1216, 1216, new Player(1248, 1248)]]) {
    assert.equal(b.place('field', x, y, p).ok, false);
    assert.deepEqual(s.inventory, original);
  }
  assert.equal(b.validate('field', b.base.right - 64, b.base.top, player), '');
  s.inventory.wood = 8;
  assert.equal(b.place('field', 1280, 1024, player).ok, false);
  assert.equal(s.inventory.wood, 8);
  s.inventory.wood = NaN;
  assert.match(b.validate('field', 1280, 1024, player), /resources/);
});

test('successful placement pays exact configured costs once; repeated input cannot pay again', () => {
  const s = base(setup()), before = { ...s.inventory };
  assert.ok(s.buildings.place('field', 1152, 1024, s.player).ok);
  for (const key of ['wood', 'stone', 'gold']) assert.equal(s.inventory[key], before[key] - BUILDING_TYPES.field.cost[key]);
  const after = { ...s.inventory };
  for (let i = 0; i < 10; i++) assert.equal(s.buildings.place('field', 1152, 1024, s.player).ok, false);
  assert.deepEqual(s.inventory, after);
});

test('all seven independent limits enforce capacity and removal frees exactly four cells', () => {
  for (const [type, config] of Object.entries(BUILDING_TYPES).slice(1)) {
    const s = base(setup());
    for (let i = 0; i < config.limit; i++) assert.ok(s.buildings.place(type, 640 + i * 96, 736, s.player).ok);
    assert.equal(s.buildings.remaining(type), 0);
    assert.equal(s.buildings.place(type, 640, 832, s.player).ok, false);
    for (const other of Object.keys(BUILDING_TYPES)) if (other !== type && other !== 'stash') assert.equal(s.buildings.remaining(other), BUILDING_TYPES[other].limit);
    const b = s.buildings.items[1], cells = s.buildings.occupancy.cells.size;
    assert.equal(s.buildings.remove(b), true); assert.equal(s.buildings.remove(b), false);
    assert.equal(s.buildings.remaining(type), 1);
    assert.equal(s.buildings.occupancy.cells.size, cells - 4);
    assert.ok(s.buildings.place(type, b.x, b.y, s.player).ok);
  }
});

test('wheat grows only outside the night and is frame-rate independent', () => {
  for (const fps of [30, 60, 144]) {
    const s = base(setup());
    const field = s.buildings.place('field', 1152, 1024, s.player).building;
    const economy = new GoldEconomy(s.buildings);
    assert.equal(field.growth, 0);
    for (let i = 0; i < 15 * fps; i++) economy.update(1 / fps, 'day');
    assert.ok(Math.abs(field.growth - 15 / BUILDING_RULES.growSeconds) < 1e-6);
    economy.update(60, 'night');
    assert.ok(Math.abs(field.growth - 15 / BUILDING_RULES.growSeconds) < 1e-6, 'night pauses growth');
    economy.update(60, 'day');
    assert.equal(field.growth, 1, 'growth stops at ripe');
  }
});

test('windmills grind ripe fields in range into gold, one per interval, and replant them', () => {
  const s = base(setup());
  const near = s.buildings.place('field', 1152, 1024, s.player).building;
  const other = s.buildings.place('field', 1216, 1024, s.player).building;
  const far = s.buildings.place('field', 1024 + 512, 1024 + 448, s.player).building;
  const economy = new GoldEconomy(s.buildings);
  economy.update(BUILDING_RULES.growSeconds, 'day');
  s.inventory.gold = 0;
  economy.update(5, 'day');
  assert.equal(s.inventory.gold, 0, 'no windmill, no gold: ripe wheat waits');
  assert.equal(near.growth, 1);
  const mill = s.buildings.place('windmill', 1152, 1152, s.player).building;
  economy.update(BUILDING_RULES.millInterval, 'night');
  assert.equal(s.inventory.gold, BUILDING_RULES.wheatGold);
  assert.equal([near, other].filter(f => f.growth === 0).length, 1, 'one field per grind');
  economy.update(BUILDING_RULES.millInterval, 'night');
  assert.equal(s.inventory.gold, 2 * BUILDING_RULES.wheatGold);
  assert.equal(far.growth, 1, 'fields out of range are not ground');
  economy.update(100, 'night');
  assert.equal(s.inventory.gold, 2 * BUILDING_RULES.wheatGold, 'nothing left in range to grind');
  s.buildings.remove(mill);
  s.inventory.gold = NaN; economy.update(1, 'day');
  assert.equal(s.inventory.gold, 0);
});

test('automatic harvesters and manual hits share infinite nodes and exact independent payouts', () => {
  const s = base(setup());
  s.buildings.place('harvester', 1152, 1024, s.player);
  s.buildings.place('harvester', 1152, 1152, s.player);
  const tree = createResource('t', 'tree', 1320, 1080);
  const stone = createResource('s', 'stone', 1340, 1160);
  const far = createResource('far', 'tree', 2000, 2000);
  for (const r of [tree, stone, far]) s.world.resources.add(r);
  Object.assign(s.inventory, { wood: 0, stone: 0, gold: 0 });
  const manual = new Harvesting(); manual.inventory = s.inventory;
  s.player.x = 1400; s.player.y = 1080;
  assert.equal(manual.attempt(s.player, new Equipment(), s.world.resources, tree.x, tree.y).amount, 3);
  const automatic = new AutomaticHarvester(s.buildings);
  automatic.update(1.999); assert.equal(s.inventory.wood, 3);
  automatic.update(.001);
  for (let i = 0; i < 10; i++) automatic.update(2);
  assert.equal(s.inventory.wood, 36); assert.equal(s.inventory.stone, 33);
  assert.equal(tree.active, true); assert.equal(stone.active, true); assert.equal(far.hitUntil, 0);
  manual.update(1); manual.attempt(s.player, new Equipment(), s.world.resources, tree.x, tree.y);
  automatic.update(100); assert.equal(s.inventory.wood, 189); assert.equal(s.inventory.stone, 183);
  assert.equal(s.world.resources.items.length, 3);
});

test('building square collision prevents tunneling, allows retreat and frees movement on removal', () => {
  const s = base(setup());
  const b = s.buildings.place('field', 1152, 1024, s.player).building;
  s.player.x = 1184; s.player.y = 800;
  s.player.update(2, { x: 0, y: 1 }, s.world);
  assert.ok(s.player.y <= 1024 - s.player.radius);
  assert.equal(circleOverlapsSquare(s.player, b.x, b.y, 64), false);
  const y = s.player.y; s.player.update(.1, { x: 0, y: -1 }, s.world); assert.ok(s.player.y < y);
  s.buildings.remove(b); s.player.update(1, { x: 0, y: 1 }, s.world); assert.ok(s.player.y > 1088);
});
