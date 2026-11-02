import { test } from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../client/js/world.js';
import { Player, HARVEST_SWING_DURATION } from '../client/js/player.js';
import { Equipment } from '../client/js/equipment.js';
import { Input } from '../client/js/input.js';
import { createResource, ResourceField, RESOURCE_TYPES } from '../client/js/resources.js';
import { generateResources } from '../client/js/world-generation.js';
import { Harvesting, HARVEST_COOLDOWN, HARVEST_REACH, resourceCount } from '../client/js/harvesting.js';
import { ResourceHUD } from '../client/js/resource-hud.js';

const near = (a, b) => assert.ok(Math.abs(a - b) < .01, `${a} should equal ${b}`);
const setup = (type = 'tree') => {
  const world = new World();
  const node = createResource('test', type, 400, 400);
  world.resources.add(node);
  const player = new Player(400 - node.radius - 35 - 10, 400);
  return { world, node, player, equipment: new Equipment(), harvesting: new Harvesting() };
};

test('generation is seeded, complete, in bounds and clear of spawn/other objects', () => {
  const a = new World();
  const b = new World();
  generateResources(a);
  generateResources(b);
  assert.equal(a.resources.items.length, 320);
  assert.deepEqual(a.resources.items, b.resources.items);
  assert.equal(new Set(a.resources.items.map((r) => r.id)).size, 320);
  assert.equal(new Set(a.resources.items.map((r) => r.type)).size, 2);
  for (let i = 0; i < a.resources.items.length; i++) {
    const node = a.resources.items[i];
    assert.ok(node.x - node.radius >= 48 && node.x + node.radius <= a.width - 48);
    assert.ok(node.y - node.radius >= 48 && node.y + node.radius <= a.height - 48);
    assert.ok(Math.hypot(node.x - a.width / 2, node.y - a.height / 2) >= 125 + node.radius);
    for (let j = i + 1; j < a.resources.items.length; j++) {
      const other = a.resources.items[j];
      assert.ok(Math.hypot(node.x - other.x, node.y - other.y) >= node.radius + other.radius + (node.formationId === other.formationId ? 12 - 1e-8 : 80));
    }
  }
  const c = new World();
  generateResources(c, { seed: 2 });
  assert.notDeepEqual(a.resources.items.slice(2), c.resources.items.slice(2));
});

test('spatial queries include partly visible objects, exclude distant objects and support explicit world maintenance removal', () => {
  const field = new ResourceField(6144);
  const node = createResource('edge', 'tree', 520, 500);
  field.add(node);
  field.add(createResource('far', 'stone', 3000, 3000));
  const buffer = [];
  assert.equal(field.queryBounds(400, 400, 500, 600, buffer), buffer);
  assert.deepEqual(buffer, [node]);
  field.remove(node);
  field.remove(node);
  assert.equal(field.items.length, 1);
  field.queryBounds(400, 400, 500, 600, buffer);
  assert.equal(buffer.length, 0);
});

for (const type of ['tree', 'stone']) {
  test(`${type} collision prevents penetration/tunneling and permits sliding and retreat`, () => {
    const { world, node, player } = setup(type);
    player.x = 100;
    player.update(3, { x: 1, y: 0 }, world);
    near(player.x, node.x - node.radius - player.radius);
    near(player.y, node.y);
    for (let frame = 0; frame < 90; frame++) {
      player.update(1 / 60, { x: 1, y: 1 }, world);
      assert.ok(Math.hypot(player.x - node.x, player.y - node.y) >= player.radius + node.radius - .001);
    }
    assert.ok(player.x > node.x && player.y > node.y);
    const previous = player.x;
    player.update(.1, { x: -1, y: 0 }, world);
    assert.ok(player.x < previous);
  });

  test(`${type} yields exactly three forever and retains collision`, () => {
    const { world, node, player, equipment, harvesting } = setup(type);
    const material = RESOURCE_TYPES[type].material;
    for (let hit = 1; hit <= 1000; hit++) {
      const result = harvesting.attempt(player, equipment, world.resources, -9999, -9999);
      assert.equal(result.status, 'hit'); assert.equal(result.amount, 3);
      assert.equal(harvesting.inventory[material], hit * 3);
      assert.equal(harvesting.attempt(player, equipment, world.resources).status, 'cooldown');
      harvesting.update(HARVEST_COOLDOWN);
    }
    assert.equal(node.active, true); assert.equal(world.resources.items.length, 1);
    assert.equal(Object.hasOwn(node, 'health'), false);
    assert.equal(Object.hasOwn(node, 'remainingReward'), false);
    player.update(1, { x: 1, y: 0 }, world);
    assert.ok(player.x < node.x - node.radius);
  });
}

test('no collection with sword, distant player or right before cooldown ends', () => {
  const { world, node, player, equipment, harvesting } = setup();
  equipment.select(1);
  assert.equal(harvesting.attempt(player, equipment, world.resources, node.x, node.y).status, 'wrong-tool');
  equipment.select(0);
  player.x = node.x - HARVEST_REACH - 1;
  assert.equal(harvesting.attempt(player, equipment, world.resources, node.x, node.y).status, 'out-of-range');
  assert.equal(harvesting.inventory.wood, 0);
  assert.equal(node.active, true);
  player.x += 1;
  assert.equal(harvesting.attempt(player, equipment, world.resources, node.x, node.y).status, 'hit');
  harvesting.update(HARVEST_COOLDOWN - .001);
  assert.equal(harvesting.attempt(player, equipment, world.resources, node.x, node.y).status, 'cooldown');
  assert.equal(harvesting.inventory.wood, 3);
});

