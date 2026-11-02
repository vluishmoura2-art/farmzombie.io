export const PALETTE = Object.freeze({ ground: '#5AAE33', grid: '#4E992B', outside: '#427f29',
  panel: 'rgba(20,24,20,.85)', secondary: 'rgba(30,36,29,.92)', border: '#414B3B',
  text: '#F1F3ED', muted: '#AAB3A5', gold: '#F1C40F', wood: '#8D6E63', stone: '#7F8C8D', danger: '#EF766C' });
export const PERFORMANCE_MODES = Object.freeze({
  quality: Object.freeze({ dpr: 2, particles: 64, numbers: 24, shadows: true, minimapHz: 10, motion: true }),
  balanced: Object.freeze({ dpr: 1.5, particles: 24, numbers: 16, shadows: true, minimapHz: 5, motion: true }),
  performance: Object.freeze({ dpr: 1, particles: 0, numbers: 8, shadows: false, minimapHz: 3, motion: false }),
});
export function performanceProfile(mode) { return PERFORMANCE_MODES[mode] || PERFORMANCE_MODES.balanced; }
export function effectiveDpr(dpr, profile) { return Math.max(1, Math.min(Number.isFinite(dpr) ? dpr : 1, profile.dpr)); }

export class FrameMetrics {
  constructor() { this.samples = new Float32Array(180); this.cursor = 0; this.count = 0; this.total = 0; this.frames = 0; this.elapsed = 0; this.fps = 0; }
  record(cpu, dt) {
    this.total -= this.samples[this.cursor]; this.samples[this.cursor] = cpu; this.total += this.samples[this.cursor];
    this.cursor = (this.cursor + 1) % this.samples.length; this.count = Math.min(this.count + 1, this.samples.length);
    this.tick(dt);
  }
  tick(dt) {
    if (dt > 0 && dt < .25) { this.frames++; this.elapsed += dt; }
    if (this.elapsed >= 1) { this.fps = Math.round(this.frames / this.elapsed); this.elapsed = 0; this.frames = 0; }
  }
  get renderMs() { return this.count ? this.total / this.count : 0; }
}
