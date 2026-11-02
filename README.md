# farmzombie.io · Phase 14

Run `npm.cmd start` on Windows (or `npm start`) and open http://localhost:7777. Node 20+; no game dependencies, external images or build step.

Move with WASD/arrows, aim with the mouse, select pickaxe/sword with 1/2. Approach a resource, equip the pickaxe and left-click anywhere on the world: the closest eligible formation within 100 world units is harvested in one action, with a 300ms cooldown. Distance is measured to its closest member in world coordinates. Every tree gives +3 wood and every stone gives +3 stone, including members farther than 100 units once their formation is selected. Cursor position is not used for harvesting selection; mouse-facing direction is preserved. Natural nodes never run out, disappear or lose collision.

Select a building in the bottom bar, then click the world. Every building occupies exactly 2×2 cells (64×64 units). Green footprints are valid; red footprints include a reason above the bar. Escape or right-click cancels construction; Escape otherwise pauses. Selecting equipment also exits construction. The bar scrolls horizontally on narrow screens.

Place the free, permanent Gold Stash first. It establishes a square 36×36-cell base centered on itself. All other buildings must fit completely inside that base and the world, without overlapping resources, buildings or the player. The first mine costs 9 wood and 9 stone, with no initial gold requirement. Invalid placement never charges. HUD labels use w = wood, s = stone, g = gold.

| Building | Limit | Wood | Stone | Gold |
|---|---:|---:|---:|---:|
| Gold Stash | 1 | 0 | 0 | 0 |
| Ballista Tower | 8 | 12 | 6 | 6 |
| Cannon Tower | 8 | 9 | 15 | 9 |
| Melee Tower | 8 | 9 | 9 | 3 |
| Bomb Tower | 8 | 12 | 12 | 9 |
| Mage Tower | 8 | 9 | 12 | 12 |
| Resource Harvester | 2 | 18 | 18 | 6 |
| Gold Mine | 8 | 9 | 9 | 0 |

Mines produce one gold per second each, regardless of player distance. Harvesters collect one whole formation every two seconds within 260 units of their center, using the same membership, distance rule and rewards as manual harvesting. Nodes have no health or depletion. The same node can supply unlimited manual and automatic hits. Both collectors share the same per-hit accounting; every manual click pays at most once and automatic collection retains its existing interval. All production uses simulation delta time and stops while the game is paused/hidden; no offline production. Reloading resets the session. No resource respawn, selling, moving or saving.

## Phase 10.1: character, tool, resource and inventory art

The player now uses a separate cached circular skin-colored body with a four-unit black outline and two small directional eyes. Zombie artwork stays unchanged. The player's collision radius remains **35**; the circle is artwork, not a new hitbox. Both tools share a lower-side grip offset and the existing mouse-facing / swing transforms. Pickaxes use a caramel handle (#8B5A2B), an angular T head, black outlines and a white diagonal highlight. The base head is steel gray (#95A5A6); upgraded tools keep their existing tier material colors. Swords use a wide base, triangular point and straight guard. Weapon statistics, prices and two-slot controls are unchanged.

Equipment and building slots have near-black backgrounds, thick black frames, a thin metallic inner border, square key labels and a protruding #F1C40F selected outline. All eight building icons are separate cached Canvas illustrations, leaving placed-building geometry and state intact. Existing costs, capacities, selection and hotkeys are retained.

Trees use two fixed eight-point star canopies over a small dark trunk, with flat olive/green lighting and a compact contact shadow. Rocks use a six-sided blue-gray polygon with angular upper faces. Their collision radii remain **45.5 / 29.5** and each member still gives the same reward. No bushes, ore variants or new natural-resource types were introduced.

Each successful tree-member hit requests exactly one visible white flash frame and a 160ms scale pulse from 1.0 to 1.05 and back. Every tree emits exactly three small square wood chips; double trees emit six, and mixed formations apply tree and stone feedback together. Effects never grant resources or remove nodes. Particle storage remains capped at 64 reusable slots. To satisfy the mandatory tree feedback, Performance mode keeps up to six chip slots for wood while its optional stone particles remain disabled; Quality/Balanced retain their existing 64/24 budgets. Repeated bursts recycle old particles instead of growing storage.

