# Phase 13 multiplayer

Run `npm.cmd install`, then `npm.cmd start`, and open http://localhost:7777 in separate browser tabs. Each tab receives a server-issued bearer session stored in sessionStorage. Open Clan to change your name, create a clan, invite players, accept/reject invitations, leave, kick members or manage building permissions. The server enforces 50 connected players, 10 clans and 4 members per clan. Session state is held in memory; it is lost when the process restarts.

The client uses native WebSocket; the server uses ws with compression disabled. Movement is an input direction rather than a client position. Resource rewards, sword damage, cooldowns, upgrades, payments, base limits and permissions use the existing game modules on the server. Remote players interpolate between snapshots. Building changes use deltas; nearby zombies and projectiles are filtered per player. Menus stop local commands; they do not freeze or protect a player from the shared simulation.

Clan members use the leader's base and its tier unlocks. An authorized builder pays placement and upgrade costs from their own inventory. Automatic mines and harvesters credit the base owner. Only the leader can establish or upgrade the clan Stash. A temporary disconnect preserves the session and clan for 60 simulation seconds; expiration or leaving transfers leadership and the original base to a remaining member, or disbands an empty clan. Existing personal bases remain distinct; territories cannot overlap. The original finite 6144-square map limits how many disjoint base territories fit, independently of the connection limit.

Invaders and attackers become hostile to relevant bases. Hostility persists for 15 simulation seconds after leaving a territory. All five tower behaviors remain active and apply normal tower damage to hostile players; zombie tier effectiveness remains unchanged. Friendly status is checked again at impact. Same-clan players cannot hit one another with swords.

Security controls include explicit Origin allowlisting, random session tokens, monotonic command sequence IDs, strict command fields, finite-number validation, server-side ownership checks, 4 KiB message limits, token-bucket rate limiting, ping/pong heartbeat and bounded outbound buffering. Tokens identify sessions; this is not an account/login system or durable persistence.

For production, terminate HTTPS/WSS at a trusted reverse proxy, set NODE_ENV=production, PUBLIC_ORIGIN=https://your-domain and TRUST_PROXY=1, and forward /ws with WebSocket upgrade headers and X-Forwarded-Proto=https. Keep Node bound to loopback behind that proxy. Without an HTTPS PUBLIC_ORIGIN production startup fails. Certificates, a public domain, external deployment and production capacity validation are not configured by this local change.

Validation commands:

```
npm.cmd test
node scripts/multiplayer-check.mjs
```

The second command opens real local WebSockets and checks movement, PvP, clans, reconnecting, origin rejection, 50 simulated clients and rejection of client 51. Read test-results/phase13-load.json for actual measured delivery rates and timings. A successful local connection test is not proof of 50-player production performance or worst-case combat load.

Phase 14 adds a mandatory entry menu: click Play with a valid 3–16-character nickname (letters, numbers, underscores). The server validates it during hello and rename. The same admitted socket is reused by gameplay.
