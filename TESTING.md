# Verification

## Phase 10.1 - character, tools, hotbar and resource art

Verified on 2026-11-01: final `node --test` passed **98 tests**, with zero failures/skips. Seven new tests cover circular player/collision preservation, grip rotations, all tool tiers, polygon geometry, exact tree particle counts, one-frame simultaneous flash/1.05 pulse and eight distinct cached icons. Browser checks covered all formation payouts/repeats/sword exclusion, live movement/harvesting/HUD input, four facing directions, nine tool materials, new slots/icons, mobile/touch landscape/laptop layouts and shop artwork. No console warnings/errors captured. See `test-results/phase10.1-report.md` for changed files, screenshots and remaining device tests.


## Phase 10 - visual polish and rendering

Verified on 2026-11-01: final `node --test` completed with **91 passing tests**, zero failures/skips. All source JavaScript syntax checks passed. Browser checks covered five responsive sizes, minimap/HUD, movement, off-target harvesting, sword exclusion, HUD input isolation, building shortcuts/placement/right-click, shop purchases and eight-mine Shift upgrades. The isolated final renderer benchmark observed approximately 44 / 60 / 60 FPS for Quality / Balanced / Performance at 1280x720 DPR 1; this is not a full AI or 4 GB hardware guarantee. See `test-results/phase10-report.md` for raw CPU timings, files changed, screenshots, known limitations and remaining native-device tests.


## Phase 9.1 / 9.2 - equipment shop and mass upgrades

Verified on 2026-11-01: final `npm.cmd test` passed **79 tests**, with zero failures or skips. All 64 previous regression tests remain passing. Browser checks verified B/HUD opening, Escape/B closing, gold/base locks, purchases through Emerald, normal building upgrades, complete group costs, insufficient group funds and SHIFT + Upgrade All on seven matching mines while preserving a pre-upgraded mine, another building type and positions/cells. No console warnings/errors captured. See `test-results/phase9-report.md` for modified files, evidence and manual-device/balance checks remaining.


## Phase 8 - base evolution and building upgrades

Verified on 2026-11-01: `npm.cmd test` passed all **64 tests** with zero failures. Browser checks covered production right-click opening, insufficient gold, modal pause and Escape; isolated funded checks covered Stash progression through Emerald, tier locks and a three-resource Mine purchase. All 72 material/building combinations were visually inspected. No console warnings/errors were captured. See `test-results/phase8-report.md` for modified files, evidence and remaining manual checks. Existing session-only state is retained; reload persistence was not added.




## Phase 7.2 — simultaneous formation harvesting



Verified on 2026-11-01 with `npm.cmd test`: **57 tests passed, 0 failed**. The Phase 7 individual-member payout tests were replaced by whole-formation assertions. Coverage includes all five generated types and exact membership, mixed pair geometry, exact 3/6 rewards for 1,000 consecutive actions per type, simultaneous member feedback, permanent nodes, isolation from nearby formations, nearest formation and camera/cursor independence, 100-unit boundary, 299/300ms cooldown, sword exclusion, shared automatic/manual accounting, immediate mixed HUD totals, and existing input/HUD exclusion and swing behavior. Movement, building, inventory, economy, zombie, tower, and day/night regression tests pass.



No new browser playtest was run for Phase 7.2. Browser evidence below is historical Phase 7 evidence.





## Phase 7 — infinite nodes and proximity harvesting



Verified on 2026-10-31. This intentionally replaces natural-resource health/depletion and cursor-hitbox targeting; prior depletion tests were rewritten to assert the new contract, while unrelated regressions were retained.



**50 Node tests passed.** Coverage includes exactly four seeded formation types; 320 total nodes; single/pair cardinalities and same-type membership; individual pair members; 12-unit internal gaps and 80-unit inter-formation clearance; spawn/world/building exclusion; atomic formation placement; 1,000 manual hits on each natural type with exact rewards and permanent collision; nearest valid member across formations; cursor/camera independence; exact 100-unit range; 299/300ms cooldown; one reward per input; sword/HUD exclusion; animation/movement independence; expiring feedback; non-negative counters; automatic/manual accounting without depletion. The building, economy, player and all zombie/tower/day-night tests also pass.