`client/js/art-config.js` contains visual-only geometry and colors. `/qa/phase101.html` shows the four facing directions, swing/grip poses, all nine tool materials, all eight real hotbar icons and production harvesting with a manual render clock. This makes the one-frame flash and 1.05 midpoint directly inspectable without changing the user's game session. See `test-results/phase10.1-report.md` for tests and screenshots.

## Phase 10: visual identity and rendering

The existing Canvas game now uses the official green ground/grid palette and consistent dark HUD panels. The top-left cluster carries survival and base status; resources, a circular north-up tactical minimap and player health sit at the top right. Equipment and all eight building types share a compact bottom dock. Construction shortcuts are **3-9 and 0**; equipment remains **1 / 2**, shop **B**, and pause/close **Escape**. The hotbar scrolls horizontally on narrow screens without hiding any building type.

The minimap fits the complete world inside its circle with correct aspect ratio. It caches natural resource dots, marks the player and facing direction, the Gold Stash and buildings, and active enemies within 1,400 world units of the player. It updates at a bounded 3-10 Hz, separately from simulation and camera movement.

Pause the game to choose **Quality**, **Balanced** (default), or **Performance**. These only change rendering: maximum world DPR is 2 / 1.5 / 1, particle capacity is 64 / 24 / 0, floating damage numbers are capped at 24 / 16 / 8, and minimap updates are 10 / 5 / 3 Hz. Performance also disables optional ground shadows and movement bobbing. Health, enemy indicators, attacks and all gameplay remain active. The pause menu reports frame cadence and rolling CPU render time. Device DPR below each cap is retained; physics and pointer coordinates stay in CSS/world units.

Solid directional shadows, subtle visual-only walking motion, bounded harvesting chips, brief hit outlines, damage numbers and 130ms construction settling add depth without changing any silhouettes, collision shapes, costs, rewards or combat values. Menus open/close in 110ms and respect reduced-motion settings.

Touch controls are enabled automatically for coarse pointers and can be toggled in the pause menu. Use the direction pad to move, tap the world to aim and act, or use the tool button. Hold a building for 500ms to inspect it; the resulting click is suppressed. The upgrade panel offers a touch group modifier for Upgrade All. Desktop controls remain available.

Renderer work is bounded: resource sprites, original humanoid silhouettes and rotating tower layers are cached, the world grid uses a repeated tile, offscreen objects/projectiles/effects are culled, tier statistics are immutable cached references, and formation selection uses spatial buckets and reused scratch buffers. The world canvas is not redrawn continuously while paused or behind a modal; changes and resizing invalidate it. No network fonts, WebGL or new dependencies were introduced.

`/qa/phase10.html` provides visual/effects inspection and a render-only benchmark populated with 320 resources, 51 buildings and 64 enemies. It is separate from the player's session. See `test-results/phase10-report.md` for actual measurements, screenshots, regression results and remaining hardware/device checks.

## Equipment shop and mass upgrades

Press **B** or click **Shop** in the HUD. Escape or B closes the shop. It pauses the world and isolates keyboard/pointer input from movement, combat, harvesting and construction. The two original slots remain: 1 pickaxe, 2 sword. Each starts at Wood and can be purchased one tier at a time through Emerald, capped by the Gold Stash tier. Purchases charge gold only, preserve slot selection, and update held tools, inventory labels/icons and gameplay attributes immediately for subsequent actions. The shop lists all nine tiers in each category with current/next statistics, costs, gold balance and unavailable states.

Equipment prices, attributes and tier materials are centralized in `client/js/equipment-config.js`. Stone starts at 30 gold for pickaxes and 45 gold for swords; prices double for each subsequent tier. Pickaxes add one material per formation member and 15% of baseline harvesting speed per tier; Wood retains +3 per member / 300ms, Emerald gives +11 per member / about 136ms. Swords add 40% of baseline damage and 12% of baseline attack speed per tier; Wood retains 25 damage / 450ms, Emerald gives 105 damage / about 230ms. Tool shapes, aiming, formation selection and automatic harvester accounting are preserved. Pickaxe upgrades affect manual gathering only; automatic machines retain their building-tier efficiency.

