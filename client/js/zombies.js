import { HORDE_BALANCE, ZOMBIE_SIZES } from './horde-config.js';
import { ZOMBIE_TYPES } from './zombie-config.js';
import { HUMANOID_RADIUS } from './humanoid.js';
import { resourceCount } from './inventory.js';
import { COMBAT_RULES } from './combat-config.js';

export function createZombie(id, type, x, y, spec = {}) {
  const c = ZOMBIE_TYPES[type];
  if (!c) throw new RangeError(`Unknown zombie category: ${type}`);
  const size = ZOMBIE_SIZES[spec.size || 'normal'];
  const scale = Math.min(HORDE_BALANCE.maxRadiusScale, c.size * size.scale * (spec.sizeMultiplier || 1));
  const bounded = n => Math.min(HORDE_BALANCE.maxAttribute, n);
  const health = bounded(c.health * size.health * (spec.healthMultiplier || 1));
  const damageMultiplier = size.damage * (spec.damageMultiplier || 1);
  return { size:spec.size || 'normal', scale, wave:spec.wave || 1,
    playerDamage:bounded(c.playerDamage*damageMultiplier), buildingDamage:bounded(c.buildingDamage*damageMultiplier), stashDamage:bounded(c.stashDamage*damageMultiplier),
    goldReward:Math.min(HORDE_BALANCE.maxReward,Math.max(1,Math.round(c.goldReward*size.reward*(spec.rewardMultiplier || 1)))),
    id, type, x, y, radius: HUMANOID_RADIUS * scale, angle: Math.PI / 2,
    health, maxHealth: health, speed: c.speed * size.speed, active: true, rewarded: false,
    walkPhase: 0, hitFlash: 0, attackCooldown: 0, pathCooldown: 0, path: [], pathIndex: 0, target: null };
}
export class Zombies {
  constructor(inventory, rules = COMBAT_RULES) {
    this.inventory = inventory; this.rules = rules; this.items = []; this.rewards = []; this.nextId = 1; this.kills = 0;
  }
  spawn(type, x, y, spec) {
    if (this.items.length >= this.rules.maxZombies) return null;
    const zombie = createZombie(this.nextId++, type, x, y, spec); this.items.push(zombie); return zombie;
  }
  damage(zombie, damage) {
    if (!zombie?.active || zombie.health <= 0 || !Number.isFinite(damage) || damage <= 0) return false;
    this.feedback?.damage(zombie.x, zombie.y, Math.min(damage, zombie.health));
    zombie.hitFlash = .12;
    zombie.health = Math.max(0, zombie.health - damage);
    if (zombie.health > 0) return true;
    zombie.active = false;
    if (!zombie.rewarded) {
      zombie.rewarded = true;
      const gold = zombie.goldReward;
      this.inventory.gold = resourceCount(resourceCount(this.inventory.gold) + gold);
      this.kills++;
      if (this.rewards.length >= this.rules.maxEffects) this.rewards.shift();
      this.rewards.push({ x: zombie.x, y: zombie.y - zombie.radius, amount: gold, time: this.rules.rewardLifetime });
    }
    return true;
  }
  update(dt) {
    // Compact in place: no per-frame filter allocations, no live removal while attacking.
    let write = 0;
    for (const z of this.items) if (z.active) { z.hitFlash = Math.max(0, z.hitFlash - dt); this.items[write++] = z; }
    this.items.length = write;
    write = 0;
    for (const reward of this.rewards) {
      reward.time -= dt; reward.y -= dt * 18;
      if (reward.time > 0) this.rewards[write++] = reward;
    }
    this.rewards.length = write;
  }
}
