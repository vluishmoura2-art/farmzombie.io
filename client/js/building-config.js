const building = (name, limit, wood, stone, gold, description) => Object.freeze({
  name, limit, cost: Object.freeze({ wood, stone, gold }), description,
});
export const BUILDING_RULES = Object.freeze({ cells: 2, baseCells: 36, goldPerSecond: 1, harvestRange: 260, harvestInterval: 2 });
export const BUILDING_TYPES = Object.freeze({
  stash: building('Gold Stash', 1, 0, 0, 0, 'Establishes your base. Permanent.'),
  ballista: building('Ballista Tower', 8, 12, 6, 6, 'Fast bolts pierce up to two enemies.'),
  cannon: building('Cannon Tower', 8, 9, 15, 9, 'Cannonballs deal area damage.'),
  melee: building('Melee Tower', 8, 9, 9, 3, 'Sweeps enemies at close range.'),
  bomb: building('Bomb Tower', 8, 12, 12, 9, 'Slow bombs explode over a wide area.'),
  mage: building('Mage Tower', 8, 9, 12, 12, 'Magic chains through up to three enemies.'),
  harvester: building('Resource Harvester', 2, 18, 18, 6, 'Harvests one nearby resource formation every 2 seconds.'),
  mine: building('Gold Mine', 8, 9, 9, 0, 'Produces 1 gold per second. No gold needed to start.'),
});
