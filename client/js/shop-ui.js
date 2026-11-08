import { showDialog, closeDialog } from './dialog-motion.js';
import { EQUIPMENT_TIERS } from './equipment-config.js';
import { COMBAT_RULES } from './combat-config.js';
import { HARVEST_COOLDOWN } from './harvesting.js';
import { resourceCount } from './inventory.js';
import { t, tierName, equipmentName, reasonText } from './i18n.js';

export class ShopUI {
  constructor(dialog, shop, drawing, onChange, onClose) {
    this.dialog = dialog; this.shop = shop; this.drawing = drawing; this.onClose = onClose;
    this.cards = new Map(); this.offers = new Map();
    for (const id of ['pickaxe', 'sword']) {
      const card = document.createElement('section'); card.className = 'shop-card';
      card.innerHTML = `<h3></h3><ol class="equipment-tiers"></ol><div class="shop-preview"><canvas width="96" height="96"></canvas><div><p data-current></p><p data-next></p></div></div><p data-stats class="upgrade-benefit"></p><p data-cost></p><p data-reason class="upgrade-muted"></p><button type="button" data-buy></button>`;
      card.querySelector('h3').textContent = t(`shop.${id}`);
      card.querySelector('canvas').setAttribute('aria-label', t('shop.preview'));
      for (const tier of EQUIPMENT_TIERS[id]) {
        const entry = document.createElement('li'); entry.textContent = tierName(tier.tier);
        entry.style.setProperty('--material', tier.color); entry.dataset.tier = tier.tier;
        entry.title = t('shop.tierTitle', { name: equipmentName(tier), cost: tier.cost.toLocaleString() });
        card.querySelector('ol').append(entry);
      }
      card.querySelector('[data-buy]').addEventListener('click', event => {
        if (event.detail > 1) return;
        const result = shop.purchase(id, this.offers.get(id));
        this.refresh(); onChange();
        dialog.querySelector('[data-shop-message]').textContent = result.ok ? t('shop.bought', { name: equipmentName(result.item) }) : reasonText(result.reason);
      });
      dialog.querySelector('[data-shop-cards]').append(card); this.cards.set(id, card);
    }
    dialog.querySelector('[data-shop-close]').addEventListener('click', () => this.close());
    dialog.addEventListener('cancel', event => { event.preventDefault(); this.close(); });
    dialog.addEventListener('keydown', event => {
      if (event.repeat && (event.key === 'Enter' || event.key === ' ')) event.preventDefault();
    });
    for (const name of ['click','pointerdown','pointerup','contextmenu','keydown','keyup']) dialog.addEventListener(name, event => event.stopPropagation());
  }
  get open() { return this.dialog.open; }
  show() { this.refresh(); this.dialog.querySelector('[data-shop-message]').textContent = ''; showDialog(this.dialog); this.dialog.querySelector('[data-shop-close]').focus(); }
  close() { closeDialog(this.dialog, () => this.onClose()); }
  refresh() {
    this.dialog.querySelector('[data-shop-balance]').textContent = t('shop.balance', { gold: resourceCount(this.shop.inventory.gold).toLocaleString(), tier: tierName(this.shop.upgrades.unlockedTier) });
    for (const [id, card] of this.cards) {
      const offer = this.shop.inspect(id), current = offer.current, next = offer.next;
      this.offers.set(id, current.tier);
      card.querySelector('[data-current]').textContent = t('shop.current', { name: equipmentName(current) });
      card.querySelector('[data-next]').textContent = next ? t('shop.next', { name: equipmentName(next) }) : t('upgrade.maxTier');
      const stats = item => id === 'pickaxe'
        ? t('shop.statsPickaxe', { amount: item.rewardPerMember, ms: (HARVEST_COOLDOWN / item.harvestSpeed * 1000).toFixed(0) })
        : t('shop.statsSword', { damage: (COMBAT_RULES.swordDamage * item.damageMultiplier).toFixed(0), ms: (COMBAT_RULES.swordCooldown / item.attackSpeed * 1000).toFixed(0) });
      card.querySelector('[data-stats]').textContent = `${stats(current)}${next ? ` → ${stats(next)}` : ''}`;
      card.querySelector('[data-cost]').textContent = next ? t('shop.cost', { cost: next.cost.toLocaleString() }) : t('shop.allOwned');
      card.querySelector('[data-reason]').textContent = reasonText(offer.reason) || t('shop.ready');
      const button = card.querySelector('[data-buy]'); button.disabled = Boolean(offer.reason);
      button.textContent = next ? t('shop.buy', { name: equipmentName(next) }) : t('upgrade.maxTier');
      for (const entry of card.querySelectorAll('[data-tier]')) {
        entry.classList.toggle('owned', Number(entry.dataset.tier) <= current.tier);
        entry.classList.toggle('current', Number(entry.dataset.tier) === current.tier);
        entry.classList.toggle('locked', Number(entry.dataset.tier) > this.shop.upgrades.unlockedTier);
      }
      const canvas = card.querySelector('canvas'), ctx = canvas.getContext('2d'); ctx.clearRect(0,0,96,96);
      ctx.save(); ctx.translate(48,22); this.drawing.draw(ctx,id,(next || current).tier); ctx.restore();
    }
  }
}

export function bindShopControls(target, button, ui, canOpen, onOpen, keyboard = true) {
  const open = () => { if (canOpen()) { onOpen(); ui.show(); } };
  button.addEventListener('click', open);
  if (keyboard) target.addEventListener('keydown', event => {
    if (event.code !== 'KeyB' || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
    if (['INPUT','TEXTAREA','SELECT'].includes(event.target?.tagName) || event.target?.isContentEditable) return;
    event.preventDefault(); open();
  });
}
