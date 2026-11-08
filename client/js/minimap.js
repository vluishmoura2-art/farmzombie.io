import { PALETTE } from './visual-config.js';
import { t } from './i18n.js';

// Fit the whole rectangular world inside a circle, preserving its aspect ratio.
export function worldToMinimap(x, y, width, height, size, output = {}) {
  const scale = (size - 20) / Math.hypot(width, height);
  output.x = size / 2 + (x - width / 2) * scale;
  output.y = size / 2 + (y - height / 2) * scale;
  return output;
}
export class Minimap {
  constructor(canvas, profile) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.profile = profile;
    this.background = document.createElement('canvas'); this.size = 0; this.ratio = 0; this.last = -Infinity;
    this.revision = -1; this.point = {};
  }
  update(timestamp, world, player, combat) {
    if (timestamp - this.last < 1000 / this.profile.minimapHz) return;
    this.last = timestamp;
    const size = Math.round(this.canvas.getBoundingClientRect().width), ratio = Math.min(window.devicePixelRatio || 1, this.profile.dpr, 1.5);
    if (!size) return;
    if (size !== this.size || ratio !== this.ratio) {
      this.size = size; this.ratio = ratio; this.canvas.width = this.background.width = Math.round(size * ratio);
      this.canvas.height = this.background.height = Math.round(size * ratio); this.revision = -1;
    }
    if (this.field !== world.resources || this.revision !== world.resources.revision) {
      const bg = this.background.getContext('2d'); bg.setTransform(ratio,0,0,ratio,0,0); bg.clearRect(0,0,size,size);
      bg.fillStyle = '#202d1e'; bg.beginPath(); bg.arc(size/2,size/2,size/2-2,0,Math.PI*2); bg.fill();
      bg.strokeStyle = '#414B3B'; bg.lineWidth = 1;
      for (const radius of [size*.24,size/2-3]) { bg.beginPath(); bg.arc(size/2,size/2,radius,0,Math.PI*2); bg.stroke(); }
      for (const r of world.resources.items) {
        const p = worldToMinimap(r.x,r.y,world.width,world.height,size,this.point);
        bg.fillStyle = r.material === 'wood' ? '#4f703d' : '#788374'; bg.fillRect(Math.round(p.x),Math.round(p.y),1.5,1.5);
      }
      bg.font = '700 9px Inter, sans-serif'; bg.textAlign = 'center'; bg.fillStyle = PALETTE.muted; bg.fillText('N',size/2,13);
      this.revision = world.resources.revision; this.field = world.resources;
    }
    const ctx = this.ctx; ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,this.canvas.width,this.canvas.height); ctx.drawImage(this.background,0,0);
    ctx.setTransform(ratio,0,0,ratio,0,0);
    for (const b of world.buildings?.items || []) {
      const p = worldToMinimap(b.x + world.buildings.size/2,b.y + world.buildings.size/2,world.width,world.height,size,this.point);
      ctx.fillStyle = b.type === 'stash' ? PALETTE.gold : '#8cb9bf'; const s = b.type === 'stash' ? 5 : 3; ctx.fillRect(p.x-s/2,p.y-s/2,s,s);
    }
    let nearby = 0;
    for (const z of combat.zombies.items) if (z.active && (z.x-player.x)**2+(z.y-player.y)**2 <= 1400**2) {
      const p = worldToMinimap(z.x,z.y,world.width,world.height,size,this.point); ctx.fillStyle = PALETTE.danger;
      ctx.beginPath();ctx.arc(p.x,p.y,2,0,Math.PI*2);ctx.fill();nearby++;
    }
    const p = worldToMinimap(player.x,player.y,world.width,world.height,size,this.point);
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(player.angle);ctx.fillStyle=PALETTE.text;ctx.strokeStyle='#182016';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(5,0);ctx.lineTo(-3,-3);ctx.lineTo(-2,0);ctx.lineTo(-3,3);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
    const label=t('hud.minimapLabel',{count:nearby});
    if(this.canvas.getAttribute('aria-label')!==label)this.canvas.setAttribute('aria-label',label);
  }
}
