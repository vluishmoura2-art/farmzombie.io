import { circleOverlapsSquare } from './buildings.js';

// Additional room restrictions mirrored from GameRoom.command('place').
// Final placement is always confirmed by the authoritative server.
export function roomPlacementReason(type, x, y, buildings, state, playerId) {
  if (!state) return '';
  if (!state.self.canBuild) return 'Leader building permission required';
  const size = buildings.size;
  if (type === 'stash') {
    const me = state.players.find(p => p.id === playerId);
    const clan = state.clans?.find(c => c.id === me?.clanId);
    if (clan && clan.leader !== playerId) return 'Only the leader can establish the clan base';
    const half = buildings.rules.baseCells * buildings.world.gridSize / 2;
    const cx = x + size / 2, cy = y + size / 2;
    if (cx-half < 0 || cy-half < 0 || cx+half > buildings.world.width || cy+half > buildings.world.height) return 'Territory must fit inside world';
    for (const base of state.bases) {
      const r = base.territory;
      if (base.id !== state.self.baseId && cx-half < r.right && cx+half > r.left && cy-half < r.bottom && cy+half > r.top) return 'Base territories cannot overlap';
    }
  }
  for (const p of state.players) if (p.id !== playerId && p.active && circleOverlapsSquare(p, x, y, size)) return 'Player occupies footprint';
  return '';
}
