import { BuildingIcons } from './building-icons.js';
import { BUILDING_TYPES } from './building-config.js';
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
    const shortcuts = ['3','4','5','6','7','8','9','0'];
    for (const [type, definition] of Object.entries(BUILDING_TYPES)) {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'building-slot'; button.dataset.building = type;
      const cost = definition.cost, shortcut = shortcuts[this.buttons.length];
      button.setAttribute('aria-keyshortcuts', shortcut);
      button.innerHTML = `<span class="slot-key">${shortcut}</span><canvas aria-hidden="true"></canvas><span class="building-name">${definition.name}</span><span class="building-capacity"></span><span class="building-cost">${type === 'stash' ? 'FREE' : `${cost.wood}w · ${cost.stone}s · ${cost.gold}g`}</span>`;
      button.title = `${definition.description}\nWood ${cost.wood} · Stone ${cost.stone} · Gold ${cost.gold}`;
      button.addEventListener('click', () => {
        if (placement.selected === type) placement.cancel(); else placement.select(type);
        this.messageTime = 0; this.refresh();
      });
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
    this.message = result.ok ? `${BUILDING_TYPES[result.building.type].name} placed` : result.reason;
    this.messageTime = 2.5; this.refresh();
  }
  update(dt) { this.messageTime = Math.max(0, this.messageTime - dt); }
  refresh() {
    const { buildings, selected, reason, visible } = this.placement;
    for (const button of this.buttons) {
      const type = button.dataset.building, definition = BUILDING_TYPES[type];
      const unavailable = buildings.availability(type);
      button.classList.toggle('unavailable', Boolean(unavailable));
      button.dataset.available = String(!unavailable);
      button.setAttribute('aria-pressed', String(selected === type));
      // Unavailable items remain selectable to inspect their footprint/reason.
      button.setAttribute('aria-label', `${definition.name}, ${buildings.remaining(type)} remaining. Wood ${definition.cost.wood}, stone ${definition.cost.stone}, gold ${definition.cost.gold}. ${unavailable}`);
      const capacity = button.querySelector('.building-capacity');
      const text = `${buildings.remaining(type)}/${definition.limit}`;
      if (capacity.textContent !== text) capacity.textContent = text;
    }
    const text = this.messageTime > 0 ? this.message : selected ? `${BUILDING_TYPES[selected].name} · ${visible && reason ? reason : buildings.availability(selected) || 'Click to place'} · Esc / right-click cancels` : 'BUILD · Place a free Gold Stash to establish your base';
    const finalText = !selected && buildings.stash && this.messageTime <= 0 ? 'BUILD · Select a building · w wood / s stone / g gold' : text;
    if (this.status.textContent !== finalText) this.status.textContent = finalText;
  }
}
