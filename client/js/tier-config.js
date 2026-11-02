import { BUILDING_TYPES } from './building-config.js';
import { COMBAT_RULES, TOWER_ATTACKS } from './combat-config.js';

// All balance and material values for the nine-tier progression live here.
export const TIERS = Object.freeze([
  ['Wood', '#a57348', '#52351e'], ['Stone', '#a0a3a1', '#51595b'],
  ['Copper', '#d8874a', '#804329'], ['Iron', '#596773', '#303b46'],
  ['Gold', '#e7b746', '#8b6323'], ['Sulfur', '#e0e447', '#848b31'],
  ['Diamond', '#9ae1f5', '#4d8eaa'], ['Ruby', '#d64c64', '#7f263e'],
  ['Emerald', '#40c78b', '#1a7458'],
].map(([name, color, outline], index) => Object.freeze({ level: index + 1, name, color, outline })));
export const MAX_TIER = TIERS.length;
export const UPGRADE_BALANCE = Object.freeze({ stashGold: 60, growth: 2, wood: 18, stone: 18, gold: 12,
  healthPerTier: .5, damagePerTier: .4, speedPerTier: .08, splashPerTier: .06, productionPerTier: .5, harvestPerTier: .2 });
export function tierOf(building) { return Number.isInteger(building?.tier) && building.tier >= 1 && building.tier <= MAX_TIER ? building.tier : 1; }
export function upgradeCost(type, nextTier) {
  if (!BUILDING_TYPES[type] || !Number.isInteger(nextTier) || nextTier < 2 || nextTier > MAX_TIER) return null;
  const factor = UPGRADE_BALANCE.growth ** (nextTier - 2);
  if (type === 'stash') return { wood: 0, stone: 0, gold: UPGRADE_BALANCE.stashGold * factor };
  const base = BUILDING_TYPES[type].cost;
  return Object.fromEntries(['wood', 'stone', 'gold'].map(material => [material, (UPGRADE_BALANCE[material] + base[material]) * factor]));
}
function calculateStats(type, tier = 1) {
  const step = tier - 1, balance = UPGRADE_BALANCE;
  const attack = TOWER_ATTACKS[type];
  return {
    maxHealth: Math.round((type === 'stash' ? COMBAT_RULES.stashHealth : COMBAT_RULES.buildingHealth) * (1 + step * balance.healthPerTier)),
    production: 1 + step * balance.productionPerTier,
    harvestSpeed: 1 + step * balance.harvestPerTier,
    attack: attack ? { ...attack, damage: attack.damage * (1 + step * balance.damagePerTier), cooldown: attack.cooldown / (1 + step * balance.speedPerTier), splash: attack.splash * (1 + step * balance.splashPerTier) } : null,
  };
}

const STAT_CACHE = Object.freeze(Object.fromEntries(Object.keys(BUILDING_TYPES).map(type => [type,
  Object.freeze(TIERS.map(tier => {
    const stats = calculateStats(type, tier.level);
    if (stats.attack) Object.freeze(stats.attack);
    return Object.freeze(stats);
  }))
])));
export function buildingStats(type, tier = 1) { return STAT_CACHE[type]?.[tier - 1] || STAT_CACHE.mine[0]; }
