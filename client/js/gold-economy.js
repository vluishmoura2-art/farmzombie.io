import { buildingStats, tierOf } from './tier-config.js';
import { resourceCount } from './inventory.js';

export const RIPE = 1;
export const isRipe = field => field?.type === 'field' && (field.growth || 0) >= RIPE - 1e-9;
export const wheatGold = (field, rules) => Math.round(rules.wheatGold * buildingStats('field', tierOf(field)).production);
export const millRange = (mill, rules) => rules.millRange * (1 + (tierOf(mill) - 1) * rules.millRangePerTier);

// Gold comes from wheat: fields grow outside the night and windmills grind
// ripe fields in range. A field without a windmill nearby stays ripe.
export class GoldEconomy {
  constructor(buildings) { this.buildings = buildings; }
  update(dt, phase = 'day') {
    if (!Number.isFinite(dt) || dt <= 0) return;
    const { inventory, rules, items, size } = this.buildings;
    inventory.gold = resourceCount(inventory.gold);
    if (phase !== 'night') {
      for (const b of items) if (b.type === 'field' && b.active) b.growth = Math.min(RIPE, (b.growth || 0) + dt / rules.growSeconds);
    }
    for (const mill of items) {
      if (mill.type !== 'windmill' || !mill.active) continue;
      // `production` is the time banked toward the next grind, capped at one grind.
      mill.production = Math.min(rules.millInterval, (mill.production || 0) + dt);
      if (mill.production + 1e-9 < rules.millInterval) continue;
      const field = this.nearestRipe(mill, millRange(mill, rules), items, size);
      if (!field) continue;
      mill.production = 0;
      const gold = wheatGold(field, rules);
      field.growth = 0;
      mill.milledAt = this.buildings.world.resources.time;
      inventory.gold = resourceCount(resourceCount(inventory.gold) + gold);
      this.buildings.world.feedback?.gain?.(field.x + size / 2, field.y + size / 2, gold);
    }
  }
  nearestRipe(mill, range, items, size) {
    let best = null, distance = Infinity;
    for (const b of items) {
      if (!b.active || !isRipe(b)) continue;
      const d = Math.hypot(b.x - mill.x, b.y - mill.y);
      if (d <= range + 1e-9 && d < distance) { best = b; distance = d; }
    }
    return best;
  }
}
