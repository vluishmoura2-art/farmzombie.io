import { buildingStats, tierOf } from './tier-config.js';
import { applyFormationHit, nearestFormation } from './resource-hit.js';
export class AutomaticHarvester {
  constructor(buildings) { this.buildings = buildings; }
  update(dt) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    const { items, rules, world, inventory, size } = this.buildings;
    for (const b of items) {
      if (b.type !== 'harvester') continue;
      b.harvestElapsed += dt * buildingStats(b.type, tierOf(b)).harvestSpeed;
      if (b.harvestElapsed + 1e-9 < rules.harvestInterval) continue;
      const ticks = Math.floor((b.harvestElapsed + 1e-9) / rules.harvestInterval);
      b.harvestElapsed = Math.max(0, b.harvestElapsed - ticks * rules.harvestInterval);
      const x = b.x + size / 2, y = b.y + size / 2, range = rules.harvestRange;
      const target = nearestFormation(world.resources, x, y, range);
      if (!target) continue;
      for (let tick = 0; tick < ticks; tick++) applyFormationHit(target, world.resources, inventory);
    }
  }
}
