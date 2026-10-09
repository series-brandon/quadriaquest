# QuadriaQuest on RUN: what is and isn't doable

Assessment of the RUN.game ("Venus") platform for QuadriaQuest's MMO goal. It comes from a read-only review of the platform source (`~/src/rundot-workspace/venus`, branch `develop`) on 2026-10-09. Platform behaviour changes; re-check the source before relying on a specific limit. Paths below are relative to the venus repo.

## Summary

- **The single-player game ships fine today.** The bundle, WebGL, workers, WASM and audio all fit. We need to move our three `localStorage` uses to platform storage first.
- **Small shared spaces with server-authoritative logic are possible.** Persistent `GameRoom`s run our own JavaScript on RUN's room server, and our shared gameplay systems are plain JS.
- **A true MMO is not possible on the platform as it runs today.** All games share one room-server instance, with no routing between instances. Its connection ceiling is 80 by default; production may be configured higher, so check Cloud Run or the GitHub environment variables. There's no interest management, a 1 MiB cap on each room's saved state, and 16 KiB updates. We can't bring our own servers because the game's network access is limited to platform hosts.
- **Operating live rooms is the other big gap.** Another RUN game, ASCII World, found this in production: a room that is never empty never picks up new server code, creators can't restart rooms, and room logs don't exist. Any always-occupied area (a town) is affected. See *Lessons from ASCII World*.
- **We work at the company, so the hard limits are platform work items rather than dead ends.** The section *Platform asks* lists them.

## What the platform gives a game

| Area | What exists | Key limits | Source |
|---|---|---|---|
| **Hosting** | Each game is a static bundle (`rundot deploy` zips `dist/`), served from `<appId>.h5-apps.getreel.com/<version>/`. Brotli, code splitting, `blob:` and workers are supported. WASM is allowed in the client. | Size limits in the docs disagree (32/100 MB); the code enforces 500 MB. Preflight warns on JS chunks over 500 KB. A `thumbnail.jpg` is required. | `cli/venus_cli`, `servers/h5-origin-shim`, `deploying-your-game.md` |
| **Runtime** | An iframe on web, Telegram, Fire TV and Steam/Electron; `react-native-webview` in the iOS/Android apps. The SDK talks to the host over JSON-RPC `postMessage`. | `maxDpr` defaults to 1.5. WebGPU is not in the iframe `allow` list. Fullscreen and pointer lock only go through the SDK, and aren't available on mobile. Host UI overlays the viewport. | `client/.../H5AppViewer`, `packages/sdk` |
| **Security policy (CSP)** | The game's network access is limited to its own origin, the platform CDN and API, Cloudinary, GCS and `wss://ws.run.game`. | **No custom backend, no external APIs, no custom login.** The game has an opaque origin, so **localStorage, IndexedDB, Cache API, cookies and Service Worker are unavailable.** Enforcement is controlled by the Statsig gate `H5_LOCKDOWN_ENABLED` (report-only when off). | `servers/h5-origin-shim/src/h5CspConfig.ts`, `docs/h5-lockdown-rollout.md` |
| **Identity** | `getProfile()` returns a stable `id`, `username`, `avatarUrl` and `isAnonymous`. Players can sign in mid-session. | Platform auth only. **No friends list, presence or social graph.** | `api/PROFILE.md` |
| **Player data** | `appStorage` (per player, per game, cloud), `deviceCache`, `ownerStorage`, `sharedStorage` and `files`. `compareAndSwap` is available. | String values; 128 keys and 10 MiB per bucket; about 977 KiB per value. Rate limited. **Players can write it, so it isn't trustworthy for progression.** | `api/STORAGE.md` (full version: `git show 8073927cbc:packages/sdk-docs/rundot-developer-platform/api/STORAGE.md`) |
| **Server-authoritative state** | `GameRoom` (our JS, sandboxed). The **Simulation API**, JSON-defined per-player entities, recipes, timers and loot (server-side, Firestore transactions). `entitlements` can be granted by the server and consumed by the client. `services.economy` shared pools are exactly-once. | Simulation is beta and not available in local Playground. | `api/SERVER_AUTHORITATIVE.md`, `api/ENTITLEMENTS.md` |
| **Realtime rooms** | `GameRoom` hooks: `onCreate`, `onPlayerJoin`, `onGameMessage`, `onTick`, `save`. Persistent rooms (keyed, survive deploys), `broadcastDelta`, moving players between rooms, room chat, seasons. | One worker thread per room with a **64 MB heap**. **No WASM, `fetch`, `eval` or `require`.** 5 s message timeout. **1 MiB persisted state** (hard fail). **16 KiB delta broadcasts** (larger forces a full resync). **30 msg/s per client.** Persistent rooms **freeze when empty and don't replay missed ticks**, and **keep their server code until empty** (no creator restart). The sandbox sets `globalThis`, `Function`, `eval`, `process` and `require` to `undefined` and has **no `performance`**; the local room server doesn't enforce this. The 16 KiB cap also applies to **every `sendTo`** (overflow behaviour undefined). Firestore **silently rejects snapshots with nested arrays or `undefined`**. **No room logs.** 5 MB server bundle. Beta. | `server/mp-room-server`, `api/ADVANCED-MULTIPLAYER.md`, full `MULTIPLAYER.md` at `git show fb88fa3987^:` |
| **Room-server scale** | **Confirmed:** one multi-tenant service hosts every game's rooms (room ids embed the game id), pinned to **one instance** because room state can't yet move between instances. That's a code limitation, not config. | Connection ceiling: concurrency **80 by default** (`MP_ROOM_SERVER_CONCURRENCY`; the production value lives in GitHub environment variables and may be higher, up to Cloud Run's 1000), shared by all games. One crash or rollback drops every room. us-central1 only. Room ownership leases with **no cross-instance routing**. The delta fan-out broker exists but isn't wired. **No interest management.** WebSockets are recycled about every 55 minutes. | `.github/workflows/ops-publish-mp-room-server.yml` (lines 81–100), `RoomManager.ts`, `DeltaFanout.ts` |
| **Syncplay** | Deterministic lockstep with rollback; the server only orders inputs. Includes combat, inventory and navmesh modules. | Every client simulates the whole state. Built for 2–16 player matches (hard cap 128). **Not suited to an MMO world.** Release candidate. | `packages/syncplay` |
| **Monetization** | `shop` (RUN Bits or real-money price tiers), `iap`, `entitlements`, subscriptions. | Ads are disabled on web. No receipts are returned to the game. **Rooms can't read entitlements or tell whether a player is a guest**, so a room has to trust the client about purchases. | `api/SHOP.md`, `api/PURCHASES.md` |
| **Lifecycle** | `onPause`/`onResume` (and sleep/awake events, which the host never sends today), plus safe-area and device events. | Leaving or opening another game destroys the iframe (no keep-alive). Save on **pause**. Load watchdogs at 15 s, 75 s and 300 s. Analytics sessions end after 30 minutes in the background. | `api/LIFECYCLES.md`, `useReadinessWatchdog.ts` |

