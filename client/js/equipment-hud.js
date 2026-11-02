
export class EquipmentHUD {
  constructor(container, equipment, drawing) {
    this.container = container;
    this.equipment = equipment;
    this.drawing = drawing;
    this.buttons = container.querySelectorAll('[data-slot]');
    this.announcement = container.querySelector('[role="status"]');
    for (const button of this.buttons) {
      // Inventory interactions belong to the HUD, even if world pointer
      // actions are introduced in a later phase. Movement keys still bubble.
      button.addEventListener('pointerdown', (event) => event.stopPropagation());
      button.addEventListener('pointerup', (event) => event.stopPropagation());
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        this.select(Number(button.dataset.slot));
      });
    }
    this.refresh();
    this.resize();
  }

  select(slot) {
    if (this.equipment.select(slot)) this.refresh();
  }

  refresh() {
    for (const button of this.buttons) {
      const item = this.equipment.items[Number(button.dataset.slot)];
      button.setAttribute('aria-label', `${item.name}, slot ${Number(button.dataset.slot) + 1}`);
      button.title = `${item.name} (${Number(button.dataset.slot) + 1})`;
      button.setAttribute('aria-pressed', String(Number(button.dataset.slot) === this.equipment.selectedSlot));
    }
    this.announcement.textContent = `${this.equipment.selected.name} equipped`;
  }

  resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    for (const button of this.buttons) {
      const canvas = button.querySelector('canvas');
      canvas.width = Math.round(44 * ratio);
      canvas.height = Math.round(44 * ratio);
      const ctx = canvas.getContext('2d');
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      const item = this.equipment.items[Number(button.dataset.slot)];
      this.drawing.drawIcon(ctx, item.id, 44, item.tier);
    }
  }
}
