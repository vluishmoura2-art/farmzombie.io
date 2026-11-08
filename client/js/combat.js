import { separateCrowd } from './zombie-crowd.js';
import { hordeSpec, chooseSize } from './horde-config.js';
import { createZombie } from './zombies.js';
import { COMBAT_RULES } from './combat-config.js';
import { Zombies } from './zombies.js';
import { WaveCycle } from './waves.js';
import { Navigation } from './navigation.js';
import { TowerCombat } from './tower-combat.js';

export class Combat {
  constructor(world, player, buildings, inventory, { rules = COMBAT_RULES, random = Math.random } = {}) {
    this.world = world; this.player = player; this.buildings = buildings; this.rules = rules; this.random = random;
    this.zombies = new Zombies(inventory, rules); world.zombies = this.zombies; this.zombies.feedback = world.feedback;
    this.cycle = new WaveCycle(rules); this.navigation = new Navigation(world, rules);
    this.towers = new TowerCombat(buildings, this.zombies, rules);
    this.swordCooldown = 0; this.gameOver = false; this.reason = ''; this.pathsUsed = 0;
    player.health = player.maxHealth = rules.playerHealth;
  }
  centerX(target) { return target === this.player ? target.x : target.x + this.buildings.size / 2; }
  centerY(target) { return target === this.player ? target.y : target.y + this.buildings.size / 2; }
  distance(z, target) {
    if (target === this.player) return Math.hypot(z.x - target.x, z.y - target.y) - target.radius;
    const x = Math.max(target.x, Math.min(target.x + this.buildings.size, z.x));
    const y = Math.max(target.y, Math.min(target.y + this.buildings.size, z.y));
    return Math.hypot(z.x - x, z.y - y);
  }
  end(reason) { this.gameOver = true; this.reason = reason; }
  spawn(wave) {
    if (this.zombies.items.length >= this.rules.maxZombies || !this.buildings.stash) return false;
    const spec = hordeSpec(wave); spec.size = chooseSize(spec,this.random);
    const type = spec.category, radius = createZombie(0,type,0,0,spec).radius;
    const stash = this.buildings.stash;
    for (let attempt = 0; attempt < 24; attempt++) {
      const angle = this.random() * Math.PI * 2, distance = this.rules.spawnRadius + this.random() * 180;
      const x = Math.max(radius + 1, Math.min(this.world.width - radius - 1, this.centerX(stash) + Math.cos(angle) * distance));
      const y = Math.max(radius + 1, Math.min(this.world.height - radius - 1, this.centerY(stash) + Math.sin(angle) * distance));
      if (Math.hypot(x - this.player.x, y - this.player.y) < radius + this.player.radius + 100 || !this.navigation.canStand(x, y, radius) || this.spawnBlocked?.(x,y,radius)) continue;
      if (this.zombies.items.some(z => z.active && Math.hypot(z.x - x, z.y - y) < z.radius + radius)) continue;
      return Boolean(this.zombies.spawn(type, x, y, spec));
    }
    return false;
  }
  swordEligible(z) {
    if (!z.active) return false;
    const dx = z.x - this.player.x, dy = z.y - this.player.y, distance = Math.hypot(dx, dy);
    const difference = Math.atan2(Math.sin(Math.atan2(dy, dx) - this.player.angle), Math.cos(Math.atan2(dy, dx) - this.player.angle));
    const allowance = Math.asin(Math.min(1, z.radius / Math.max(1, distance)));
    return distance - z.radius <= this.rules.swordRange && Math.abs(difference) <= this.rules.swordHalfAngle + allowance;
  }
  sword(equipment) {
    if (this.gameOver || equipment.selected.id !== 'sword' || this.swordCooldown > 1e-9) return 0;
    this.swordCooldown = this.rules.swordCooldown / (equipment.selected.attackSpeed || 1);
    this.player.swordSwingTime = .24;
    let hits = 0;
    for (const z of this.zombies.items) {
      if (!z.active) continue;
      if (this.swordEligible(z)) {
        if (this.zombies.damage(z, this.rules.swordDamage * (equipment.selected.damageMultiplier || 1))) hits++;
      }
    }
    return hits;
  }
  attack(z, target) {
    if (z.attackCooldown > 1e-9) return;
    const c = z; z.attackCooldown = this.rules.attackInterval;
    const damage = target === this.player ? c.playerDamage : target.type === 'stash' ? c.stashDamage : c.buildingDamage;
    this.world.feedback?.damage(this.centerX(target), this.centerY(target), Math.min(damage, target.health), target === this.player);
    target.hitUntil = this.world.resources.time + .12;
    target.health = Math.max(0, target.health - damage);
    if (target.health > 0) return;
    if (target === this.player) this.end('You were defeated.');
    else if (target.type === 'stash') { this.buildings.destroy(target); this.end('Your Gold Stash was destroyed.'); }
    else this.buildings.destroy(target);
  }
  updateZombie(z, dt) {
    z.attackCooldown = Math.max(0, z.attackCooldown - dt); z.pathCooldown -= dt;
    const target = Math.hypot(z.x - this.player.x, z.y - this.player.y) < this.rules.aggroRange ? this.player : this.buildings.stash;
    if (!target) return;
    if (z.target !== target) { z.target = target; z.pathCooldown = 0; z.path.length = 0; z.pathIndex = 0; }
    const tx = this.centerX(target), ty = this.centerY(target);
    z.angle = Math.atan2(ty - z.y, tx - z.x);
    if (this.distance(z, target) <= z.radius + this.rules.attackReach) { this.attack(z, target); return; }
    // Buildings touching the route can be attacked to break through a sealed base.
    for (const b of this.buildings.items) if (this.distance(z, b) <= z.radius + this.rules.attackReach) { this.attack(z, b); return; }
    if (z.pathCooldown <= 0 && this.pathsUsed < this.rules.pathsPerFrame) {
      this.pathsUsed++; z.pathCooldown = this.rules.pathInterval;
      const stop = z.radius + (target === this.player ? this.player.radius : this.buildings.size / 2) + this.rules.attackReach - 2;
      const distance = Math.hypot(tx - z.x, ty - z.y) || 1;
      const ex = tx - (tx - z.x) / distance * stop, ey = ty - (ty - z.y) / distance * stop;
      z.path = this.navigation.lineClear(z.x, z.y, ex, ey, z.radius) ? [{ x: ex, y: ey }] : this.navigation.find(z, tx, ty, stop + 16);
      z.pathIndex = 0;
    }
    let waypoint = z.path[z.pathIndex];
    while (waypoint && Math.hypot(waypoint.x - z.x, waypoint.y - z.y) < 5) waypoint = z.path[++z.pathIndex];
    const dx = (waypoint?.x ?? tx) - z.x, dy = (waypoint?.y ?? ty) - z.y, distance = Math.hypot(dx, dy);
    if (distance > 0) {
      const step = Math.min(z.speed * dt, distance);
      const beforeX = z.x, beforeY = z.y;
      this.world.move(z, dx / distance * step, dy / distance * step);
      z.walkPhase += Math.hypot(z.x - beforeX, z.y - beforeY) * .06;
    }
  }
  update(dt) {
    if (this.gameOver || !Number.isFinite(dt) || dt <= 0) return;
    this.swordCooldown = Math.max(0, this.swordCooldown - dt);
    this.player.swordSwingTime = Math.max(0, (this.player.swordSwingTime || 0) - dt);
    this.cycle.update(dt, Boolean(this.buildings.stash), wave => this.spawn(wave));
    this.pathsUsed = 0;
    this.towers.update(dt);
    for (const z of this.zombies.items) {
      if (z.active) this.updateZombie(z, dt);
      if (this.gameOver) break;
    }
    // Bounded crowd separation; movement still resolves against world obstacles.
    const list = this.zombies.items;
    if(!this.gameOver) separateCrowd(list,this.world,dt,this.player);
    this.zombies.update(dt);
    if (!this.gameOver && this.cycle.phase === 'day' && !list.some(z => z.active && Math.hypot(z.x - this.player.x, z.y - this.player.y) < this.rules.aggroRange)) {
      this.player.health = Math.min(this.player.maxHealth, this.player.health + this.rules.dayHealingPerSecond * dt);
    }
  }
}
