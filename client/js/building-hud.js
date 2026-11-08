import { BuildingIcons } from './building-icons.js';
import { BUILDING_TYPES } from './building-config.js';
import { MATERIALS, missingResources } from './building-feedback.js';
import { resourceCount } from './inventory.js';
import { t, buildingName, buildingDescription, materialName, reasonText } from './i18n.js';

const missingText = (type, inventory) => {
  const missing = missingResources(type, inventory);
  return missing.length ? t('build.missing', { list: missing.map(({ material, amount }) => `${amount} ${materialName(material)}`).join(' · ') }) : '';
};
const costText = cost => MATERIALS.map(m => `${cost[m]} ${materialName(m)}`).join(' · ');

export class BuildingHUD {
  constructor(container, placement, drawing) {
    this.container = container;
    this.placement = placement;
    this.buttons = [];
    this.status = document.querySelector('#build-status');
    this.message = '';
    this.messageTime = 0;
    this.drawing = drawing;
    this.icons = new BuildingIcons();
    this.detail = document.createElement('div');
    this.detail.id = 'building-detail'; this.detail.role = 'tooltip'; this.detail.hidden = true;
    container.parentElement.append(this.detail);
    this.inspected = null;
    const shortcuts = ['3','4','5','6','7','8','9','0','-'];
    for (const [type, definition] of Object.entries(BUILDING_TYPES)) {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'building-slot'; button.dataset.building = type;
      const cost = definition.cost, shortcut = shortcuts[this.buttons.length];
      button.setAttribute('aria-keyshortcuts', shortcut === '-' ? 'Minus' : shortcut);
      button.innerHTML = `<span class="slot-key">${shortcut}</span><canvas aria-hidden="true"></canvas><span class="building-name"></span><span class="building-capacity"></span><span class="building-cost">${type === 'stash' ? '' : MATERIALS.filter(m => cost[m] > 0).map(m => `<span class="cost-resource ${m}" data-material="${m}"><i class="resource-symbol" aria-hidden="true"></i><span>${cost[m]}</span></span>`).join('')}</span>`;
      button.querySelector('.building-name').textContent = buildingName(type);
      if (type === 'stash') button.querySelector('.building-cost').textContent = t('build.free');
      button.addEventListener('click', () => {
        if (placement.selected === type) placement.cancel(); else placement.select(type);
        if (placement.selected === type) button.scrollIntoView({block:'nearest',inline:'nearest'});
        this.messageTime = 0; this.refresh();
      });
      button.setAttribute('aria-describedby', this.detail.id);
      const inspect = () => { this.inspected = type; this.refresh(); };
      const leave = () => { this.inspected = null; this.detail.hidden = true; };
      button.addEventListener('pointerenter', inspect); button.addEventListener('focus', inspect);
      button.addEventListener('pointerleave', leave); button.addEventListener('blur', leave);
      container.append(button); this.buttons.push(button);
    }
    for (const type of ['pointerdown', 'pointerup', 'click', 'contextmenu']) container.addEventListener(type, event => event.stopPropagation());
    this.resize(); this.refresh();
  }
  resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    for (const button of this.buttons) {
      const canvas = button.querySelector('canvas'); canvas.width = canvas.height = Math.round(38 * ratio);
      const ctx = canvas.getContext('2d'); ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      this.icons.draw(ctx, button.dataset.building, 0, 0, 38);
    }
  }
  show(result) {
    this.message = result.ok ? t('build.placed', { name: buildingName(result.building.type) }) : reasonText(result.reason);
    this.messageTime = 2.5; this.refresh();
  }
  update(dt) { this.messageTime = Math.max(0, this.messageTime - dt); }
  // Availability reasons are English codes from the rules; show the exact deficit instead.
  reasonFor(type, reason) {
    return reason === 'Not enough resources' ? missingText(type, this.placement.buildings.inventory) : reasonText(reason);
  }
  refresh() {
    const { buildings, selected, reason, visible } = this.placement;
    for (const button of this.buttons) {
      const type = button.dataset.building, definition = BUILDING_TYPES[type];
      const unavailable = buildings.availability(type);
      button.classList.toggle('unavailable', Boolean(unavailable));
      button.dataset.available = String(!unavailable);
      button.setAttribute('aria-pressed', String(selected === type));
      // Unavailable items remain selectable to inspect their footprint/reason.
      const count = t('build.count', { count: buildings.counts[type], limit: definition.limit });
      const state = unavailable ? this.reasonFor(type, unavailable) : t('build.ready');
      button.setAttribute('aria-label', `${buildingName(type)}. ${count}. ${type === 'stash' ? t('build.free') : costText(definition.cost)}. ${state}`);
      const capacity = button.querySelector('.building-capacity');
      const text = `${buildings.counts[type]}/${definition.limit}`;
      if (capacity.textContent !== text) capacity.textContent = text;
      for (const entry of button.querySelectorAll('[data-material]')) {
        const material = entry.dataset.material;
        entry.classList.toggle('missing', resourceCount(buildings.inventory[material]) < definition.cost[material]);
      }
      const explanation = `${buildingDescription(type)}\n${count} · ${state}`;
      button.title = explanation;
      button.dataset.reason = unavailable;
      if (this.inspected === type) {
        this.detail.hidden = false;
        this.detail.textContent = `${buildingName(type)} · ${explanation}`;
      }
    }
    let text;
    if (this.placement.pending) text = t('build.pending');
    else if (this.messageTime > 0) text = this.message;
    else if (selected) {
      const blocker = visible && reason ? reason : buildings.availability(selected);
      text = `${buildingName(selected)} · ${blocker ? this.reasonFor(selected, blocker) : t('build.clickToPlace')} · ${t('build.cancelHint')}`;
    } else text = buildings.stash ? t('build.idle') : t('build.noStash');
    if (this.status.textContent !== text) this.status.textContent = text;
  }
}
