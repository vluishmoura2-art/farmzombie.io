import { showDialog, closeDialog } from './dialog-motion.js';
import { TIERS, buildingStats, tierOf } from './tier-config.js';
import { BUILDING_RULES } from './building-config.js';
import { millRange } from './gold-economy.js';
import { resourceCount } from './inventory.js';
import { t, tierName, buildingName, materialName, reasonText } from './i18n.js';

const amounts = (values) => ['wood', 'stone', 'gold'].map(m => `${resourceCount(values[m]).toLocaleString()} ${materialName(m)}`).join(' · ');

export class UpgradeUI {
  constructor(dialog, upgrades, drawing, onChange, onClose) {
    this.dialog = dialog; this.upgrades = upgrades; this.drawing = drawing;
    this.onChange = onChange; this.onClose = onClose; this.building = null;
    this.shiftHeld = false; this.touchShift = false;
    dialog.querySelector('[data-close]').addEventListener('click', () => this.close());
    dialog.addEventListener('cancel', event => { event.preventDefault(); this.close(); });
    dialog.addEventListener('keydown', event => { if (event.repeat && (event.key === 'Enter' || event.key === ' ')) event.preventDefault(); });
    dialog.querySelector('[data-upgrade]').addEventListener('click', event => {
      if (event.detail > 1) return;
      const result = event.shiftKey || this.shiftHeld
        ? upgrades.purchaseAll(this.building, this.offeredTier, this.offeredIds)
        : upgrades.purchase(this.building, this.offeredTier);
      this.refresh();
      dialog.querySelector('[data-message]').textContent = result.ok ? t('upgrade.done', { tier: tierName(tierOf(this.building)) }) : reasonText(result.reason);
      onChange();
    });
    dialog.querySelector('[data-upgrade-all]').addEventListener('click', event => {
      if (event.detail > 1) return;
      if (!(event.shiftKey || this.shiftHeld)) {
        dialog.querySelector('[data-message]').textContent = t('upgrade.holdShift');
        return;
      }
      const result = upgrades.purchaseAll(this.building, this.offeredTier, this.offeredIds);
      this.refresh();
      dialog.querySelector('[data-message]').textContent = result.ok ? t('upgrade.doneAll', { count: result.count, tier: tierName(result.tier) }) : reasonText(result.reason);
      onChange();
    });
    dialog.addEventListener('keydown', event => { if (event.key === 'Shift') this.setShift(true); });
    dialog.addEventListener('keyup', event => { if (event.key === 'Shift') this.setShift(false); });
    dialog.addEventListener('pointermove', event => this.setShift(event.shiftKey || this.touchShift));
    dialog.querySelector('[data-touch-shift]').addEventListener('click', () => { this.touchShift = !this.touchShift; this.setShift(this.touchShift); });
    window.addEventListener('blur', () => this.setShift(false));
    for (const name of ['click', 'pointerdown', 'pointerup', 'contextmenu', 'keydown', 'keyup']) dialog.addEventListener(name, event => event.stopPropagation());
  }
  get open() { return this.dialog.open; }
  show(building, shiftHeld = false) {
    this.shiftHeld = shiftHeld;
    this.building = building; this.refresh();
    this.dialog.querySelector('[data-message]').textContent = '';
    showDialog(this.dialog);
    this.dialog.querySelector('[data-close]').focus();
  }
  close() { closeDialog(this.dialog, () => { this.building = null; this.touchShift = false; this.setShift(false); this.onClose(); }); }
  setShift(held) {
    this.shiftHeld = held;
    this.dialog.classList.toggle('shift-held', held);
    this.dialog.querySelector('[data-touch-shift]').setAttribute('aria-pressed', String(this.touchShift));
    this.dialog.querySelector('[data-upgrade-all]').disabled = Boolean(this.massReason);
    this.dialog.querySelector('[data-mass-hint]').textContent = t(held ? 'upgrade.shiftOn' : 'upgrade.shiftOff');
  }
  refresh() {
    const b = this.building;
    const offer = this.upgrades.inspect(b);
    this.offeredTier = offer.current;
    const current = TIERS[offer.current - 1], next = offer.next ? TIERS[offer.next - 1] : null;
    const text = (selector, value) => { this.dialog.querySelector(selector).textContent = value; };
    text('[data-name]', buildingName(b.type));
    text('[data-current]', t('upgrade.tier', { level: current.level, name: tierName(current.level) }));
    text('[data-next]', next ? t('upgrade.tier', { level: next.level, name: tierName(next.level) }) : t('upgrade.maxTier'));
    text('[data-unlocked]', t('upgrade.unlocked', { tier: tierName(this.upgrades.unlockedTier) }));
    text('[data-reason]', reasonText(offer.reason) || t('upgrade.ready'));
    const costs = this.dialog.querySelector('[data-costs]'); costs.replaceChildren();
    for (const material of b.type === 'stash' ? ['gold'] : ['wood', 'stone', 'gold']) {
      const row = document.createElement('div');
      const amount = offer.cost?.[material] || 0, balance = resourceCount(this.upgrades.buildings.inventory[material]);
      row.className = 'upgrade-cost' + (balance < amount ? ' missing' : '');
      const label = document.createElement('span'), value = document.createElement('strong');
      label.textContent = materialName(material); value.textContent = t('upgrade.costRow', { cost: amount.toLocaleString(), balance: balance.toLocaleString() });
      row.append(label, value); costs.append(row);
    }
    const stats = buildingStats(b.type, offer.current), future = buildingStats(b.type, offer.next || offer.current);
    const rules = BUILDING_RULES, nextTier = offer.next || offer.current;
    const benefit = b.type === 'field' ? t('upgrade.benefitWheat', { from: Math.round(rules.wheatGold * stats.production), to: Math.round(rules.wheatGold * future.production) })
      : b.type === 'windmill' ? t('upgrade.benefitRange', { from: Math.round(millRange({ tier: offer.current }, rules)), to: Math.round(millRange({ tier: nextTier }, rules)) })
      : b.type === 'harvester' ? t('upgrade.benefitHarvest', { from: stats.harvestSpeed.toFixed(1), to: future.harvestSpeed.toFixed(1) })
      : stats.attack ? t('upgrade.benefitDamage', { from: stats.attack.damage.toFixed(1), to: future.attack.damage.toFixed(1) })
      : t('upgrade.benefitHealth', { from: stats.maxHealth, to: future.maxHealth });
    text('[data-benefit]', benefit);
    const button = this.dialog.querySelector('[data-upgrade]'); button.disabled = Boolean(offer.reason);
    button.textContent = next ? t('upgrade.button', { tier: tierName(next.level) }) : t('upgrade.maxTier');
    const preview = this.dialog.querySelector('canvas'), ctx = preview.getContext('2d');
    ctx.clearRect(0, 0, preview.width, preview.height);
    this.drawing.draw(ctx, b.type, 8, 8, 112, 0, offer.next || offer.current);
    const mass = this.upgrades.inspectAll(b);
    this.offeredIds = mass.targets.map(target => target.id); this.massReason = mass.reason;
    this.dialog.querySelector('[data-mass-section]').hidden = b.type === 'stash';
    text('[data-mass-count]', t('upgrade.massCount', { count: mass.count, name: buildingName(b.type), tier: tierName(current.level) }));
    text('[data-mass-cost]', t('upgrade.massCost', { list: amounts(mass.cost) }));
    text('[data-mass-balance]', t('upgrade.massBalance', { list: amounts(this.upgrades.buildings.inventory) }));
    text('[data-mass-reason]', reasonText(mass.reason) || t('upgrade.massReady'));
    this.setShift(this.shiftHeld);
  }
}
