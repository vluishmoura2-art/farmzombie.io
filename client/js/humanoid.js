// Legacy three-part art retained for every zombie category.
// Player artwork is separate; the existing shared collision radius remains unchanged.
export const HUMANOID_RADIUS = 35;
export const HUMANOID_PARTS = Object.freeze([
  Object.freeze([0, -2, 20, 22, 0]),
  Object.freeze([-20, 8, 10, 11, -.2]),
  Object.freeze([20, 8, 10, 11, .2]),
]);

export class HumanoidRenderer {
  constructor() {
    this.parts = HUMANOID_PARTS.map(([x, y, rx, ry, rotation]) => {
      const path = new Path2D(); path.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2); return path;
    });
    this.cache = new Map();
    this.silhouette = new Path2D();
    for (const path of this.parts) this.silhouette.addPath(path);
  }
  // The caller owns translation, rotation and proportional scaling.
  draw(ctx, fill, outline) {
    let outlines = this.cache.get(fill);
    if (!outlines) { outlines = new Map(); this.cache.set(fill,outlines); }
    let sprite = outlines.get(outline);
    if (!sprite) {
      sprite = document.createElement('canvas'); sprite.width=sprite.height=256;
      const cached = sprite.getContext('2d');cached.translate(128,128);cached.scale(3.2,3.2);
      this.drawGeometry(cached,fill,outline);outlines.set(outline,sprite);
    }
    ctx.drawImage(sprite,-40,-40,80,80);
  }
  drawGeometry(ctx, fill, outline) {
    ctx.lineWidth = 5;
    ctx.strokeStyle = outline; ctx.fillStyle = fill;
    for (const path of this.parts) ctx.stroke(path);
    ctx.fill(this.silhouette);
  }
}
