import { buildingStats, tierOf } from './tier-config.js';
import { resourceCount } from './inventory.js';
export class GoldEconomy {
  constructor(buildings) { this.buildings = buildings; }
  update(dt) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    const { inventory, rules, items } = this.buildings;
    inventory.gold = resourceCount(inventory.gold);
    for (const b of items) {
      if (b.type !== 'mine') continue;
      b.production += dt * rules.goldPerSecond * buildingStats(b.type, tierOf(b)).production;
      const earned = Math.floor(b.production + 1e-9);
      if (earned > 0) {
        b.production = Math.max(0, b.production - earned);
        inventory.gold = resourceCount(resourceCount(inventory.gold) + earned);
      }
    }
  }
}
