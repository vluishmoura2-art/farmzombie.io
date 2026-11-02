import { RESOURCE_IMPACT_DURATION } from './art-config.js';
import { resourceCount } from './inventory.js';

const eligible = resource => resource.active && ['wood', 'stone'].includes(resource.material) && Number.isSafeInteger(resource.rewardPerHit) && resource.rewardPerHit > 0;

// Distance to a formation is the distance to its closest member in world space.
// Explicit membership prevents neighboring formations from being combined.
export function nearestFormation(field, x, y, range) {
  field.prepareFormationIndex();
  field.queryBounds(x - range, y - range, x + range, y + range, field.harvestCandidates);
  const seen = field.harvestSeen; seen.clear();
  let target = null, nearest = range * range;
  for (const resource of field.harvestCandidates) {
    const formation = field.formationIndex.get(resource);
    if (!formation || seen.has(formation)) continue;
    seen.add(formation);
    if (!formation.members.length || !formation.members.every(eligible)) continue;
    let distance = Infinity;
    for (const node of formation.members) distance = Math.min(distance, (node.x - x) ** 2 + (node.y - y) ** 2);
    if (distance < nearest || (distance === nearest && (!target || field.formationOrder.get(formation) < field.formationOrder.get(target)))) { target = formation; nearest = distance; }
  }
  return target;
}

// Manual and automatic actions share this single synchronous accounting operation.
export function applyFormationHit(formation, field, inventory, multiplier = 1) {
  const rewards = { wood: 0, stone: 0 };
  if (!formation?.members.length || !formation.members.every(eligible) || !Number.isFinite(multiplier) || multiplier <= 0) return rewards;
  for (const resource of new Set(formation.members)) {
    rewards[resource.material] += Math.round(resource.rewardPerHit * multiplier);
    resource.hitUntil = field.time + RESOURCE_IMPACT_DURATION;
    resource.flashPending = true;
  }
  for (const material of ['wood', 'stone']) {
    inventory[material] = resourceCount(resourceCount(inventory[material]) + rewards[material]);
  }
  field.feedback?.harvest(formation.members);
  return rewards;
}
