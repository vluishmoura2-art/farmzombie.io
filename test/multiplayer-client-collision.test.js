import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MultiplayerClient } from '../client/js/multiplayer-client.js';
import { World } from '../client/js/world.js';
import { Player } from '../client/js/player.js';
import { Buildings, circleOverlapsSquare } from '../client/js/buildings.js';
import { createResource } from '../client/js/resources.js';
import { GameRoom } from '../server/game-room.js';

test('snapshot movement collides with remote buildings and follows removal and reset deltas', t => {
  const previousDocument = globalThis.document;
  globalThis.document = { querySelector: () => ({ textContent: '' }) };
  t.after(() => {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  });
  const room = new GameRoom();
  const self = room.join(undefined, 'Local_Player');
  const remote = room.join(undefined, 'Remote_Player');
  const world = new World();
  world.resources.add(createResource('far', 'tree', 3000, 3000));
  const player = new Player(800, 800);
  const buildings = new Buildings(world, {});
  const client = Object.assign(Object.create(MultiplayerClient.prototype), {
    world, player, buildings, id: self.id, equipment: {}, harvesting: { inventory: {} },
    combat: { cycle: {}, zombies: {}, towers: {} }, status: {}, dialog: { open: false },
    buildingMap: new Map(), remote: new Map(), onChange() {},
  });
  const apply = (changes = {}) => client.apply({ ...room.snapshot(self), reset: true, removed: [], ...changes });
  const move = (dy) => player.update(2, { x: 0, y: dy }, world);
  const start = () => { player.x = 1056; player.y = 800; };

  apply();
  start();
  assert.doesNotThrow(() => move(1));
  assert.ok(player.y > 1088);

  remote.buildings.items.push({ id: 1, type: 'field', x: 1024, y: 1024, active: true, tier: 1 });
  apply();
  assert.equal(buildings.items.length, 0, 'remote buildings stay outside the local ownership list');
  assert.equal(world.buildings.items.length, 1);
  start();
  move(1);
  assert.ok(player.y <= 1024 - player.radius);
  assert.equal(circleOverlapsSquare(player, 1024, 1024, 64), false);
  const blockedY = player.y;
  move(-1);
  assert.ok(player.y < blockedY, 'player can retreat from the wall');

  apply({ reset: false, buildings: [], removed: [`${remote.baseId}:1`] });
  start();
  move(1);
  assert.ok(player.y > 1088, 'removed building no longer blocks movement');

  apply();
  start();
  move(1);
  assert.ok(player.y <= 1024 - player.radius, 'full snapshot restores building collision');
});