**Browser checked through CUA in a separate normal-game tab.** `scripts/harvesting-browser-check.mjs` ran the wood and stone stages: distant clicks and sword input grant nothing; nine off-target clicks give 27 wood; native movement/camera scrolling then nine off-target clicks give 27 stone; inventory and counter clicks grant nothing. Nodes remain visibly present beyond the former three-hit limit. A free stash and mine were built with the collected materials, followed by a Resource Harvester; automatic production raised wood from zero to 27 while the original tree remained. The first night and zombie spawning continued, with no console errors.



Evidence is saved in `test-results/phase7-formations.png`, `phase7-tree.png`, `phase7-stone.png`, and `phase7-harvester.png`; the browser report is `phase7-browser-results.json`. Browser cooldown timing can vary with native automation latency, so the exact 299/300ms edge is asserted in Node. Independent selection of both members of pairs is covered deterministically by Node; visual formation geometry is reviewed in browser screenshots.



Remaining manual verification: sustained frame rate/RAM and input feel on the intended 4 GB laptop, physical monitor DPI changes, and long-session economy balance with unlimited resources. The Phase 4 browser runner is historical and deliberately not used because its depletion/cursor-target assertions contradict this redesign.



## Phase 6 — progressive zombie categories and survival



Verified on 2026-10-30. The directory did not contain combat/day-night systems; the user explicitly authorized implementing them in this project. Phase 5 systems were retained.



Node suite covers all prior regressions plus category palette/proportions/scaled radii, strictly increasing stats, unlocks through wave 40 (40,000 selector samples), positive late-wave weights, exact-once death payouts, sword range/cone/cooldown, all 20 tower/category combinations, differentiated player/building/stash damage, destruction/capacity/game-over freezing, day/night timing at 30/60/144 Hz, category movement speed at those rates, navigation/radius/obstacle invalidation, collision and spawn caps. Run `npm.cmd test`.



Browser: `scripts/combat-browser-check.mjs` was executed through CUA in the dedicated `/qa/combat.html` fixture. It uses the actual production modules and deterministic action buttons; it does not inject state into a normal game. Six groups passed:



1. All four colored silhouettes visually reviewed beside the original player, with increasing scale and no new body parts.

2. Sword damages all four; repeated input during cooldown does nothing; four deaths pay exactly 58 gold and cannot pay again.

3. Each of the five tower systems damages all four stationary category targets.

4. Day transitions to night and wave 1 spawns green only.

5. Stash destruction ends and freezes simulation.

6. No console errors or broken imports.



The normal game was separately checked in a fresh QA tab: placing the stash starts the 60-second day; the first night spawned four green enemies that navigated to and defeated the idle player, displaying Game Over. Restart restored health, resources and preparation mode. Sword selection, movement, pause/resume and 390×844 responsive HUD were checked, with no horizontal overflow. Temporary viewport settings were restored. A seeded-world simulation with the player away also confirmed the first wave reaches and destroys an undefended stash.



Screenshots: `phase6-categories.png`, `phase6-sword-rewards.png`, `phase6-towers.png`, `phase6-game-over.png`, `phase6-mobile.png` under `test-results/`. Machine-readable fixture results: `phase6-browser-results.json`. The existing Phase 4 browser harness is historical and was not rerun wholesale; its sword-feedback expectation predates actual sword combat.



Remaining manual checks: sustained performance/RAM on the target 4 GB laptop, physical monitor scaling changes, and long-session balancing/playthrough of later waves. Late-wave eligibility, damage and rewards were exercised deterministically in tests; a real-time survival playthrough to wave 14 was not performed.



## Phase 5 — buildings, gold economy and base management



Verified on 2026-10-30 at http://localhost:7777. The existing user tab was preserved; native browser checks used a separate QA tab. No test inventory or debug globals were added to the game.



Logic suite: 33 tests (the 25 prior regression tests plus 8 building/economy groups). New coverage includes:



- All eight types can be placed; exactly four occupied cells each, 32-unit snapping and 64-unit dimensions.

- Free, unique, permanent stash; prerequisites; centered 36-cell base; full-footprint boundary checks.

- No payment for invalid grid coordinates, world/base overflow, player/resource/building overlap or insufficient funds. Successful placement deducts each configured cost exactly once.

- Independent limits for every type, idempotent removal, capacity recovery and four-cell release; stash removal is rejected.