Right-click an existing non-Stash building for individual and mass upgrade options. **Upgrade** affects only that building, including when Shift is held. **Hold SHIFT and click Upgrade All** to upgrade all active, living buildings of exactly that type and current tier, one tier each. The panel shows eligible count, full wood/stone/gold cost and available balances. Clicking Upgrade All without Shift performs no purchase. Insufficient totals upgrade nothing; one atomic payment covers the entire group. Changed displayed membership is rejected and must be reviewed again. Gold Stash never supports mass upgrades, and buildings cannot exceed its unlocked tier.

For an isolated funded browser fixture, open `/qa/phase9.html`. It includes eight mines, a different building type, tier-unlock and low-resource cases, using the production shop and upgrade modules. It does not change the game session. State remains session-only as in previous phases.

## Base evolution and building upgrades

Right-click any placed building to inspect its next upgrade. The modal pauses simulation and blocks world actions. Escape or the close button returns to play. Nine tiers: Wood, Stone, Copper, Iron, Gold, Sulfur, Diamond, Ruby, Emerald. Every newly placed building starts at Wood.

The Gold Stash unlocks one base tier at a time, for gold only. Other buildings upgrade individually, one tier at a time, up to the Stash tier, and always require wood, stone and gold together. Insufficient funds, locked tiers, missing buildings and maximum tier never charge. Rapid double-clicks and stale displayed offers cannot apply the same upgrade twice. Positions, identities, footprints and placement limits remain unchanged. Upgrades preserve the percentage of remaining health.

All materials, costs and scaling live in `client/js/tier-config.js`. Stash upgrades start at 60 gold and double for each next tier. Other upgrade costs start at placement cost plus 18 wood / 18 stone / 12 gold, also doubling per tier. Each tier adds 50% of original maximum health, 40% of original tower damage, 8% attack speed, 6% explosion radius, 50% mine output and 20% harvester speed. The original Wood statistics are unchanged. These are placeholder balance values.

`BuildingUpgrades` validates purchases and applies tiers. `payResources` checks all costs before committing any payment. `UpgradeUI` displays current/next tiers, Canvas preview, benefits, cost/balance rows and unavailable states. The renderer retains the brown square foundation and existing silhouettes, adding material inlays, colored components and tier rivets. Both cached and rotating buildings use their tier.

Tiers, balances and building identities remain in the existing live session state. This project has no disk persistence: reloading starts a fresh world, as in earlier phases. There is no offline production.

For isolated funded UI and material checks, open `/qa/phase8.html`. It uses production modules in a separate test base and does not alter the running game. See `TESTING.md` for results.

## Infinite resource formations

Five formation definitions live in `world-generation.js`: A single tree (+3 wood), B single stone (+3 stone), C two trees (+6 wood), D two stones (+6 stone), E one tree and one stone (+3 wood and +3 stone). Pairs have a 12-unit gap between their collision circles and each member retains its own identity and collision. Separate formations keep at least 80 units between their outer node footprints. The seeded generator places 320 nodes total, validates all members before committing a formation, respects world/spawn clearance and avoids existing buildings. Every formation has exactly one or two members.

The nearest formation is determined by its nearest member. A single action rewards and pulses every member simultaneously, with one pickaxe swing and one cooldown. Separate formations never share an action. Formation selection runs only on manual input or the automatic collector's interval. A short outline pulse replaces resource health bars; only a simulation clock advances per frame, without scanning all nodes. Infinite nodes continue to block buildings and movement, so choose a clear construction site.

Phase 7 changed: `client/js/resources.js`, `resource-hit.js`, `harvesting.js`, `automatic-harvester.js`, `world-generation.js`, `resource-renderer.js`, `resource-hud.js`, `main.js`, `buildings.js`; `client/index.html`; `package.json`; `test/resources.test.js`, `test/buildings.test.js`, new `test/resource-formations.test.js`; new `scripts/harvesting-browser-check.mjs`; `README.md` and `TESTING.md`. Combat, towers, zombie progression, day/night, equipment geometry and building costs/limits were not redesigned.

