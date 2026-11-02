import { TIERS, MAX_TIER } from './tier-config.js';

export const EQUIPMENT_BALANCE = Object.freeze({ pickaxeGold: 30, swordGold: 45, costGrowth: 2,
  rewardPerTier: 1, harvestSpeedPerTier: .15, swordDamagePerTier: .4, swordSpeedPerTier: .12 });
// Build only eighteen immutable entries, shared by inventory, shop and gameplay.
export const EQUIPMENT_TIERS = Object.freeze(Object.fromEntries(['pickaxe', 'sword'].map(id => [id,
  Object.freeze(TIERS.map((material, index) => Object.freeze({
    id, tier: index + 1, name: `${index === 0 ? 'Wooden' : material.name} ${id === 'pickaxe' ? 'Pickaxe' : 'Sword'}`,
    color: material.color, outline: material.outline,
    cost: index === 0 ? 0 : EQUIPMENT_BALANCE[`${id}Gold`] * EQUIPMENT_BALANCE.costGrowth ** (index - 1),
    rewardPerMember: 3 + index * EQUIPMENT_BALANCE.rewardPerTier,
    harvestMultiplier: (3 + index * EQUIPMENT_BALANCE.rewardPerTier) / 3,
    harvestSpeed: 1 + index * EQUIPMENT_BALANCE.harvestSpeedPerTier,
    damageMultiplier: 1 + index * EQUIPMENT_BALANCE.swordDamagePerTier,
    attackSpeed: 1 + index * EQUIPMENT_BALANCE.swordSpeedPerTier,
  })))
])));
export function equipmentTier(id, tier) { return EQUIPMENT_TIERS[id]?.[tier - 1] || null; }
export { MAX_TIER };
