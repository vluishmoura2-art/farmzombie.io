import { INK, PLAYER_ART, TOOL_ATTACHMENT } from './art-config.js';

// Circular player is deliberately separate from the unchanged zombie renderer.
export class PlayerRenderer {
  constructor() { this.sprites = []; }
  draw(ctx, hit = false) {
    const index = hit ? 1 : 0;
    if (!this.sprites[index]) {
      const sprite = document.createElement('canvas'); sprite.width = sprite.height = 128;
      const cached = sprite.getContext('2d'); cached.translate(64,64); cached.scale(2,2);
      this.drawGeometry(cached, hit); this.sprites[index] = sprite;
    }
    ctx.drawImage(this.sprites[index],-32,-32,64,64);
  }
  drawEquipped(ctx, tools, item, angle, swing = 0, hit = false) {
    ctx.save();ctx.rotate(angle-Math.PI/2);
    ctx.save();ctx.translate(TOOL_ATTACHMENT.x,TOOL_ATTACHMENT.y);ctx.rotate(swing);
    tools.draw(ctx,item.id,item.tier);ctx.restore();this.draw(ctx,hit);ctx.restore();
  }
  drawGeometry(ctx, hit = false) {
    ctx.lineWidth = PLAYER_ART.outline; ctx.strokeStyle = INK; ctx.fillStyle = PLAYER_ART.skin;
    ctx.beginPath(); ctx.arc(0,0,PLAYER_ART.radius,0,Math.PI*2);ctx.fill();ctx.stroke();
    if (hit) {
      ctx.lineWidth=2;ctx.strokeStyle='#FFFFFF';ctx.beginPath();ctx.arc(0,0,20,0,Math.PI*2);ctx.stroke();
    }
    // Local +Y faces the cursor; no face/tool rotation enters hitbox calculations.
    ctx.fillStyle=INK;
    for (const x of [-7,7]) {ctx.beginPath();ctx.arc(x,11,PLAYER_ART.eyeRadius,0,Math.PI*2);ctx.fill();}
  }
}