## Survival and progression

The previous folder contained Phase 5 only; the missing combat systems were added with user authorization. Place a Gold Stash to start the cycle: **60 seconds of day, 45 seconds of night**. Each night starts a new wave. Survivors remain during daytime. Player health recovers slowly by day when no enemy is nearby. Player death OR destruction of the Gold Stash ends the session; use the restart button for a fresh world.

Equip **2** and left-click to swing the wooden sword toward the cursor: 25 damage, 105-unit reach to the enemy edge, 450ms cooldown. Pickaxe harvesting and placement remain separate. Towers automatically acquire enemies: ballista fires piercing bolts (two hits), cannon fires area-damage shells, melee sweeps nearby enemies, bomb launches slower wide-area explosives, mage chains through three targets. No combat input passes through HUD elements.

| Category | First wave | Scale | HP | Speed | Player / building / stash damage | Gold per death |
|---|---:|---:|---:|---:|---|---:|
| Green | 1 | 0.85 | 40 | 70 | 5 / 7 / 6 | 3 |
| Gold | 4 | 1.05 | 85 | 86 | 9 / 13 / 11 | 7 |
| Diamond | 7 | 1.30 | 160 | 102 | 15 / 22 / 19 | 16 |
| Emerald | 10 | 1.60 | 280 | 120 | 24 / 35 / 30 | 32 |

All zombies reuse the player's exact three Canvas shapes; only palette and proportional scale differ. Collision radius is the player's 35 units times the category scale. All damage columns strictly increase. Attacks occur at most once per second per zombie. Gold is awarded only on the alive-to-dead transition, with a brief floating `+N gold` number.

Green-only waves 1–3 introduce gold on 4–6, diamond on 7–9 and emerald on 10–13. Every unlocked type retains positive weight; stronger types ramp up and all four can appear from wave 14 onward. `spawnProbability` values in `zombie-config.js` are baseline proportions; `waveWeights()` applies unlock/maturity modifiers, and selection normalizes those weights. Early emerald spawning is impossible through the wave selector.

Zombies pursue nearby players, otherwise the stash. Radius-aware A* routes around trees, rocks and buildings; zombies attack structures obstructing their approach. Navigation maps are invalidated when obstacles change. At most two searches run per frame, with a node budget; enemies (64), projectiles (96) and feedback effects (64) are capped. Destruction releases building occupancy, capacity, collision and production. Stash destruction is allowed only through combat, not selling/removal controls.

New Phase 6 modules: `humanoid.js`, `zombie-config.js`, `combat-config.js`, `zombies.js`, `waves.js`, `navigation.js`, `tower-combat.js`, `combat.js`, `combat-renderer.js`, `combat-hud.js`. Updated `player.js`, `renderer.js`, `main.js`, `buildings.js`, `building-renderer.js`, `building-config.js`, `index.html`, `style.css`, `package.json` and documentation. Tests: `test/combat.test.js`, `scripts/combat-browser-check.mjs`, plus `client/qa/combat.html` and `combat-fixture.js` (isolated QA page, never imported by the game). Category balance lives in `zombie-config.js`; timing, combat/health values and budgets live in `combat-config.js`.

## Phase 5 architecture retained

New modules in `client/js/`:
- `building-config.js`: all eight definitions, costs, limits, base size and production settings.
- `grid-occupancy.js`: four-cell occupancy and release.
- `buildings.js`: placement validation/payment, base state, capacity lifecycle and square collisions.
- `building-placement.js`: selection, camera-independent world-grid snapping and preview state.
- `building-renderer.js`: procedural Canvas designs shared by icons/ghosts/world, cached at capped 2× resolution; independent turret angles for future combat.
- `building-hud.js`: fixed selection bar, costs, capacity, unavailable states and feedback.
- `gold-economy.js`: per-mine fractional production accumulation and integer payouts.
- `automatic-harvester.js`: periodic spatial queries and automatic collection.
- `resource-hit.js`: single-hit reward transaction shared by manual and automatic collection; no natural-node consumption.
- `inventory.js`: safe non-negative integer counters, re-exported by harvesting for compatibility.

