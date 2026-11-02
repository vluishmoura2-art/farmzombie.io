const category = (color, outline, size, health, speed, playerDamage, buildingDamage, stashDamage, goldReward, unlockWave, spawnProbability) => Object.freeze({
  color, outline, size, health, speed, playerDamage, buildingDamage, stashDamage, goldReward, unlockWave, spawnProbability,
});
export const ZOMBIE_TYPES = Object.freeze({
  green: category('#48B94C', '#287C32', .85, 40, 70, 5, 7, 6, 3, 1, .18),
  gold: category('#F2BD39', '#A87512', 1.05, 85, 86, 9, 13, 11, 7, 4, .21),
  diamond: category('#55A8EA', '#27639B', 1.3, 160, 102, 15, 22, 19, 16, 7, .26),
  emerald: category('#24B77C', '#08754B', 1.6, 280, 120, 24, 35, 30, 32, 10, .35),
});
export const ZOMBIE_ORDER = Object.freeze(Object.keys(ZOMBIE_TYPES));

// Positive weights retain older categories. Each stronger category ramps up
// after its unlock, with all four participating from wave 14 onward.
export function waveWeights(wave) {
  const n = Number.isFinite(wave) ? Math.max(1, Math.floor(wave)) : 1;
  return ZOMBIE_ORDER.map((type, rank) => {
    const c = ZOMBIE_TYPES[type];
    if (n < c.unlockWave) return 0;
    const maturity = Math.min(1, (n - c.unlockWave + 1) / 4);
    return c.spawnProbability * (rank === 0 ? 1 : maturity * (1 + rank * Math.min(20, n - c.unlockWave) / 10));
  });
}
export function chooseZombieType(wave, random = Math.random) {
  const weights = waveWeights(wave);
  const total = weights.reduce((sum, w) => sum + w, 0);
  let sample = Math.max(0, Math.min(.999999999, random())) * total;
  for (let i = 0; i < weights.length; i++) {
    sample -= weights[i];
    if (sample < 0) return ZOMBIE_ORDER[i];
  }
  return 'green';
}