Documentation gaps found during the review: `api/MULTIPLAYER.md` and `api/STORAGE.md` were accidentally truncated by commit `fb88fa3987` (the full versions are in history), and size limits and sleep events differ between the docs and the code.

## What this means for QuadriaQuest

### Doable now

- **Ship the current game.** Changes needed:
  - **Replace `localStorage`.** It's used in `journal.js` (expanded journal), `audio.js` (sound settings) and `render-quality.js` (graphics tier). Use `deviceCache` for per-device settings and `appStorage` for anything that should follow the player.
  - Adopt the SDK (profile, `onPause` save, preloader progress inside the watchdogs), `viewport-fit=cover`, a relative Vite `base`, and a `thumbnail.jpg`.
  - Optionally use the shared three.js build (exact **0.170.0 or 0.183.2** only; we use **0.180.0**), which would shrink our bundle a lot.
- **Save game.** Per-player progress fits easily in `appStorage`: inventory, skills, quests, equipment and companion. But players can write it themselves, so anything competitive or tradable (gold, rare drops) belongs on the server: in room state, the Simulation API or entitlements.
- **Small shared areas.** For example, one persistent `GameRoom` per area (the clearing, a town, a dungeon instance), holding several to a few dozen players. Players move between rooms when they travel by crystal. This fits our area model and our 16 × 16 chunk streamer.
- **Server-authoritative gameplay with shared code.** Our shared systems are plain JavaScript (combat formulas, resource rules, recipes, inventory), so the same modules can run in the client for prediction and in the room for authority. Click-to-move sends a destination, not every step, which stays well under 30 messages a second. Server-bound modules must avoid the globals the sandbox blocks, and anything that touches the DOM (for example the XP notices in `skills.js`) has to be split from the rules first.
- **Enemy drops and gold:** rolled in the room, with gold kept on the server (room state or simulation entities).
- **Shops and paid items:** through `shop` and `entitlements`. Purchases that change gameplay can't be verified by a room yet, so they rely on the client's word until RUN adds a server-side check.

### Hard limits today (platform-side)

| Need | Blocker | Workable inside the limits? |
|---|---|---|
| Hundreds or thousands of concurrent players | One room-server instance shared by all games (80 connections by default; production value unverified); no cross-instance routing | No |
| One large seamless world | 1 MiB room state, 16 KiB broadcasts, no interest management | Only as many small rooms (shards per region), with transfers between them |
| World simulation while nobody is around | Persistent rooms freeze when empty | Yes: compute catch-up from timestamps (respawns, growth) |
| Our own servers, databases or services | The CSP limits network access to platform hosts | No, unless the platform adds hosts to the allowlist |
| Friends, parties, guilds, DMs | No social graph or presence API | Partly, in game logic inside rooms; cross-room needs platform support |
| Offline asset caching for a big streamed world | No IndexedDB or Cache API | HTTP cache only |
| Physics or WASM on the server | Room sandbox blocks WASM | Hand-written JS only |
| Shipping server updates to busy areas | Occupied persistent rooms keep old server code; only a RUN engineer can restart them (by editing room leases) | Partly: clients must work against older servers, and restarts are coordinated with RUN |
| Diagnosing server problems | No room logs | Partly: route server errors through clients into analytics |
| Trusting paid items on the server | Rooms can't read entitlements | No |
| Low latency outside the US | us-central1 only; assets served without a CDN (as of the Sep 2026 analysis) | No |

