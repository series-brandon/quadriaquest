# QuadriaQuest development handoff

Snapshot: 2026-10-06. This is a restart aid, not a claim that all architecture work is finished. Read `AGENTS.md` first and verify current code/worktree state before editing. The latest cleanup status is recorded below; older dated verification sections are historical snapshots.

## Project and working conventions

- Game name: **QuadriaQuest**. Project/repository/folder references: **quadriaquest**. The actual checkout is `/Users/brandonmanning/src/poc-workspace/quadriaquest`; some session metadata still refers to the old `project-clime` path.
- Stack: HTML, JavaScript, CSS, Three.js. No replacement game engine or other implementation language.
- Preserve existing staged and unstaged work. This snapshot includes substantial uncommitted work from multiple iterations; do not reset/revert/stage it wholesale or assume it belongs to the current task.
- `docs/DESIGN.md` holds the broader design. `docs/COMBAT.md` is the current combat/progression design source of truth; update its rules in place rather than appending history. `docs/CINDERHOLD.md` holds the third-area design and first-playable status; `docs/WILLOWBANK.md` holds the second chapter. `README.md` holds run/build/debug instructions. If these disagree with newer user decisions or actual code, reconcile them explicitly.
- New work must be reachable, repeatable, and resettable in the dev playground in the same change. Use production implementations. Ask when coverage or scope is uncertain. Keep developer tools out of normal builds.

## Architecture boundary — settled with the user

Only layout and narrative belong to a particular area. Gameplay systems must work in any world that supplies the relevant terrain/entity/target. This includes actions and state, not merely model factories and UI. Do not add `activeArea`, `enteredWillowbank`, or equivalent prerequisites for generic gameplay.

**Bridge clarification:** Willowbank's bridge collapse, Reed's dialogue, quest sequence, rescue/crossing, and one-off finger injury are local narrative. Carpentry is shared: requirements, timed work, hammering, cancellation, material consumption, XP, and progress events. Preserve the specific bridge story; extract the skill mechanics underneath it. A portable bridge model/progress presentation can be configured by that narrative.

Use shared action completion/progress callbacks for tutorial updates. Normal gameplay must not require that a tutorial objective is active. Avoid copying the same action into the next map. Do not use a debugging shortcut that teleports the player just to preview shared UI.

## Recent fixes already made

### HUD single row and whole-number player splats — 2026-10-07

- **Model viewer Attack hands:** the slime loadout gains an **Attack hands** select (Automatic, Main only, Off only, Alternate).
  - The preview equips its loadout on a real `createEquipment` instance, so eligibility, defaults and fallbacks are the gameplay rules.
  - Alternate switches hands each preview cycle, after the 0.28s follow-through, so each swing keeps its own hand.
  - The loadout note states what actually applies, including when a choice is unavailable (e.g. Off hand only with a shield).
  - Tests cover alternation timing, fallbacks, bare-hand alternation, a lone off-hand dagger and spells. Verified in the built viewer.

- **Playground sections:** the new fieldsets sat loose at the top of the panel because `playground-layout.js` only files fieldsets whose legends it lists. They now live in a collapsible **Character & abilities** section (character & combat profile) and in **Combat** (assistance, dual wield, armor, control & backfire). Any future unlisted fieldset falls into a collapsible **More** section instead of escaping. The control-test picker uses the shared label-plus-action row. Verified in the built playground: nothing loose, the sections start collapsed, and the controls still run.

- **Resource HUD:** all five orbs share one row, each with its action directly beneath (Eat, Restore, Sprint, Strong Strike, Auras).
  - Desktop sidebar: 5 × 48px. The collapsed floating HUD widens from 274px to 300px.
  - Phones: 44px orbs and actions with 4px gaps (236px) beside a 113px minimap during play, and the same single row above full-screen pages. The earlier two-row and phone-page special rules are removed.
  - Verified at desktop (sidebar and collapsed) and 375px (gameplay and Skills page); no overflow.
