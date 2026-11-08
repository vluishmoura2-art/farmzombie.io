const building = (name, limit, wood, stone, gold, description) => Object.freeze({
  name, limit, cost: Object.freeze({ wood, stone, gold }), description,
});
// Wheat economy: fields grow only outside the night, windmills grind ripe
// fields in range into gold and reset them to seedlings.
export const BUILDING_RULES = Object.freeze({
  cells: 2, baseCells: 36, harvestRange: 260, harvestInterval: 2,
  growSeconds: 30, wheatGold: 24, millInterval: 2, millRange: 320, millRangePerTier: .1,
});
export const BUILDING_TYPES = Object.freeze({
  stash: building('Gold Stash', 1, 0, 0, 0, 'Establishes your base. Permanent.'),
  field: building('Wheat Field', 8, 9, 9, 0, 'Grows wheat during the day. A windmill turns ripe wheat into gold.'),
  windmill: building('Windmill', 2, 15, 15, 0, 'Grinds ripe wheat fields in range into gold.'),
  ballista: building('Ballista Tower', 8, 12, 6, 6, 'Fast bolts pierce up to two enemies.'),
  cannon: building('Cannon Tower', 8, 9, 15, 9, 'Cannonballs deal area damage.'),
  melee: building('Melee Tower', 8, 9, 9, 3, 'Sweeps enemies at close range.'),
  bomb: building('Bomb Tower', 8, 12, 12, 9, 'Slow bombs explode over a wide area.'),
  mage: building('Mage Tower', 8, 9, 12, 12, 'Magic chains through up to three enemies.'),
  harvester: building('Resource Harvester', 2, 18, 18, 6, 'Harvests one nearby resource formation every 2 seconds.'),
});
