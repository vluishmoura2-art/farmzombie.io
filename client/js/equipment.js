import { equipmentTier } from './equipment-config.js';
export const EQUIPMENT = Object.freeze([
  Object.freeze({ id: 'pickaxe', name: 'Wooden pickaxe', shortcut: '1' }),
  Object.freeze({ id: 'sword', name: 'Wooden sword', shortcut: '2' }),
]);

export class Equipment {
  constructor() {
    this.selectedSlot = 0;
    this.items = [equipmentTier('pickaxe', 1), equipmentTier('sword', 1)];
  }

  get selected() { return this.items[this.selectedSlot]; }

  select(slot) {
    if (!Number.isInteger(slot) || slot < 0 || slot >= EQUIPMENT.length) return false;
    this.selectedSlot = slot;
    return true;
  }
}
