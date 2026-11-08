import { equipmentTier } from './equipment-config.js';
import { PlayerRenderer } from './player-renderer.js';
import { PALETTE, CANVAS_FONT, performanceProfile, effectiveDpr, FrameMetrics } from './visual-config.js';
import { t } from './i18n.js';
import { ResourceRenderer } from './resource-renderer.js';
import { BuildingRenderer } from './building-renderer.js';
import { HumanoidRenderer } from './humanoid.js';
import { CombatRenderer } from './combat-renderer.js';

export class Renderer {
  constructor(canvas, equipmentDrawing) {
    this.canvas = canvas;
    this.equipmentDrawing = equipmentDrawing;
    this.resourceDrawing = new ResourceRenderer();
    this.buildingDrawing = new BuildingRenderer();
    this.context = canvas.getContext('2d', { alpha: false });
    if (!this.context) throw new Error('Canvas 2D is required to play.');
    this.humanoid = new HumanoidRenderer();
    this.playerDrawing = new PlayerRenderer();
    this.combatDrawing = new CombatRenderer(this.humanoid);
    this.profile = performanceProfile('balanced'); this.metrics = new FrameMetrics(); this.gridPattern = null;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(this.reducedMotion)this.profile={...this.profile,motion:false,particles:0};
    this.width = 0;
    this.height = 0;
    this.pixelRatio = 1;
    this.resize();
  }

  get targetRatio() { return effectiveDpr(window.devicePixelRatio || 1, this.profile); }
  setMode(mode) { this.profile = performanceProfile(mode); if(this.reducedMotion)this.profile={...this.profile,motion:false,particles:0}; this.resize(); }
  resize() {
    const width = window.innerWidth, height = window.innerHeight, ratio = this.targetRatio;
    if (width === this.width && height === this.height && ratio === this.pixelRatio) return;
    this.width = width; this.height = height; this.pixelRatio = ratio;
    this.canvas.width = Math.round(width * ratio); this.canvas.height = Math.round(height * ratio);
    this.gridPattern = null;
  }

  render(world, player, camera, equipment, placement, combat) {
    const started = performance.now();
    const ctx = this.context;
    const ratio = this.pixelRatio;
    const left = camera.x - this.width / 2;
    const top = camera.y - this.height / 2;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = PALETTE.outside;
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.save();
    ctx.translate(-left, -top);
    ctx.fillStyle = PALETTE.ground;
    ctx.fillRect(0, 0, world.width, world.height);

    if (!this.gridPattern) {
      const tile = document.createElement('canvas'); tile.width = tile.height = world.gridSize;
      const grid = tile.getContext('2d'); grid.strokeStyle = PALETTE.grid; grid.globalAlpha = .55; grid.lineWidth = 1;
      grid.beginPath(); grid.moveTo(.5,world.gridSize); grid.lineTo(.5,.5); grid.lineTo(world.gridSize,.5); grid.stroke();
      this.gridPattern = ctx.createPattern(tile, 'repeat');
    }
    const minX = Math.max(0,left), minY = Math.max(0,top);
    ctx.fillStyle = this.gridPattern; ctx.fillRect(minX,minY,Math.min(world.width,left+this.width)-minX,Math.min(world.height,top+this.height)-minY);
    ctx.strokeStyle = '#376d24'; ctx.lineWidth = 4; ctx.strokeRect(0,0,world.width,world.height);

    this.resourceDrawing.draw(ctx, world.resources, left, top, this.width, this.height);
    if (world.buildings && placement) this.buildingDrawing.drawWorld(ctx, world.buildings, placement, left, top, this.width, this.height, this.profile, world.resources.time);
    if (combat) this.combatDrawing.draw(ctx, combat, left, top, this.width, this.height, this.profile, this.reducedMotion);
    for (const remote of world.remotePlayers || []) {
      if(!remote.online || remote.x < left-80 || remote.x > left+this.width+80 || remote.y < top-80 || remote.y > top+this.height+80)continue;
      const friendly=world.networkSelf?.clanId && world.networkSelf.clanId===remote.clanId;
      ctx.save();ctx.translate(remote.x,remote.y);
      if(remote.active) this.playerDrawing.drawEquipped(ctx,this.equipmentDrawing,equipmentTier(remote.slot?'sword':'pickaxe',remote.tiers[remote.slot]),remote.angle,remote.swordSwingTime>0?.5:0,remote.hitUntil>world.resources.time);
      ctx.font=`bold 12px ${CANVAS_FONT}`;ctx.textAlign='center';ctx.strokeStyle='#13200f';ctx.lineWidth=3;ctx.fillStyle=friendly?'#b7e983':'#ffb28e';
      const label=`${remote.name}${remote.clanName?' ['+remote.clanName+']':''}${remote.active?'':` (${t('hud.downed')})`}`;ctx.strokeText(label,0,-52);ctx.fillText(label,0,-52);
      ctx.fillStyle='#202d1d';ctx.fillRect(-25,-46,50,5);ctx.fillStyle=friendly?'#8cda61':'#ee735f';ctx.fillRect(-25,-46,50*remote.health/remote.maxHealth,5);ctx.restore();
    }
    if(world.networkSelf){ctx.save();ctx.font=`bold 12px ${CANVAS_FONT}`;ctx.textAlign='center';ctx.fillStyle='#fff';ctx.strokeStyle='#13200f';ctx.lineWidth=3;const me=world.networkSelf;const label=me.name+(me.clanName?' ['+me.clanName+']':'');ctx.strokeText(label,player.x,player.y-52);ctx.fillText(label,player.x,player.y-52);ctx.restore();}
    if (this.profile.shadows) {
      ctx.fillStyle = '#20331c38'; ctx.beginPath(); ctx.ellipse(player.x+5,player.y+9,28,18,0,0,Math.PI*2);ctx.fill();
    }
    const bob = this.profile.motion && !this.reducedMotion ? Math.sin(player.walkPhase || 0)*1.2 : 0;
    ctx.translate(player.x, player.y + bob);
    // Visual grip rotation is separate from all combat/harvesting hit tests.
    const swing = equipment.selected.id === 'pickaxe' ? player.harvestSwingAngle : player.swordSwingTime > 0 ? Math.sin((1-player.swordSwingTime/.24)*Math.PI*2)*.8 : 0;
    const reflection = this.profile.motion && !this.reducedMotion && player.swordSwingTime > 0 && equipment.selected.id === 'sword' ? 1-player.swordSwingTime/.24 : null;
    this.playerDrawing.drawEquipped(ctx,this.equipmentDrawing,equipment.selected,player.angle,swing,player.hitUntil>world.resources.time,reflection);
    ctx.restore();
    ctx.save(); ctx.translate(-left,-top); world.feedback?.draw(ctx,left,top,this.width,this.height); ctx.restore();
    // Subtle flat night tint; DOM HUD remains readable and screen-fixed.
    if (combat?.cycle.phase === 'night') {
      ctx.fillStyle = '#172537'; ctx.globalAlpha = .16;
      ctx.fillRect(0, 0, this.width, this.height); ctx.globalAlpha = 1;
    }
    this.metrics.record(performance.now()-started, 0);
  }
}
