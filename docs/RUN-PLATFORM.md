# QuadriaQuest on RUN: what is and isn't doable

Grid terms (tile, chunk, region, world, shard) follow [WORLD.md](WORLD.md), *Glossary*; "cloud region" means a data-centre location.

Assessment of the RUN.game ("Venus") platform for QuadriaQuest's MMO goal. It comes from a read-only review of the platform source (`~/src/rundot-workspace/venus`, branch `develop`) on 2026-10-09, re-checked on 2026-10-12 at `34aff2694c` (74 commits later) and on 2026-10-13 at `636dd62fcc` (31 more; see *Changes since the first review*). Platform behaviour changes; re-check the source before relying on a specific limit. Paths below are relative to the venus repo.

## Summary

- **The single-player game ships fine today.** The bundle, WebGL, workers, WASM and audio all fit. We need to move our three `localStorage` uses to platform storage first.
- **Small shared spaces with server-authoritative logic are possible.** Persistent `GameRoom`s run our own JavaScript on RUN's room server, and our shared gameplay systems are plain JS.
- **A true MMO is not possible on the platform as it runs today.** All games share one room-server instance, with no routing between instances. **Production is confirmed at one instance and 80 connections** (RUN's own remediation plan, 2026-10-12), and cross-instance rooms are an unscheduled "large program". There's no interest management, a 1 MiB cap on each room's saved state, and 16 KiB updates. We can't bring our own servers because the game's network access is limited to platform hosts.
- **Operating live rooms is the other big gap.** Another RUN game, ASCII World, found this in production: a room that is never empty never picks up new server code, creators can't restart rooms, and room logs don't exist. Any always-occupied area (a town) is affected. See *Lessons from ASCII World*.
- **SyncHub is RUN's recommended route to an MMO-like game, but it isn't usable yet.** It's hub-and-spoke: a social hub plus instanced Syncplay raids (lockstep, every client simulating the instance), joined by "airlocks" that hide the instance boundary. RUN's developers recommend it (*RUN's guidance*). It fits our world's doors, gates and crystals well. But it isn't in production, raid sessions currently end after 10 minutes, and raids share the same 80 connections. See *SyncHub and extraction*.
- **We work at the company, so the hard limits are platform work items rather than dead ends.** The section *Platform asks* lists them.

## What the platform gives a game

| Area | What exists | Key limits | Source |
|---|---|---|---|
| **Hosting** | Each game is a static bundle (`rundot deploy` zips `dist/`), served from `<appId>.h5-apps.getreel.com/<version>/`. Brotli, code splitting, `blob:` and workers are supported. WASM is allowed in the client. | Size limits in the docs disagree (32/100 MB); the code enforces 500 MB. Preflight warns on JS chunks over 500 KB. A `thumbnail.jpg` is required. | `cli/venus_cli`, `servers/h5-origin-shim`, `deploying-your-game.md` |
| **Runtime** | An iframe on web, Telegram, Fire TV and Steam/Electron; `react-native-webview` in the iOS/Android apps. The SDK talks to the host over JSON-RPC `postMessage`. | `maxDpr` defaults to 1.5. WebGPU is not in the iframe `allow` list. Fullscreen and pointer lock only go through the SDK, and aren't available on mobile. Host UI overlays the viewport. | `client/.../H5AppViewer`, `packages/sdk` |
| **Security policy (CSP)** | The game's network access is limited to its own origin, the platform CDN and API, Cloudinary, GCS and `wss://ws.run.game`. | **No custom backend, no external APIs, no custom login.** The game has an opaque origin, so **localStorage, IndexedDB, Cache API, cookies and Service Worker are unavailable.** Enforcement is controlled by the Statsig gate `H5_LOCKDOWN_ENABLED` (report-only when off). | `servers/h5-origin-shim/src/h5CspConfig.ts`, `docs/h5-lockdown-rollout.md` |
| **Identity** | `getProfile()` returns a stable `id`, `username`, `avatarUrl` and `isAnonymous`. Players can sign in mid-session. | Platform auth only. **No friends list, presence or social graph.** | `api/PROFILE.md` |
| **Player data** | `appStorage` (per player, per game, cloud), `deviceCache`, `ownerStorage`, `sharedStorage` and `files`. `compareAndSwap` is available (`appStorage` only). A CRDT document layer over `appStorage` is documented (`document-runtime.md`). | String values; 128 keys and 10 MiB **per player's bucket** (not per game); 1,000,000 bytes per value (warning at 256 KiB); 8 MiB per write call; 100 keys per multi-get; 400 items per batch. Platform staff can raise a game's limits to 1,024 keys and 100 MiB (`storageQuotaOverrides`). Rate limited (`RATE_LIMITED` with `retryAfterMs`). **Players can write it, so it isn't trustworthy for progression.** | `api/STORAGE.md` (restored in `924bc36cf3`) |
| **Server-authoritative state** | `GameRoom` (our JS, sandboxed). The **Simulation API**, JSON-defined per-player entities, recipes, timers and loot (server-side, Firestore transactions). `entitlements` can be granted by the server and consumed by the client. `services.economy` shared pools are exactly-once. | Simulation is beta and not available in local Playground. Rooms can call `grantMeta` on the simulation proxy (`09e9290c07`). | `api/SERVER_AUTHORITATIVE.md`, `api/ENTITLEMENTS.md` |
| **Realtime rooms** | `GameRoom` hooks: `onCreate`, `onPlayerJoin`, `onGameMessage`, `onTick`, `save`. Persistent rooms (keyed, survive deploys), `broadcastDelta`, moving players between rooms, room chat, seasons. | One worker thread per room with a **64 MB heap**. **No WASM, `fetch`, `eval` or `require`.** 5 s message timeout. **1 MiB persisted state** (hard fail). **16 KiB delta broadcasts** (larger forces a full resync). **30 msg/s per client.** Persistent rooms **freeze when empty and don't replay missed ticks**, and **keep their server code until empty** (no creator restart). The sandbox sets `globalThis`, `Function`, `eval`, `process` and `require` to `undefined` and has **no `performance`**; the local room server doesn't enforce this. The 16 KiB cap also applies to **every `sendTo`** (overflow behaviour undefined). Firestore **silently rejects snapshots with nested arrays or `undefined`**. **No room logs.** 5 MB server bundle. Beta. | `server/mp-room-server`, `api/ADVANCED-MULTIPLAYER.md`, full `MULTIPLAYER.md` at `git show fb88fa3987^:` |
| **Room-server scale** | **Confirmed:** one multi-tenant service hosts every game's rooms (room ids embed the game id), pinned to **one instance** because room state can't yet move between instances. That's a code limitation, not config. | Connection ceiling: **80 in production** (confirmed: `--max-instances=1 --concurrency=80`; peak use 20 of 80 over three days, `.plans/mp-room-availability-remediation.md`), shared by all games. A second instance is "not safe today". One crash, rollback or Cloud Run instance replacement drops every room (outages on 2026-10-11 and 10-12). us-central1 only. Room ownership leases with **no cross-instance routing**. The delta fan-out broker exists but isn't wired. **No interest management.** Request timeout is **600 s** since `29b065a997`: every long WebSocket reconnects about every 10 minutes, and **grant-based raid sessions can't reconnect, so they end at 10 minutes**. | `.github/workflows/ops-publish-mp-room-server.yml`, `RoomManager.ts`, `DeltaFanout.ts`, `.plans/mp-room-availability-remediation.md` |
| **Syncplay** | Deterministic lockstep with rollback; the server only orders inputs. Includes combat, inventory and navmesh modules. | Every client simulates the whole state. Built for 2–16 player matches (hard cap 128). **Not suited to an MMO world.** Release candidate. | `packages/syncplay` |
| **Monetization** | `shop` (RUN Bits or real-money price tiers), `iap`, `entitlements`, subscriptions. | Ads are disabled on web. No receipts are returned to the game. **Rooms can't read entitlements or tell whether a player is a guest**, so a room has to trust the client about purchases. | `api/SHOP.md`, `api/PURCHASES.md` |
| **Lifecycle** | `onPause`/`onResume`, plus safe-area and device events. The host sends AWAKE when a ready game is shown; SLEEP is still never sent. Play resumes after an uncertain ad or a stale pause (`deafba433d`). | Leaving or opening another game destroys the iframe (no keep-alive). Save on **pause**. Load watchdogs at 15 s, 75 s and 300 s. Analytics sessions end after 30 minutes in the background. | `api/LIFECYCLES.md`, `useReadinessWatchdog.ts` |

Documentation gaps found during the first review: `api/MULTIPLAYER.md` and `api/STORAGE.md` had been truncated by commit `fb88fa3987`; `924bc36cf3` restored both. Bundle size limits still differ between the docs and the code.

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
| One large seamless world | 1 MiB room state, 16 KiB broadcasts, no interest management | Only as many small rooms (one per region), with transfers between them |
| World simulation while nobody is around | Persistent rooms freeze when empty | Yes: compute catch-up from timestamps (respawns, growth) |
| Our own servers, databases or services | The CSP limits network access to platform hosts | No, unless the platform adds hosts to the allowlist |
| Friends, parties, guilds, DMs | No social graph or presence API | Partly, in game logic inside rooms; cross-room needs platform support |
| Offline asset caching for a big streamed world | No IndexedDB or Cache API | HTTP cache only. `RundotGameAPI.cdn` may help with delivery (see *Changes since the first review*) |
| Physics or WASM on the server | Room sandbox blocks WASM | Hand-written JS only |
| Shipping server updates to busy areas | Occupied persistent rooms keep old server code; only a RUN engineer can restart them (by editing room leases) | Partly: clients must work against older servers, and restarts are coordinated with RUN |
| Diagnosing server problems | No room logs | Partly: route server errors through clients into analytics |
| Trusting paid items on the server | Rooms can't read entitlements | No |
| Low latency outside the US | Room server in us-central1 only. Asset delivery: an asset CDN API is now documented but unconfirmed | No for rooms; check the CDN for assets |

## Platform asks (to make an MMO feasible)

In priority order:
1. **Scale the room server horizontally:** multiple instances with routing to whichever instance owns a room, and wire up the existing `DeltaFanout` broker. SyncHub's `FleetRoomRouter` already does cross-instance routing for raids (with a Redis broker), so the ask is mostly to extend it to `GameRoom`s and deploy Redis. RUN's own remediation plan names cross-instance rooms as the fix for its single-instance outages, but has no date for it.
2. **Ship SyncHub to production with raid reconnects,** so spokes can last longer than 10 minutes.
3. **Restart or drain persistent rooms from the CLI**, keeping the snapshot and coming back on the current bundle, ideally automatically on deploy. Plus **room status** (bundle version, players, last save, lock and lease).
4. **Room logs:** `this.log` output, uncaught errors and failed saves, readable from the CLI.
5. **Interest management:** per-client relevance (by area, chunk or radius) for broadcasts, instead of whole-room deltas.
6. **A world-state store** beyond the 1 MiB room snapshot, such as per-chunk or per-region documents with transactional updates. Until then, snapshot writes should validate and fail loudly.
7. **Server-side entitlement and guest checks** from rooms.
8. **Background ticking** for chosen persistent rooms, or a scheduled-job hook.
9. **Higher per-client message budgets** for real-time combat rooms, and more cloud regions.
10. **Social primitives:** friends, presence, parties, and cross-room messaging.
11. **Client caching** (a storage API for large streamed assets) and a **CDN** for game assets.
12. Smaller items:
    - a local room server that enforces the prod sandbox, and a bundle check for blocked globals;
    - a clear error on oversized sends;
    - honouring `reconnectTimeout`, and letting a new login take over a stale seat;
    - documenting lock semantics and `RUNDOT_PLAYGROUND_ROOM_SERVER_URL=local`;
    - `rundot predeploy` checks for the room-server bundle (it only checks client builds today);
    - an emergency promote path for incident fixes;
    - an exact three.js version match (or using our own copy);
    - WebGPU in the iframe `allow` list;

## SyncHub and extraction

New since the first review (`252267666d`, `62001d519a`). It's a turnkey framework for extraction games (the reference game is Stick Zone). **As of 2026-10-12 it is not in production** (the remediation plan lists #5242, #5352 and #5365 as undeployed, and the hosted-simulation fix #5371 too):

- **Hub:** a persistent stash, loadout and squad setup. Its realtime side is an HTTP stash client (`ActiveHubSession.ts`) with no presence sync. The architecture doc says "up to 50 players per instance", but no live hub room exists yet.
- **Airlock:** a two-phase handoff. It holds the loadout in escrow and issues a signed, single-use ticket (`HUB_READY -> PREPARED -> ... -> SETTLED`).
- **Spoke:** a short raid room of 1–6 players (squads default to 6, `packages/syncplay/src/extensions/hub/party.ts:58`). It's a Syncplay lockstep room, so every client runs the whole simulation and the server only orders inputs.
- **Settlement:** a server re-runs the input log (`replayWorker.ts`) and commits the result to inventory in one Firestore transaction.
- **Hosting:** live raids run on `mp-room-server` through `synchub/RaidGateway.ts` and `FleetRoomRouter.ts`, so they count against the same 80 connections. Control, escrow and settlement run on Cloud Run (`server/cloud-run/src/synchub/*`).
- **Session length:** raid sessions can't reconnect, so with the 600 s request timeout they **end after 10 minutes**. A raid reconnect path is "tracked separately" (`ops-publish-mp-room-server.yml` comment, `29b065a997`).
- **Maturity:** until `01f2bbe5c8` (2026-10-13) the raid gateway accepted the literal signature `"valid_mock_sig"`, so anyone could join a raid as any player. Grants are now HMAC-signed.
- **Cross-instance routing:** `FleetRoomRouter` routes across processes, using Redis only when `REDIS_URL` is set (`server/mp-room-server/src/server.ts:57`). The deploy workflow doesn't set it, so it falls back to in-memory. It serves raids only, not `GameRoom`s.
- **Server-side bots:** an NPC bot supervisor (`src/bots/*`) with fenced leases, aimed at raids.
- **APIs:** `RundotGameAPI.extraction` (`openHubAsync`, `prepareRaidAsync`, `airlock.enterAsync`, `spoke.submitIntent`, `requestExtractionAsync`, `getDebriefAsync`). Docs: `api/EXTRACTION.md`, `api/SYNCPLAY-EXTRACTION.md`, `docs/synchub-extraction-architecture.md`.

Related Syncplay additions (now `6.0.0-rc.45`):
- **Dynamic seating** (`e9b1035161`): seats change between empty, bot and human mid-match within a fixed capacity. The 128-player hard cap is unchanged. Secrets are now tied to players, not seats.
- **Solo to co-op** (`93441213ab`): a solo session can be carried into a small co-op room (`exportPromotionSnapshot`, `carryIntoRoom`). The solo session must be co-op-shaped from the start, and a carried world can't feed verified settlement or leaderboards.

**For QuadriaQuest:** no persistent shared world, no server-run enemies, no interest management, so the MMO conclusion stands. It could fit **instanced dungeons or raids** later: a party leaves a town, plays a short lockstep instance, and the server verifies the loot. That needs the fight written as Syncplay simulation, and our skilling and crafting rewards don't fit its loadout and loot model without adapting it.

## RUN's guidance: hub, spokes and airlocks (2026-10-13)

From a RUN platform developer (Slack, paraphrased):
- SyncHub sits on Syncplay: deterministic lockstep, which gives cheat detection between clients for free. It uses the Simulation API for server-authoritative persistence and game logic. It can still be hacked; server-side Syncplay clients connected to "shadow" run instances would close that.
- **Hub and spoke** is the model, because it's the simplest and most scalable MMO-like experience and "scales by default": a social hub plus instanced raids, instead of shared zones of variable size.
- Raids can hold **up to 128 players** (Syncplay's hard cap), so an instance can feel well populated.
- **Airlocks** fake a shared world: a place where one party can't see other parties, such as a door, a cavern, a time lock or a loading screen. Games like The Division and Destiny do this.
- What it can't promise: that stranger X, standing next to object Y, sees stranger Z, unless they've signalled that they want to see each other. That's hard to solve generically, so RUN wants creators to use clever airlocks.

**How it maps onto QuadriaQuest:**
- **The capital is the hub.** The square is already designed as the social centre.
- **Our world already has airlocks:**
  - the city gates (double doors in each gatehouse);
  - doors into separate interiors and dungeons (the sewers, the crypt);
  - Iter Crystal travel (already a loading screen);
  - the tutorial areas, which are naturally private instances.
- **A spoke is an area or a region** (WORLD.md, *Glossary*), never the whole 2,048 × 2,048 world, because every lockstep client simulates its whole instance. Regions would join at chokepoints (gates, bridges, passes, caves) so the world still feels continuous.
- **Slow combat suits lockstep:** 2.5 s attacks and click-to-move.

**What we'd give up or take on:**
- **No chance meetings in the wild.** Strangers meet in the hub and in matchmade instances, not by chance, and RuneScape-style competition for the same resources goes away unless spokes are public and matchmade. WORLD.md's "one continuous world, no loading step" becomes "continuous-feeling, through airlocks".
- **Deterministic gameplay:** seeded randomness, a fixed tick and no wall-clock time. It may mean using Syncplay's own modules instead of our shared systems. This is the largest and least-known cost.
- **Progression through the Simulation API:** XP, gold, quests and inventory as server recipes, at about 200 calls a minute per user, so they need batching. SyncHub's settlement is built around raid loadouts and loot; skilling rewards need adapting.

**Open questions for RUN** (Q1 answered by the 2026-10-13 source check):
1. ~~Production room-server capacity~~ **Answered:** one instance, 80 connections, shared by all games; cross-instance rooms unscheduled. So a 128-player raid can't run today.
2. Is the hub itself a realtime room (lockstep or `GameRoom`)? What's its real capacity (the docs say 50), and is it built? The code still has only an HTTP stash client.
3. Can a Syncplay simulation run our own deterministic JS (combat, skilling, townsfolk), or must it be built from Syncplay components? Are there requirements beyond seeded randomness, such as fixed-point maths?
4. Can strangers be matchmade into the same spoke (public instances, Destiny-style), with drop-in through dynamic seating?
5. Is there an example of non-loot progression (XP, quest state, gold) through the Simulation API, and can its rate limits be raised?
6. What's the timeline for server-side "shadow" Syncplay clients?
7. When does SyncHub go to production?
8. When will raids be able to reconnect, so sessions can run longer than 10 minutes?
9. Is there any plan or date for running the room server on more than one instance?

**Our next step if 2, 3 and 7–9 come back well:** a spike on this branch. One countryside spoke behind the west gate, two clients chopping trees together under Syncplay, to measure how much of our shared gameplay survives deterministic lockstep.

## Changes since the first review

Re-checked 2026-10-12 at `34aff2694c`. Unchanged unless listed here:

- **Room server:** no changes to any limit in the *Realtime rooms* and *Room-server scale* rows, including the sandbox, the deploy workflow (`ops-publish-mp-room-server.yml:97-100`), restart and logs. `StateStore.ts` gained per-room write locks and a revisioned `persistCritical` save (`e9b1035161`), but the 1 MiB cap and Firestore sanitising still apply. `handleJoin` gained `capabilities` and `protocolVersion`, with no entitlement data.
- **CSP:** unchanged. The new `rundot predeploy` CRITICAL rule `network-external-fetch` warns about external requests. Suppressing it doesn't open the CSP.
- **SDK init:** a bare `import '@series-inc/rundot-game-sdk/api'` is still correct (`3b0474456c`; `initializeAsync()` is deprecated). If init fails the import still resolves, and `getProfile`, `getDevice`, `getEnvironment` and `getSafeArea` throw, so wrap the first reads in try/catch.
- **Deploy tooling** (`e45742440b`): `rundot preflight` is now `rundot predeploy`, with `fix`/`ignore`, `predeploy.config.json` and inline `@rundot-ignore`. Relevant rules: `storage-blocked-apis`, `sandbox-blocked-modals`, `embedded-lib-duplicate`, `asset-unhosted-cdn`; it also pushes `maxDpr` 1.5 and SDK ^5.28.1.
- **Asset CDN (to verify):** `api/CDN.md` documents `RundotGameAPI.cdn` (`fetchAsset`, `resolveAssetUrl(s)`, signed URLs for entitlement-gated files), with files in `public/cdn-assets/` and rules in `cdn.config.json`. If it serves real game assets, our "no CDN" finding is wrong. Large streamed world assets would belong there.
- **Multiplayer docs:** restored `api/MULTIPLAYER.md` covers matchmaking (`joinOrCreateRoom` with `criteria`, `matchmakeRoom`), room codes, private and singleton rooms, room listing, `startLocked` lobbies, invite hooks and `services.simulation` (actor recipes, `matchmaking`, `move_player`). `maxPlayers` defaults to 10. Still no friends or presence.
- **iframe, DPR, three.js:** unchanged (no WebGPU; `maxDpr` 1.5; three.js 0.170.0 or 0.183.2 only).
- **Analytics:** the host emits `active_play_60s_v1` automatically; games must not emit it (`api/ANALYTICS.md`).

Re-checked 2026-10-13 at `636dd62fcc` (31 commits):
- **Room-server availability** (`29b065a997`; plan `.plans/mp-room-availability-remediation.md`):
  - Production confirmed at one instance and 80 connections. Peak use was 20 of 80 over three days.
  - Two outages, on 10-11 and 10-12: Cloud Run stopped routing to a live instance, and the second ended with every room dropped when the instance was replaced.
  - The fixes are bounded and jittered SDK reconnects, `Retry-After` on ticket 429s, a Datadog monitor, and a request timeout cut from 3,600 to 600 s (drains last at most 10 minutes).
  - Cross-instance rooms and Cloud Run settings are explicit non-goals.
- **Raid grants** (`01f2bbe5c8`): the raid gateway now requires an HMAC-signed grant. It used to accept the mock signature `"valid_mock_sig"`.
- **Syncplay:** physics contact materials and performance work only (`039401a6d2`, `8a86284702`, `336835133f`, `46413708dc`). No changes to seating, the hub, the Simulation API or capacity.

## Lessons from ASCII World

ASCII World is another game on RUN with persistent multiplayer rooms. Its team wrote up its first week in production (Oct 1–4, 2026): about two days of stale or broken play and a four-hour frozen world. Each outage started with a bug in their own code. The missing platform tools turned them into hours: no logs, no way to see which server code a room runs, and no creator restart. Every recovery needed a RUN engineer to edit room leases in Firestore by hand. Checks of the venus source on 2026-10-09, 10-12 and 10-13 found no room-server changes that address it (the 10-13 availability work adds alerts and bounded reconnects, not logs or restarts), so all of this still applies.

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
3. **Design the world as regions** (WORLD.md, *Glossary*: 128 × 128 tiles, 4 × 4 chunks) that map to rooms, server processes or SyncHub spokes, joined at chokepoints that can act as airlocks (gates, bridges, passes, caves), plus instanced dungeons. The content plan then works with today's limits, with hub and spoke, and after the platform asks land. Copies of the whole world for more players are **shards**.
4. **Take the platform asks to the RUN team,** using numbers from the spike.
