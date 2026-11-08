import { BUILDING_TYPES } from './building-config.js';
import { resourceCount } from './inventory.js';

export const MATERIALS = ['wood', 'stone', 'gold'];
// Shared by cost labels, tooltips and placement status; never decorative values.
export function missingResources(type, inventory) {
  return MATERIALS.map(material => ({ material, amount: Math.max(0, BUILDING_TYPES[type].cost[material] - resourceCount(inventory[material])) })).filter(entry => entry.amount > 0);
}
export function missingMessage(type, inventory) {
  const missing = missingResources(type, inventory);
  return missing.length ? `Missing ${missing.map(({material, amount}) => `${amount} ${material}`).join(' · ')}` : '';
}
