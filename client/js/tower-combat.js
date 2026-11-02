import { towerMultiplier } from './damage-effectiveness.js';
import { buildingStats, tierOf } from './tier-config.js';
import { COMBAT_RULES } from './combat-config.js';

export function segmentDistance(x, y, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, length = dx * dx + dy * dy;
  const t = length ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / length)) : 0;
  return Math.hypot(x - ax - dx * t, y - ay - dy * t);
}
export class TowerCombat {
  constructor(buildings, zombies, rules = COMBAT_RULES) {
    this.buildings = buildings; this.zombies = zombies; this.rules = rules; this.projectiles = []; this.effects = [];
  }
  effect(x, y, tx, ty, radius = 0, color = '#ddd7b5') {
    if (this.effects.length >= this.rules.maxEffects) this.effects.shift();
    this.effects.push({ x, y, tx, ty, radius, color, time: .16 });
  }
  nearest(x, y, range, excluded = null) {
    let target = null, nearest = range;
    for (const z of this.zombies.items) {
      if (!z.active || excluded?.has(z.id)) continue;
      const distance = Math.hypot(z.x - x, z.y - y) - z.radius;
      if (distance <= nearest) { nearest = distance; target = z; }
    }
    return target;
  }
  damage(zombie, damage, tier) {
    return this.zombies.damage(zombie, damage * towerMultiplier(tier, zombie.type));
  }
  splash(x, y, radius, damage, tier = 1) {
    for (const z of this.zombies.items) if (z.active && Math.hypot(z.x - x, z.y - y) <= radius + z.radius) this.damage(z, damage, tier);
  }
  fire(b, target, attack) {
    const x = b.x + this.buildings.size / 2, y = b.y + this.buildings.size / 2;
    b.angle = Math.atan2(target.y - y, target.x - x) + Math.PI / 2;
    if (b.type === 'melee') {
      // A close-range sweep only damages enemies inside the tower's reach.
      for (const z of this.zombies.items) if (z.active && Math.hypot(z.x - x, z.y - y) <= attack.range + z.radius) this.damage(z, attack.damage, tierOf(b));
      this.effect(x, y, x, y, attack.range, '#c7c9b9');
    } else if (b.type === 'mage') {
      const hit = new Set(); let next = target, fromX = x, fromY = y;
      for (let bounce = 0; bounce < attack.chain && next; bounce++) {
        hit.add(next.id); this.damage(next, attack.damage, tierOf(b));
        this.effect(fromX, fromY, next.x, next.y, 0, '#c2a9df');
        fromX = next.x; fromY = next.y; next = this.nearest(fromX, fromY, 130, hit);
      }
    } else if (this.projectiles.length < this.rules.maxProjectiles) {
      const dx = target.x - x, dy = target.y - y, distance = Math.hypot(dx, dy) || 1;
      this.projectiles.push({ type: b.type, x, y, tx: target.x, ty: target.y, vx: dx / distance * attack.speed, vy: dy / distance * attack.speed,
        tier: tierOf(b), damage: attack.damage, splash: attack.splash, pierce: attack.pierce, speed: attack.speed, remaining: b.type === 'ballista' ? attack.range + target.radius : distance,
        hit: new Set() });
    }
  }
  update(dt) {
    for (const b of this.buildings.items) {
      const attack = buildingStats(b.type, tierOf(b)).attack; if (!attack) continue;
      b.attackCooldown = Math.max(0, (b.attackCooldown || 0) - dt);
      if (b.attackCooldown > 1e-9) continue;
      const target = this.nearest(b.x + this.buildings.size / 2, b.y + this.buildings.size / 2, attack.range);
      if (target) { this.fire(b, target, attack); b.attackCooldown = attack.cooldown; }
    }
    let write = 0;
    for (const p of this.projectiles) {
      const ax = p.x, ay = p.y, step = Math.min(dt, p.remaining / p.speed);
      p.x += p.vx * step; p.y += p.vy * step; p.remaining -= p.speed * step;
      if (p.type === 'ballista') {
        // Swept collision includes each category's scaled radius.
        for (const z of this.zombies.items) {
          if (!z.active || p.hit.has(z.id) || segmentDistance(z.x, z.y, ax, ay, p.x, p.y) > z.radius + 3) continue;
          p.hit.add(z.id); this.damage(z, p.damage, p.tier); p.pierce--;
          if (!p.pierce) { p.remaining = 0; break; }
        }
      } else if (p.remaining <= 1e-9) {
        this.splash(p.tx, p.ty, p.splash, p.damage, p.tier); this.effect(p.tx, p.ty, p.tx, p.ty, p.splash, '#d5c8a1');
      }
      if (p.remaining > 1e-9) this.projectiles[write++] = p;
    }
    this.projectiles.length = write; write = 0;
    for (const e of this.effects) { e.time -= dt; if (e.time > 0) this.effects[write++] = e; }
    this.effects.length = write;
  }
}
