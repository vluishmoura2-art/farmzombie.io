export class BuildingPlacement {
  constructor(buildings) {
    this.buildings = buildings;
    this.selected = null;
    this.x = 0;
    this.y = 0;
    this.visible = false;
    this.reason = '';
    this.pending = null;
  }
  select(type) { this.selected = type; this.visible = false; }
  cancel() { this.selected = null; this.visible = false; }
  update(x, y, player, visible = true) {
    this.visible = Boolean(this.selected) && visible;
    const grid = this.buildings.world.gridSize;
    this.x = Math.floor(x / grid) * grid;
    this.y = Math.floor(y / grid) * grid;
    this.reason = this.selected ? this.buildings.validate(this.selected, this.x, this.y, player) : '';
  }
  place(x, y, player) {
    this.update(x, y, player);
    const result = this.buildings.place(this.selected, this.x, this.y, player);
    if (result.ok && this.buildings.remaining(this.selected) === 0) this.cancel();
    return result;
  }
}