- Mine-only integer production at 30/60/144 updates per second, configurable production rates and removal stopping production.

- Both automatic collectors and manual hits sharing nodes without duplicate rewards; wood/stone depletion, out-of-range rejection and exact collection interval.

- Solid square building collisions, prevention of tunneling, retreat and collision removal.



Browser checks through CUA:



- All eight Canvas icons visually reviewed, with shared brown foundations and distinct mounted objects; cached drawing version reloaded and checked without errors.

- Red preview and explicit rejection over the player, free stash placement, single-stash limit and updated capacities.

- Escape cancels construction without pausing; right-click cancels. HUD selection does not place a building or harvest resources.

- Native WASD/camera motion, tree and stone collection through three clicks each (9 wood + 9 stone), then mine placement deducting both to zero and gold increasing automatically while standing away from the mine.

- Narrow 390×844 layout: eight buttons available through horizontal scrolling, no document overflow, building panel bottom 758 and equipment top 770 (no overlap). Desktop layout also visually reviewed; temporary viewport override reset.

- No console errors or broken imports, including after reloading the final cached-rendering implementation.



Evidence: `test-results/phase5-base.png`, `phase5-mobile.png`, `phase5-final.png` and `phase5-browser-results.json`. The existing `scripts/browser-check.mjs` is still the Phase 4 regression harness; it was not rerun in full for this phase. Phase 5 browser actions above were performed through native CUA controls; limits, automated harvesters and all tower placement combinations were exercised in the Node suite, rather than grinding every building purchase in the browser.



Remaining manual verification: sustained FPS/RAM/input feel on the target 4 GB laptop; physical monitor/DPR changes; long-session balance of costs, mine rates and automatic harvesting. No combat, respawn, selling or saving was introduced. Production pauses with the existing game pause/visibility behavior.



## Phase 4 — functional wood and stone harvesting



Verified on 2026-10-28 at **http://localhost:7777**. Existing modules were reused; seed, resource positions, collision shapes/behavior, world/grid, equipment and camera were preserved.



**Logic: 25 tests passed.** `npm.cmd test`/`node --test` cover all earlier gameplay regressions and the Phase 4 cases:



- Trees and stones give exactly three units on each valid hit and disappear after three hits for nine total; clicking depleted nodes cannot pay again and their collisions are removed.

- Default range is 100 center-to-center world units for both types. Exactly 100 succeeds; 100.01 fails. Range/cooldown can be explicitly configured.

- Default cooldown is 300ms. A second hit at 299ms is blocked, and the remaining 1ms permits it. Floating-point residue is clamped away.

- Sword, empty ground, distant targets and non-left/world clicks give nothing; ticking hundreds of animation frames after one click does not apply more hits.

- The last hit always pays the per-hit amount, without the previous remainder bonus.

- Swing time expires, reaches a nonzero intermediate angle and returns to rest while normal movement and aiming remain independent.

- Inventory/HUD values remain non-negative safe integers, including invalid starting values such as NaN, undefined, infinity or negative numbers.



**Browser: all 7 acceptance groups passed** using the shared harness through CUA in a separate QA tab:



1. Fresh spawn, zero counters, default pickaxe, two equipment slots and rendered world.

2. WASD/camera motion, fixed inventory and rejection of out-of-range clicks.

3. Sword rejection, successful pickaxe hits, three wood per hit, cooldown handling, tree depletion at nine and no duplicate rewards.

4. Stone collision, three stone per hit, click-based slot switching, HUD click isolation, stone depletion at nine and no duplicate rewards.

5. Pause/resume and no movement while paused.

6. 390×844 and 1280×800 resize with correct canvas backing dimensions, fixed HUD, no horizontal overflow and retained counters.

7. No browser console errors or broken imports.



Native double-click automation can space its events by more than 300ms; the browser harness accounts for measured elapsed time, while Node checks the exact 299/300ms boundary. Captures are in `test-results/phase4-world.png`, `phase4-swing.png`, `phase4-tree-hit.png`, `phase4-stone-hit.png`, `phase4-390.png` and `phase4-1280.png`; the current machine-readable report is `test-results/browser-results.json`. Static screenshots verify appearance and hit feedback; swing timing is verified in the logic suite.



