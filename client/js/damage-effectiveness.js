// Applied exactly once at impact; low tiers retain meaningful damage.
export const DAMAGE_EFFECTIVENESS=Object.freeze({
 green:Object.freeze({tier:1,multiplier:1}),
 diamond:Object.freeze({tier:7,multiplier:.25}),
 yellow:Object.freeze({tier:9,multiplier:.15}),
});
export function towerMultiplier(tier,zombieType,balance=DAMAGE_EFFECTIVENESS){const rule=balance[zombieType];return !rule||tier>=rule.tier?1:rule.multiplier;}
