import { TIERS, tierOf } from './tier-config.js';

const setText = (element,text) => { if (element && element.textContent !== text) element.textContent=text; };
export class CombatHUD {
  constructor(combat) {
    this.combat = combat;
    this.cycle = document.querySelector('#cycle-status');
    this.health = document.querySelector('#player-health');
    this.healthBar = document.querySelector('#health-bar');this.baseTier=document.querySelector('#base-tier');this.container=document.querySelector('#combat-hud');
    this.stash = document.querySelector('#stash-health');
    this.enemies = document.querySelector('#enemy-count');
    this.over = document.querySelector('#game-over');
    this.message = document.querySelector('#game-over-message');
    document.querySelector('#restart-button').addEventListener('click', () => this.onRestart ? this.onRestart() : location.reload());
    this.refresh();
  }
  refresh() {
    const c = this.combat;
    setText(this.cycle, c.cycle.phase === 'preparation' ? 'Place Gold Stash to begin' : `${c.cycle.phase === 'night' ? 'NIGHT' : 'DAY'} · Wave ${c.cycle.wave || 1} · ${Math.ceil(c.cycle.remaining)}s`);
    setText(this.health, `${Math.ceil(c.player.health)} / ${c.player.maxHealth}`);
    if(this.healthBar){this.healthBar.max=c.player.maxHealth;this.healthBar.value=c.player.health;this.healthBar.classList.toggle('danger',c.player.health/c.player.maxHealth<.3);}
    setText(this.baseTier,`${TIERS[tierOf(c.buildings.stash)-1].name.toUpperCase()} BASE`);
    if(this.container)this.container.dataset.night=String(c.cycle.phase==='night');
    setText(this.stash, c.buildings.stash ? `${Math.ceil(c.buildings.stash.health)} / ${c.buildings.stash.maxHealth}` : c.gameOver ? 'Destroyed' : 'Not placed');
    setText(this.enemies, String(c.zombies.items.length));
    if (c.gameOver && this.over.hidden) {
      this.message.textContent = `${c.reason} Wave ${c.cycle.wave} · ${c.zombies.kills} enemies defeated.`;
      this.over.hidden = false;
      document.querySelector('#restart-button').focus({ preventScroll: true });
    }
  }
}
