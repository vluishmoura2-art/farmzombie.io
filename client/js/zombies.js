import { ZOMBIE_TYPES } from './zombie-config.js';
import { HUMANOID_RADIUS } from './humanoid.js';
import { resourceCount } from './inventory.js';
import { COMBAT_RULES } from './combat-config.js';

export function createZombie(id, type, x, y) {
  const c = ZOMBIE_TYPES[type];
  if (!c) throw new RangeError(`Unknown zombie category: ${type}`);
  return { id, type, x, y, radius: HUMANOID_RADIUS * c.size, angle: Math.PI / 2,
    health: c.health, maxHealth: c.health, speed: c.speed, active: true, rewarded: false,
    walkPhase: 0, hitFlash: 0, attackCooldown: 0, pathCooldown: 0, path: [], pathIndex: 0, target: null };
}
export class Zombies {
  constructor(inventory, rules = COMBAT_RULES) {
    this.inventory = inventory; this.rules = rules; this.items = []; this.rewards = []; this.nextId = 1; this.kills = 0;
  }
  spawn(type, x, y) {
    if (this.items.length >= this.rules.maxZombies) return null;
    const zombie = createZombie(this.nextId++, type, x, y); this.items.push(zombie); return zombie;
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
      const gold = ZOMBIE_TYPES[zombie.type].goldReward;
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
