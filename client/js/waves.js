import { COMBAT_RULES } from './combat-config.js';
export class WaveCycle {
  constructor(rules = COMBAT_RULES) {
    this.rules = rules; this.phase = 'preparation'; this.wave = 0; this.remaining = rules.daySeconds; this.pending = 0; this.spawnTimer = 0;
  }
  update(dt, hasStash, spawn) {
    if (!hasStash || !Number.isFinite(dt) || dt <= 0) return;
    if (this.phase === 'preparation') this.phase = 'day';
    // Consume boundaries explicitly so timestep subdivision does not skip waves.
    let remainingDt = dt;
    while (remainingDt > 1e-9) {
      const step = Math.min(remainingDt, this.remaining);
      this.remaining -= step; remainingDt -= step;
      if (this.phase === 'night') {
        this.spawnTimer -= step;
        while (this.pending > 0 && this.spawnTimer <= 1e-9) {
          if (!spawn(this.wave)) { this.spawnTimer = this.rules.spawnInterval; break; }
          this.pending--; this.spawnTimer += this.rules.spawnInterval;
        }
      }
      if (this.remaining <= 1e-9) {
        if (this.phase === 'day') {
          this.phase = 'night'; this.wave++;
          this.pending = Math.min(this.rules.maxWaveSize, this.rules.initialWaveSize + (this.wave - 1) * this.rules.waveGrowth);
          this.spawnTimer = 0; this.remaining = this.rules.nightSeconds;
        } else {
          this.phase = 'day'; this.pending = 0; this.remaining = this.rules.daySeconds;
        }
      }
    }
  }
}
