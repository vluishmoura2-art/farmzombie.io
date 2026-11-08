# Phase 17 — gameplay interface refinement

## Delivered

- Eight separately composed, cached Canvas inventory silhouettes: coin pile on timber, open mine entrance, bow/string/bolt, cannon muzzle, sword, fused bomb, floating crystal and offset harvesting saw. Removed the repeated square icon foundation.
- Consistent cards with resource symbols, readable resource colors, real configured costs, red underlined deficits, pointer/focus tooltips and exact missing quantities. Unavailable cards remain inspectable; placement is blocked by validation.
- Counters now explicitly show built / maximum. **Eight towers per type is preserved**, as requested during clarification; mines remain eight and harvesters two. No economic or server limit changes.
- Selection, hover, press, focus and brief selection motion; reduced-motion support. Selecting an offscreen card via shortcuts scrolls it into view. Mobile keeps the horizontal inventory and moves the permanent control hint out of the combat panel (full guide remains in pause).
- Straight outlined pickaxe, triangular sword and attack-only clipped metallic stripe. Grip transforms, cursor direction and progression colors are unchanged; no filters, glow, extra animation loop or framework.
- Strong green/red four-cell footprint. Added client preview checks for remote players, full stash territory bounds, territory overlap and clan leader stash ownership. Existing occupancy, resource, enemy and base checks stay in use. Server still makes the final decision.
- An outstanding construction request has a gold dashed footprint and confirmation status; duplicate clicks wait for the result. Server rejection remains visible, including when state changes between preview and confirmation.

## Files changed for this phase

- `client/js/building-hud.js`
- `client/js/building-icons.js`
- `client/js/building-placement.js`
- `client/js/building-renderer.js`
- `client/js/equipment-renderer.js`
- `client/js/player-renderer.js`
- `client/js/renderer.js`
- `client/js/main.js`
- `client/style.css`
- New `client/js/building-feedback.js`, `client/js/placement-feedback.js`
- New `client/qa/phase17.html`, `client/qa/phase17.js`
- New `test/building-feedback.test.js`
- This report, `PHASE17.md`

Previously present changes for phases 15/16 are retained.

## Verification

- Full Node suite: **153/153 passed**, including real loopback WebSocket upgrades, multiplayer, clan permissions, harvesting, combat, upgrades, collision, four-cell occupancy, all independent construction limits and cached artwork. Initial sandbox run could not connect to loopback; rerunning with loopback access passed.
- Added regression coverage for exact live material deficits, invalid inventory normalization, remote-player obstruction, territory bounds/overlap, building permissions and clan stash ownership.
- Browser fixture at `/qa/phase17.html`: checked eight distinct icons, normal/selected/unavailable cards, `Missing 3 stone`, funded state, 8/8 ballistas with limit reason, removal to 7/8, green valid and red occupied four-cell previews. Reviewed desktop 1280×720 and narrow 390×844 layout.
- Complete game: entered as QA_Phase17, connected to authoritative multiplayer, inspected desktop/mobile HUD, selected Ballista using shortcut 4. No browser console errors were reported during the integration check.

## Limits of verification

The final repeated suite, after the last UI changes, reported 152 passed, zero assertion failures and one cancelled test: `production WebSocket upgrades with trustProxy=true` exceeded its 10-second timeout (13.55 seconds). The complete earlier 153/153 run passed that same test. During the repeat the host became very slow and the browser automation also timed out; the run took about 941 seconds. The final repeat is therefore not fully green. Desktop and mobile screenshots were inspected in tool output, but a final exported screenshot could not be saved after browser recovery timed out.

Network snapshots can become stale while players move; an allowed preview is never a guarantee of acceptance. The authoritative server revalidates and its rejection is shown. This phase did not add latency simulation or a new multiplayer load test. Long-term device FPS and every possible touch device were not measured; the existing bounded rendering/performance tests passed. Gameplay text remains in the existing English HUD language; menu localization is unchanged.

## Final verification update

The final repeated suite reported 152 passed, zero assertion failures and one cancelled test: production WebSocket upgrades with trustProxy=true exceeded its 10-second timeout (13.55 seconds). The earlier complete 153/153 run passed the same test. The repeat took about 941 seconds while the host and browser automation became very slow. The final repeat is not fully green. Desktop/mobile screenshots were inspected, but the final exported screenshot could not be saved after browser recovery timed out.