All changed JavaScript was syntax-checked. Still manual: sustained performance/memory and the feel of the short swing on the intended 4 GB laptop, plus physical changes between monitors with different scaling. The optional standalone Playwright adapter was not separately run; the shared acceptance function was run through CUA. No automatic respawn was added.



## Phase 3A history — resources and harvesting



Verified on 2026-10-28 at **http://localhost:7777** using Node.js and the in-app browser through CUA. The final automated browser checks used a separate QA tab so the user's current game was preserved. The native animation loop ran normally; no production debug globals or test-only game features were introduced.



**Logic: 20 tests passed with `npm.cmd test`.** The ten Phase 1/2 tests still pass. Added checks cover:



- Deterministic generation of all 320 objects, both types, unique IDs, boundary margins, initial spawn clearance and pairwise resource spacing.

- Spatial queries that include partially visible objects and remove depleted entries.

- Tree and stone collision footprints, tunneling prevention, sliding, retreat and recovery from an exact-center overlap without NaN.

- Both resource types yielding three units per hit, enforcing cooldown, disappearing after five hits, awarding fifteen total and rejecting duplicate collection.

- Sword, distant and empty clicks yielding no resources; the exact reach threshold; clicks just before cooldown expiry remaining blocked.

- Final depletion awarding any configured remaining reward once and opening the former collision area.

- Harvesting clicks originating only from the world canvas and only from the left mouse button.



**Browser: all 7 acceptance groups passed.** `scripts/browser-check.mjs` exports the shared `runBrowserChecks(tab, options)` harness and supports a connected CUA tab or the optional standalone Playwright adapter. The CUA path was executed for this phase:



1. Fresh spawn, zero counters, default pickaxe, exactly two inventory slots and a rendered-world screenshot.

2. WASD, camera scrolling, screen-fixed inventory and rejection of a distant resource click.

3. Sword rejection, pickaxe collection of three wood per hit, rapid-double-click cooldown, tree depletion at fifteen wood and no duplicate reward.

4. Stone collisions and collection, click-based equipment switching, HUD isolation, stone depletion at fifteen stone and no duplicate reward.

5. Escape pause/resume and no movement while paused.

6. 390×844 and 1280×800 resizing, matching backing-buffer dimensions, 18px inventory padding, fixed counters, no horizontal overflow and retained inventory.

7. No browser console errors or broken imports.



Screenshots were visually reviewed for circular tree centers with fourteen integrated perimeter spikes, flat fills/outlines, perfectly circular stones, unchanged grass/grid/player, attached equipment, health bars and compact HUD placement. Current evidence is `test-results/browser-results.json` plus `phase3-world.png`, `phase3-tree-hit.png`, `phase3-stone-hit.png`, `phase3-390.png` and `phase3-1280.png`.



Run `npm.cmd test` for logic checks. With the server running and optional Playwright/Chrome configured using the environment variables below, `node scripts/browser-check.mjs` runs the standalone adapter. The exported CUA harness was verified; that alternative standalone adapter was syntax-checked but not separately executed in this phase.



Still manual: sustained frame rate, memory use and input feel on the intended 4 GB Windows laptop; physical monitor changes with different scaling. World-boundary regression and normalized movement remain covered by Node tests; physically traversing every world edge in the browser was not repeated for this phase. No combat, crafting, buildings, enemies, day/night or multiplayer were added.



## Phase 2 history — mouse aiming and two equipment slots



The checks and captures below describe the previous runner and earlier verification. The current runner and report are described above.



Verified on 2026-10-28 using Node.js and installed Google Chrome through Playwright. The game remains on **http://localhost:7777**.



**Logic: 10 tests passed.** The five original Phase 1 checks still pass. Added checks cover all eight aiming directions, preserving the last direction at the player center, continuity across the atan2 wrap, inverse screen/world conversion with camera lag and resized viewports, exactly two equipment slots with pickaxe selected by default, keyboard selection while holding movement, ignoring shortcuts in editable controls, and canvas-relative cursor offsets.



**Browser: all nine acceptance groups passed.** The existing runner now checks the real player rotation and held-tool pixel changes, in addition to the Phase 1 regressions:



- All eight edge/corner cursor directions while stationary.

- Correct aiming at a stationary cursor while moving diagonally and while the camera follows.

- Exactly two 56×56 inventory slots at 18px left/bottom padding, with pickaxe selected on startup.

