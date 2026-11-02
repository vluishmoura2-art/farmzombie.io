// Small movement substeps prevent tunneling. Separation along a circle's
// normal keeps movement tangent to it, allowing the player to slide away.
export function moveWithCollisions(entity, dx, dy, world, candidates) {
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / (entity.radius * .5)));
  const stepX = dx / steps;
  const stepY = dy / steps;
  for (let step = 0; step < steps; step++) {
    const previousX = entity.x;
    const previousY = entity.y;
    entity.x += stepX;
    entity.y += stepY;
    world.constrain(entity);
    // Generated resources leave corridors wider than the player's diameter.
    // A few passes also make custom close obstacle arrangements stable.
    for (let pass = 0; pass < 4; pass++) {
      world.resources.queryBounds(entity.x - entity.radius, entity.y - entity.radius, entity.x + entity.radius, entity.y + entity.radius, candidates);
      let separated = false;
      for (const resource of candidates) {
        let nx = entity.x - resource.x;
        let ny = entity.y - resource.y;
        const minimum = entity.radius + resource.radius;
        let distance = Math.hypot(nx, ny);
        if (distance >= minimum) continue;
        if (distance < .000001) {
          nx = previousX - resource.x;
          ny = previousY - resource.y;
          distance = Math.hypot(nx, ny);
          if (distance < .000001) { nx = 1; ny = 0; distance = 1; }
        }
        entity.x = resource.x + nx / distance * (minimum + .001);
        entity.y = resource.y + ny / distance * (minimum + .001);
        separated = true;
      }
      if (world.buildings?.resolveCollision(entity)) separated = true;
      world.constrain(entity);
      if (!separated) break;
    }
    // Tight player-built corridors can be narrower than the player's diameter.
    // Reject an unresolved step rather than pushing through another obstacle.
    if (world.buildings?.items.length) {
      let blocked = false;
      world.resources.queryBounds(entity.x - entity.radius, entity.y - entity.radius, entity.x + entity.radius, entity.y + entity.radius, candidates);
      for (const r of candidates) if (Math.hypot(entity.x - r.x, entity.y - r.y) < entity.radius + r.radius - .0001) blocked = true;
      for (const b of world.buildings.items) {
        const nx = Math.max(b.x, Math.min(b.x + world.buildings.size, entity.x));
        const ny = Math.max(b.y, Math.min(b.y + world.buildings.size, entity.y));
        if (Math.hypot(entity.x - nx, entity.y - ny) < entity.radius - .0001) blocked = true;
      }
      if (blocked) { entity.x = previousX; entity.y = previousY; }
    }
  }
}
