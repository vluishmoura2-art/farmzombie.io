import { createResource, RESOURCE_TYPES } from './resources.js';
import { circleOverlapsSquare } from './buildings.js';
export const WORLD_SEED = 3417777;
export const FORMATION_TYPES = Object.freeze({
  A: Object.freeze({ resource: 'tree', count: 1 }),
  B: Object.freeze({ resource: 'stone', count: 1 }),
  C: Object.freeze({ resource: 'tree', count: 2 }),
  D: Object.freeze({ resource: 'stone', count: 2 }),
  E: Object.freeze({ resource: 'tree', count: 2, memberTypes: Object.freeze(['tree', 'stone']) }),
});
function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = Math.imul(state ^ state >>> 15, 1 | state);
    value ^= value + Math.imul(value ^ value >>> 7, 61 | value);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}
export function generateResources(world, { seed = WORLD_SEED, count = 320, spacing = 80, spawnClearance = 125 } = {}) {
  const random = seededRandom(seed), field = world.resources;
  const spawnX = world.width / 2, spawnY = world.height / 2, candidates = [];
  const place = (type, x, y, angle = 0) => {
    const definition = FORMATION_TYPES[type];
    if (field.items.length + definition.count > count) return false;
    const id = `formation-${field.formations.length + 1}`, members = [];
    const memberTypes = definition.memberTypes || Array(definition.count).fill(definition.resource);
    const offset = definition.count === 2 ? (RESOURCE_TYPES[memberTypes[0]].radius + RESOURCE_TYPES[memberTypes[1]].radius + 12) / 2 : 0;
    for (let i = 0; i < definition.count; i++) {
      const sign = i === 0 ? -1 : 1;
      const radius = RESOURCE_TYPES[memberTypes[i]].radius;
      const node = createResource(`resource-${field.items.length + i + 1}`, memberTypes[i], x + Math.cos(angle) * offset * sign, y + Math.sin(angle) * offset * sign);
      node.formationId = id; node.formationType = type;
      const padding = radius + 48;
      if (node.x < padding || node.y < padding || node.x > world.width - padding || node.y > world.height - padding) return false;
      if (Math.hypot(node.x - spawnX, node.y - spawnY) < spawnClearance + radius) return false;
      for (const b of world.buildings?.items || []) if (circleOverlapsSquare(node, b.x, b.y, world.buildings.size)) return false;
      field.queryBounds(node.x - radius - spacing, node.y - radius - spacing, node.x + radius + spacing, node.y + radius + spacing, candidates);
      for (const other of candidates) if (Math.hypot(node.x - other.x, node.y - other.y) < radius + other.radius + spacing) return false;
      members.push(node);
    }
    for (const node of members) field.add(node);
    field.formations.push({ id, type, x, y, members });
    return true;
  };
  place('A', spawnX + 185, spawnY + 50);
  place('B', spawnX - 180, spawnY - 85);
  place('C', spawnX + 230, spawnY - 220);
  place('D', spawnX - 230, spawnY + 220);
  place('E', spawnX + 400, spawnY + 200);
  const types = Object.keys(FORMATION_TYPES);
  for (let attempt = 0; field.items.length < count && attempt < count * 100; attempt++) {
    const type = types[Math.floor(random() * (count - field.items.length === 1 ? 2 : types.length))];
    place(type, random() * world.width, random() * world.height, random() * Math.PI * 2);
  }
  return field;
}
