import { equipmentTier } from './equipment-config.js';
import { INK, TOOL_ART } from './art-config.js';
// Local origin is the grip. World tools, inventory and shop share this art.
export class EquipmentRenderer {
  constructor() {
    this.handle = new Path2D(); this.handle.roundRect(-4,-7,8,46,2);
    this.pickaxeHead = new Path2D('M -27 26 L 27 26 L 30 33 L 24 39 L 7 35 L 7 41 L -7 41 L -7 35 L -24 39 L -30 33 Z');
    this.pickaxeHighlight = new Path2D('M -21 28 L -13 28 L 12 35 L 4 35 Z');
    this.swordBlade = new Path2D('M -8 17 L -8 31 L 0 51 L 8 31 L 8 17 Z');
    this.swordHighlight = new Path2D('M -5 19 L -5 30 L 0 44 L -1 30 L -1 19 Z');
    this.swordGuard = new Path2D();this.swordGuard.rect(-14,12,28,6);
    this.swordGrip = new Path2D();this.swordGrip.roundRect(-4,-7,8,20,2);
  }
  draw(ctx, id, tier = 1) {
    const material = equipmentTier(id,tier); if (!material) return;
    ctx.save();ctx.strokeStyle=INK;ctx.lineWidth=TOOL_ART.outline;ctx.lineJoin='miter';
    ctx.fillStyle=TOOL_ART.handle;
    const grip = id === 'pickaxe' ? this.handle : this.swordGrip;
    ctx.fill(grip);ctx.stroke(grip);
    ctx.fillStyle=tier===1?TOOL_ART.steel:material.color;
    const head=id==='pickaxe'?this.pickaxeHead:this.swordBlade;
    ctx.fill(head);ctx.stroke(head);
    ctx.fillStyle=TOOL_ART.highlight;ctx.fill(id==='pickaxe'?this.pickaxeHighlight:this.swordHighlight);
    if(id==='sword') {ctx.fillStyle=tier===1?'#AE9256':material.color;ctx.fill(this.swordGuard);ctx.stroke(this.swordGuard);}
    ctx.restore();
  }
  drawIcon(ctx, id, size, tier = 1) {
    ctx.save();ctx.translate(size/2,size/2);ctx.rotate(-Math.PI/4);
    ctx.scale(size/90,size/90);ctx.translate(0,-22);this.draw(ctx,id,tier);ctx.restore();
  }
}
