import { circleOverlapsSquare } from './buildings.js';
import { COMBAT_RULES } from './combat-config.js';

// Shared A* scratch space; each category gets a cached, radius-aware obstacle
// map. Rebuilt only when world obstacles change. At most two searches per frame.
export class Navigation {
  constructor(world, rules = COMBAT_RULES) {
    this.world = world; this.rules = rules; this.cell = world.gridSize;
    this.columns = Math.ceil(world.width / this.cell); this.rows = Math.ceil(world.height / this.cell);
    const n = this.columns * this.rows;
    this.cost = new Float64Array(n); this.parent = new Int32Array(n); this.seen = new Uint32Array(n); this.closed = new Uint32Array(n);
    this.stamp = 0; this.heap = []; this.maps = new Map(); this.revision = ''; this.candidates = [];
  }
  canStand(x, y, radius) {
    const w = this.world;
    if (x < radius || y < radius || x > w.width - radius || y > w.height - radius) return false;
    w.resources.queryBounds(x - radius, y - radius, x + radius, y + radius, this.candidates);
    for (const r of this.candidates) if (Math.hypot(r.x - x, r.y - y) < radius + r.radius) return false;
    const circle = { x, y, radius };
    for (const b of w.buildings?.items || []) if (circleOverlapsSquare(circle, b.x, b.y, w.buildings.size)) return false;
    return true;
  }
  lineClear(x, y, tx, ty, radius) {
    const steps = Math.max(1, Math.ceil(Math.hypot(tx - x, ty - y) / (this.cell / 2)));
    for (let i = 1; i <= steps; i++) if (!this.canStand(x + (tx - x) * i / steps, y + (ty - y) * i / steps, radius)) return false;
    return true;
  }
  obstacleMap(radius) {
    const revision = `${this.world.resources.items.length}:${this.world.buildings?.revision || 0}`;
    if (revision !== this.revision) { this.maps.clear(); this.revision = revision; }
    if (this.maps.has(radius)) return this.maps.get(radius);
    const map = new Uint8Array(this.columns * this.rows);
    const mark = (left, top, right, bottom, test) => {
      const minX = Math.max(0, Math.floor(left / this.cell)), maxX = Math.min(this.columns - 1, Math.floor(right / this.cell));
      const minY = Math.max(0, Math.floor(top / this.cell)), maxY = Math.min(this.rows - 1, Math.floor(bottom / this.cell));
      for (let row = minY; row <= maxY; row++) for (let col = minX; col <= maxX; col++) {
        if (test((col + .5) * this.cell, (row + .5) * this.cell)) map[row * this.columns + col] = 1;
      }
    };
    for (let y = 0; y < this.rows; y++) for (let x = 0; x < this.columns; x++) {
      const cx = (x + .5) * this.cell, cy = (y + .5) * this.cell;
      if (cx < radius || cy < radius || cx > this.world.width - radius || cy > this.world.height - radius) map[y * this.columns + x] = 1;
    }
    for (const r of this.world.resources.items) {
      const reach = r.radius + radius;
      mark(r.x - reach, r.y - reach, r.x + reach, r.y + reach, (x, y) => (x - r.x) ** 2 + (y - r.y) ** 2 < reach ** 2);
    }
    const size = this.world.buildings?.size || 0;
    for (const b of this.world.buildings?.items || []) mark(b.x - radius, b.y - radius, b.x + size + radius, b.y + size + radius, (x, y) => circleOverlapsSquare({ x, y, radius }, b.x, b.y, size));
    if (this.maps.size >= 8) this.maps.delete(this.maps.keys().next().value);
    this.maps.set(radius, map); return map;
  }
  push(id, score) {
    const item = { id, score }; let i = this.heap.length; this.heap.push(item);
    while (i > 0) { const p = (i - 1) >> 1; if (this.heap[p].score <= score) break; this.heap[i] = this.heap[p]; i = p; }
    this.heap[i] = item;
  }
  pop() {
    const result = this.heap[0], last = this.heap.pop();
    if (this.heap.length) {
      let i = 0;
      while (i * 2 + 1 < this.heap.length) {
        let child = i * 2 + 1;
        if (child + 1 < this.heap.length && this.heap[child + 1].score < this.heap[child].score) child++;
        if (last.score <= this.heap[child].score) break;
        this.heap[i] = this.heap[child]; i = child;
      }
      this.heap[i] = last;
    }
    return result.id;
  }
  find(entity, targetX, targetY, stopRadius) {
    const map = this.obstacleMap(entity.radius), c = this.columns, cell = this.cell;
    const start = Math.floor(entity.y / cell) * c + Math.floor(entity.x / cell);
    const heuristic = id => Math.hypot((id % c + .5) * cell - targetX, (Math.floor(id / c) + .5) * cell - targetY);
    const stamp = ++this.stamp; this.heap.length = 0;
    this.seen[start] = stamp; this.cost[start] = 0; this.parent[start] = -1; this.push(start, heuristic(start));
    let best = start, bestDistance = heuristic(start), visited = 0;
    while (this.heap.length && visited++ < this.rules.pathNodeBudget) {
      const id = this.pop();
      if (this.closed[id] === stamp) continue;
      this.closed[id] = stamp;
      const distance = heuristic(id);
      if (distance < bestDistance) { best = id; bestDistance = distance; }
      if (distance <= stopRadius) { best = id; break; }
      const x = id % c, y = Math.floor(id / c);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if ((!dx && !dy) || x + dx < 0 || y + dy < 0 || x + dx >= c || y + dy >= this.rows) continue;
        const next = id + dy * c + dx;
        if (map[next] || this.closed[next] === stamp || (dx && dy && (map[id + dx] || map[id + dy * c]))) continue;
        const cost = this.cost[id] + cell * (dx && dy ? Math.SQRT2 : 1);
        if (this.seen[next] === stamp && cost >= this.cost[next]) continue;
        this.seen[next] = stamp; this.cost[next] = cost; this.parent[next] = id;
        this.push(next, cost + heuristic(next));
      }
    }
    const path = [];
    for (let id = best; id !== start && id >= 0; id = this.parent[id]) path.push({ x: (id % c + .5) * cell, y: (Math.floor(id / c) + .5) * cell });
    path.reverse(); return path;
  }
}
