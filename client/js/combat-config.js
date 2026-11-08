export const COMBAT_RULES = Object.freeze({
  daySeconds: 60, spawnRadius: 700,
  maxZombies: 256,
  attackInterval: 1, attackReach: 10, aggroRange: 230,
  pathInterval: .8, pathsPerFrame: 2, pathNodeBudget: 1800,
  playerHealth: 100, stashHealth: 600, buildingHealth: 220,
  swordDamage: 25, swordRange: 105, swordHalfAngle: Math.PI / 3, swordCooldown: .45,
  dayHealingPerSecond: 4, rewardLifetime: 1.2, maxEffects: 64, maxProjectiles: 96,
});
const tower = (range, damage, cooldown, speed, splash = 0, pierce = 1, chain = 0) => Object.freeze({ range, damage, cooldown, speed, splash, pierce, chain });
export const TOWER_ATTACKS = Object.freeze({
  ballista: tower(400, 22, 1.1, 500, 0, 2),
  cannon: tower(340, 35, 1.8, 260, 70),
  melee: tower(125, 24, .8, 0, 75),
  bomb: tower(310, 48, 2.6, 180, 110),
  mage: tower(300, 20, 1.2, 0, 0, 1, 3),
});
