export function resourceCount(value) {
  return Number.isFinite(value) ? Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.trunc(value))) : 0;
}

export function payResources(inventory, cost) {
  const materials = ['wood', 'stone', 'gold'];
  if (!cost || materials.some(material => !Number.isSafeInteger(cost[material]) || cost[material] < 0 || resourceCount(inventory[material]) < cost[material])) return false;
  for (const material of materials) inventory[material] = resourceCount(inventory[material]) - cost[material];
  return true;
}