test('hit feedback expires without health, depletion or per-frame resource scans', () => {
  const { world, node, player, equipment, harvesting } = setup();
  harvesting.attempt(player, equipment, world.resources);
  assert.ok(node.hitUntil > world.resources.time);
  world.resources.update(.17);
  assert.ok(node.hitUntil < world.resources.time);
  assert.equal(node.active, true); assert.equal(Object.hasOwn(node,'health'), false);
});

test('harvest range is 100 center-to-center units, independent of resource size', () => {
  assert.equal(HARVEST_REACH, 100);
  for (const type of ['tree', 'stone']) {
    const { world, node, player, equipment, harvesting } = setup(type);
    player.x = node.x - 100.01;
    assert.equal(harvesting.attempt(player, equipment, world.resources, node.x, node.y).status, 'out-of-range');
    player.x = node.x - 100;
    assert.equal(harvesting.attempt(player, equipment, world.resources, node.x, node.y).status, 'hit');
  }
});

test('range/cooldown are configurable and one click cannot deal damage on later frames', () => {
  const { world, node, player, equipment } = setup();
  const harvesting = new Harvesting({ range: 120, cooldown: .5 });
  player.x = node.x - 110;
  assert.equal(harvesting.attempt(player, equipment, world.resources, node.x, node.y).status, 'hit');
  for (let frame = 0; frame < 600; frame++) harvesting.update(1 / 60);
  assert.equal(node.active, true);
  assert.equal(harvesting.inventory.wood, 3);
  harvesting.attempt(player, equipment, world.resources, node.x, node.y);
  harvesting.update(.499);
  assert.equal(harvesting.attempt(player, equipment, world.resources, node.x, node.y).status, 'cooldown');
  harvesting.update(.001);
  assert.equal(harvesting.attempt(player, equipment, world.resources, node.x, node.y).status, 'hit');
  assert.equal(harvesting.inventory.wood, 9);
  assert.throws(() => new Harvesting({ range: NaN }), RangeError);
});

test('default cooldown blocks 299ms and accepts 300ms without duplicating damage', () => {
  assert.equal(HARVEST_COOLDOWN, .3);
  const { world, node, player, equipment, harvesting } = setup();
  harvesting.attempt(player, equipment, world.resources, node.x, node.y);
  harvesting.update(.299);
  assert.equal(harvesting.attempt(player, equipment, world.resources, node.x, node.y).status, 'cooldown');
  harvesting.update(.001);
  assert.equal(harvesting.attempt(player, equipment, world.resources, node.x, node.y).status, 'hit');
  assert.equal(node.active, true);
  assert.equal(harvesting.inventory.wood, 6);
});

test('swing finishes, keeps aiming independent and does not interrupt movement', () => {
  const world = new World();
  const player = new Player(1000, 1000);
  player.aimAt(1200, 1100);
  const angle = player.angle;
  player.startHarvestSwing();
  assert.equal(player.harvestSwingAngle, 0);
  player.update(HARVEST_SWING_DURATION / 4, { x: 1, y: 0 }, world);
  assert.ok(Math.abs(player.harvestSwingAngle) > .3);
  near(player.x, 1000 + player.speed * HARVEST_SWING_DURATION / 4);
  assert.equal(player.angle, angle);
  player.aimAt(800, 900);
  assert.notEqual(player.angle, angle);
  player.update(HARVEST_SWING_DURATION, { x: 0, y: 0 }, world);
  assert.equal(player.harvestSwingTime, 0);
  assert.equal(player.harvestSwingAngle, 0);
});

test('inventory and HUD counters stay non-negative integers with invalid starting values', () => {
  const wood = {};
  const stone = {};
  const { world, node, player, equipment, harvesting } = setup();
  for (const value of [NaN, undefined, Infinity, -10, 1.9]) {
    harvesting.inventory.wood = value;
    harvesting.inventory.stone = value;
    ResourceHUD.prototype.refresh.call({ inventory: harvesting.inventory, wood, stone });
    for (const output of [wood, stone]) {
      assert.ok(Number.isSafeInteger(Number(output.value)) && Number(output.value) >= 0);
    }
  }
  harvesting.inventory.wood = NaN;
  harvesting.attempt(player, equipment, world.resources, node.x, node.y);
  assert.equal(harvesting.inventory.wood, 3);
  assert.equal(resourceCount(-1), 0);
});

test('collision recovers from an exact center overlap without NaN or trapped movement', () => {
  const { world, node, player } = setup();
  player.x = node.x;
  player.y = node.y;
  world.move(player, 0, 0);
  assert.ok(Number.isFinite(player.x) && Number.isFinite(player.y));
  assert.ok(Math.hypot(player.x - node.x, player.y - node.y) >= node.radius + player.radius);
  const oldX = player.x;
  player.update(.1, { x: 1, y: 0 }, world);
  assert.ok(player.x > oldX);
});

test('click input harvests only from the canvas and only with the left button', () => {
  const target = new EventTarget();
  const canvas = new EventTarget();
  canvas.getBoundingClientRect = () => ({ left: 20, top: 30 });
  const input = new Input(target, canvas);
  let calls = 0;
  input.onHarvest = (x, y) => { calls++; near(x, 80); near(y, 90); };
  const click = (button) => {
    const event = new Event('click');
    Object.defineProperties(event, { button: { value: button }, clientX: { value: 100 }, clientY: { value: 120 } });
    return event;
  };
  target.dispatchEvent(click(0));
  canvas.dispatchEvent(click(2));
  assert.equal(calls, 0);
  canvas.dispatchEvent(click(0));
  assert.equal(calls, 1);
  input.destroy();
  canvas.dispatchEvent(click(0));
  assert.equal(calls, 1);
});
