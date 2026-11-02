import { equipmentTier, MAX_TIER } from './equipment-config.js';
import { payResources, resourceCount } from './inventory.js';

export class EquipmentShop {
  constructor(equipment, inventory, upgrades) { this.equipment = equipment; this.inventory = inventory; this.upgrades = upgrades; }
  inspect(id) {
    const current = this.equipment.items.find(item => item.id === id);
    if (!current) return { reason: 'Unknown equipment.' };
    const next = equipmentTier(id, current.tier + 1);
    let reason = '';
    if (current.tier === MAX_TIER) reason = 'Maximum tier reached: Emerald.';
    else if (next.tier > this.upgrades.unlockedTier) reason = 'Upgrade the Gold Stash to unlock this tier.';
    else if (resourceCount(this.inventory.gold) < next.cost) reason = 'Not enough gold.';
    return { current, next, reason };
  }
  purchase(id, expectedTier) {
    const offer = this.inspect(id);
    if (offer.reason) return { ok: false, reason: offer.reason };
    if (offer.current.tier !== expectedTier) return { ok: false, reason: 'Offer changed. Review the next tier.' };
    if (!payResources(this.inventory, { wood: 0, stone: 0, gold: offer.next.cost })) return { ok: false, reason: 'Not enough gold.' };
    const slot = this.equipment.items.indexOf(offer.current);
    this.equipment.items[slot] = offer.next;
    return { ok: true, item: offer.next };
  }
}
