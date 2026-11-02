// Required tower tier and damage below that tier. Applied once, at impact.
export const DAMAGE_EFFECTIVENESS = Object.freeze({
  green: Object.freeze({ tier: 1, multiplier: 1 }),
  gold: Object.freeze({ tier: 5, multiplier: .35 }),
  diamond: Object.freeze({ tier: 7, multiplier: .25 }),
  emerald: Object.freeze({ tier: 9, multiplier: .15 }),
});
export function towerMultiplier(tier, zombieType, balance = DAMAGE_EFFECTIVENESS) {
  const rule = balance[zombieType];
  return !rule || tier >= rule.tier ? 1 : rule.multiplier;
}
