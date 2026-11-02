export class Camera {
  constructor(x, y, smoothing = 14) {
    this.x = x;
    this.y = y;
    this.smoothing = smoothing;
  }

  update(deltaTime, target) {
    const blend = 1 - Math.exp(-this.smoothing * deltaTime);
    this.x += (target.x - this.x) * blend;
    this.y += (target.y - this.y) * blend;
  }

  worldToScreenX(x, viewportWidth) { return x - this.x + viewportWidth / 2; }
  worldToScreenY(y, viewportHeight) { return y - this.y + viewportHeight / 2; }
  screenToWorldX(x, viewportWidth) { return x + this.x - viewportWidth / 2; }
  screenToWorldY(y, viewportHeight) { return y + this.y - viewportHeight / 2; }
}
