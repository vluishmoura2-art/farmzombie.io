# Phase 15 implementation and verification

The old four-category mixed waves have been replaced by Normal (internal key `green`), Diamond and Yellow. Category boundaries, size distributions, duration, rate, multipliers and safety limits are centralized in `client/js/horde-config.js`. The main menu and Phase 14.1 changelog are preserved.

## Progression

| Hordes | Category / sizes | Spawn window | Rate | Target |
| --- | --- | --- | --- | --- |
| 1–5 | Normal / normal | 10s | 1/s | 10 |
| 6–9 | Normal / gradually scaled normal | 10s | 2/s | 20 |
| 10–15 | Normal / 25% small, 50% normal, 25% large | 10s | 5/s | 50 |
| 16–20 | Normal / large | 20s | 10/s | 200 |
| 21–25 | Diamond / normal | 30s | 5/s | 150 |
| 26–30 | Diamond / large | 40s | 5/s | 200 |
| 31–35 | Yellow / progressively scaled normal | 40s | 5/s | 200 |
| 36+ | Yellow / progressively scaled large | 40s | 5/s | 200 |

The 60-second preparation interval remains. At population or placement limits, remaining spawns retry after the nominal window, rather than losing quota. Each simulation update admits at most four spawns. No client-side horde simulation runs in multiplayer; the server publishes the base owner's cycle and visible zombie states. Different independent bases retain their own cycles; clan members follow their shared base owner's cycle.

Sizes change actual collision radius, rendered scale, health, attack damage, movement speed and gold reward. Kills pay gold once. Diamond takes 25% damage below Diamond tier; Yellow takes 15% below Emerald tier. These multipliers are applied once by the existing tower impact system. All five tower behaviors remain intact.

Endless growth uses logarithmic multipliers, bounded attributes/rewards and a capped physical radius. Navigation caches retain at most eight radius maps. Crowd separation uses spatial cells and a configurable movement budget. Existing view culling, snapshot interest filtering and in-place dead entity cleanup remain.

## Actual verification

- Full regression suite: **151 passed, 0 failed**, including local WebSocket tests (124.7s wall time in this environment).
- After the final crowd work budget change: **18 passed, 0 failed**, covering hordes and combat.
- Exact quotas tested at 20, 60 and 144 updates/s, including category cutovers, delayed spawns, all size collision radii, single rewards, extreme finite endless stats and matching authoritative snapshots.
- Dense load test: 512 live enemies, two active bases, 20 server ticks plus a JSON snapshot. Before the final budget: **1,490.0ms**, 91,503 JSON characters. Final run: **2,579.7ms**, 94,852 JSON characters. The environment also slowed unrelated tests substantially; these runs do **not** demonstrate a performance improvement or sustained 20Hz at maximum density.
- Browser QA was attempted twice; the browser tool timed out before opening the fixture. Phase 15 visual verification is **unresolved**. The updated `/qa/combat.html` fixture remains available for review.
- `git diff --check` passed (line-ending notices only).

## Balance and validation still required

The unspecified early rates, rate for hordes 26–30, Yellow duration/rate, size weights, growth curves and reward multipliers are initial configurable choices. Stone/Diamond/Emerald effectiveness is implemented, but full player campaigns and economic pacing have not been playtested. Maximum-density server performance needs profiling on a stable target host; the measured stress runs exceed the 50ms budget of a 20Hz server. Mobile Canvas rendering and visual HUD review remain unverified because of the browser tool timeout.

## Files changed for Phase 15

- `client/js/horde-config.js` (new)
- `client/js/zombie-crowd.js` (new)
- `client/js/waves.js`
- `client/js/zombie-config.js`
- `client/js/zombies.js`
- `client/js/combat.js`
- `client/js/combat-config.js`
- `client/js/combat-hud.js`
- `client/js/combat-renderer.js`
- `client/js/damage-effectiveness.js`
- `client/js/navigation.js`
- `server/game-room.js`
- `client/qa/combat-fixture.js`
- `client/qa/combat.html`
- `client/qa/phase10.js`
- `scripts/combat-browser-check.mjs` (updated expectations; browser run still blocked)
- `test/hordes.test.js` (new)
- `test/combat.test.js`
- `test/phase11-12.test.js`
- `test/multiplayer.test.js`
- `PHASE15.md` (new)

Earlier uncommitted Phase 14.1 files were retained.