Updated: `client/js/main.js`, `world.js`, `collision.js`, `renderer.js`, `harvesting.js`, `resource-hud.js`; `client/index.html`, `client/style.css`, `package.json`, `README.md`, `TESTING.md`. Added `test/buildings.test.js`. The existing player, input, camera, equipment, resource geometry/data and world generation modules are reused. The Node server remains on port 7777.

Render work is culled to the viewport; resources use their existing spatial hash. Production only scans the bounded building list (maximum 51 buildings) and harvesters query nearby resources on their collection interval. HUD updates at 10Hz plus immediate manual-hit/placement updates. DPR is capped at 2. No new dependencies.

## Verification

Run `npm.cmd test` for movement/aim/camera/equipment/harvesting regressions plus building, collision and economy cases. Browser checks and remaining hardware verification are recorded in `TESTING.md`. `scripts/harvesting-browser-check.mjs` contains the Phase 7 native-browser checks. Supply a fresh QA tab, preserving the player session. The old `scripts/browser-check.mjs` is historical: its depletion and cursor-targeting assertions intentionally no longer apply.

## Phases 11 and 12

Tower effectiveness lives in `client/js/damage-effectiveness.js`. Green takes full damage at all tiers; Gold requires tier 5 (otherwise 35%), Diamond tier 7 (otherwise 25%), Emerald tier 9 (otherwise 15%). All five towers apply the multiplier once per target at impact; projectiles snapshot their firing tier. Original damage scaling, attack behaviors, health, waves, rewards and zombie attacks remain unchanged.

E toggles Auto Left Click (also available as a HUD button). Q switches tools. Automation runs in the existing frame loop, shares manual harvesting/sword cooldowns and uses the current equipped tool's stats. Sword automation uses the normal cursor-facing attack cone, without auto-aim. Auto actions suspend during pause, menus and building placement, resume when those states end, and disable on death. The HUD shows the state, unavailable reason and selected tool. No timers or synthetic clicks are used.

B opens/closes Shop; Escape closes a menu, cancels construction or pauses. 1/2 select equipment; 3-9 and 0 select the eight existing building slots (0 retains access to Gold Mine). Numpad equivalents work. Shift + Upgrade now uses the same atomic group purchase as Shift + Upgrade All; group membership and current tier rules remain intact. R is reserved: all existing building footprints are square and have no directional placement behavior. Shortcuts ignore typing, composition, modifiers and repeated toggles; routing lives in Input and main.

## Phase 14: main menu and brand

The entry page now shows the official farmzombie.io identity, a lightweight illustrated Canvas world, nickname field, Play button and language selector. The background reuses resource, building and zombie drawing modules, caches its terrain and props, limits ambient animation to 24 FPS, pauses in hidden tabs and respects reduced motion. It stops when gameplay starts.

The menu supports Brazilian Portuguese, English and Spanish through `/locales/pt-BR.json`, `/locales/en.json` and `/locales/es.json`. Language follows the saved preference or browser language; Portuguese is the fallback. Only the main menu is localized in this phase; existing gameplay HUD text remains unchanged. The last admitted nickname and language are saved in localStorage.

Nicknames must contain 3–16 letters, numbers or underscores, with surrounding whitespace trimmed. Validation runs both before connecting and on the server, including subsequent rename commands. Play opens a single WebSocket, sends the nickname and any resumable session token, waits for welcome, and hands that same socket to the lazily loaded game. No gameplay input or connection starts on the menu. Full servers, failed connections and unavailable sessions keep the menu usable. An expired/in-use token is cleared so a subsequent explicit Play can create a new session.

Run `node --test` and `node scripts/menu-join-check.mjs`. The latter exercises actual local WebSocket admission, including 50 accepted clients and refusal of client 51; it is not a load-capacity benchmark. `/qa/menu-layout.html?size=mobile` provides deterministic iframe viewports for responsive QA, with `small`, `tablet`, `desktop` and `ultrawide` alternatives. See `test-results/phase14-report.md` for measured checks and screenshots.
