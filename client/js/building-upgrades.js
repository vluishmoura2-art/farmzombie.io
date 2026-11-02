import { MAX_TIER, tierOf, upgradeCost, buildingStats } from './tier-config.js';
import { payResources, resourceCount } from './inventory.js';

function advanceTier(building, next) {
  const healthRatio = building.health / building.maxHealth;
  building.tier = next;
  building.maxHealth = buildingStats(building.type, next).maxHealth;
  building.health = Math.max(1, Math.round(building.maxHealth * healthRatio));
}

export class BuildingUpgrades {
  constructor(buildings) { this.buildings = buildings; }
  get unlockedTier() { return this.buildings.stash ? tierOf(this.buildings.stash) : 1; }
  inspect(building) {
    const current = tierOf(building), next = current + 1;
    const cost = upgradeCost(building?.type, next);
    let reason = '';
    if (!building?.active || building.health <= 0 || !this.buildings.items.includes(building)) reason = 'Building is no longer available.';
    else if (current === MAX_TIER) reason = 'Maximum tier reached: Emerald.';
    else if (!this.buildings.stash || (building.type !== 'stash' && next > this.unlockedTier)) reason = 'Upgrade the Gold Stash to unlock the next tier.';
    else if (Object.entries(cost).some(([material, amount]) => resourceCount(this.buildings.inventory[material]) < amount)) reason = 'Not enough resources for this upgrade.';
    return { current, next: cost ? next : null, cost, reason };
  }
  // Expected tier makes repeat submissions of one displayed offer idempotent.
  purchase(building, expectedTier) {
    const offer = this.inspect(building);
    if (offer.reason) return { ok: false, reason: offer.reason };
    if (expectedTier !== offer.current) return { ok: false, reason: 'Offer changed. Review the next upgrade.' };
    if (!payResources(this.buildings.inventory, offer.cost)) return { ok: false, reason: 'Not enough resources for this upgrade.' };
    advanceTier(building, offer.next);
    building.upgradedAt = this.buildings.world.resources.time;
    return { ok: true, building };
  }
  inspectAll(building) {
    const current = tierOf(building), next = current + 1;
    const valid = building?.active && building.health > 0 && this.buildings.items.includes(building);
    const targets = valid && building.type !== 'stash' && current < this.unlockedTier && next <= MAX_TIER
      ? this.buildings.items.filter(b => b.active && b.health > 0 && b.type === building.type && tierOf(b) === current) : [];
    const unit = upgradeCost(building?.type, next);
    const cost = Object.fromEntries(['wood', 'stone', 'gold'].map(m => [m, (unit?.[m] || 0) * targets.length]));
    let reason = '';
    if (building?.type === 'stash') reason = 'Gold Stash upgrades individually only.';
    else if (!valid) reason = 'Building is no longer available.';
    else if (current === MAX_TIER) reason = 'Maximum tier reached: Emerald.';
    else if (!targets.length) reason = 'Upgrade the Gold Stash to unlock the next tier.';
    else if (Object.entries(cost).some(([m, amount]) => resourceCount(this.buildings.inventory[m]) < amount)) reason = 'Not enough resources for the entire group.';
    return { current, next, targets, count: targets.length, cost, reason };
  }
  purchaseAll(building, expectedTier, expectedIds) {
    const offer = this.inspectAll(building);
    if (offer.reason) return { ok: false, reason: offer.reason };
    if (expectedTier !== offer.current || !Array.isArray(expectedIds) || expectedIds.length !== offer.count || offer.targets.some((b, i) => b.id !== expectedIds[i])) {
      return { ok: false, reason: 'Group changed. Review the total cost again.' };
    }
    // Revalidation and the single payment happen synchronously before any tier changes.
    if (!payResources(this.buildings.inventory, offer.cost)) return { ok: false, reason: 'Not enough resources for the entire group.' };
    for (const target of offer.targets) { advanceTier(target, offer.next); target.upgradedAt = this.buildings.world.resources.time; }
    return { ok: true, count: offer.count, tier: offer.next };
  }
}
