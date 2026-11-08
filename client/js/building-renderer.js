import { TIERS } from './tier-config.js';
// Canvas geometry shared by world buildings, ghosts and HUD icons.
export class BuildingRenderer {
  constructor() { this.cache = new Map(); }
  sprite(type, tier, layer = 'all') {
    const key = `${type}:${tier}:${layer}`;
    let sprite = this.cache.get(key);
    if (!sprite) {
      sprite = document.createElement('canvas'); sprite.width = sprite.height = 128;
      this.drawGeometry(sprite.getContext('2d'),type,0,0,128,0,tier,layer);this.cache.set(key,sprite);
    }
    return sprite;
  }
  draw(ctx, type, x, y, size, angle = 0, tier = 1) {
    if (angle === 0) { ctx.drawImage(this.sprite(type,tier),x,y,size,size); return; }
    ctx.drawImage(this.sprite(type,tier,'foundation'),x,y,size,size);
    ctx.save();ctx.translate(x+size/2,y+size/2);ctx.rotate(angle);
    ctx.drawImage(this.sprite(type,tier,'head'),-size/2,-size/2,size,size);ctx.restore();
  }

  drawGeometry(ctx, type, x, y, size, angle = 0, tier = 1, layer = 'all') {
    ctx.save();
    ctx.translate(x + size / 2, y + size / 2);
    ctx.scale(size / 64, size / 64);
    const material = TIERS[tier - 1] || TIERS[0];
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = 3;
    if (layer !== 'head') {
    ctx.fillStyle = '#96613a';
    ctx.strokeStyle = '#55351f';
    ctx.fillRect(-30.5, -30.5, 61, 61);
    ctx.strokeRect(-30.5, -30.5, 61, 61);
    // Keep the brown square footprint, with a material inlay and tier rivets.
    ctx.fillStyle = material.color; ctx.strokeStyle = material.outline;
    ctx.fillRect(-27, -27, 54, 54); ctx.strokeRect(-27, -27, 54, 54);
    ctx.fillStyle = material.outline;
    for (let i = 0; i < tier; i++) ctx.fillRect(-23 + i * 5.5, 25, 3, 3);
    }
    if (layer === 'foundation') { ctx.restore(); return; }
    ctx.rotate(angle);
    ctx.strokeStyle = '#353b3c';
    ctx.fillStyle = material.color;
    const rect = (x, y, w, h) => { ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h); };
    const circle = (x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); };
    const path = (points, close = false) => {
      ctx.beginPath(); ctx.moveTo(points[0], points[1]);
      for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1]);
      if (close) { ctx.closePath(); ctx.fill(); } ctx.stroke();
    };
    if (type === 'stash') {
      ctx.fillStyle = '#efc63d'; ctx.strokeStyle = '#211d13'; ctx.lineWidth = 2;
      for (const [cx, cy] of [[-15, 11], [0, 15], [15, 10], [-17, -4], [-3, 1], [13, -5], [-3, -14]]) circle(cx, cy, 8);
    } else if (type === 'ballista') {
      circle(0, 5, 12); rect(-4, -23, 8, 45);
      path([-24, -5, -20, -17, 0, -23, 20, -17, 24, -5]);
      ctx.lineWidth = 1.5; path([-24, -5, 0, 13, 24, -5]);
      ctx.fillStyle = '#d5d8ce'; path([-5, -16, 0, -26, 5, -16], true);
    } else if (type === 'cannon') {
      ctx.fillStyle = '#5f6668'; circle(0, 7, 18);
      ctx.fillStyle = material.color; rect(-9, -24, 18, 34);
      ctx.fillStyle = '#31383b'; rect(-8, -25, 16, 6);
      ctx.fillStyle = '#62686a'; rect(-21, 4, 7, 17); rect(14, 4, 7, 17);
    } else if (type === 'melee') {
      circle(0, 10, 13); ctx.fillStyle = '#65452e'; rect(-3, -6, 6, 30);
      ctx.fillStyle = material.color; path([-6, 0, -6, -16, 0, -27, 6, -16, 6, 0], true);
      ctx.fillStyle = '#747c7d'; rect(-15, 0, 30, 5);
    } else if (type === 'bomb') {
      ctx.fillStyle = '#697173'; circle(0, 7, 18);
      ctx.fillStyle = material.color; path([-15, 10, -12, -18, 12, -18, 15, 10], true);
      ctx.fillStyle = '#252d30'; circle(0, -14, 12);
      ctx.fillStyle = '#515b5c'; circle(0, -14, 8);
      ctx.strokeStyle = '#dfc18a'; path([4, -20, 6, -25, 11, -25]);
    } else if (type === 'mage') {
      ctx.fillStyle = '#606c75'; circle(0, 13, 13); rect(-3, -10, 6, 33);
      ctx.fillStyle = material.color; ctx.strokeStyle = '#4c425f';
      path([0, -27, 13, -10, 0, 5, -13, -10], true);
      ctx.fillStyle = '#d6c8e9'; path([0, -27, 0, 5, -13, -10], true);
    } else if (type === 'harvester') {
      ctx.fillStyle = material.color; rect(-16, -14, 32, 32);
      ctx.fillStyle = '#b7bdb0'; circle(0, 1, 11);
      for (let i = 0; i < 6; i++) {
        ctx.save(); ctx.rotate(i * Math.PI / 3); rect(-3, -18, 6, 8); ctx.restore();
      }
      ctx.fillStyle = '#424d45'; circle(0, 1, 4);
      ctx.fillStyle = '#c9c5ac'; rect(-23, 16, 46, 8);
    } else if (type === 'mine') {
      ctx.fillStyle = '#444c4c'; rect(-20, 15, 40, 9);
      ctx.fillStyle = material.color; path([-21, 13, -9, -23, 6, -23, 18, 13, 10, 13, 0, -13, -13, 13], true);
      rect(-2, -15, 7, 28); path([-5, 10, 8, 10, 1, 21], true);
      ctx.fillStyle = '#efc63d'; ctx.strokeStyle = '#211d13'; ctx.lineWidth = 2;
      circle(-12, 20, 5); circle(15, 20, 5);
    }
    ctx.restore();
  }

  drawWorld(ctx, buildings, placement, left, top, width, height, profile = {shadows:true,motion:true}, time = 0) {
    const size = buildings.size;
    if (placement.selected && buildings.base) {
      const b = buildings.base;
      ctx.save(); ctx.strokeStyle = '#ede7b8'; ctx.globalAlpha = .7; ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]); ctx.strokeRect(b.left, b.top, b.right - b.left, b.bottom - b.top); ctx.restore();
    }
    for (const b of buildings.items) {
      if (b.x + size < left || b.y + size < top || b.x > left + width || b.y > top + height) continue;
      if (profile.shadows) { ctx.fillStyle='#20331c38';ctx.fillRect(b.x+5,b.y+7,size,size); }
      const age = time - (b.createdAt ?? -1), scale = profile.motion && age >= 0 && age < .13 ? .96 + .04 * age/.13 : 1;
      const inset = size*(1-scale)/2;
      this.draw(ctx, b.type, b.x+inset, b.y+inset, size*scale, b.angle, b.tier);
      if (b.hitUntil > time || (b.upgradedAt !== undefined && time-b.upgradedAt >= 0 && time-b.upgradedAt < .14)) {
        ctx.strokeStyle='#F1F3ED';ctx.lineWidth=2;ctx.strokeRect(b.x+1,b.y+1,size-2,size-2);
      }
      if (b.health < b.maxHealth) {
        ctx.fillStyle = '#2b322a'; ctx.fillRect(b.x + 5, b.y - 9, size - 10, 5);
        ctx.fillStyle = b.type === 'stash' ? '#efc63d' : '#b4cf8d';
        ctx.fillRect(b.x + 6, b.y - 8, (size - 12) * Math.max(0, b.health / b.maxHealth), 3);
      }
    }
    if (placement.pending) {
      const pending=placement.pending;
      ctx.save();ctx.globalAlpha=.65;
      this.draw(ctx,pending.type,pending.x,pending.y,size);
      ctx.globalAlpha=1;ctx.strokeStyle='#F2CF54';ctx.lineWidth=3;ctx.setLineDash([6,4]);
      ctx.strokeRect(pending.x+1,pending.y+1,size-2,size-2);ctx.restore();
      return;
    }
    if (!placement.visible) return;
    ctx.save(); ctx.globalAlpha = .75;
    this.draw(ctx, placement.selected, placement.x, placement.y, size);
    ctx.globalAlpha = .28; ctx.fillStyle = placement.reason ? '#ed6760' : '#69e898';
    ctx.fillRect(placement.x, placement.y, size, size);
    ctx.globalAlpha = 1; ctx.strokeStyle = placement.reason ? '#ff7971' : '#69e898'; ctx.lineWidth = 2;
    ctx.strokeRect(placement.x + 1, placement.y + 1, size - 2, size - 2);
    ctx.beginPath(); ctx.moveTo(placement.x + size / 2, placement.y); ctx.lineTo(placement.x + size / 2, placement.y + size);
    ctx.moveTo(placement.x, placement.y + size / 2); ctx.lineTo(placement.x + size, placement.y + size / 2); ctx.stroke(); ctx.restore();
  }
}