- **Fractional player hit splats.** Health is fractional internally (passive regeneration), but player splats showed `health before − health after`, so a lethal hit at 5.947837… HP printed the raw fraction. Player splats (enemy hits, backfire, Willowbank's scripted injury) now use `displayedLoss`: the drop in displayed (rounded-up) health. This equals the whole hit damage for every non-lethal hit and, for a lethal hit, exactly the health the orb showed (never a larger overkill number). This matches enemy splats, which already show HP actually removed.
- Verification: 252 tests (new displayed-loss unit and lethal-hit integration tests), both builds and debug isolation. A live lethal Bruiser hit from fractional health showed a whole "7!": regeneration had raised health just past 6, so the orb showed 7. A built-preview launch config (`playground-built`, port 4174) avoids the dev server's CSS watch issue during checks.

### Fixes: vanishing hands, Auto abilities — 2026-10-07

- **Hands vanished permanently after unarmed combat.** Off-hand mirroring read a sixth pose value that punch poses don't have, producing `NaN`. Hand smoothing then carried the `NaN` forever. Unarmed defaults to alternating, so the first off-hand punch triggered it. Fixed the mirror (missing rotations count as 0). The main-loop hand smoothing now treats invalid targets as 0 and snaps back from non-finite transforms, so no single bad pose can stick. A regression test checks every attack motion from both hands for finite values.
- **Auto now uses abilities when available** (user decision, recorded in COMBAT.md). During a fight, Auto queues learned abilities when the attack is eligible, Energy suffices, nothing is pending or committed, and the training goal allows it. Requests go through the same pending slot; Auto-queued requests are marked so manual requests keep priority. Auto-eat yields only to manual requests. Pressing an Auto-queued ability adopts it as manual, and a second press withdraws it.
- Verification: 250 tests (new Auto-ability and pending-slot priority tests), both builds and debug isolation. A bounded browser check on the playground server ran an unarmed Auto fight against a Bruiser: off-hand punches in 44 of 103 samples, zero non-finite hand transforms, a mirrored punch pose, and Auto spending 50 Energy on Strong Strike (Melee Power XP) then re-queuing as Energy recovered. Inspection state now includes the player's hand transforms. No performance run: the fixes add no per-frame cost beyond a finite-check on two hands.

### Assistance, dual wield, backfire, armor, control effects and Ember — 2026-10-07

- **Assistance** (`assistance.js`; Combat page rebuilt in `combat-style-menu.js`):
  - **Mode and setup:** Manual/Auto with Pacifist in both. Defaults are Auto · Balanced · Melee · no training goal.
  - **What Auto reads:** actual enemy stats (user decision). Danger bands use the final max hit after player defenses, and the warning shows in the HUD status line.
  - **Retaliation:** Adaptive retaliation is withheld at 1–3 hits unless the player deliberately clicked that enemy. That override clears at the 5s combat exit. Manual uses Auto-Retaliate. Pacifist refuses manual and automatic attacks ("Cannot attack while in pacifist mode.") and stops the unreleased windup.
  - **Auto choices:** strategy follows the training goal, otherwise as listed under "Needs review". Spells never use one with backfire risk unless allowed. Auto-eat triggers at ≤150% of the max hit, respects exclusions and manual-queue priority (unless emergency priority is enabled), and warns "Warning! Recommend fleeing!" when nothing is eligible. Auto auras follow the COMBAT.md rules (25% floor, recovery threshold, grace). Manual changes to strategy, spell or an aura stick until **Return to Auto**.
  - **Optimize Equipment:** ranks DPS → reduction → current gear and fills armor slots; it also runs on a Class change. Advanced settings hold auto-eat, emergency priority, risky spells, food/spell exclusions, aura recovery % and grace.
  - Settings are session-scoped like other preferences; Full test area resets them.
- **Dual wield:**
  - Copper Dagger is off-hand eligible; Stone Sword is not. Equipment offers main/off actions and respects owned copies. Shield hands and two-handed hands are never free fists.
  - Attack hands: Main/Off/Alternate. The default is the weapon hand, or Alternate for two weapons or two fists. One sequential timer alternates only on release, keeps the pending hand through cancellation, and resets after the 5s exit.
  - Each hand has its own damage type (dagger Piercing → stab, Slashing → slash). Off-hand strikes mirror the animation. The off-hand dagger has its own left-hand model in gameplay and the model viewer.
- **Spell backfire:** resolved at release after costs, using the unclamped requirement ratio. It hits only the caster: 50% of the normal max, against magic, armor, shield and Harden resistance, with no dodge, block or crit. It never aggroes the target, grants base XP only under the target's rules, and can defeat. The Combat summary shows the chance, the damage and a lethal warning. Energy Strike (level 1) never backfires; a playground override raises its requirement.
- **Armor:** shared slots (head = helm, chest, hands, legs, feet, back, ward). Each piece has its own armor-skill effectiveness (10% floor). Slot proficiency adds +0.02 resistance and +0.0001pp block per level. Connected hits award armor XP: the skill pool splits by class, the slot pool splits equally. Blocks give none. Only playground test pieces exist (`src/dev/test-armor.js`, excluded from normal builds).
- **Control effects** (`control-effects.js`): one shared state for the player and every enemy.
  - Stun blocks movement, attacks and casting; immobilize blocks movement only. They share movement protection.
  - Slows apply the strongest one (90% cap) with per-effect timers and a refresh-or-fail setting. Cleanse keeps the longer protection window.
  - A stun cancels the player's windup and pending action but keeps the target, then restarts with a fresh windup. The current step finishes, but no new step starts.
  - Enemies freeze, stop attacking, and walk slower. The HUD status and enemy labels show effects and immunity. Only playground test sources exist.
- **Ember (draft Ki mentor)** in the Cinderhold forge corner teaches Rush and Harden in the optional "Steady Breath" quest (see CINDERHOLD.md). It has a checkpoint, a landmark and a model-viewer entry.
- **Needs review** (provisional where COMBAT.md is open):
  - Auto strategy: highest expected damage per second, or Defensive at ≤6 hits when no goal is set.
  - A second press withdraws a queued ability; movement does not clear an unassigned one.
  - Redistribute refunds points to spend with + in Skills.
  - Optimize treats magic setups as equal on damage per second (spells ignore weapons).
  - Ember's name, look and placement.
- Verification: 247 tests (new `combat-systems.test.js` covers control, dual wield, backfire, armor and assistance), both builds and debug isolation. Test armor is absent from the normal bundle. Bounded browser checks:
  - Auto/Manual/Pacifist and Optimize (dagger+shield).
  - Two-dagger alternation training Dagger proficiency against a Scrapper.
  - Auto Bruiser fight from 45 HP: flee warning, Strong→Defensive strategy, auto-eat once.
  - Player stun+slow HUD and an enemy stun label; duplicate effects rejected.
  - Backfire risk shown at 90.25%.
  - Ember's full lesson (rush → stack → recover → done).
  - 375px Combat page with no overflow; no console errors.
  - Fixed during checks: unreadable Optimize/Auto-Retaliate buttons (cream on cream), and selected states looking identical to unselected.
  - Not done: a full tutorial replay; enemy dodge/crit content (none exists).
- Tooling note: the dev server sometimes misses CSS edits made from the shell; restart the preview server after shell-edited stylesheets.
- Performance: full dev-gpu suite, 8/9 PASS (0.53–2.67 ms/frame, 59.5–59.8 fps). `cinderhold-combat` now fails on draws 605, objects 2171 and visible meshes 458. The extra ~233 objects are Ember's slime rig (one more mentor in the map), on top of the earlier extra visible goblin. Every scene has +5 objects for the hidden off-hand dagger model. Frame time is unchanged. This is deliberate content, not a regression; the baseline (still from before these slices) needs a full `--update-baseline` run.

### Abilities, auras, Energy/Ki and crystal services — 2026-10-07

- **Energy and Ki** pools follow Tenacity/Aura and regenerate under the shared rules (Ki only while every aura is off). The HUD shows all five orbs: a second row has Energy with a Strong Strike button and Ki with an Auras shortcut. On phones with a page open, the five orbs share one row.
- **Strong Strike**: `combat.js` has one shared pending-action slot.
  - Queue from the HUD or Combat menu. The ability attaches when the next eligible melee windup begins; pressing again before then withdraws it.
  - It spends 50 Energy at impact. If Energy drops below 50 before impact, the windup and ability are cancelled (no cost, no XP).
  - It rejects ranged/spell attacks and insufficient Energy with one notice, and never repeats.
  - It uses Strong strategy (22–44 at starting stats; its −2 Speed makes it a 2.55s swing) and trains Melee Power.
  - Bristle teaches it in the `return` step; later checkpoints grant it.
- **Auras** (`auras.js`): Rush (+10% movement, additive with sprint and Celerity's +0.2%/point) and Harden (+10 resistance points per incoming portion). Each has a 0.5 Ki activation fee and 0.5 Ki/s upkeep, stacking. At zero Ki every aura turns off with a notice. Toggled in Combat. The mentor is deferred (user decision), so auras are learnable only in the playground. Auto aura management belongs to the assistance slice.
- **Food** now consumes and heals at initiation, with one shared 2s manual-consumable cooldown. An accepted meal cancels the unreleased windup and clears the pending action; attacks restart with a full windup, which may replace the eating animation. The "done" feedback fires when the animation ends; the narrative `foodEaten` fires at initiation.
- **Iter Crystal services** in the shared destination menu, outside combat (5s buffer):
  - **Restore** refills all five pools and keeps active auras.
  - **Redistribute attribute points** returns every invested point to the unspent pool, to reassign with + in Skills; it turns auras off and refills.
  - Both are preview-only without a real crystal. No cost yet (none designed).
- Playground: **Character & combat profile** adds learn/forget for the combat kit, Queue Strong Strike, and pending/cooldown/aura readouts. Player health resources include Energy and Ki (up to 5000) for exhaustion tests.
- Verification: 233 tests (new aura, respec, Strong Strike, Harden and food tests), both builds and debug isolation. Bounded hardware-browser checks:
  - Clearing: Strong Strike 34 damage → Melee Power XP, 50 Energy spent, then normal attacks; Rush+Harden on in Combat (1 Ki fee, visible drain); eating mid-Bruiser fight +20 at once with the fight kept.
  - Cinderhold: a real crystal's Restore (auras kept, Health 110 at Constitution 11) and Redistribute (2 points refunded, auras off); Bristle's `return` dialogue teaching Strong Strike and advancing to `bruiser`.
  - Desktop and 375px HUD layouts (a phone overlap with the taller HUD was found and fixed); no console errors.
  - Not checked: the full tutorial replay.
- Still open per COMBAT.md: Ki mentor; unassigned-ability edge cases (repeat presses withdraw for now); attack-hand selection/dual wield; spell backfire; armor; stuns; Manual/Auto assistance and Pacifist (next slice).
- Performance: full dev-gpu suite, 8/9 PASS (59.4–59.9 fps, 0.57–2.5 ms/frame). `cinderhold-combat` shows the same draws difference as the previous slice (584 vs 538.6, one more goblin visible); counters are otherwise unchanged (mutations ~123/s, layouts ~9/s). The baseline is still not updated.

### Player progression and formula-driven combat — 2026-10-07

- `character.js`: shared character with documented attribute bases (capacity 10, others 1), 3 creation points, 18 combat skills, Light/Medium/Heavy Armor, weapon/armor-slot/elemental proficiencies, and core XP (one /5 conversion per action with carried remainder; 3 points per core level). All tracks use the adopted curve. Session-only, like the other skills.
- `combat-profile.js` derives each committed attack (bounds, interval, crit, XP tracks, Mana cost, requirement effectiveness) and player defenses (dodge, block, resistance) from the character. `combat.js` uses it everywhere:
  - Player attacks: no miss; crit from Luck; per-portion resistance.
  - Enemy attacks: 1% miss → dodge → block → damage → resistance; Scrapper protection kept.
  - XP per resolved attack: strategy skill + weapon proficiency, or elemental proficiency for spells. Shield XP on connected or blocked hits, using a hypothetical roll on blocks. Entity multiplier and cap are applied per track. The old Combat-XP-on-win and the single Combat skill are gone.
- Items now carry bonuses: Stone Sword +6/+6, Copper Dagger +10/+10, Training Bow +10/+10 at range 6, Wooden Shield +30, Copper Shield +50 resistance. The old Stone Sword/Wooden Shield values were chosen by the user. Practice targets: 50 HP, 0.5 XP below level 3. Cooked Pondfish heals 20.
- Spark is replaced by **Energy Strike** (4 Mana, 3s base cast, 6 tiles, Energy proficiency). Unaffordable casts pause with the target kept and show one notice, then resume. Wisp's lines and the training fixture use it; the quest title "First Spark" is kept as flavor.
- Regeneration: Health, Mana and Stamina regenerate (scaled by attributes; slower in combat and for 5s after). Stamina pauses only while actively sprinting. Maxima follow Constitution/Mentis/Endurance without refilling. Resource orbs write the DOM only when the rounded-up number changes.
- UI:
  - **Skills** shows core level, attributes with 44px **+** buttons, and all combat skills. Proficiencies appear once trained; Unarmed always.
  - **Combat** adds the six strategies with their XP destination and a live summary of the attack the next windup would commit.
  - Hit splats now distinguish Miss!/Dodged!/Blocked! and orange criticals.
- Playground: the Skills select covers every track via the real award path. New **Character & combat profile** controls set attributes, grant points, print the committed attack and defenses, and reset the character. Full test area resets the character. Combat/training notes updated.
- Not yet implemented, each tracked in COMBAT.md:
  - Attack-hand selection, dual wielding and per-hand damage-type choice
  - Strong Strike, Energy, Ki and auras, and the Energy/Ki orbs
  - Food at initiation with the shared 2s cooldown
  - Spell backfire (no current spell can backfire)
  - Armor items and armor XP; Athletics and sprint efficiency
  - Iter Crystal Restore/respec
  - The 5-meal/50-arrow tutorial top-ups
  - Manual/Auto assistance and Pacifist
- Verification: 225 tests (new character tests), normal and debug builds, and debug isolation. Bounded hardware-browser checks:
  - Clearing: Constitution allocation (max 110, no refill) and an unarmed Scrapper fight (2.5s cadence, 1–10 incoming, per-attack XP, level-ups at 562, core 1,220/5 = 244).
  - Combat menu summaries (Accurate Energy Strike 6–20 every 3s) and Energy Strike vs a target (5 casts, 20 Mana, 375 half-XP each to Magic Accuracy/Energy).
  - Cinderhold: portable fixture attack and XP.
  - 375px Skills layout.
  - Not checked: the Wisp dialogue path and a full tutorial replay.
- Performance: full dev-gpu suite, 8/9 PASS. `cinderhold-combat` FAILs on draws (+8.4%) because one more goblin is visible (longer fights), not a per-object regression; frame time 2.7–2.8 ms at 59.5+ fps. Per-attack XP labels and hit splats now use one composited transform write per frame (mutations ~229 → ~123/s, layouts ~56 → ~9/s). The baseline is **not** updated; see the PERFORMANCE ledger. Run `npm run perf -- --update-baseline --note "…"` (full suite) to accept it.

### Shared combat formulas and enemy stat sheets — 2026-10-07

- `combat-formulas.js` implements the settled COMBAT.md math as pure functions: damage bounds, Strong Strike, chances, the attack resolution order, per-portion resistance, infusion shares, action timing, requirement effectiveness, backfire, Mana cost, XP curve/caps/pool splits/core conversion, resource maxima/regeneration/display, sprint drain, movement slows, character-sheet attack/resistance/dodge/critical bonuses, Threat and danger bands. Ten tests in `combat-formulas.test.js` reproduce the documented worked examples.
- `combat-rules.js` now holds the Scrapper/Bruiser stat sheets. Their health, damage bounds, interval and Threat are derived through the shared formulas, not literals. Gameplay change: Bruiser attacks every 2.5s (was 2s). Existing combat tests now step 2.5s for Bruiser hits.
- Still prototype: player offense (unarmed 1–3 etc.), the 15% enemy miss, flat shield mitigation, the single Combat skill and the 4-HP practice target. These convert together in the player-progression slice so balance doesn't break midway. The new miss, capability and resistance data is stored but not yet used by the runtime.
- Playground Combat practice: **Show enemy stat sheets** prints production-derived values and flags which ones aren't live yet; an **Enemy stat sheets** table lists every configured input. `.claude/launch.json` adds a `playground` preview configuration.
- Verification: 218 tests, normal and debug builds, and debug isolation passed. A bounded hardware-browser check in the clearing confirmed the derived sheet text and table, and Bruiser hits landing exactly 2.50s apart. With the aggressive fixture, Scrapper and Bruiser now share the 2.5s cadence, so simultaneous hits can appear as one health change. Cinderhold was not checked in the browser; it uses the same `ENEMIES` definitions. No performance run (no rendering or per-frame changes).

### Combat design consolidation — 2026-10-07

- Design-only update: COMBAT.md holds the settled formulas and assistance rules; production remains the prototype described below. DESIGN.md now references the redesign defaults and action semantics.
- First-rollout assistance defaults to Auto / Balanced / Melee / no training goal. Pacifist is available in Manual and Auto and blocks manual and automatic attacks; switching into it cancels unreleased windups. Danger bands: 1 hit (run), 2–3 (flee, retaliation withheld), 4–6 (caution, retaliates), 7+ (no warning).
- Auto deliberately uses actual enemy data for all of its decisions, so no unknown-damage estimate or discovery system is needed. The deferred bestiary is player-facing only.
- Decided 2026-10-07: Optimize ranks gear by damage per second, then incoming-damage reduction, then current gear. Simple Auto aura rules. Auto-heal triggers earlier for slow heals and warns when a heal is insufficient. Style changes map the training goal to the same skill in the new style. Combat preferences persist. The HUD shows all five resource orbs. XP coefficients ship as-is. Threat wording must caveat that it assumes appropriate gear. Cinderhold Basic Training is optional (its refusal branch already allows leaving).
- The unsourced tutorial simulation figures were removed from COMBAT.md; tutorial balance must be validated in-game. Remaining open items are listed at the end of COMBAT.md; none blocks the shared formula/progression module.
- Verification: documentation consistency review and `git diff --check`; no runtime, browser, build or performance checks for this documentation-only change.

### Enemy tuning and pending combat redesign — 2026-10-06

- Shared Goblin Scrapper now has 50 HP and max hit 10; Goblin Bruiser has 100 HP and max hit 20. Minimum hits (1/3), intervals (2.5s/2s), aggression and Scrapper protection are unchanged. Practice targets remain inert at 4 HP.
- Playground combat fixtures use these production definitions; their instructions show the new numbers. Verified fixture spawn/reset in the clearing and production Cinderhold enemies, maximum damage-roll bounds, 208 tests, both builds and debug isolation. No performance suite run.
- The user supplied an older turn-based design as a basis for a real-time combat redesign. Replacement mechanics are awaiting user decisions; do not implement its formulas, XP model, attributes, resource costs, skill curve or recipe changes as settled requirements. Player damage/food have not been rebalanced for the tougher enemies yet.

### Sidebar toggle during dialogue — 2026-10-06

- The desktop collapse/expand tab is mounted directly under body, with its own layer above the dialogue dimmer. It keeps its sidebar-edge/floating placement without raising other gameplay controls above the overlay.
- Existing playground dialogue checkpoints cover this fix; UI practice notes now describe repeated toggling. Bounded hardware-browser checks passed real collapse/expand clicks in Cinderhold and Willowbank, unchanged dialogue lines, viewport recentering and mobile toggle hiding. Both builds and debug isolation passed; no performance suite run.

### Bristle branching introduction — 2026-10-06

- `cinderhold-dialogue.js` owns the revised narrative: slime/backtalk banter, converging first responses, optional training, unseen `???` Threat Level explanation, and persistent refusal/reconsideration. Refusal is area story state, reset with training progress; shared combat is unchanged.
- Shared character dialogue supports explicit player lines and speakers without portraits. Choices still speak through the existing shared response path, exactly once. Existing distraught/concerned expressions cover upset/confused and uneasy.
- Playground arrival/meet/refused checkpoints replay each entry point without tutorial prerequisites. Meet/refused immediately open the conversation; the sarge landmark supports normal repeat interaction.
- Verification: 208 unit tests, normal/debug builds and debug isolation. A bounded hardware-browser check passed arrival, both opening branches, player-spoken choices, unseen narrator, refusal, normal world re-interaction, reconsideration and reset, with no runtime errors; its browser/server were closed. No performance suite was run for this narrative/UI change.

### Interactive minimap and player resources — 2026-10-06

- Shared health, mana and stamina start at 100. `player-resources.js` owns resource pools and sprint timing; `resource-orb.js` shares rendering and white/orange/red number thresholds (>50%, 25–50%, <25%). Mana costs, quick restore and passive regeneration are not implemented.
- The boot toggles double-speed movement, spending one stamina per 0.5 seconds of movement. Idle time does not drain it; exhaustion disables sprint and smoothly resumes walking. Partial drain time survives toggles. Full playground reset restores resources and disables sprint.
- `minimap-controls.js` supports wheel/pinch zoom, keyboard +/- zoom and click/tap movement through the existing shared pathfinder. The minimap marks the current route destination, including an edge indicator outside the view. Clicking uses the displayed map center; pinch/drag does not issue movement.
- Playground Inventory & skills exposes individual resource values and restore/reset controls. The shared `minimap-sprint` performance scenario exercises movement, zoom and sprint.
- Verified: 205 unit tests, normal/debug builds and debug isolation. Bounded hardware-browser checks exercised desktop/mobile movement, destination clearing, approximately 2x sprint speed, exhaustion, exact color boundaries, wheel/pinch behavior, travel and reset without runtime errors. No full tutorial replay was performed.
- Performance: all nine GPU scenarios PASS (~59.5–59.9 FPS). Focused low-perf menus and minimap-sprint PASS; clearing-walk has a timing WARN (-11.9% versus baseline), with no FAILs or baseline changes. See the performance ledger for reports. These measurements precede minor map hit-coordinate/edge-marker polish.
- Performance checks are VERY slow: AGENTS.md and the performance guide now explicitly require sparse milestone runs, never a run after every edit. Existing measurements cover minor follow-up polish.

### Performance testing harness — 2026-10-05

- Added `perf/` (Playwright, dev-only) with `npm run perf`, `perf:full`, `perf:ab` and `perf:baseline`; docs in `docs/PERFORMANCE.md`.
  - Environments: dev-gpu, low-perf, mobile-emu, webkit, plus ci (counters only, planned for GitHub Actions).
  - Eight scenarios are shared with the playground (`src/dev/perf-scenarios.js`).
  - The playground-only probe (`src/dev/perf-probe.js`) times loop phases, GPU time and scene census; the main-loop laps compile away in normal builds.
- The playground **Performance** section prepares scenarios, toggles a HUD and logs a census.
- `scripts/profile-ui.mjs` was folded into the runner and removed.
- `check:debug-isolation` now also asserts no perf probe in normal builds, no Playwright harness in either build, and Playwright as a devDependency only.
- The first perf run's mutation counter found enemy health labels rewriting `hidden` for every enemy every frame (~360 DOM mutations/s while idle). `combat.js` now writes label visibility and text only on change (~4/s). The label was rechecked during real recruit-yard combat: it tracks HP and hides after defeat.
- First data:
  - low-perf clearing-idle misses its 58 fps target (~17 fps, fill-rate bound under SwiftShader). This is the top backlog item.
  - mobile-emu combat holds ~59 fps against a 30 fps target.
  - Travel round trips show no leaks.
  - An A/A check sets the noise floor; see the PERFORMANCE doc.

### 3D render/scene CPU pass — 2026-10-05

- Inactive areas are detached from the scene graph by `area-runtime.js` (not just hidden), so three.js no longer updates ~4,000 off-screen matrices every frame. Activation re-attaches and refreshes world matrices before use.
- `terrain-batch.js` is now the shared static terrain path for the clearing, Willowbank, Cinderhold and the splash garden. `preserve` keeps live-editable materials (the playground grass picker's grass materials) as their own merged meshes; other solid colors are vertex-baked; seams merge per material. `decorate` merges static per-tile dressing (flowers). Ray hits still resolve logical tiles through `terrainHitData`.
- Water bodies render one merged surface, one glint layer and one merged static bed/pebble/shoreline layer. Per-tile animated surfaces and water boxes remain as invisible pick proxies. The 131 always-drawn hidden water box faces in Willowbank are gone. Each water body shares one side material, and colors re-apply only when `waterSettings.color` changes.
- Hover picking happens immediately after pointer movement and otherwise at 10 Hz. It uses the cached game viewport rect and writes tooltip/cursor DOM only when picking. The companion portrait resizes only when its canvas size changes. Companion/goblin rigs cache named-part lookups (`named-parts.js`). Music gain is scheduled only when its target changes. Several per-frame `Vector3` allocations and unchanged idle/progress DOM writes were removed.
- Measured idle in the playground, GPU-backed (M1 Max, same session), main-thread rAF time per frame:
  - clearing: ~4.6 → ~1.3–2.0 ms; WebGL draws ~957 → ~180 per frame;
  - Willowbank: ~3.1 ms (after the area detach) → ~1.9 ms, ~300 draws;
  - Cinderhold: ~2.0 ms;
  - scene objects in the clearing: 5,291 → 419.
- Checks: 198 tests; both builds and debug isolation; click-to-move in all three areas; repeated travel; grass picker on batched terrain; splash garden; normal-build splash/intro smoke check; no runtime errors.
- Not done (optional follow-ups):
  - shadow map still refreshes every frame, now cheap with merged casters;
  - the main scene still renders under fullscreen mobile menus;
  - trees and resources are still per-entity meshes, because they animate and respawn individually.

### CPU investigation and bounded verification — 2026-10-05

- Previous automated checks explicitly forced SwiftShader, moving graphics rendering onto the CPU; a short comparison got ~8 FPS versus ~60 FPS with ANGLE Metal on the M1 Max. No old verification browsers/servers were running when this investigation started; the user's port-5174 server was preserved. Routine checks must use hardware rendering, one browser, bounded lifetime and finally cleanup (see AGENTS/README).
- Removed unchanged per-frame health DOM writes, redundant sidebar layout/navigation/status writes, recipe markup rebuilds and combat-option reconstruction. Recipe caches include inventory, skill levels, busy state and active recipe; combat cache includes learned/selected styles, busy state and retaliation. Cached fixed game viewport bounds refresh through the existing resize/ResizeObserver path, avoiding repeated layout measurements during rendering.
- Four four-second idle samples (Quests, Inventory, Skills, Combat), same 1200×850 GPU-backed clearing setup: sidebar mutations fell from 8,304–8,506 per sample to zero; summed main-thread task duration fell 6.007s → 5.277s (~12%). ~60 FPS retained; layout duration fell to zero during those idle samples. These are short local main-thread measurements, not total-machine CPU guarantees; 3D rendering/shadow/scene traversal work remains.
- `node scripts/profile-ui.mjs` profiles the running playground, reports actual renderer/timings/mutations and saves Chrome CPU profiles under a printed temporary directory. It launches one disposable browser with a 65-second watchdog and cleans up automatically; optional --software runs one explicit comparison. Existing health/inventory/crafting/combat/travel/reset and resize/collapse controls exercise production behavior; playground instructions updated.
- Live regression checks passed health damage/eating completion, crafting busy/completion labels, retaliation toggling, viewport cache updates through desktop/mobile/collapse/restore, Cinderhold and reset. 198 tests and both build variants/debug isolation passed. No frame-rate cap, visual-quality reduction or gameplay timing change was introduced.

### Sidebar persistence and overview refinements — 2026-10-05

- Docked desktop journal now always stays open, restoring its last page when necessary and ignoring dismissal/Escape. Its close control is hidden. Collapse/expand belongs to the player overview; collapsing moves the overview to the upper right with an integrated expand icon and restores the full game viewport. Mobile retains explicit journal dismissal. Guided tutorial controls still use the shared tutorial lock.
- Removed the player name. Health, mana and stamina now share orb frame/gloss/fill styling with separate color variables. Stamina uses a boot icon. Minimap grows to 212px desktop / 172px mobile, shrinking to available space alongside the resource grid rather than overlapping it. Existing playground navigation, travel/reset and icon catalogue cover the changes; instructions updated.
- Verification: desktop at 1200 and 701px checks persistent page, collapse/full viewport, restore and non-overlapping map; Cinderhold checks shared persistence; 320px mobile checks dismissal and layout. Normal/debug builds and isolation passed; 198 tests passed. Screenshots inspected.

### Resource orb overview — 2026-10-05

- Health uses a 48px red orb filled bottom-up from production health, current health number only, with current/max tooltip and accessible meter semantics. A 44px icon-only Quick eat button sits directly below and stays available while the mobile journal is open. The overview reserves three columns/two rows; purple Mana/Quick restore and green Stamina/Sprint toggle are explicitly inactive placeholders (dash values, disabled buttons and coming-soon labels). Desktop minimap is on the right. No mana/stamina gameplay was added.
- Existing playground Restore health/Lose 10 health, Inventory food, combat, reset and travel controls exercise the real UI. Icon sheet automatically includes quickEat/quickRestore/sprint; instructions updated. Browser checks exercised partial/full health, food completion from open journal, clearing and Cinderhold, desktop and 390/320px phone layouts; fresh built-preview checks confirmed both placeholders, disabled actions, minimap right alignment and no overflow at 1200/320px. Screenshots inspected. 198 tests, both builds and debug isolation passed.

### Compact mobile confirmations — 2026-10-05

- Tiny confirmations now opt into shared `compact-confirm` styling instead of fullscreen mobile presentation. Full-health eating is the first use: centered, content-height, safe-area margins, 44px actions, accessible name/message. Project instructions and design document record the exception. Journal Escape handling now defers to any open native dialog, preserving the page behind the confirmation.
- Existing playground Inventory/add-food and Restore health controls cover both quick Eat and Inventory Eat without tutorial replay; instructions explicitly describe confirming/cancelling/repeating. Browser checks passed in the clearing and Cinderhold at 390×844, 320×568 and 650×360: ~120px dialog height, centered bounds, Cancel/Escape preserve food, Eat anyway consumes on completion. Screenshot inspected. Tests, both builds and debug isolation checked.

### Responsive player sidebar and mobile HUD — 2026-10-05

- Viewport/navigation refinement: world dialogue and choices, tips, toasts, area/skill notices, placement controls and desktop utility dialogs center inside the rendered game bounds; their dimming/fades also stop at the sidebar. Embedded mobile lesson tips retain their journal layout. Eat is a compact button beside health (food/count in its accessible label and tooltip). The redundant launcher hides while desktop sidebar/mobile navigation is available, except guided lessons. Mobile uses four fixed primary tabs and a scrollable-height More panel for all optional/secondary tabs, including playground; no horizontal tab scrolling. More closes on selection, outside press, Escape, action, incoming attack, reset and desktop resize.
- Verification for this refinement: 198 tests, both builds and debug isolation passed. Local Chrome checked 1200px desktop, 390/320px phones and 650×360 landscape; clearing tip/sidebar hide/restore, furnace centering, real Eat completion/consumption, Cinderhold dialogue alignment, More selection/Escape/incoming-attack dismissal, and screenshots. Existing playground objective/checkpoint/interface/health/combat controls exercise production behavior; their instructions are updated.

- Persistence refinement: shared menu closing now distinguishes automatic requests from explicit dismissal and tab switching. Desktop ignores automatic dismissal (including travel, story, defeat, reset and Companion lifecycle cleanup), compacting expanded pages instead. Mobile retains automatic dismissal. Verified Inventory through travel/arrival, Combat through defeat/reset, and explicit close/tab switching; playground uses its existing travel, defeat, reset and companion controls.

- Width refinement: sidebar is now 360–420px rather than 300px. Desktop tabs wrap without horizontal scrolling, including the extra Companion/Debug tabs. Verified all nine tabs at 701, 1024, 1200 and 1440px, with at least 44px button widths and correct remaining game viewport. Mobile retains its full viewport. Both builds and debug isolation passed.

- `player-interface.js` composes production journal pages with a shared player overview: name, live health, quick food and a north-up minimap sampled from nearby active-map tiles/enemies. Desktop reserves 360–420px for the sidebar (responsive to viewport width), with wrapping journal tabs instead of horizontal scrolling; hiding it restores the full world viewport and keeps the overview available as a HUD. Closing the journal collapses only its tabbed portion. Expanded pages float beside the overview. Equipment and Combat are journal tabs using the existing gameplay systems.
- Desktop gameplay actions and incoming attacks compact expanded pages without dismissing them. Mobile uses a health/quick-food HUD and minimap, bottom tab navigation, and fullscreen pages. Any resolved incoming attack (including misses) closes the mobile journal and open utility dialogs. Journal item/recipe choices and searches survive reopening; inventory action availability refreshes while food runs. Quick food uses `createFoodSystem`, including movement buffering, confirmation, healing and consumption. Only Cooked Pondfish exists currently; its inventory action assigns quick food. No placeholder mana/stamina systems were added.
- `game-viewport.js` supplies actual renderer bounds for combat labels/hit splats and debug picking. Camera aspect and renderer dimensions follow the game container through ResizeObserver; XP projection uses the same viewport dimensions. Tutorial locks remain on production controls; guided mobile lessons retain their original tab targets instead of proxy navigation.
- Playground coverage uses the real sidebar/tab controls, Inventory and health controls, passive/aggressive combat fixtures, travel and full reset. Instructions were updated; inspection exposes responsive UI/viewport state. Full reset restores the sidebar, compact mode and default quick food. Developer-only state remains compile-time isolated.
- Verification: 197 tests passed; normal/debug builds and debug isolation passed (existing bundle-size warnings remain). Browser checks passed repeated desktop eating without reopening, crafting persistence, expanded-to-compact action/attack transitions, full viewport restoration, mobile incoming-attack dismissal and retained selection, quick food during incoming combat, Cinderhold quick food and Equipment equip, guided mobile Inventory selection, and expanded desktop overview visibility. Screenshots inspected at desktop and 390×844. Production splash/opening smoke check is separate from these checkpoint-assisted flows; a complete fresh-game tutorial replay has not been performed.


### Combat interruption, retaliation and awareness — 2026-10-05

- Shared combat provokes passive creatures only when a melee hit splat resolves or a ranged/magic projectile arrives. Damage, zero damage and misses all provoke; selecting, approaching, winding up and releasing do not. Inert practice targets remain non-retaliating.
- Shared enemy definitions/configuration now carry `aggressive` and `aggroRange`: Scrappers default passive, Bruisers aggressive within four tiles. Awareness respects range, height, sight obstruction, reachability and safe zones. Pursuit and leash return retain continuous walking. Maps can override these properties through the portable enemy factory.
- Auto-Retaliate defaults On in the real Combat menu, responds to incoming attacks including misses, and can be changed during combat. Off does not cancel a manually chosen fight. Preference survives travel; the full playground reset restores On.
- The shared cancellation policy interrupts skilling/utility actions while preserving combat and eating. Food retains the fight target, pauses outgoing attack progress while enemies keep attacking, consumes/heals at normal completion and resumes attacking afterward. Defeat, movement and explicit reset still cancel food. A food request buffered behind the current walking step survives combat interruption.
- Playground Combat offers separate passive/aggressive fixture spawns (three-tile awareness), real fight/reset/remove/defeat commands, and instructions for the existing inventory food and health controls. The real Combat menu exercises retaliation, and inspection exposes aggression/radius/preference. No location-specific combat logic was added.
- Validation: 194 tests, both build variants and debug isolation passed. Regression coverage includes all three attack styles × damage/miss/zero outcomes; passive proximity; aggressive radius/height/walls/safe zones; multiple-enemy reset; retaliation; real food completion during combat and defeat cancellation; real crafting interruption and the shared cancellation policy. Browser checks passed food during combat in the clearing before visiting later maps and in Cinderhold, plus aggressive proximity, toggling retaliation during incoming attacks, food surviving damage received while eating with retaliation Off, preference persistence through real travel, and full playground reset. The 390×844 Combat menu fills the screen without overflow and has a 47px retaliation button. Existing bundle-size warnings remain. These are focused checks, not a full tutorial replay.


### Finish the current step before inventory actions — 2026-10-05

- Shared `after-step.js` buffers one stationary action while the current movement segment finishes. Food, inventory crafting, and campfire placement use it through their production start functions. The remaining route and old interaction target are cleared, but the active step and player position remain intact. Requirements are rechecked at arrival; consumption and action timers do not start while queued.
- The latest valid action replaces the pending request. New movement/interactions, travel, defeat, and resets clear it through shared cancellation. Full-health food confirmation is shown after arrival. Station/resource interactions already approach their targets before starting and retain their existing flow.
- Playground coverage: normal Eat/Craft/Place buttons during movement, inventory and health controls, and area resets exercise the real implementation. The debug-only inspection state exposes player position, current step, queued action, and eating state. Instructions are included in the playground UI.
- Verification: 178 tests, normal/debug builds, and debug isolation passed. Browser checks confirmed no immediate position jump or backwards travel, arrival at the current step destination before food/crafting/placement, both upward and downward steps, and food/crafting in the clearing before visiting Cinderhold and again in Cinderhold. New movement and area-reset checks cancelled pending food without consumption; no browser runtime errors were reported.

### Attack momentum and bow face anchor — 2026-10-05

- Shared punch/stab/slash poses pull the off hand slightly backward and turn the torso about seven degrees in the user-corrected positive-yaw direction at impact, then settle during recovery. This also carries an equipped shield; blade rotation keys and combat timing remain unchanged.
- Setup combines the rightward torso turn, upward/sideways bow sweep, and arrow-hand placement. All three finish at a single fixed full-draw bow transform, followed by a short set beat before the draw starts. Live archery applies its already-eased authored poses directly, avoiding a second smoothing pass that lets the grip keep settling after the draw begins. During draw, the torso and bow-holding hand remain fixed; only the string hand pulls straight back to the face. Tests assert that setup contains the sweep and that the bow has no translation or rotation during draw. The arrow stays aligned with the string and target. Shield blocks preserve the main hand’s relaxed carry rotation instead of standing its weapon upright.
- Existing playground Attack overrides, main/off-hand equipment controls, looping/restart, and live equipped attacks fully expose these changes for all slime rigs. Validation: 175 tests, both builds, and debug isolation passed, including off-hand momentum, the cross-body bow sweep, face contact, hand clearance, arrow/string alignment, and main-hand orientation throughout shield blocks. Browser checks inspected impact/full-draw frames and completed live bow combat in the clearing and Cinderhold with no runtime errors.

### Relaxed weapon carry and windup — 2026-10-05

- `equipmentIdleHands` supplies the shared lowered sword/dagger/bow carry pose in gameplay and model previews, including attack/block starting and recovery poses. Dagger aiming is brief and angles inward once the hand clears the body; sword retains its rear/slash rotation keys; bow raises along a clear outward arc before drawing.
- Bow rests horizontally with the string above the wood. Its ready position is between center and left, nearer the face. Shared `bow-presentation.js` attaches an arrow to the drawing hand and rotates it into alignment before draw; it hides on release, cancellation, and non-archery actions. The draw retains its off-hand wooden grip, main-hand string contact, and forward arrow aim. Recovery returns smoothly to carry.
- Playground coverage remains Idle/Sliding plus Attack/Block with independent equipment on all slime models, and live equipped combat. Validation: 172 tests, both builds, and debug isolation passed; tests cover both bow hands through lift/draw/recovery, horizontal carry orientation, and hand-held arrow alignment and release. Browser inspection covered carry, arrow pickup/rotation, full draw, and stab impact; live bow combat completed in the clearing and Cinderhold without runtime errors.

### Combat pose polish — 2026-10-05

- Shared stab starts at the idle hand position. Slash translation follows an outward curve around the body while preserving the blade rotation and attack timing.
- Bows remain main-slot, two-handed equipment, but the shared held-tool attachment mounts the wooden grip in the off hand. The main hand follows the string as the torso turns through the draw; the arrow stays aimed forward. Bow blocking uses the same corrected attachment.
- Existing playground Attack motion overrides and independent equipment selectors expose these changes on the player and every mentor; live equipped attacks use the same production functions.
- Verification: 170 tests passed, including sampled hand clearance, preserved slash rotations, and bow grip/string alignment. Normal/debug builds and debug isolation passed. Browser checks inspected player/mentor poses and completed real bow target combat in the clearing before travel and in Cinderhold, with no runtime errors. These checks were focused combat checks, not a fresh full tutorial playthrough.

- `src/cooking.js`: app-owned cooking action, Culinary XP, cancellation, station availability, and one-recipe completion. `src/recipes.js`: shared recipe catalogue and material/tool helpers.
- `src/cooking-menu.js` / `.css`: shared recipe picker and details. The debug interface preview opens with no station and cannot cook; it must not move the player, change maps, or grant items. A real campfire provides the station context.
- Cooking header/close-button bugs came from global `header`/`footer` styles. Those styles were scoped, and the cooking UI uses its own classes.
- `src/campfires.js`: app-owned placement mode, ghost, validation, approach/placement, station clicks, packing, animation/highlights, and reset. `campfire-model.js`, `campfires.css`, and `placement-rules.js` supply shared presentation/rules.
- Campfires no longer require visiting/being in Willowbank or a special meadow flag. Clear reachable land works by default; water, occupancy, explicit non-buildable structures, and unreachable tiles reject placement. The existing one-fire-per-current-map limit is preserved. Stations retain their original tile instances across travel; matching coordinates in another map do not identify the same station. Packing refunds one Campfire.
- `src/recipe-crafting.js`: app-owned inventory recipe crafting, used for the additional tool/fire recipes previously run inside Willowbank. `main.js` drives it independently of the current area. The introductory axe/pickaxe recipes now use this same controller; the legacy activities loop has been removed.
- Willowbank now receives campfire/cooking/crafting completion callbacks for narrative. It no longer implements their generic placement/cooking/crafting actions.
- Companions already have app-owned behavior in `companions.js`, with shared model, follow logic, menu/naming, animations, and feedback modules. Willowbank retains the stranded-animal rescue script.

## Shared-system ownership — current audit

The requested crafting consolidation and compatibility cleanup are implemented. Area narrative remains local and calls shared systems. Keep future additions aligned with these boundaries.

| System | Existing coupling | Intended separation |
| --- | --- | --- |
| Fishing | Extracted: app-owned action, skill, spot lifecycle, and rod/catch presentation. | Willowbank configures placement and observes start/catch for narrative. The clearing playground uses the same implementation before any visit. |
| Carpentry | Extracted: app-owned action/skill and portable bridge entity. | Willowbank configures availability and observes progress/completion for injury, terrain transition, and rescue. |
| Eating and health | Extracted into app-owned `player-health.js`; Willowbank owns its scripted injury and observes food completion. | Combat owns shared defeat/recovery. Food and health no longer require an area visit. |
| Gathering, chopping, mining | Extracted: shared resource prefabs and app-owned action/depletion/respawn controller. | Areas configure finite/respawning placement and observe rewards for narrative. Ground pickups stay walkable. |
| Combat and equipment | Extracted into app-owned combat/equipment and portable enemy entities. | Normal Willowbank remains peaceful; explicit playground fixtures exercise the shared implementation in any map. Sword/shield recipes and equip actions are available without area gates. |
| Skill/action/menu ownership | App-owned skills (including Culinary), one inventory recipe controller, and shared journal pages. | Tutorial supplies guidance and observes action callbacks; no chapter recipe/skill wrapper or separate introductory timer. |
| Model catalogue dependencies | Portable factories are imported directly from shared modules; the Willowbank re-export barrel is removed. | Reed uses `fisher-model.js` in gameplay and the catalogue. Map rules export only layout/configuration. |

The two requested cleanup items are complete in code. Cinderhold now implements the third-area combat narrative; see the latest implementation section below. This is not a claim that every generic actor uses an identical schema: non-resource actors retain their own lifecycle fields; resources now share `depleted`.

## Design details worth preserving

- Clearing: opening/customization, movement/camera, gathering/XP/levels, menus, crafting, chopping/mining, Iter Crystal, optional practice reward/top hat.
- Willowbank quest: **Broken Bridge Rescue**. Dialogue, carpentry, companion rescue/naming, fishing, fire placement, cooking, eating. Reed is a fisher slime; the stranded corgi is a local animal, not initially Reed's pet. Combat is taught in Cinderhold, the third area.
- Bridge work causes a one-off minor injury to motivate healing. Do not turn all carpentry into random injury or make this a universal rule.
- Cooking chooses a recipe and cooks one item, not a quantity prompt. Tutorial needs one Pondfish. Preserve reward/consumption timing and avoid double rewards when interrupted.
- Models, animations, expressions, hitboxes, feedback, and resource lifecycle should be consistent across maps, splash, and previews.
- Menus/utility popups default to edge-to-edge fullscreen on mobile. Dialogue/tips/toasts are exceptions. Tutorial information is distinct from objectives; quests retain task history. Model viewer animations and expressions are separate, with Default/automatic expressions.
- Terrain uses half-height increments, no ramps, automatic half-height traversal, safe routes for taller elevation changes. Ground items do not block walking.

## Validation and playground entry points

Commands: `npm test`, `npm run build`, `npm run build:debug`, `npm run check:debug-isolation`. Normal dev: `npm run dev`; debug dev: `npm run dev:debug` (default port 5174). Deploy the normal `dist` output, not `dist-playground`.

Last recorded validation for the shared campfire/crafting change:

- 109 unit tests passed; both builds and debug-isolation check passed. Vite still reports the existing large-bundle warning.
- Browser-tested in clearing, without a Willowbank visit: craft a Campfire (materials spent, +20 Crafting XP), place via actual pointer input, open it, cook one fish, pack it back into inventory.
- Browser-tested Willowbank campfire cooking still advances the tutorial to eating.
- Ran the unified playground checkpoint-loading sweep without reported runtime errors. Loading a checkpoint is not a substitute for completing its entire tutorial flow.
- New regression files: `campfires.test.js`, `recipe-crafting.test.js`, and `cooking.test.js`. Coverage includes map identity/persistence, cancellation, invalidated placement, packing refunds, reusable tools, and one-time rewards.

To reproduce without adding a special location-specific shortcut: use debug Inventory controls to add Small Logs ×2, Flint and Stone ×1, and Raw Pondfish. Open Crafting, craft Campfire; open Inventory, select Campfire, Place; interact to cook; Pack. Repeat in a second area. The Cooking UI preview deliberately has no usable station.

Browser checks used an isolated headless Chrome with software WebGL and temporary CDP scripts under `/tmp`. Those scripts are session artifacts, not a durable test suite. No test server/browser was intentionally left running. Do not assume their presence or stop user-owned servers.

## Eating/health extraction — 2026-10-04

- `player-health.js` owns bounded player health and timed food consumption. `main.js` owns its update, cancellation, full-health confirmation, and HUD. Inventory exposes Eat before any Willowbank visit. Existing eating motion/expression is reused.
- Willowbank observes successful meals for its tutorial and uses the shared health object for its scripted bridge injury and legacy combat. Combat/defeat orchestration, equipment gates, fishing, carpentry, and resources remain coupled; this change does not claim those extractions are complete.
- Playground coverage: existing Player health controls restore/damage the shared state; Inventory controls grant Cooked Pondfish, and the production Inventory Eat action exercises completion and full-health confirmation. Movement cancels; Full test area resets health and cancels work. Willowbank Eat checkpoint exercises the same shared controller and tutorial callback.
- Validation: 112 tests passed; normal/debug builds and debug isolation passed (existing bundle-size warning). Isolated Chrome exercised clearing eating before a chapter visit (20→30 health, one fish consumed), repeated full-health consumption with confirmation, movement cancellation (no consumption/healing), and Willowbank Eat checkpoint completion (phase finished, one meal observed). Checkpoint validation does not represent a full tutorial replay. Unit tests also cover missing food, confirmation cancellation, repeated completion, and health bounds.

## Fishing extraction — 2026-10-04

- `fishing.js` owns the action, skill, tool/reach checks, skill-adjusted wait, one-time fish/XP reward at the bite, and cancellation. `main.js` drives it independently of the chapter and exposes Fishing directly to normal Skills and playground controls.
- `fishing-spots.js` owns portable spot registration, hit targets, ripples, highlights, availability, and removal. Tile identity prevents spots from another map with matching coordinates from being used. `fishing-spot-model.js` supplies the same model and motion to the catalogue.
- `fishing-presentation.js` owns the player's rod and caught fish, using existing cast, hook, line-anchoring, and celebration animations. Willowbank retains only its spot placement and tutorial start/catch observers. First-catch dialogue waits for shared actions, movement, and journal use. Removed stale area-owned eating-update and fishing-preview timing branches.
- Playground: World & water → Fishing practice documents the clearing pond fixture at (4, 4). Add a Crude Fishing Rod through Inventory controls and click the ripples. Skills controls adjust Fishing XP/levels; the model viewer exposes cast, wait, catch, and celebration; Full test area cancels and resets rewards. The fixture, its instructions, and inspection state remain behind the compile-time flag. Full test area now restores clearing visibility after customization preview; browser-verified a catch after that reset.
- Validation: 119 unit tests, both builds, and debug isolation passed (existing bundle-size warning). Browser checks covered the real pointer path in the clearing before any chapter visit: missing rod, cancellation before the bite, repeated catches, one-time reward timing, opening Inventory/skipping the flourish without losing rewards, and reset. Willowbank's fishing checkpoint awarded one fish/20 XP and advanced to Flint with delayed dialogue. A separate actual crystal-travel run verified retained rewards and fishing in Willowbank's initial meet phase, before its quest began; returning to the clearing preserved rewards and allowed a third catch. Unit tests cover return-map identity, invalidated/removed spots, reusable tools, configured loot, and rod-line anchors.
- Remaining extraction order: carpentry, resource action/lifecycle consolidation, combat/equipment, then remaining skill/model/UI adapters. Fishing does not remove those other area dependencies.

## Carpentry extraction — 2026-10-04

- `carpentry.js` owns the app-level skill, tool/material checks, skill-adjusted timing, progress stages, cancellation, material consumption, XP, and repair motion. Targets configure recipe/stages and availability and receive start/progress/completion callbacks. A target may pause for local narrative without spending materials early.
- `carpentry-bridge.js` owns the portable bridge model, picking, highlight, progress, completed interaction state, reset, and map identity checks. `bridge-model.js` and `tool-models.js` now supply gameplay and catalogue factories. Willowbank retains the bridge quest gate, scripted finger injury/dialogue, terrain transition, and rescue sequence.
- Playground: World & water → Carpentry practice documents the clearing fixture at (2, 4). Inventory grants hammer/logs, Skills adjusts Carpentry, the model catalogue reuses real hammering/bridge models, and Full test area cancels and resets the fixture and rewards. These controls and the fixture stay behind the playground flag.
- Validation: 122 tests; normal/debug builds and debug isolation passed (existing Vite bundle-size warning). Browser exercised real pointer interactions in the clearing before any Willowbank visit: missing hammer, movement cancellation, completion with three logs consumed/hammer retained/40 XP, full reset, and repeated completion. Willowbank's repair checkpoint exercised the injury pause at 25 health, resumed repair, exactly three logs/40 XP, and companion crossing/acquisition. Screenshots inspected for clearing completion and injury dialogue. This is checkpoint coverage, not a complete replay from the opening. Unit tests cover travel/map replacement cancellation and return-map identity; actual crystal travel was not rerun for this extraction.
- Next: resource action/depletion/respawn consolidation, then combat/equipment and remaining UI/model adapters. Existing earlier verification notes are historical snapshots.

## Resource extraction — 2026-10-04

- `resource-entities.js` owns shared tree/boulder/ground-bundle models, picking, highlights, and occupancy. Both maps now place those prefabs. `resource-actions.js` owns the app-level gathering/chopping/mining action, tool and reach checks, skill speed, hit feedback, committed depletion, one-time rewards, cancellation, reset, and respawn. `resource-rules.js` supplies the shared tool-work roll. Removed the obsolete chopping/mining factories and migrated their coverage to the real controller tests.
- User decision: trees/boulders in every area use a 3–6 second base duration and 1–3 item yield. Skill levels reduce duration. Clearing resources remain finite for opening/practice objectives; Willowbank configures eight-second respawns. Ground bundles yield one item. All successful actions award 20 corresponding skill XP.
- Solid respawns wait for a free tile, including player movement reservations, companion occupancy, and placement reservations. Ground pickups never block walking or clear another occupant. Off-map depletion/respawn pauses and resumes on return; unfinished work cancels on map identity changes. Reset removes queued depletion rewards and respawns.
- Narrative callbacks remain local: clearing XP/chop/mine guidance and Willowbank Flint progression observe shared rewards. Generic resource work no longer depends on a crafting tutorial stage. Existing `felled`, `collected`, and `opened` flags are aliases for one shared depletion state, retained for opening/finale/UI adapters; those adapters remain an explicit cleanup item. Crafting's introductory axe/pickaxe path and combat/equipment still require later consolidation.
- Playground coverage: existing Inventory/Skills controls, real map resources, model catalogue animations, targeted clearing resets, Full test area, and Willowbank checkpoints exercise the shared implementation. Resource picking instructions describe cancellation/repeat/respawn. Repeated clicks no longer cancel work through the playground stop hook. Fixed Willowbank checkpoint setup to create the clearing return crystal using the production helper, so actual return travel has a landing point.
- Validation: 126 tests passed; both builds and debug isolation passed with the existing Vite bundle-size warning. New controller tests cover all five resource kinds, missing tools, bounded rolls/skill speed, cancellation/restart, map identity, delayed single rewards, pending-depletion reset, return-map continuation, and occupied/reserved respawns. Browser checks passed clearing pickup, chop cancellation, chop/mine completion, Full test area reset/repeat; Willowbank shared chopping, timed respawn/repeat, Flint-to-fire narrative; clearing gathering/chop/mine tutorial checkpoint callbacks and non-restarting repeated clicks; Willowbank pickup in the meet phase and actual crystal return with inventory/XP preserved. Inspected the clearing reward screenshot. Tutorial checks used checkpoints rather than a full opening replay. Test server and isolated browser were stopped afterward.
- Next: combat/equipment extraction, then remaining skill/model/UI adapters and introductory crafting consolidation.

## Combat and equipment extraction — 2026-10-04

- `combat.js` owns the app-level Combat skill, timed attacks, hit/miss and damage rules, pursuit/reengagement/leashing, configured patrols, enemy defeat/fleeing, reset/cancellation, and player defeat/recovery. `combat-rules.js` retains the existing balance. `enemy-entity.js` and `enemy-model.js` supply portable models, picking, health labels, highlights, and animation. Willowbank no longer owns enemy placement, combat state, equipment, or defeat handling.
- `equipment.js` owns sword, shield, and top-hat state, inventory validation, and equip actions. `equipment-presentation.js` owns worn models and held weapons. Gear persists across travel/defeat; losing the last item unequips it. The clearing finale retains only its reward/held-hat celebration. Sword/shield recipes, equip actions, and Combat skill are now available without an area visit; this supersedes older notes about hidden recipes.
- Maps configure enemy placement/patrol bounds and provide world/respawn context. No normal map gains combat encounters or objectives. Defeat prefers a safe crystal-adjacent tile, falls back to a free current-map tile when no crystal landing is available, and waits if none is safe. Returning enemies wait for occupied home tiles rather than overlapping another entity. Cancellation and map identity checks prevent stale fights or duplicate rewards.
- Playground: Combat → Combat practice explicitly spawns both shared enemies near the player in the current map, approaches/fights either, resets/removes them, or triggers the real defeat/respawn flow. Inventory, Skills, health, normal crafting/equipping/eating, and the existing model catalogue exercise the shared systems. Full test area removes fixtures and resets gear/XP; current-area reset removes combat fixtures. Fixtures, commands, and inspection state remain behind the compile-time flag; debug isolation now checks their markers. Companion updates continue during combat.
- Validation: 134 tests passed; normal/debug builds and debug isolation passed with the existing Vite bundle-size warning. Controller tests cover equipment/stale actions/missing items, hat state, unarmed/equipped wins and single XP, misses/shields/protected training health, pursuit/reengagement/leash, occupied homes, repeated defeat with unavailable/safe respawn, inventory preservation, map replacement, removal, and configured wandering occupancy. Browser checks passed sword/shield crafting and unarmed/equipped wins in the clearing before a Willowbank visit; pointer retreat/pursuit/leash; real enemy-caused defeat and repeated recovery with gear/items retained; explicit second-map combat before Reed's quest with narrative unchanged; actual crystal travel preserving equipment/Combat XP; shared top-hat equip/presentation/travel and unequipping on removal; enemy-model pointer picking and live wandering. Inspected equipped-combat screenshot. Test server and isolated browser were stopped afterward. These are focused flows/checkpoints, not a complete tutorial replay or a new third-area implementation.
- Remaining work: consolidate introductory axe/pickaxe crafting with the shared recipe path; remove historical chapter/skill/UI adapters and resource flag aliases where useful; audit remaining model/export ownership. Third-area layout and combat narrative remain design work, distinct from this shared-system extraction.

## Dialogue button style repair — 2026-10-05

- Corrected the accidental `#character-dialogue button button` selector introduced in the earlier shared-system extraction. Character dialogue buttons once again receive their theme background, text color, border, and rounding; the continuation prompt retains its explicit transparent override.
- Existing Willowbank → Reed conversation playground checkpoint covers the production dialogue implementation. Browser-checked its three actual response buttons at 1000px and 390px widths: themed purple background/cream text, solid borders, 10px corners, and 54px height. No new playground controls needed. This was checkpoint coverage, not a full opening replay.
- Normal/debug builds and debug isolation passed (existing bundle-size warning).

## Action marker completion repair — 2026-10-05

- Stationary movement feedback previously called `complete()` with a partial list of busy-system guards, omitting cooking, eating, shared recipes, and combat. It could overwrite an active action's marker on its first frame. Movement now calls `arrived()`, which only completes an approaching marker; gameplay completion callbacks retain ownership of “Done!”.
- Regression coverage drives the real cooking controller and feedback through the frame ordering, repeated completion, cancellation, ordinary arrival, and other action labels. All 135 tests, both builds, and debug isolation passed (existing bundle-size warning).
- Existing playground Inventory/place/cook controls and Willowbank Cook checkpoint fully expose this fix. Browser screenshots confirmed “Cooking” with spinner before reward in both areas, and “Done!” at reward in the clearing before visiting Willowbank. Willowbank completion awarded food/XP and advanced to eating dialogue, which clears the marker. Willowbank pointer targeting required camera rotation to avoid a foreground tree. These are focused checks, not a full tutorial replay.

## Crafting consolidation and legacy adapter cleanup — 2026-10-05

- `recipes.js` now includes Crude Axe and Crude Pickaxe; `recipe-crafting.js` owns all inventory crafting. Removed `activities.js` and the separate main-loop action/timer. Both tools retain Sticks ×1/Rocks ×1 and a two-second level-1 duration, now using the same Crafting-level speed adjustment as other recipes. Materials/output/20 XP commit once on completion; explicit cancellation notifies narrative, and repeated starts cannot replace active work. Shared crafting also owns the timing callback used for crafting audio.
- `game-menus.js` owns recipe rendering/availability, skill-adjusted duration display, Inventory, and Skills. Main and the journal call those pages directly. The crafting tutorial only supplies guidance/navigation locks and observes shared start/cancel/complete events. Recipes use canonical item IDs (`axes`, `pickaxes`) throughout, including journal guidance and checkpoints. Removed obsolete tutorial `canChop`/`canMine` and chapter recipe adapters. Culinary is read directly from app-owned cooking for normal menus, playground controls, and reset.
- Resources expose `kind` and one `depleted` state; removed `type`, `felled`, `collected`, and `opened` aliases. Picking, highlights, practice goals, and both maps use the canonical fields. Shared resource reset supports depleted checkpoint fixtures without rewards or queued respawn. Finale/Willowbank resets no longer repeat resource lifecycle transforms themselves. Other actor types retain their own lifecycle fields.
- Removed the Willowbank shared-model export barrel and recipe/placement re-exports. Reed's rig is in `fisher-model.js`, reused by gameplay and the existing model catalogue. Removed the redundant Willowbank resource matching wrapper and finale/inventory hat-equipment adapters; shared equipment owns reconciliation and normal inventory actions.
- Playground coverage: existing Inventory/Skills controls and normal Crafting page exercise every recipe in both maps; instructions now describe tool crafting/cancellation/level timing. Guided axe/pickaxe checkpoints use the same controller and pages. Resource controls, map resources, Full test area, practice reset, and model catalogue remain production-backed. No new debug-only production controls were introduced.
- Validation: 136 tests passed, both builds passed, debug isolation passed, and diff whitespace checks passed. Existing Vite bundle-size warning remains. Regression coverage includes both tools' exact reward timing, cancellation/restart, missing ingredients, duplicate starts and skill speed; menu use without tutorial/area adapters; and resource checkpoint reset without pending rewards/respawn.
- Browser verification: clearing before Willowbank—Culinary visible, axe completion, pickaxe movement cancellation/retry/reward, desktop/mobile recipe pages; guided axe completion and continuation, guided pickaxe cancellation/retry/completion; both tool recipes and level-adjusted duration in Willowbank before its quest; actual return-crystal travel preserving tools/XP. Clearing pickup/chop/mine, cancellation and Full test area repeat passed. Willowbank chop/respawn/repeat passed (use gameplay-state polling on software-rendered browsers; a fixed wall-clock wait can expire before the simulation timer). All 24 affected menu/crafting/practice checkpoint loaders passed, plus shared hat equip/removal. Normal production startup reached opening dialogue without runtime errors or the playground API. These are focused real interactions/checkpoint checks, not a complete opening-to-finale replay.
- The requested two cleanup items are complete. The next feature is not implied by this cleanup; area-three layout/combat narrative remains separate design work. Temporary browser and production preview were stopped; the pre-existing playground server was left running.

## Boundary audit clarification — 2026-10-05

Completing the two cleanup items above does not establish that all reusable behavior is separated from maps. A follow-up code inspection confirmed these remaining boundaries to address:

- Travel/crystal lifecycle: `tutorial-finale.js` still owns generic travel validation, fade timing, crystal interaction/idle motion and a hardcoded clearing-versus-destination transition. Extract reusable travel/crystal behavior; retain the clearing's reveal, quest and reward narrative locally.
- App orchestration: `main.js` directly combines opening/finale/Willowbank busy state, camera focus, cancellation and a two-area visibility switch. Introduce an active-area interface and shared transition/input coordination before treating additional maps as configuration-only additions. Story completion callbacks themselves are legitimate integration, not defects.
- NPC presentation: Reed's model and conversation facing are shared, but his idle body/hand animation still lives in `willowbank.js`; the catalogue uses the generic slime preview motion. Extract the production NPC idle behavior and reuse it in the catalogue.

The verified skill/action controllers and menus are portable across the two current maps. That is narrower than a complete architecture audit or a guarantee that adding a third area requires no application changes.


## Travel, active-area routing, and NPC presentation cleanup — 2026-10-05

- Addressed the three boundaries in the audit above. `travel.js` owns destination validation, fade timing, switching, cancellation and arrival notification. It rechecks the destination and source at the switch, rejects repeated requests, and enters the destination quietly if cancelled after the switch. `portal-spawn.js` supports occupied landing exclusions. Tutorial finale retains crystal reveal, practice/reward sequencing and quest completion callbacks.
- `crystals.js` owns portable crystal actors, picking, readiness, highlights, interaction and removal; `crystal-model.js` owns their model and floating animation. Clearing and Willowbank use the same implementation. Removing a crystal cancels its pending travel and removes its picking/occupancy state.
- `area-runtime.js` registers arbitrary areas and routes active visibility, tile identity, lifecycle, input state, camera focus, animation and narrative events. Main registers current area content and hooks; the old two-way switch and cross-area busy/camera combinations are removed. Clearing content now has one parent group, preserving individual entity visibility across trips. NPC/chest narrative interactions route through the active area. Opening presentation and area registration remain application composition; this is not a claim that every line of main is map-independent.
- `fisher-model.js` exports Reed's production idle motion, used by Willowbank and the model catalogue. Removed the catalogue's obsolete generic Reed animation branch. Crystal previews also use production motion without importing gameplay controllers.
- Playground: World & water → Travel practice exposes destination travel, walking to the current crystal and cancelling travel; existing reset/checkpoint controls and model viewer cover reset, narrative and presentation. Controls and inspection state remain compile-time gated; isolation checks include their markers.
- Validation: 142 tests passed, including arbitrary three-area routing, one-time entry/reward, cancellation before/after switching, blocked/occupied destination revalidation, source removal, repeat trips, crystal identity/lifecycle and production/preview motion agreement. Both builds and debug isolation passed with the existing bundle-size warning. Browser checks covered cancellation on both sides of the switch, repeated travel, actual approach to the return crystal, inventory preservation and reset. All 24 affected menu/crafting/practice checkpoint loaders passed; Reed and crystal previews opened/restarted successfully; normal production startup reached opening dialogue with no runtime errors or playground API. Inspected the clearing screenshot. Final affected tests and both builds/isolation passed after the last edits. These are focused interaction/checkpoint checks, not a full tutorial replay. Temporary browser/production preview were stopped; the pre-existing playground server was left running.

## Third tutorial design draft — 2026-10-05

- Added [CINDERHOLD.md](CINDERHOLD.md), a planning document only. The requested direction is a rocky/cavern combat area with an angry drill-sergeant slime, a dwarf-like mining/smithing guide, unarmed combat → copper mining → furnace ingots → anvil/hammer dagger and shield → tougher fight, plus optional bow/arrows and magic mentors.
- Replaced the superseded area-three sword/shield tutorial outline in DESIGN.md with a linked overview. Existing Stone Sword/Wooden Shield gameplay remains intact. The draft includes a shared three-destination Iter Crystal picker, architecture boundaries, playground coverage, and normal-flow/cross-map acceptance criteria.
- Working names, recipe quantities, Smithing/Combat skill assignments, optional-style resource rules, and destination availability are proposals for review. In particular, making all three destinations available after the first crystal reveal is a proposed refinement of the earlier linear tutorial order.
- Code inspection confirmed that shared area/travel/crystal infrastructure and melee already exist; equipment still uses item-specific boolean slots, crystals still request a fixed destination, and copper stations/ranged/spells are not implemented. No runtime changes, builds, or gameplay validation were performed for this documentation-only change.

## Third tutorial ownership and world-scale review — 2026-10-05

- User accepted the overall Cinderhold direction and requested the largest tutorial area so far, with tutorial maps escalating toward a massive open world streamed in nearby chunks.
- CINDERHOLD.md now proposes roughly 40 × 32 tiles and at least twice Willowbank's reachable floor area, with larger connected chambers, optional side wings/outer loop, and a short legible required crafting route. Dimensions remain a layout proposal; the size progression is a requirement.
- Tightened ownership for safe zones/protected encounters, supply refill offers, one-time item/spell grants, practice targets, generic progression events across areas, registry-driven destination UI and scoped lifecycle/reset. These must be shared systems/definitions; Cinderhold supplies placement/configuration and story/tutorial only. Added corresponding cross-map playground and acceptance coverage.
- DESIGN.md records the future continuous chunk-streamed world and shared residency/lifecycle/spatial-query requirements, stable logical identities, retained state, travel readiness and future streaming playground coverage. Existing tile identity/pathfinding/whole-area activation are not claimed to support streaming. Implementing the open-world streamer is separate from the current chapter plan.
- Documentation review only; no gameplay changes or runtime/build verification. Check numerical layout and performance targets during implementation.


## Cinderhold first playable implementation — 2026-10-05

Cinderhold is playable through the normal Iter Crystal destination menu. The required chapter covers Bristle's unarmed Scrapper fight, Borin's copper mining → furnace ingots → anvil dagger/shield chain, equipping both items, and the Bruiser fight/graduation. Fletch's bow lesson and Wisp's Spark lesson are independent optional quests. All three destinations are available after the clearing's crystal reveal; Willowbank remains the recommended second stop.

- Layout: 40 × 32 bounding grid, 1,244 placed tiles and 1,089 walkable floor tiles before entities, compared with Willowbank's 416/285. Connected slate halls, copper terraces, arches, forge and side wings establish the first dungeon visual pass. `terrain-batch.js` merges static terrain in spatial groups and preserves per-tile ray picking. This is rendering batching, **not chunk streaming**; area residency/pathfinding still use the existing whole-area model.
- Area ownership: `cinderhold.js` owns placement, dialogue and quest sequencing; `cinderhold-rules.js` owns layout and narrative progress rules. Shared gathering handles copper, `station-crafting.js` handles furnace/anvil transactions and Smithing, `equipment.js` owns item-based slots and two-handed conflicts, and `combat-styles.js` owns learned Spark/style state. `combat.js`, `combat-range.js` and `projectile-effects.js` supply shared ranged/magic combat, wall obstruction, projectile timing, ammunition and encounter lifecycle. Inert targets do not retaliate or award XP. `supply-offers.js` owns reusable supply/grant rules; maps only invoke configured offers.
- Presentation: `training-models.js`, `world-actors.js` and existing shared motion/face modules provide portable mentors, stations, ore, equipment and target models. `destination-menu.js` reads the area registry; `combat-style-menu.js` selects equipped weapon/bare hands or a learned spell. Station and utility dialogs use fullscreen mobile layouts. Area events are broadcast so relevant generic actions can advance an entered chapter while performed elsewhere.
- Playground: 16 Cinderhold checkpoints, landmark jumps, portable production fixtures in any map, supply/spell controls, area/full resets, new item/skill controls, interface previews and shared model entries. Fixtures use real controllers and stay hidden in other maps. Full reset clears shared spells/supply grants as well as gear/items/skills; area reset restarts local narrative and encounters. Preview station/destination menus cannot craft or travel without a real source.

Validation: **154 tests passed**, normal and playground builds passed, and `npm run check:debug-isolation` passed. Vite retains its existing bundle-size warning. Added tests cover station transactions/cancellation, item slots, supply/spell state, ranged line of sight, projectile timing/ammo, inert targets, map reachability/size, narrative ordering and batched tile picking.

Browser verification used compiled builds and real pointer interactions with checkpoint-assisted setup: unarmed victory/referral, four ingots and copper equipment crafting/equipping, equipped Bruiser victory/graduation, both optional target/live-enemy lessons, and all 16 checkpoint loaders. Portable furnace/anvil/Spark worked in the clearing before visiting either later chapter; smelting also worked in Willowbank before Reed's quest. Every directed crystal route among the three maps preserved inventory and learned spells. Additional checks covered station cancellation without material loss, supply-food healing, companion travel, current-area reset, new model catalogue entries, and desktop/mobile menu rendering. No runtime errors were recorded. A representative forge view reported 247 render calls/53,694 triangles on the test browser; this is not a device performance benchmark.

Verification limits and follow-up: the normal build passed opening/customization/first journal-lesson smoke checks and exposed no playground controls. The full fresh-game sequence through all three chapters has **not** been replayed continuously; checkpoint-assisted chapter checks do not replace that acceptance pass. Environmental dressing, longer authored camera beats, device performance and combat tuning remain polish. No open-world streamer, durable save system or mana system was added. Existing architecture audit notes remain historical evidence, not a claim that every legacy system was re-audited in this change.


## Dialogue ownership and Cinderhold presentation repairs — 2026-10-05

- Found a real shared-system boundary leak: Willowbank manually echoed response text through its own `playerLine` wrapper, while Cinderhold ran choice callbacks immediately. `character-dialogue.js` now always presents a chosen option as a left-side player line and waits for continuation before running its callback. Choice data may supply a player expression; it cannot opt out of the spoken line. Removed Willowbank's duplicate choice echoes. Its scripted injury utterance remains narrative. The application supplies the current player name/model, ticks dialogue once regardless of area, and reads the player expression directly from shared dialogue.
- Cinderhold no longer forces the shared Point animation whenever a mentor speaks; mentors retain their ordinary idle hands. Bristle's shared model now wears a brimless iron helmet with ridge and cheek guards. The existing Sergeant Bristle catalogue entry uses that exact factory; Point/Stomp remain available as explicit preview motions.
- Filled the missing corner terrain and raised all dungeon wall tiles three units above their local floor (at least 2.5 units beside a half-height terrace transition). The rectangle now contains 1,280 tiles/1,105 walkable tiles before entities. A regression test verifies continuous blocked/sight-blocking perimeter corners, minimum adjacent wall height, and existing landmark reachability.
- Existing playground coverage: Cinderhold meet checkpoint and Sarge/ranger/mage landmarks expose accept/decline/repeat; Willowbank Reed conversation exposes the same shared response flow. Current-area reset cancels dialogue and allows replay. Sarge's existing shared model preview and Cinderhold landmarks expose the updated model and walls. No separate debug implementation was added.
- Browser checks passed Sarge accept and decline (player line before phase change/close), both optional mentor acceptances (player line before grants/progression), and Reed's response before exposition without a duplicate echo. Inspected player entrance, resting Sarge hands, fantasy helmet in both live portrait and catalogue, and the tall-wall forge view; no runtime errors were recorded. These checks used real interactions with checkpoint setup, not a fresh-game replay. This fixes the identified dialogue boundary; it is not a claim that the entire repository has received another architecture audit.

- Final validation for these repairs: 155 tests passed, both builds passed, debug isolation and diff whitespace checks passed (existing Vite bundle-size warning remains). Reset during a pending player reply cancelled its continuation; replay and mobile player-response rendering passed. Temporary browser/preview server were stopped; the existing development server was preserved.


## All-slime animation access — 2026-10-05

- Player Slime, Reed, Bristle, Borin, Fletch and Wisp now expose the same 31 motions in Shared model preview, using one animation list and playback implementation. Character-specific idle motion/default expression remains intact. Reed's idle fishing rod hides during other motions; shared action props supply the appropriate tools and clear them on switching.
- Point and Stomp moved into the shared `playerActionMotion` pose source. Mentor gesture playback and the live player Animation preview consume those same poses. Both gestures support the existing speed, loop, restart and Stop controls without an area visit or gameplay rewards. All slime models also expose Spawn landing, which was previously only in the live-player preview.
- Tests exercise every advertised motion on every model, require all six slime motion lists to match, check tool cleanup and pointing/idle transitions, and retain production Reed-idle/facing verification. 156 tests, both builds and debug isolation passed; the existing Vite bundle-size warning remains.

- Browser verification confirmed identical 31-motion menus for all six slimes; Point/Stomp/Mining/Wave/Idle playback and transitions; Reed pointing without the idle rod; and live player Point/Stomp play/stop in the clearing before later-area visits and in Cinderhold. No runtime errors were recorded.

## Copperbelly apron proportions — 2026-10-05

Widened the shared smith apron from .46 to .66 units (body width .72), shortened it from .38 to .24, and lowered its top to .33, below the mouth. Existing Borin catalogue and smith landmark cover the change. Visually verified the model preview and live dialogue portrait; no runtime errors. Both builds and debug isolation passed.


## Combat presentation and pursuit in progress — 2026-10-05

Shared weapon-specific attacks and equipment-aware blocks are implemented in `combat-animation.js`, used by gameplay and all slime previews. Bow strings/nocked arrows animate with release. Attack windup/follow-through takes priority over a hit reaction. Targeting does not aggro; resolved impact does (including misses and zero damage, as refined below). Pursuit and leash return walk continuously through reserved destinations, with health restored on arriving home. Explicit reset/travel may reset entities; ordinary retreat does not teleport them. Playground pointer actions no longer force-stop combat when no animation preview is active.

164 tests and both builds/debug isolation passed. Browser checks passed attack/block previews on all six slimes, live equipped previews, ranged passivity until damage and smooth pursuit in the clearing, and equipped Cinderhold victory plus retreat/walk-home (maximum observed displacement .10 units/frame). Spark check setup needed selecting the learned spell through the normal Combat menu. Full fresh-game replay has not been performed.

The subsequent design discussion selected independent motion and equipment controls with automatic gameplay resolution and explicit overrides; see the completed viewer section below.


## Combat viewer and equipped casting completed — 2026-10-05

- All six slime models now expose one **Attack** and one **Block** animation, replacing equipment-permutation entries. Contextual Attack motion (Automatic/Punch/Stab/Slash/Bow draw-release/Cast) and Block motion (Automatic/Fists/Blade/Shield/Bow guard) select the pose independently of Main hand, Off hand and Weapon/Magic combat style. Automatic uses the shared gameplay motion resolver. Explicit overrides never change gear; bow loadouts clear/disable the off hand. Selections persist when comparing slime models; Reset loadout restores empty hands, Weapon style and automatic motions. Non-slime models hide these controls.
- Casting retains equipped combat gear in both gameplay and previews; spell damage remains separate from weapon damage. Fishing/mining and other actions needing their own props temporarily hide combat gear, restoring it afterward through the same shared visibility policy. Casting hands sit together just in front of the body to keep equipment from clipping inside it. Shared bow string/arrow presentation and every attack/block pose remain production-backed.
- Mobile model viewer remains edge-to-edge with safe-area padding, touch-sized controls and a scrollable controls section so the actual-size camera canvas retains usable space. Existing live-player Attack (equipped)/Block (equipped), combat fixtures, inventory, spell controls and tutorial checkpoints remain the production test paths.
- Final validation: **167 tests passed**, normal and playground builds passed, debug isolation and whitespace checks passed. Existing Vite bundle-size warning remains. Regression coverage includes automatic/explicit motion selection, independent gear, legal bow slots, casting visibility, temporary skilling-tool substitution/restoration on all six slime rigs, and production equipment presentation.
- Browser checks passed independent selectors, six slime models, override persistence, off-hand restrictions, resets, non-slime hiding and fullscreen 390 × 844 layout without horizontal overflow (306px of model canvas). Inspected corrected equipped casting in the viewer and live gameplay. Spark target victories with dagger/shield equipped passed in the clearing before later-area visits and in Cinderhold. The earlier Cinderhold test's pointer coordinates missed the target; clicking its visible model completed the check without a code change. No runtime errors were recorded. Earlier pursuit/return and melee browser checks remain recorded above; these are focused checkpoint/fixture checks, not a full fresh-game replay.


## Minimap layout and ground pickups — 2026-10-05

- Desktop overview centers a 246px minimap above the resource orbs/actions. Collapse is a tab outside the sidebar; the collapsed overview has no panel background/border and restores from a bottom-right button. Mobile retains its existing side-by-side HUD.
- Minimap canvas cells and gutters use whole device pixels at the actual display size, including fractional pixel densities. Gold squares represent live ground pickups from the shared resource controller; active tile identity excludes other maps, and collection/reset/respawn automatically refresh markers.
- Existing playground Ground items/reset, real gathering, travel and sidebar controls cover the changes; instructions updated. Focused browser checks verified desktop collapse/restore, 701px layout, 320px mobile, collection removing a marker, and Willowbank. Screenshots inspected; no runtime errors. All 200 tests, both builds and debug isolation passed (existing bundle-size warning remains).
- Per user guidance, long performance suites are batched once or twice per active development day, with focused verification between runs. This change did not rerun the long suite; today's existing results remain the latest performance evidence.