## Platform asks (to make an MMO feasible)

In priority order:
1. **Scale the room server horizontally:** multiple instances with routing to whichever instance owns a room, and wire up the existing `DeltaFanout` broker.
2. **Restart or drain persistent rooms from the CLI**, keeping the snapshot and coming back on the current bundle, ideally automatically on deploy. Plus **room status** (bundle version, players, last save, lock and lease).
3. **Room logs:** `this.log` output, uncaught errors and failed saves, readable from the CLI.
4. **Interest management:** per-client relevance (by area, chunk or radius) for broadcasts, instead of whole-room deltas.
5. **A world-state store** beyond the 1 MiB room snapshot, such as per-chunk or per-region documents with transactional updates. Until then, snapshot writes should validate and fail loudly.
6. **Server-side entitlement and guest checks** from rooms.
7. **Background ticking** for chosen persistent rooms, or a scheduled-job hook.
8. **Higher per-client message budgets** for real-time combat rooms, and more regions.
9. **Social primitives:** friends, presence, parties, and cross-room messaging.
10. **Client caching** (a storage API for large streamed assets) and a **CDN** for game assets.
11. Smaller items:
    - a local room server that enforces the prod sandbox, and a bundle check for blocked globals;
    - a clear error on oversized sends;
    - honouring `reconnectTimeout`, and letting a new login take over a stale seat;
    - documenting lock semantics and `RUNDOT_PLAYGROUND_ROOM_SERVER_URL=local`;
    - an emergency promote path for incident fixes;
    - an exact three.js version match (or using our own copy);
    - WebGPU in the iframe `allow` list;
    - restoring the truncated docs.

## Lessons from ASCII World

ASCII World is another game on RUN with persistent multiplayer rooms. Its team wrote up its first week in production (Oct 1–4, 2026): about two days of stale or broken play and a four-hour frozen world. Each outage started with a bug in their own code. The missing platform tools turned them into hours: no logs, no way to see which server code a room runs, and no creator restart. Every recovery needed a RUN engineer to edit room leases in Firestore by hand. A check of the venus source on 2026-10-09 found no room-server changes since, so all of this still applies.

What they hit, and what we do about it:

| What happened to them | Our rule |
|---|---|
| A persistent room kept its launch-day server code for two days because players never left | Clients must work against older servers. Hide new features until the server reports support, and never make a client rule that needs a lockstep server deploy (that caused their Oct 4 lockout). |
| Server code read `globalThis.performance`. It works in Node, tests and the local room server, but it's `undefined` in prod, so the world froze | A test fails the build if server-bound code uses anything outside the sandbox's allowlist (`server/mp-room-server/src/harness/Sandbox.ts`). |
| Firestore silently rejected every save (nested arrays, `undefined`) for hours | Save the world as one JSON string (`{world: JSON.stringify(...)}`) and track the last successful save time. |
| A message grew to 17 KiB, over the 16 KiB frame cap | Send area and chunk data in batches under 12 KB. |
| A `/reboot` command called `lock()`, and the lock outlived the room | Never lock persistent rooms. A starting room unlocks itself if it finds itself locked. |
| A reopened app was told "already playing" for over a minute (against a 20 s `reconnectTimeout`) | Expect stale seats. Don't skip sends to players flagged as disconnected; a late disconnect event can flag the new connection. |
| Server errors were invisible | Route server errors through clients into analytics, and show "the server did not answer" with the last error. |
| Each fix waited about 5 minutes in review, across 7 deploys during one outage | Plan for slow hotfixes. Note that `rundot deploy` also uploads the shop config. |

Their next release went out cleanly with this checklist, which we'll adopt:
- Test on RUN's own room server locally, including on a phone.
- Test the new client against the old live server code, because that in-between state is what players see first.
- Before deploying:
  - `git fetch`, because other sessions deploy too;
  - run the tests and the type check;
  - scan the server bundle for sandbox-unsafe code;
  - bump the build.
- Restart rooms only through RUN's proven lease restart, at a chosen time.
- Get an explicit go for every prod step.
- After release:
  - confirm the server version on a device, in the app and in incognito;
  - read the server error report.

## Suggested path

1. **Make the game platform-ready:** storage adapter, SDK integration, deploy to RUN unlisted, and measure load and memory on real devices through the SDK heartbeat.
2. **Multiplayer spike inside the current limits:** start with the sandbox-globals test and run rooms locally against RUN's room server. Then one persistent `GameRoom` for a single area, using the shared JS systems on the server, with several players seeing each other move, gather (shared resource depletion) and fight one enemy. This proves the shared-code architecture and shows us real numbers.
3. **Design the world as regions or shards** that map to rooms (towns, wilderness regions, dungeon instances), so the content plan works both with today's limits and after the platform asks land.
4. **Take the platform asks to the RUN team,** using numbers from the spike.
