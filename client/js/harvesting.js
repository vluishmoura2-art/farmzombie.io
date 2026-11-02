import { applyFormationHit, nearestFormation } from './resource-hit.js';
export { resourceCount } from './inventory.js';
export const HARVEST_COOLDOWN = .3;
export const HARVEST_REACH = 100; // Player center to closest formation member.
export class Harvesting {
  constructor({ range = HARVEST_REACH, cooldown = HARVEST_COOLDOWN } = {}) {
    if (!Number.isFinite(range) || range <= 0 || !Number.isFinite(cooldown) || cooldown <= 0) throw new RangeError('Harvest range and cooldown must be positive finite numbers.');
    this.range = range; this.hitCooldown = cooldown; this.cooldown = 0;
    this.inventory = { wood: 0, stone: 0, gold: 0 };
    this.result = { status: 'empty', resource: null, amount: 0 };
  }
  update(dt) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.cooldown < 1e-9) this.cooldown = 0;
  }
  attempt(player, equipment, field) {
    const result = this.result;
    result.status = 'empty'; result.resource = null; result.formation = null; result.rewards = { wood: 0, stone: 0 }; result.amount = 0;
    if (equipment.selected.id !== 'pickaxe') { result.status = 'wrong-tool'; return result; }
    if (this.cooldown > 0) { result.status = 'cooldown'; return result; }
    const target = nearestFormation(field, player.x, player.y, this.range);
    if (!target) { result.status = 'out-of-range'; return result; }
    const rewards = applyFormationHit(target, field, this.inventory, equipment.selected.harvestMultiplier || 1);
    const amount = rewards.wood + rewards.stone;
    if (amount > 0) {
      this.cooldown = this.hitCooldown / (equipment.selected.harvestSpeed || 1);
      result.status = 'hit'; result.resource = target.members[0]; result.formation = target; result.rewards = rewards; result.amount = amount;
    }
    return result;
  }
}
