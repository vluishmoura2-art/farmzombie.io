import { PALETTE } from './visual-config.js';

const WOOD_DIRECTIONS = Object.freeze([-2.65,-1.57,-.5]);

// Fixed pools: no unbounded emitters and no filter/map allocations in the frame loop.
export class VisualEffects {
  constructor(profile) {
    this.profile = profile;
    this.particles = Array.from({ length: 64 }, () => ({ time: 0, x: 0, y: 0, vx: 0, vy: 0, color: '' }));
    this.numbers = Array.from({ length: 24 }, () => ({ time: 0, x: 0, y: 0, text: '', color: '' }));
    this.particleCursor = 0; this.numberCursor = 0;
  }
  setProfile(profile) {
    this.profile = profile;
    for (let i = profile.particles; i < this.particles.length; i++) this.particles[i].time = 0;
    for (let i = profile.numbers; i < this.numbers.length; i++) this.numbers[i].time = 0;
  }
  harvest(members) {
    for(const member of members) {
      const wood=member.material==='wood',count=wood?3:2;
      // Mandatory tree feedback survives the optional-effects Performance preset.
      const limit=Math.min(this.particles.length,wood?Math.max(6,this.profile.particles):this.profile.particles);
      if(!limit)continue;
      for(let i=0;i<count;i++) {
        const p=this.particles[this.particleCursor++ % limit],angle=wood?WOOD_DIRECTIONS[i]:(i?-.65:-2.5),speed=wood?38+i*4:30;
        p.time=.25;p.x=member.x+Math.cos(angle)*24;p.y=member.y+Math.sin(angle)*24;
        p.vx=Math.cos(angle)*speed;p.vy=Math.sin(angle)*speed;p.color=PALETTE[member.material];p.sourceId=member.id;
      }
    }
  }

  damage(x, y, amount, danger = false) {
    if (!this.profile.numbers) return;
    const n = this.numbers[this.numberCursor++ % this.profile.numbers];
    n.time = .55; n.x = x; n.y = y - 35; n.text = String(Math.ceil(amount)); n.color = danger ? PALETTE.danger : PALETTE.text;
  }
  update(dt) {
    for (const p of this.particles) if (p.time > 0) { p.time -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 120 * dt; }
    for (const n of this.numbers) if (n.time > 0) { n.time -= dt; n.y -= 22 * dt; }
  }
  draw(ctx, left, top, width, height) {
    ctx.save();
    for (const p of this.particles) if (p.time > 0 && p.x >= left && p.x <= left + width && p.y >= top && p.y <= top + height) {
      ctx.globalAlpha = Math.min(1, p.time * 5); ctx.fillStyle = p.color; ctx.fillRect(Math.round(p.x), Math.round(p.y), 3, 3);
    }
    ctx.font = '600 12px Inter, Ubuntu, sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = '#20291e';
    for (const n of this.numbers) if (n.time > 0 && n.x >= left && n.x <= left + width && n.y >= top && n.y <= top + height) {
      ctx.globalAlpha = Math.min(1, n.time * 5); ctx.fillStyle = n.color; ctx.strokeText(n.text, n.x, n.y); ctx.fillText(n.text, n.x, n.y);
    }
    ctx.restore();
  }
}
