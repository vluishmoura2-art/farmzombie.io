import { hordeSpec } from './horde-config.js';
import { tierOf } from './tier-config.js';
import { t, tierName, reasonText } from './i18n.js';

const setText = (element,text) => { if (element && element.textContent !== text) element.textContent=text; };
const hordeName = category => t(`horde.${category}`);

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
  cycleText() {
    const cycle = this.combat.cycle, seconds = Math.ceil(cycle.remaining);
    if (cycle.phase === 'preparation') return t('hud.placeStash');
    if (cycle.phase === 'night') {
      const spec = hordeSpec(cycle.wave || 1);
      const text = t('hud.night', { wave: cycle.wave || 1, horde: hordeName(spec.category), seconds });
      return spec.endless ? `${text} · ${t('hud.endless')}` : text;
    }
    return t('hud.day', { day: (cycle.wave || 0) + 1, seconds, horde: hordeName(hordeSpec((cycle.wave || 0) + 1).category) });
  }
  refresh() {
    const c = this.combat;
    setText(this.cycle, this.cycleText());
    setText(this.health, `${Math.ceil(c.player.health)} / ${c.player.maxHealth}`);
    if(this.healthBar){this.healthBar.max=c.player.maxHealth;this.healthBar.value=c.player.health;this.healthBar.classList.toggle('danger',c.player.health/c.player.maxHealth<.3);}
    setText(this.baseTier, t('hud.baseTier', { tier: tierName(tierOf(c.buildings.stash)) }));
    if(this.container)this.container.dataset.night=String(c.cycle.phase==='night');
    setText(this.stash, c.buildings.stash ? `${Math.ceil(c.buildings.stash.health)} / ${c.buildings.stash.maxHealth}` : c.gameOver ? t('hud.stashDestroyed') : t('hud.stashMissing'));
    setText(this.enemies, String(c.zombies.items.length));
    if (c.gameOver && this.over.hidden) {
      this.message.textContent = `${reasonText(c.reason)} ${t('gameOver.summary', { wave: c.cycle.wave || 0 })}`;
      this.over.hidden = false;
      document.querySelector('#restart-button').focus({ preventScroll: true });
    }
  }
}
