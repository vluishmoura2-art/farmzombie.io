import { ZOMBIE_TYPES } from './zombie-config.js';

export class CombatRenderer {
  constructor(humanoid) { this.humanoid = humanoid; }
  draw(ctx, combat, left, top, width, height, profile = {shadows:true,motion:true}, reducedMotion = false) {
    for (const z of combat.zombies.items) {
      if (!z.active || z.x + z.radius < left || z.x - z.radius > left + width || z.y + z.radius < top || z.y - z.radius > top + height) continue;
      const c = ZOMBIE_TYPES[z.type];
      if (profile.shadows) { ctx.fillStyle='#20331c38';ctx.beginPath();ctx.ellipse(z.x+5,z.y+9,28*c.size,18*c.size,0,0,Math.PI*2);ctx.fill(); }
      const bob = profile.motion && !reducedMotion ? Math.sin(z.walkPhase || 0)*1.2 : 0;
      ctx.save(); ctx.translate(z.x, z.y+bob); ctx.rotate(z.angle - Math.PI / 2); ctx.scale(c.size, c.size);
      this.humanoid.draw(ctx, c.color, z.hitFlash > 0 ? '#F1F3ED' : c.outline); ctx.restore();
      if (z.health < z.maxHealth) {
        ctx.fillStyle = '#26372d'; ctx.fillRect(z.x - 22, z.y - z.radius - 10, 44, 5);
        ctx.fillStyle = c.color; ctx.fillRect(z.x - 21, z.y - z.radius - 9, 42 * z.health / z.maxHealth, 3);
      }
    }
    for (const p of combat.towers.projectiles) {
      if(p.x+8<left||p.x-8>left+width||p.y+8<top||p.y-8>top+height)continue;
      ctx.fillStyle = p.type === 'bomb' ? '#282e30' : p.type === 'cannon' ? '#626b70' : '#d1d6ce';
      ctx.strokeStyle = '#333b38'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.type === 'ballista' ? 3 : 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    for (const e of combat.towers.effects) {
      if(Math.max(e.x,e.tx)+e.radius<left||Math.min(e.x,e.tx)-e.radius>left+width||Math.max(e.y,e.ty)+e.radius<top||Math.min(e.y,e.ty)-e.radius>top+height)continue;
      ctx.save(); ctx.globalAlpha = Math.min(1, e.time / .16); ctx.strokeStyle = e.color; ctx.lineWidth = 2;
      ctx.beginPath();
      if (e.radius) ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      else { ctx.moveTo(e.x, e.y); ctx.lineTo(e.tx, e.ty); }
      ctx.stroke(); ctx.restore();
    }
    ctx.font = 'bold 13px "Segoe UI", sans-serif'; ctx.textAlign = 'center';
    for (const r of combat.zombies.rewards) {
      if(r.x<left||r.x>left+width||r.y<top||r.y>top+height)continue;
      ctx.save(); ctx.globalAlpha = Math.min(1, r.time * 2); ctx.lineWidth = 3; ctx.strokeStyle = '#344329'; ctx.fillStyle = '#ffdd65';
      ctx.strokeText(`+${r.amount} gold`, r.x, r.y); ctx.fillText(`+${r.amount} gold`, r.x, r.y); ctx.restore();
    }
  }
}
