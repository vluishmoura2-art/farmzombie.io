// Radius encloses the body and both arms, including the 2.5-unit outline.
import { HUMANOID_RADIUS } from './humanoid.js';
export const PLAYER_RADIUS = HUMANOID_RADIUS;
export const PLAYER_SPEED = 240;
export const HARVEST_SWING_DURATION = .24;

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = PLAYER_RADIUS;
    this.speed = PLAYER_SPEED;
    this.angle = Math.PI / 2;
    this.harvestSwingTime = 0;
    this.walkPhase = 0;
  }

  startHarvestSwing() { this.harvestSwingTime = HARVEST_SWING_DURATION; }

  get harvestSwingAngle() {
    if (this.harvestSwingTime <= 0) return 0;
    const progress = 1 - this.harvestSwingTime / HARVEST_SWING_DURATION;
    return .65 * Math.sin(progress * Math.PI * 2) * Math.sin(progress * Math.PI);
  }

  aimAt(worldX, worldY) {
    const dx = worldX - this.x;
    const dy = worldY - this.y;
    // At the exact center there is no direction; keep the last valid angle.
    if (dx * dx + dy * dy > .000001) this.angle = Math.atan2(dy, dx);
  }

  update(deltaTime, input, world) {
    this.harvestSwingTime = Math.max(0, this.harvestSwingTime - deltaTime);
    const length = Math.hypot(input.x, input.y);
    if (length > 0) {
      const distance = this.speed * deltaTime / length;
      const beforeX = this.x, beforeY = this.y;
      world.move(this, input.x * distance, input.y * distance);
      this.walkPhase += Math.hypot(this.x - beforeX, this.y - beforeY) * .06;
    }
    world.constrain(this);
  }
}
