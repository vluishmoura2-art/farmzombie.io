import { showDialog, closeDialog } from './dialog-motion.js';
import { BUILDING_TYPES } from './building-config.js';
import { TIERS, buildingStats, tierOf } from './tier-config.js';
import { resourceCount } from './inventory.js';

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
      dialog.querySelector('[data-message]').textContent = result.ok ? `Upgraded to ${TIERS[tierOf(this.building) - 1].name}.` : result.reason;
      onChange();
    });
    dialog.querySelector('[data-upgrade-all]').addEventListener('click', event => {
      if (event.detail > 1) return;
      if (!(event.shiftKey || this.shiftHeld)) {
        dialog.querySelector('[data-message]').textContent = 'Hold SHIFT and click Upgrade All to confirm the entire group.';
        return;
      }
      const result = upgrades.purchaseAll(this.building, this.offeredTier, this.offeredIds);
      this.refresh();
      dialog.querySelector('[data-message]').textContent = result.ok ? `Upgraded ${result.count} matching buildings to ${TIERS[result.tier - 1].name}.` : result.reason;
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
    this.dialog.querySelector('[data-mass-hint]').textContent = held ? 'SHIFT held: upgrade every matching building together.' : 'Hold SHIFT, then click Upgrade All.';
  }
  refresh() {
    const b = this.building;
    const offer = this.upgrades.inspect(b);
    this.offeredTier = offer.current;
    const current = TIERS[offer.current - 1], next = offer.next ? TIERS[offer.next - 1] : null;
    const text = (selector, value) => { this.dialog.querySelector(selector).textContent = value; };
    text('[data-name]', BUILDING_TYPES[b.type].name);
    text('[data-current]', `Tier ${current.level} · ${current.name}`);
    text('[data-next]', next ? `Tier ${next.level} · ${next.name}` : 'Emerald · Maximum tier');
    text('[data-unlocked]', `Base tier: ${TIERS[this.upgrades.unlockedTier - 1].name}`);
    text('[data-reason]', offer.reason || 'Ready to upgrade');
    const costs = this.dialog.querySelector('[data-costs]'); costs.replaceChildren();
    for (const material of b.type === 'stash' ? ['gold'] : ['wood', 'stone', 'gold']) {
      const row = document.createElement('div');
      const amount = offer.cost?.[material] || 0, balance = resourceCount(this.upgrades.buildings.inventory[material]);
      row.className = 'upgrade-cost' + (balance < amount ? ' missing' : '');
      const label = document.createElement('span'), value = document.createElement('strong');
      label.textContent = material; value.textContent = `${amount.toLocaleString()} / ${balance.toLocaleString()} available`;
      row.append(label, value); costs.append(row);
    }
    const stats = buildingStats(b.type, offer.current), future = buildingStats(b.type, offer.next || offer.current);
    const benefit = b.type === 'mine' ? `Gold output ×${stats.production} → ×${future.production}` : b.type === 'harvester' ? `Collection speed ×${stats.harvestSpeed.toFixed(1)} → ×${future.harvestSpeed.toFixed(1)}` : stats.attack ? `Damage ${stats.attack.damage.toFixed(1)} → ${future.attack.damage.toFixed(1)}` : `Maximum health ${stats.maxHealth} → ${future.maxHealth}`;
    text('[data-benefit]', benefit);
    const button = this.dialog.querySelector('[data-upgrade]'); button.disabled = Boolean(offer.reason);
    button.textContent = next ? `Upgrade to ${next.name}` : 'Maximum tier reached';
    const preview = this.dialog.querySelector('canvas'), ctx = preview.getContext('2d');
    ctx.clearRect(0, 0, preview.width, preview.height);
    this.drawing.draw(ctx, b.type, 8, 8, 112, 0, offer.next || offer.current);
    const mass = this.upgrades.inspectAll(b);
    this.offeredIds = mass.targets.map(target => target.id); this.massReason = mass.reason;
    this.dialog.querySelector('[data-mass-section]').hidden = b.type === 'stash';
    text('[data-mass-count]', `${mass.count} eligible ${BUILDING_TYPES[b.type].name} buildings at ${current.name}`);
    text('[data-mass-cost]', `Total: ${mass.cost.wood.toLocaleString()} wood · ${mass.cost.stone.toLocaleString()} stone · ${mass.cost.gold.toLocaleString()} gold`);
    text('[data-mass-balance]', `Available: ${resourceCount(this.upgrades.buildings.inventory.wood).toLocaleString()} wood · ${resourceCount(this.upgrades.buildings.inventory.stone).toLocaleString()} stone · ${resourceCount(this.upgrades.buildings.inventory.gold).toLocaleString()} gold`);
    text('[data-mass-reason]', mass.reason || 'Entire group is affordable.');
    this.setShift(this.shiftHeld);
  }
}
