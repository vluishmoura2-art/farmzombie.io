export class GridOccupancy {
  constructor() { this.cells = new Map(); }
  key(x, y) { return `${x},${y}`; }
  isFree(x, y, size) {
    for (let j = y; j < y + size; j++) for (let i = x; i < x + size; i++) if (this.cells.has(this.key(i, j))) return false;
    return true;
  }
  add(building, size) {
    for (let y = building.cellY; y < building.cellY + size; y++) for (let x = building.cellX; x < building.cellX + size; x++) this.cells.set(this.key(x, y), building);
  }
  remove(building, size) {
    for (let y = building.cellY; y < building.cellY + size; y++) for (let x = building.cellX; x < building.cellX + size; x++) {
      const key = this.key(x, y);
      if (this.cells.get(key) === building) this.cells.delete(key);
    }
  }
}
