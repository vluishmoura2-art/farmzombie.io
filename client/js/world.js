import { ResourceField } from './resources.js';
import { moveWithCollisions } from './collision.js';

export class World {
  constructor(width = 6144, height = 6144, gridSize = 32) {
    this.width = width;
    this.height = height;
    this.gridSize = gridSize;
    this.resources = new ResourceField(width);
    this.collisionCandidates = [];
  }

  move(entity, dx, dy) {
    if (this.resources.items.length === 0 && !this.buildings?.items.length) {
      entity.x += dx;
      entity.y += dy;
      this.constrain(entity);
      return;
    }
    moveWithCollisions(entity, dx, dy, this, this.collisionCandidates);
  }

  constrain(entity) {
    entity.x = Math.max(entity.radius, Math.min(this.width - entity.radius, entity.x));
    entity.y = Math.max(entity.radius, Math.min(this.height - entity.radius, entity.y));
  }
}
