import { test } from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../client/js/world.js';
import { Player } from '../client/js/player.js';
import { Camera } from '../client/js/camera.js';
import { Input } from '../client/js/input.js';
import { Equipment, EQUIPMENT } from '../client/js/equipment.js';

const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} should equal ${expected}`);

test('WASD diagonals travel the same distance as cardinal movement', () => {
  const world = new World();
  for (const direction of [{ x: 1, y: 0 }, { x: -1, y: -1 }, { x: 1, y: 1 }]) {
    const player = new Player(3000, 3000);
    for (let frame = 0; frame < 60; frame++) player.update(1 / 60, direction, world);
    near(Math.hypot(player.x - 3000, player.y - 3000), player.speed);
  }
});

test('movement is consistent at 30, 60 and 144 fps, and idle does not drift', () => {
  const world = new World();
  for (const fps of [30, 60, 144]) {
    const player = new Player(3000, 3000);
    for (let frame = 0; frame < fps * 2; frame++) player.update(1 / fps, { x: 1, y: 0 }, world);
    near(player.x, 3480);
    player.update(1, { x: 0, y: 0 }, world);
    near(player.x, 3480);
    near(player.y, 3000);
  }
});

test('all four corners constrain the entire collision footprint', () => {
  const world = new World();
  for (const x of [-1, 1]) for (const y of [-1, 1]) {
    const player = new Player(world.width / 2, world.height / 2);
    player.update(100, { x, y }, world);
    near(player.x, x < 0 ? player.radius : world.width - player.radius);
    near(player.y, y < 0 ? player.radius : world.height - player.radius);
    player.update(1, { x, y }, world);
    assert.ok(player.x >= player.radius && player.x <= world.width - player.radius);
    assert.ok(player.y >= player.radius && player.y <= world.height - player.radius);
    // Pushing against a wall still permits motion parallel to it.
    player.update(.1, { x: -x, y }, world);
    assert.ok(x < 0 ? player.x > player.radius : player.x < world.width - player.radius);
  }
});

test('camera converges smoothly and its damping is frame-rate independent', () => {
  let expected;
  for (const fps of [30, 60, 144]) {
    const camera = new Camera(0, 0);
    const target = { x: 1000, y: 500 };
    for (let frame = 0; frame < fps; frame++) camera.update(1 / fps, target);
    assert.ok(camera.x > 999 && camera.x < target.x);
    if (expected === undefined) expected = camera.x;
    near(camera.x, expected);
    near(camera.worldToScreenX(camera.x, 1280), 640);
    near(camera.worldToScreenY(camera.y, 720), 360);
    near(camera.worldToScreenX(64, 1280) - camera.worldToScreenX(0, 1280), 64);
  }
});

test('keyboard combines keys, cancels opposites and clears on blur', () => {
  const target = new EventTarget();
  const input = new Input(target);
  const key = (type, code) => {
    const event = new Event(type, { cancelable: true });
    Object.defineProperty(event, 'code', { value: code });
    target.dispatchEvent(event);
  };
  key('keydown', 'KeyW');
  key('keydown', 'KeyD');
  assert.equal(input.x, 1);
  assert.equal(input.y, -1);
  key('keydown', 'KeyA');
  assert.equal(input.x, 0);
  key('keyup', 'KeyA');
  key('keyup', 'KeyD');
  assert.equal(input.x, 0);
  target.dispatchEvent(new Event('blur'));
  assert.equal(input.y, 0);
  assert.equal(input.keys.size, 0);
  input.destroy();
  key('keydown', 'KeyD');
  assert.equal(input.x, 0);
});

test('aiming covers all quadrants and keeps the last angle at the player center', () => {
  const player = new Player(100, 200);
  for (const [dx, dy] of [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]]) {
    player.aimAt(player.x + dx * 100, player.y + dy * 100);
    near(player.angle, Math.atan2(dy, dx));
  }
  const previous = player.angle;
  player.aimAt(player.x, player.y);
  near(player.angle, previous);
  // Crossing the atan2 wrap still gives neighboring facing vectors.
  player.aimAt(0, 200.01);
  const before = player.angle;
  player.aimAt(0, 199.99);
  assert.ok(Math.cos(player.angle - before) > .999999);
});

test('cursor conversions remain inverse with camera lag and changing viewport sizes', () => {
  const player = new Player(3000, 3000);
  const camera = new Camera(2975, 2960);
  for (const [width, height] of [[1280, 800], [390, 844], [800, 600]]) {
    for (const [x, y] of [[1, 1], [width - 1, 1], [1, height - 1], [width - 1, height - 1]]) {
      const worldX = camera.screenToWorldX(x, width);
      const worldY = camera.screenToWorldY(y, height);
      near(camera.worldToScreenX(worldX, width), x);
      near(camera.worldToScreenY(worldY, height), y);
      player.aimAt(worldX, worldY);
      near(player.angle, Math.atan2(y - camera.worldToScreenY(player.y, height), x - camera.worldToScreenX(player.x, width)));
    }
    camera.update(.016, player);
  }
});

test('equipment starts with pickaxe and accepts exactly two slots', () => {
  const equipment = new Equipment();
  assert.equal(EQUIPMENT.length, 2);
  assert.equal(equipment.selected.id, 'pickaxe');
  assert.equal(equipment.select(1), true);
  assert.equal(equipment.selected.id, 'sword');
  for (const invalid of [-1, 2, NaN, .5, '0']) assert.equal(equipment.select(invalid), false);
  assert.equal(equipment.selected.id, 'sword');
  equipment.select(0);
  assert.equal(equipment.selected.id, 'pickaxe');
});

test('equipment shortcuts preserve held movement and ignore editable input', () => {
  const target = new EventTarget();
  const input = new Input(target);
  const equipment = new Equipment();
  input.onSelectEquipment = (slot) => equipment.select(slot);
  const event = (code, repeat = false) => ({ code, repeat, preventDefault() {} });
  input.handleKey(event('KeyW'), true);
  input.handleKey(event('Digit2'), true);
  assert.equal(equipment.selected.id, 'sword');
  assert.equal(input.y, -1);
  input.handleKey({ ...event('Digit1'), target: { tagName: 'INPUT' } }, true);
  assert.equal(equipment.selected.id, 'sword');
  input.handleKey(event('Numpad1'), true);
  assert.equal(equipment.selected.id, 'pickaxe');
  input.clear();
  assert.equal(input.y, 0);
  assert.equal(equipment.selected.id, 'pickaxe');
  input.destroy();
});

test('pointer input uses canvas CSS offset and recomputes offsets on resize', () => {
  const target = new EventTarget();
  let left = 20;
  const surface = new EventTarget();
  surface.getBoundingClientRect = () => ({ left, top: 30 });
  const input = new Input(target, surface);
  const move = new Event('pointermove');
  Object.defineProperties(move, { clientX: { value: 400 }, clientY: { value: 300 } });
  target.dispatchEvent(move);
  assert.equal(input.hasPointer, true);
  near(input.pointerX, 380);
  near(input.pointerY, 270);
  left = 40;
  input.refreshPointer();
  near(input.pointerX, 360);
  input.destroy();
});