- Keys 1/2 and both slot clicks update selection and the actual tool drawn in the player's hand on the next animation frame.

- Inventory pointerdown, pointerup and click events do not bubble to world listeners; holding WASD through a slot click continues movement.

- The HUD remains fixed during camera movement. Both slots remain visible and correctly positioned at all tested viewport sizes, and aiming stays correct after resizing.

- The original grid, movement, camera, four-corner collisions, pause/focus cleanup, high-DPI backing-buffer cap and native animation loop all pass.

- No console errors, page errors, missing assets or broken imports.



Visually reviewed the desktop and narrow-viewport captures for tool/hand connection, both visible arms, wood colors, sword tip/guard, recognizable pickaxe, selected slot border and HUD placement. Current evidence is in `test-results/browser-results.json`, `01-world.png` through `04-high-dpi.png`, plus `05-pickaxe-equipped.png` and `06-sword-equipped.png`. The runner uses Canvas methods only as test observations; production modules expose no test globals.



Run `npm.cmd test` for the dependency-free logic suite. Start `npm.cmd start` and run `node scripts/browser-check.mjs` for the optional browser suite with Playwright configured as described below.



Still manual: sustained performance/input feel on the intended 4 GB laptop and physically moving the window between monitors with different scaling. No touch movement, resource interactions, damage or attacks were introduced in this phase.



## Phase 1 verification history



Verified on 2026-10-27 using Node.js 24.20.0 and installed Google Chrome through Playwright.



## Automated logic checks



`npm test` (or `npm.cmd test` in PowerShell): **5 tests passed**.



- Equal cardinal and diagonal travel distances.

- Equal movement speed at 30, 60 and 144 simulation steps per second; no idle drift.

- All four corner collisions, full player radius containment and release from walls.

- Camera damping consistency, convergence and world-to-screen/grid spacing.

- Keyboard combinations, opposing keys, key release and focus-loss cleanup.



All JavaScript files also pass `node --check`.



## Browser acceptance checks



`scripts/browser-check.mjs` runs the actual app in headless Chrome. Most checks drive its real requestAnimationFrame callback with a controlled clock and real keyboard events; a separate high-DPI page runs the native animation loop.



- Initial centered spawn; sampled exact grass `#78B84A` and skin `#E8B18A` colors; both arms visible.

- WASD moves the player; diagonal distance matches cardinal distance.

- Camera follows smoothly and settles at viewport center.

- Grid pixels stay on world-grid coordinates while the camera moves.

- Pause/Resume and Escape stop/restart gameplay.

- Losing focus pauses and clears held keys, with no movement stuck on resume.

- Resize to 800×600, 390×844 and 640×480 updates the backing buffer and keeps the player centered without horizontal page overflow.

- Movement into all four corners stops at the 35-unit collision radius; player remains centered under the camera.

- Device pixel ratio 3 uses a backing buffer capped at ratio 2; native frame loop and position HUD update correctly.

- No console errors, page errors or failed game asset requests.



Screenshots were visually reviewed for the unobstructed playfield, connected character silhouette, grid, HUD placement and boundary presentation. Results and captures are saved under `test-results/` (ignored by Git):



- `01-world.png`: desktop world and character.

- `02-narrow-viewport.png`: 390×844 layout.

- `03-world-boundary.png`: corner collision and outside-world distinction.

- `04-high-dpi.png`: high-DPI rendering.

- `browser-results.json`: machine-readable results.



To repeat browser checks, start the game server and use an installed Playwright package/browser:



```powershell

$env:PLAYWRIGHT_MODULE = 'C:/path/to/node_modules/playwright/index.mjs'

$env:CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe'

node scripts/browser-check.mjs

```



Both environment variables are optional when Playwright and its bundled Chromium are installed normally. Browser tooling is optional and is not a dependency of the game or the logic tests.



## HTTP checks



The page, stylesheet and JavaScript modules return 200 with correct content types. A missing file returns 404, malformed URL encoding returns 400, attempted traversal outside `client/` returns 403, and POST returns 405.



## Remaining manual verification



Sustained frame rate, memory usage and input feel on the intended 4 GB Windows laptop require a manual hardware playtest. Resizing was automated; physically moving a browser between monitors with different scaling settings was not tested. Touch movement is outside this keyboard-controlled phase.
