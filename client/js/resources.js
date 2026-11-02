export const RESOURCE_TYPES = Object.freeze({
  tree: Object.freeze({ material: 'wood', name: 'Tree', radius: 45.5, drawingRadius: 40, spikes: 14, spikeLength: 4, fill: '#399b43', outline: '#216a2d', rewardPerHit: 3 }),
  stone: Object.freeze({ material: 'stone', name: 'Stone', radius: 29.5, drawingRadius: 28, fill: '#969696', outline: '#555555', rewardPerHit: 3 }),
});

export function createResource(id, type, x, y) {
  const definition = RESOURCE_TYPES[type];
  if (!definition) throw new Error(`Unknown resource type: ${type}`);
  return { id, type, x, y, radius: definition.radius, rewardPerHit: definition.rewardPerHit, hitUntil: 0, material: definition.material, active: true };
}

// Each object belongs to exactly one spatial bucket. Queries reuse caller
// buffers and expand by the largest radius, so edge-visible objects survive.
export class ResourceField {
  constructor(width, cellSize = 256) {
    this.cellSize = cellSize;
    this.columns = Math.ceil(width / cellSize) + 2;
    this.buckets = new Map();
    this.items = [];
    this.formations = [];
    this.time = 0;
    this.formationIndex = new Map(); this.formationOrder = new Map();
    this.indexItems = -1; this.indexFormations = -1; this.revision = 0; this.indexRevision = -1;
    this.harvestCandidates = []; this.harvestSeen = new Set();
    this.maxRadius = 0;
  }

  update(dt) { if (Number.isFinite(dt) && dt > 0) this.time += dt; }

  key(x, y) { return Math.floor(x / this.cellSize) + Math.floor(y / this.cellSize) * this.columns; }

  add(resource) {
    const key = this.key(resource.x, resource.y);
    let bucket = this.buckets.get(key);
    if (!bucket) { bucket = []; this.buckets.set(key, bucket); }
    bucket.push(resource);
    this.items.push(resource); this.revision++;
    this.maxRadius = Math.max(this.maxRadius, resource.radius);
  }

  prepareFormationIndex() {
    if (this.indexRevision === this.revision && this.indexFormations === this.formations.length) return;
    this.formationIndex.clear(); this.formationOrder.clear();
    let order = 0;
    for (const formation of this.formations) {
      this.formationOrder.set(formation, order++);
      for (const member of formation.members) this.formationIndex.set(member, formation);
    }
    for (const node of this.items) if (!node.formationId && !this.formationIndex.has(node)) {
      const formation = { id: node.id, type: node.type, members: [node] };
      this.formationIndex.set(node, formation); this.formationOrder.set(formation, order++);
    }
    this.indexRevision = this.revision; this.indexItems = this.items.length; this.indexFormations = this.formations.length;
  }

  remove(resource) {
    if (!resource.active) return;
    resource.active = false; this.revision++;
    const key = this.key(resource.x, resource.y);
    const bucket = this.buckets.get(key);
    const bucketIndex = bucket?.indexOf(resource) ?? -1;
    if (bucketIndex >= 0) bucket.splice(bucketIndex, 1);
    if (bucket?.length === 0) this.buckets.delete(key);
    const itemIndex = this.items.indexOf(resource);
    if (itemIndex >= 0) this.items.splice(itemIndex, 1);
  }

  queryBounds(left, top, right, bottom, output) {
    output.length = 0;
    const minX = Math.max(0, Math.floor((left - this.maxRadius) / this.cellSize));
    const maxX = Math.min(this.columns - 2, Math.floor((right + this.maxRadius) / this.cellSize));
    const minY = Math.max(0, Math.floor((top - this.maxRadius) / this.cellSize));
    const maxY = Math.floor((bottom + this.maxRadius) / this.cellSize);
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      const bucket = this.buckets.get(x + y * this.columns);
      if (!bucket) continue;
      for (const resource of bucket) {
        if (resource.active && resource.x + resource.radius >= left && resource.x - resource.radius <= right && resource.y + resource.radius >= top && resource.y - resource.radius <= bottom) output.push(resource);
      }
    }
    return output;
  }
}
