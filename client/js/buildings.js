import { BUILDING_TYPES, BUILDING_RULES } from './building-config.js';
import { GridOccupancy } from './grid-occupancy.js';
import { resourceCount, payResources } from './inventory.js';
import { buildingStats } from './tier-config.js';

export function circleOverlapsSquare(circle, x, y, size) {
  const dx = circle.x - Math.max(x, Math.min(x + size, circle.x));
  const dy = circle.y - Math.max(y, Math.min(y + size, circle.y));
  return dx * dx + dy * dy < circle.radius * circle.radius;
}

export class Buildings {
  constructor(world, inventory, rules = BUILDING_RULES) {
    this.world = world;
    this.inventory = inventory;
    this.rules = rules;
    this.size = rules.cells * world.gridSize;
    this.items = [];
    this.counts = Object.fromEntries(Object.keys(BUILDING_TYPES).map(type => [type, 0]));
    this.occupancy = new GridOccupancy();
    this.candidates = [];
    this.stash = null;
    this.base = null;
    this.nextId = 1;
    this.revision = 0;
    world.buildings = this;
  }

  remaining(type) { return Math.max(0, BUILDING_TYPES[type].limit - this.counts[type]); }
  availability(type) {
    const definition = BUILDING_TYPES[type];
    if (!definition) return 'Unknown building';
    if (this.remaining(type) === 0) return 'Placement limit reached';
    if (type !== 'stash' && !this.stash) return 'Place the Gold Stash first';
    for (const material of ['wood', 'stone', 'gold']) if (resourceCount(this.inventory[material]) < definition.cost[material]) return 'Not enough resources';
    return '';
  }

  validate(type, x, y, player) {
    if (!Number.isFinite(x) || !Number.isFinite(y) || x % this.world.gridSize || y % this.world.gridSize) return 'Must align to the grid';
    const reason = this.availability(type);
    if (reason) return reason;
    const s = this.size;
    if (x < 0 || y < 0 || x + s > this.world.width || y + s > this.world.height) return 'Outside the world';
    if (type !== 'stash' && (x < this.base.left || y < this.base.top || x + s > this.base.right || y + s > this.base.bottom)) return 'Outside your base';
    if (!this.occupancy.isFree(x / this.world.gridSize, y / this.world.gridSize, this.rules.cells)) return 'Cells already occupied';
    if (circleOverlapsSquare(player, x, y, s)) return 'Move away from the footprint';
    for (const z of this.world.zombies?.items || []) if (z.active && circleOverlapsSquare(z, x, y, s)) return 'An enemy occupies the footprint';
    this.world.resources.queryBounds(x, y, x + s, y + s, this.candidates);
    for (const resource of this.candidates) if (circleOverlapsSquare(resource, x, y, s)) return 'Natural resource occupies this footprint';
    return '';
  }

  place(type, x, y, player) {
    const reason = this.validate(type, x, y, player);
    if (reason) return { ok: false, reason };
    const b = { id: this.nextId++, type, x, y, cellX: x / this.world.gridSize, cellY: y / this.world.gridSize, createdAt: this.world.resources.time, angle: 0, tier: 1, active: true, production: 0, harvestElapsed: 0 };
    b.health = b.maxHealth = buildingStats(type).maxHealth;
    b.attackCooldown = 0;
    // No asynchronous work between validation, payment and occupancy commit.
    const cost = BUILDING_TYPES[type].cost;
    if (!payResources(this.inventory, cost)) return { ok: false, reason: 'Not enough resources' };
    this.items.push(b);
    this.revision++;
    this.counts[type]++;
    this.occupancy.add(b, this.rules.cells);
    if (type === 'stash') {
      this.stash = b;
      const half = this.rules.baseCells * this.world.gridSize / 2;
      this.base = { left: x + this.size / 2 - half, top: y + this.size / 2 - half, right: x + this.size / 2 + half, bottom: y + this.size / 2 + half };
    }
    return { ok: true, building: b };
  }

  // Lifecycle hook for future destruction; no selling/moving UI in this phase.
  remove(b) {
    if (!b?.active || b === this.stash || !this.items.includes(b)) return false;
    b.active = false;
    this.items.splice(this.items.indexOf(b), 1);
    this.counts[b.type] = Math.max(0, this.counts[b.type] - 1);
    this.occupancy.remove(b, this.rules.cells);
    this.revision++;
    return true;
  }

  destroy(b) {
    if (!b?.active || b.health > 0) return false;
    if (b === this.stash) { this.stash = null; this.base = null; }
    return this.remove(b);
  }

  resolveCollision(entity) {
    let collided = false;
    for (const b of this.items) {
      if (!circleOverlapsSquare(entity, b.x, b.y, this.size)) continue;
      const nearestX = Math.max(b.x, Math.min(b.x + this.size, entity.x));
      const nearestY = Math.max(b.y, Math.min(b.y + this.size, entity.y));
      const dx = entity.x - nearestX, dy = entity.y - nearestY;
      const distance = Math.hypot(dx, dy);
      if (distance > 0) {
        entity.x = nearestX + dx / distance * (entity.radius + .001);
        entity.y = nearestY + dy / distance * (entity.radius + .001);
      } else {
        const left = entity.x - b.x, right = b.x + this.size - entity.x;
        const top = entity.y - b.y, bottom = b.y + this.size - entity.y;
        const minimum = Math.min(left, right, top, bottom);
        if (minimum === left) entity.x = b.x - entity.radius - .001;
        else if (minimum === right) entity.x = b.x + this.size + entity.radius + .001;
        else if (minimum === top) entity.y = b.y - entity.radius - .001;
        else entity.y = b.y + this.size + entity.radius + .001;
      }
      collided = true;
    }
    return collided;
  }
}
