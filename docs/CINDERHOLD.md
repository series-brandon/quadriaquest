# Cinderhold: Basic Training

First playable implementation · 2026-10-05.

The initial implementation now includes the 40 × 32 training complex, main melee/metalwork quest, optional ranged and Energy Strike lessons, shared destination picker, and production-backed playground controls. The sections below retain the design intent and tuning proposals. See [HANDOFF.md](HANDOFF.md#cinderhold-first-playable-implementation--2026-10-05) for implementation ownership and verification limits.

The first visual pass uses connected slate halls, arches, copper terraces, a lit furnace, and the four mentor rigs. Perimeter walls now enclose all four corners and rise three blocks above their local floor; Bristle wears a brimless iron guard helmet. Detailed environmental dressing, longer authored camera sequences, and device-specific performance/balance tuning remain polish work. The terrain renderer batches static geometry while retaining individual tile picking; this does **not** implement open-world streaming.

The third tutorial turns preparation into confidence: win a small fight with bare hands, turn copper ore into useful equipment, then feel the difference in a tougher fight. Basic Training ends there. Like all combat tutorials it is optional: players can refuse or abandon it and still leave, travel and continue the game. Bow-and-arrow and spell lessons are optional invitations that can be taken now, later, or never.

**Working name: Cinderhold.** A disused underground training hall built around an old copper forge. Slate terraces, cut-stone arches, exposed copper seams, and warm furnace light distinguish it from the clearing and Willowbank. It should feel like an expansive dungeon training complex with friendly inhabitants, while keeping the readable shapes and playful slime characters of QuadriaQuest.

The requested sequence, angry drill-sergeant slime, dwarf-like smith slime, copper → ingot → dagger/shield chain, optional ranged/magic mentors, three-destination Iter Crystal menu, and the largest tutorial area so far are the design requirements. Names, exact lines, layout, recipe quantities, skill assignments, and balance below are proposed defaults for review.

## Place and layout

**Cinderhold is the largest tutorial map yet.** The tutorial spaces grow from the clearing's 13 × 13 bounding grid, to Willowbank's 24 × 18 footprint, to a proposed Cinderhold footprint of roughly **40 × 32 tiles**. These earlier dimensions were checked against the current map definitions. Cinderhold's bounding footprint is about three times Willowbank's; target at least twice its reachable floor area so the difference comes from exploration space, not decorative walls. The exact outline and counts need layout validation.

Build connected chambers, broad galleries, half-height terraces and looping routes around a central training court. No loading screen between rooms. The entrance frames the crystal and Sarge, with the forge's warm light visible through an arch. The entire complex should not fit into the arrival view: successive rooms reveal its scale.

Keep the main circuit legible: court → recruit yard → forge/copper workings → court → proving ring. Place furnace and anvil together, with copper close enough that four mining trips do not become a walking chore. Put optional mentors in substantial side wings; connect those wings with a safe outer loop and overlooks so exploration rewards curiosity without creating mandatory detours. Use existing resource and encounter prefabs for repeatable side practice, with threats visibly separated from safe routes. More space should support distinct activities and discoveries, not long empty corridors or extra required grind.

This size progression leads toward the much larger continuous, chunk-streamed game world described in [DESIGN.md](DESIGN.md#world-scale-and-streaming-direction). Cinderhold remains a bounded tutorial destination; its size does not require the open-world streaming system to be implemented as part of this chapter. Any spatial-loading support introduced here must belong to shared world infrastructure.

| Space | Purpose and contents |
| --- | --- |
| Arrival court | Iter Crystal, safe recovery spot, Sarge, room for the follower. No enemy patrol or pursuit enters this space. |
| Recruit yard | One isolated Goblin Scrapper, visible from Sarge. A forgiving first encounter with an obvious retreat path. |
| Forge chamber | Smith, permanent furnace and anvil, supply bundles and a small provision shelf. Safe from enemies. |
| Copper workings | Several branching ore pockets and stepped mining terraces; required copper remains a short, safe route from the furnace. Mining is not mixed with surprise combat. |
| Proving ring | One Goblin Bruiser beyond a broken arch. Distinct silhouette and warning before entering its reach. |
| Side wings | A ranged gallery with shooting lanes, and a separate rune-lit magic chamber with practice space. Both reconnect to the court and safe outer loop. |
| Outer loop and overlooks | Optional exploration joining the larger chambers, extra resource/practice placements and views into the hall. No required quest step or new mechanic is added merely to fill space. |

Use half-height steps, no ramps, and clear floor seams. Dark charcoal/slate floors, gray-violet walls, orange copper deposits, amber forge light, and restrained blue crystal light replace the grassy palette. Small moss patches may soften the stone without making another meadow.

Use an open-roof/cutaway cavern treatment with low foreground walls. Arches and tall rock formations must not hide enemies, resources, or click targets at supported camera angles. Light the entire playable floor sufficiently; darkness supplies atmosphere, not a navigation penalty. Keep mining and smithing sparks brief and readable. New stone tiles, ore, stations, props, and character rigs are shared models, not geometry embedded in the map script.

## The guides

### Sergeant Bristle — “Sarge”

A squat red-orange slime with a tiny battered helmet, sharply lowered brows, and a near-permanent angry face. He barks orders and visibly quivers with impatience. His concern shows through practical advice; he never takes the player's items, punishes retreat, or insults them for losing. He is funny because he takes his training post incredibly seriously.

- Arrival: “You! Maggot! Over here!”
- Introduction: “Name's Bristle. You call me Sarge. Those little mitts aren't just for picking flowers.”
- First fight: “That scrapper. Bare hands. Click him once and keep swinging. Need out? Click clear ground and MOVE!”
- After winning: “HA! A pulse AND a punch. Now let's put something useful in those hands.”
- Smith referral: “Find the smith. Copper. Furnace. Anvil. Come back with a dagger and a shield!”
- On return: “Made it yourself? Good. Put it ON. Equipment in a bag is luggage!”
- Bruiser introduction: “Bigger goblin. Bigger wallop. This is why we bothered with the metal.”
- On defeat: “Up! You've still got your kit. Catch your breath, eat something, then try again.”
- Completion: “Acceptable! ...That's a compliment. Don't get used to it.”
- Optional referral: “Arrows down that way. Spells over there. Less shouting. Suspicious, if you ask me. Visit them if you like. You're cleared to leave.”

Angry is his default world and portrait expression, including when listening. A short proud/happy break on graduation is optional, followed immediately by the scowl. Add an authored Angry expression to the shared slime expression system if necessary; do not fake it in this area's dialogue. Every spoken line specifies a supported expression. Pointing, stomping, and idle agitation use shared rig motions and have real animation previews.

### Borin Copperbelly — smith and miner

An amber slime with a broad braided beard, heavy brows, leather apron, and a miner's helmet. The beard is a readable costume attached to the slime rig; he remains recognizably a slime. Patient, dry, and proud of good workmanship. Convey the dwarf-like character through silhouette, craft, and manner rather than difficult phonetic dialogue.

- Greeting: “Let me guess. Loud, red, called you a maggot? Aye. That's his welcome speech.”
- Mining: “Copper's the orange seam. Your pickaxe will do. Bring me four pieces of ore.”
- Smelting: “Ore's what the mountain gives you. Ingots are what the furnace gives back.”
- Smithing: “Ingot on the anvil. Hammer in hand. Now we're making something worth carrying.”
- Equipment: “One dagger. One shield. Sharp end away from you, flat side toward trouble.”
- Return to Sarge: “Off you go. Try not to let him see you enjoying yourself.”

### Optional mentors

**Fletch**, a calm green slime with a feathered hood, teaches bow and arrows. “You can hit a thing without standing beside it. Revolutionary, I know.”

**Wisp**, a soft violet slime with a star-patched hat, teaches a simple offensive spell. “He shouts. I prefer a small, carefully directed spark.”

They are less theatrical than Sarge, but their lessons still offer useful play. Each gets a brief introduction, one practical task, and a repeatable practice option. Their names and costumes are provisional.

## Main quest: Basic Training (optional)

Tips explain; the Quests page tracks objectives and completed history. Use optional “Show me how” for familiar inventory/crafting steps. Do not repeat the clearing's full menu tour. Dialogue choices offer flavor and “I'll be back”; talking again resumes the current task.

| Step | Player action and teaching | Completion evidence |
| --- | --- | --- |
| 1. Report to Sarge | Accept the training invitation. Brief camera focus on the recruit yard, then return control. | Acceptance assigns the first fight. |
| 2. Throw the first punch | Fight the Scrapper unarmed. Explain automatic repeat attacks, health, hits/misses, and moving away. Retreat is taught but not a mandatory failure. | Shared enemy-defeat event from the recruit encounter, fought unarmed. |
| 3. Meet the smith | Sarge refers the player to Borin. He explains the material chain and points out copper, furnace, and anvil. | Conversation assigns the production tasks. |
| 4. Mine copper | Use the existing Crude Pickaxe on copper outcrops. The new lesson is an ore resource, not relearning mining controls. | Obtain four Copper Ore through successful shared mining completions. |
| 5. Smelt ingots | Approach the furnace, select Copper Ingot, and complete four single-item smelts. Show consumed ore and produced ingots. | Four ingots produced through the shared station action. |
| 6. Smith equipment | At the anvil, use ingots plus the reusable Crude Hammer to make a Copper Dagger and Copper Shield. | One successful craft of each. |
| 7. Gear up | Equip the dagger in the main hand and shield in the off hand. Show worn models and actual stat changes. | Both items equipped; possession alone does not complete this step. |
| 8. Prove yourself | Return to Sarge, who teaches Strong Strike, then defeat one Bruiser. Remind the player to retreat and eat if needed. | One real Bruiser defeat; equipment is preparation, not an invisible damage/target gate. |
| 9. Dismissed | Sarge acknowledges success and points out the two optional mentors. | Required quest complete; optional invitations do not hold it open. |

Temporarily unequip combat gear for the first lesson through normal equipment actions, retaining it in inventory. Never silently delete or swap gear. If the player beats the Scrapper with gear, award normal gameplay rewards and offer a retry for the unarmed objective. The encounter can respawn; it cannot become an unrecoverable quest target.

Recipes, ore, stations, enemies, and mentors work before their quest step. Record relevant chapter activity from first entry so doing the forge work early is acknowledged. Once tracking begins, generic mining/smelting/crafting objectives accept matching shared completion events from any area, including while this chapter is inactive; only explicitly named narrative encounters require their placed encounter identity. Mine/smelt/craft counts survive consumption, travel, and later dialogue; inventory totals alone are not proof of an action. If the Bruiser was already defeated here, acknowledge that victory once the preparation lesson is complete, without demanding an artificial second kill. Shared systems emit facts; the area decides which facts satisfy its narrative.

Keep the old Stone Sword and Wooden Shield recipes functional and available everywhere. Copper gear is the required teaching example here, not a rename of those items. Returning players who already own copper gear can use it in combat, but production objectives still demonstrate the new chain if it has not been recorded by this tutorial. That tracking rule affects only quest completion, never recipe availability, rewards, or equipment use.

## Materials, stations, and skills

Proposed small recipe economy:

| Output | Consumed materials | Station | Reusable tool | Base seconds | XP proposal |
| --- | --- | --- | --- | ---: | --- |
| Copper Ingot ×1 | Copper Ore ×1 | Furnace | — | 3 | 20 Smithing |
| Copper Dagger ×1 | Copper Ingot ×1 | Anvil | Crude Hammer | 3 | 20 Smithing |
| Copper Shield ×1 | Copper Ingot ×3 | Anvil | Crude Hammer | 4 | 20 Smithing |

Four ore become four ingots, then exactly one dagger and one shield. No coal, fuel, alloying, durability, random failure, or extra handle recipe in this introduction. The furnace is already lit. Tools remain in inventory and are not consumed. Use one new **Smithing** skill for smelting and smithing; Mining remains Mining. Both station menus show their requirements, output, real duration, and skill reward. Smithing is visible and usable everywhere without meeting Borin first.

Copper outcrops reuse mining's tool checks, duration adjustment, strikes, depletion and safe respawn. Proposed yield: one ore per completed action, 20 Mining XP, eight-second respawn when unoccupied; show a clear four-ore objective. Define this in the shared copper resource definition; placements may select a shared respawn policy. No Cinderhold-specific reward, timing, or mining controller is allowed.

The furnace and anvil are permanent placed stations for this chapter. Click to approach a reachable working tile and open the real station recipe picker. Recipes remain discoverable in the journal with “Requires a furnace/anvil” where relevant. The station must be present in the active world and reachable to execute; simply having a recipe selected cannot bypass that requirement.

For each craft, inputs, output, and XP commit together exactly once at completion. Moving, travel, reset, station removal, or invalidated access cancels unfinished work without consuming inputs. Closing the picker after starting may leave the world action running, consistent with cooking; it must not leave input locked. Repeated clicks cannot restart a timer or duplicate rewards. Reuse the shared recipe catalogue and action/menu foundation, generalizing station support where needed rather than adding a Borin-specific crafting system.

**Recovery from missing supplies:** renewable Sticks and Rocks bundles make replacement pickaxes and hammers locally craftable with the existing recipes. Copper never permanently runs out. A provision shelf offers one free Cooked Pondfish when the player has no cooked food, and can supply another after it is consumed. This is an explicit replenishable tutorial supply interaction, using shared item grants and ordinary eating; it is not a hidden heal or a new cooking lesson. The shelf is a portable supply entity configured by this area. No purchases or return trip are needed to recover from an empty inventory.

## Combat and equipment behavior

Keep combat real-time, point-and-click, and stat-driven. This chapter is not a manual combo, dodge, or parry tutorial. Clicking an enemy approaches to the chosen attack range and repeats attacks; clicking ground stops attacking and attempts retreat. Enemies may pursue until their leash ends, so make the route back to safety clear. Explain the shield's passive mitigation; do not imply a block button exists.

Combat now uses the shared COMBAT.md formulas for player and enemy attacks. At starting stats every attack takes 2.5 seconds: bare hands 1–12, Stone Sword 4–18, Copper Dagger 6–22, Training Bow 6–22, Energy Strike 1–22 (about 2.94 seconds, 4 Mana). Wooden and Copper Shields add 3% and 5% resistance. Scrapper: 50 health, 1–10 damage, cannot reduce the player below one health. Bruiser: 100 health, 3–20 damage, can cause defeat. Practice targets have 50 health and award half XP until the receiving track reaches level 3. Cinderhold's live creatures (Scrappers and the Bruiser) give 1.5× XP until each receiving skill reaches level 3, then normal XP; this is area configuration of the shared entity XP modifiers. These values are verified in the current code; tutorial balance still needs a full playthrough.

Copper gear (+10 Power/Accuracy dagger, +50 resistance shield) is the intended upgrade over bare hands and the weaker Stone Sword (+6/+6) and Wooden Shield (+30). Tune only after playing the complete sequence. Random rolls must not make the introductory lesson feel arbitrary.

Equipment now uses item definitions and explicit hand slots instead of `swords`/`shields` boolean slot ownership. One main-hand weapon at a time; dagger plus shield is legal, a bow occupies both hands, cosmetics remain separate. Equipping a bow returns a shield to inventory, with clear feedback. Removing the last owned copy clears its equipped slot. Prevent equipment changes during working/combat as the current system does. Damage, reach, cadence, held models, and animation come from equipped definitions, not area checks or “has sword” special cases.

Defeat reuses the shared animation and safe crystal-adjacent recovery, restores health, and retains items, skills, equipment, companion, and quest progress. Reset the encounter through its shared lifecycle so retries cannot duplicate victory rewards. Sarge's recovery line is contextual and does not replay the introduction. Companions remain cosmetic and untargetable; NPCs, stations and the arrival court remain outside enemy pursuit.

## Optional ranged and magic lessons

Sarge's graduation reveals two independent optional quest invitations. Neither is auto-accepted, neither counts against Basic Training, and neither blocks the crystal, departure, or a completion message. Both mentors can also be approached early. Returning later preserves each lesson independently.

### Fletch: A Little Distance

- Accept a loan-free starter gift of a Training Bow and 20 Training Arrows once. These are real inventory items that can leave the map.
- Equip the bow through the normal inventory. Explain its two-hand requirement, range, and arrow count.
- First shoot an inert practice target to learn range and projectile feedback; then defeat one forgiving shared practice enemy with the bow to demonstrate actual combat at distance.
- Proposed starting range: four tiles with line of sight. Approach when too far away; arrows cannot pass through stone walls. A blocked route/shot gives feedback rather than consuming arrows.
- Consume one arrow when a shot is committed, including misses. Moving before release spends nothing; moving after release cannot refund ammunition or duplicate the hit. Empty ammunition stops attacks and offers a clear instruction.
- Fletch uses the shared supply-offer interaction to replenish Training Arrows when none remain, so a missed practice shot cannot stall the lesson. Bow acquisition is idempotent; provide replacement access if it is lost later. No fletching or arrow-crafting lesson in this chapter.

### Wisp: First Spark (Energy Strike)

- Accept to learn **Energy Strike**, a permanent basic offensive spell, through the shared learn-spell API. Wisp's tutorial is one configured source of that grant; the spell system never checks whether Wisp was met or Cinderhold was visited. Select it through a shared spell UI; it remains usable away from Wisp and Cinderhold.
- Energy Strike costs 4 Mana per cast at the shared release-time cost rule; Mana regenerates passively and at Iter Crystals. No staff or rune item is required. Spell selection activates magic attacks; switching back to a weapon/unarmed style uses the same shared combat selection. Worn gear remains owned, and casting does not silently destroy or unequip it; weapon damage bonuses do not apply to spells.
- Cast at an inert target, then defeat one forgiving shared practice enemy with Energy Strike. Teach range, line of sight, cast cadence, projectile impact, and cancellation using the real combat controller.
- Six-tile range and a clearly visible cast/recovery cycle. Numeric damage and cadence need balancing alongside the bow; neither optional style should trivialize the rest of the tutorial.

### Ember: Steady Breath (draft Ki mentor, pending review)

- **Ember**, a calm teal slime with a cloth headband and a floating ring of breath, sits in the quiet north-west corner of the forge terrace (3, 4), inside the safe zone. Name, look, placement and lines are a draft for the user's review.
- Optional, never required to leave. Accepting teaches **Rush** and **Harden** through the shared aura system. Ember explains the activation fee, per-second upkeep in or out of combat, stacking, exhaustion (all auras fade at zero Ki) and Ki recovering only while every aura rests.
- Objectives observe shared aura state and never toggle auras: light Rush by itself → add Harden so both run → turn both off. Talking again repeats the current hint. Bristle's graduation line mentions Ember.
- Playground: the `cinderhold:ki` checkpoint starts the practice step; the `ki` landmark visits Ember; the model viewer includes Ember.

All three styles train their own combat skills and proficiencies per attack (COMBAT.md). Runes, advanced spells and fletching remain future design decisions. Inert targets award half XP until each receiving track reaches level 3. Live practice enemies use normal one-time victory rewards and repeatable respawn. Neither optional fight gets a special parallel combat simulation.

## Iter Crystal: choose a destination

Replace fixed two-way crystal interactions with one shared destination picker. All ready crystals use the same menu and travel system; only placement, initial reveal, and narrative recommendations belong to an area.

**Proposed availability:** once the clearing's existing crystal reveal finishes, all three tutorial destinations are listed and usable. Recommend Willowbank before Cinderhold, but do not require a visit, completion, or level. This preserves the intended teaching order through guidance while keeping shared gameplay available independently. Cinderhold therefore supplies its own tools and recovery food. This soft recommendation is implemented for the first playable chapter; the story teaches the intended order without an area-unlock gate.

1. Click a crystal and walk to a valid adjacent interaction tile.
2. Open **Where to?** with three rows, in stable order: **The Clearing** — Resources & crafting; **Willowbank** — Fishing, cooking & healing; **Cinderhold** — Combat & equipment. Willowbank's details can also mention carpentry and companions.
3. Mark the current area **You are here**, disable travel to it, and initially select the recommended next destination (otherwise the first other area). Mark unvisited places **New** and give a short description. No invented level lock or danger rating.
4. Select a destination, then press **Travel**. Opening the menu or selecting a row does not teleport. Close, Escape, or mobile Back cancels without moving the player. The Travel button is the confirmation; no second confirmation dialog.
5. Revalidate source readiness, destination registration, and a safe arrival tile, then use the existing fade/switch/arrival sequence. Disable repeated requests during transition. If no landing tile is safe, remain in the source area and explain why.

Desktop uses a compact modal; screens at 700px or less use edge-to-edge fullscreen with safe-area padding and at least 44px touch targets. Use visible keyboard focus, accessible current/selected/disabled states, and restore focus on close. The open picker owns pointer/keyboard input so the world does not receive clicks through it. Do not pause hostile combat via a travel menu: interaction is only accepted when shared action/combat state permits it, with protected crystal space ensuring ordinary access is safe.

Closing/resetting/removing the source crystal clears stale selection and input ownership. Travel cancels unfinished work through shared controllers, clears transient combat/projectile effects, and preserves committed inventory, equipment, health, skills, spells, ammunition, follower preferences, and per-area quest state. Return visits skip first-arrival introductions. Preserve existing cancellation before/after the actual area switch and occupied-arrival revalidation. Session persistence follows the current game; this feature does not imply save-to-disk support.

After graduation, a prototype completion notice may appear once after Sarge's optional invitations. Dismissing it returns to free exploration. Never imply that optional mentors must be completed to finish or that a nonexistent fourth map is available.

## Ownership audit: only story/tutorial and layout are local

**Portability test:** place the same entity or station in the clearing, grant the same items/learned spell through shared APIs, and perform the same action before visiting either later tutorial. Its checks, animation, results, cancellation and reset must work unchanged. Then repeat in another area. Shared state must not be hidden behind an area controller, even if its model already lives in a shared file.

| Concern | Shared owner and behavior | What Cinderhold may supply |
| --- | --- | --- |
| Resources and metalwork | Resource/recipe definitions, Mining/Smithing state, tools, timing, costs, XP, depletion/respawn, stations and recipe UI. | Placement, resource/station definition IDs, respawn-policy selection; objective text and observation of completed actions. |
| Combat and safety | Attacks, damage/protection policies, range/sightline, projectiles, threat acquisition, pursuit/leash, victory, defeat and recovery. | Encounter placements, patrol/leash bounds, generic safe-zone geometry, respawn anchors and shared enemy profile IDs. Sarge's response to outcomes is local. |
| Practice targets | Portable target prefab, hit reactions, target eligibility, reward policy, reset and respawn. | Positions and selection of inert/no-reward or live-enemy definitions; lesson completion conditions. |
| Gear and spells | Item/slot definitions, learned-spell state, grant APIs, style selection, ammo, stats, models, animations and feedback. | Tutorial reward declarations and dialogue invoking shared grants. No named mentor/area prerequisite in combat or spell code. |
| Food, arrows and replacement tools | Portable supply-offer system: inventory eligibility, quantities, one-time grant identity, refill policy, shared item transfer and interaction UI. | Place a shelf or attach an offer to a mentor; select offer definitions and write explanation text. No inventory mutation/refill loop in the map module. |
| NPC presentation | Shared rigs, appearance configuration, expressions, idle/gesture motion, facing, portrait/dialogue rendering and disposal. | Character appearance selection, home position, authored lines/expressions and scripted story beats. |
| Crystal and destination menu | Destination registry, picker UI, current/visited state, approach, input ownership, validation, fade, arrival and cancellation. | Crystal placement, reveal story, destination metadata and a tutorial recommendation. Rows come from the registry, not a hardcoded three-area UI. |
| Lifecycle and resets | Entity registration, action cancellation, reward idempotency, effect cleanup, scoped reset and future chunk attach/detach. | Initial placement/configuration and chapter quest reset. Area reset invokes shared lifecycle APIs instead of manipulating internal timers, health or inventory. |

Safe courts and protected first fights must use generic zone/encounter policies consumed by shared combat; no `if area === 'cinderhold'` immunity or pursuit branch. A supply shelf, mentor arrow offer, or spell grant moved elsewhere retains its mechanics. Costs, stats, skills and recipe definitions are shared content; “configuration” is not permission to embed custom gameplay functions in a map.

The area tutorial may watch shared events, sequence dialogue/camera beats, assign objectives, and request declared rewards through shared APIs. Generic progression observers remain active when the player travels elsewhere. They must not calculate hits, spend materials, own the player's spell state, or implement station work. Visiting/unlocking a tutorial controls its narrative only; ordinary gameplay availability depends on actual items, learned abilities, terrain, entities and shared action state.

Shared world services must accept coordinates and spatial/entity context without assuming a 13 × 13 grid, a named area's origin, or that the whole future world is loaded. This is a design constraint for new work, not a claim that current tile-object identity and pathfinding are already streaming-ready.

## Implementation boundaries and order

Implementation: `area-runtime.js` registers destinations and broadcasts gameplay facts; `destination-menu.js` and `crystals.js` use the shared travel system. `combat.js`, `combat-range.js`, `combat-styles.js`, and portable enemy/target entities cover the three attack styles. `equipment.js` defines main/off/head slots and gear stats. `recipes.js` plus `station-crafting.js` own the copper chain and Smithing, using the generalized station recipe picker. `supply-offers.js`, `world-actors.js`, and shared models own supplies and NPC/prop interactions. `cinderhold.js` supplies layout and narrative; `cinderhold-rules.js` holds layout/story progression. The following order records the implementation slices rather than a remaining-work list.

1. **Destination UI and area shell:** shared picker plus registration of the larger rocky map, safe arrival, round-trip travel, terrain models, safe-zone configuration and map/reset controls. Validate reachable area, route length and representative desktop/mobile performance before filling the map; remove fixed small-map assumptions in shared consumers as needed. In partial development builds, never list an unregistered destination as usable.
2. **Sarge and unarmed lesson:** portable NPC model/motions/expressions, existing enemy prefab, initial quest and safe recovery.
3. **Mining and metalwork:** copper resource configuration, shared Smithing state, furnace/anvil stations, recipes, production animations and receipt/UI behavior; prove them in the clearing before using them in the chapter.
4. **Equipment and proving fight:** generalized hand slots, distinct copper models/stats, equip guidance, Bruiser, completion and optional referrals.
5. **Optional styles:** shared attack range/line-of-sight/projectile rules, bow/ammo, learned spell state/selection, portable targets, mentors and independent optional quests.

Each slice includes its playground support and validation before moving to the next. Full planned scope includes both optional lessons; optional for the player does not mean omitted from implementation. Layout, authored dialogue, quest sequencing, provisioning configuration and encounter placement belong to Cinderhold. Gameplay, item/skill state, menus, animations, rewards and lifecycles remain shared.

## Playground coverage required with implementation

The first implementation provides these entry points through Tutorial checkpoints, Training systems, Travel practice, Inventory/Skills, interface previews, and the shared model catalogue. Read the handoff for the exercised checks; the table remains the coverage requirement for subsequent changes.

| Addition | Reach, exercise, repeat and reset |
| --- | --- |
| Cinderhold and chapter | Direct entry and area reset; checkpoints for arrival, Sarge, unarmed, smith, mining, smelting, each equipment recipe, equip, Bruiser, graduation, and each optional lesson. Load prerequisites through real shared state/controllers. |
| Rocky terrain and new models | Catalogue entries for stone tiles/ledges/arches, copper outcrop, ore/ingot props if modeled, stations, supply shelf, every mentor, copper gear, bow/arrow and practice target. Expose only implemented motions; stationary props offer Static. |
| Sarge and other NPCs | Real conversation replays, expressions independent of motions, idle/point/stomp and other authored animations with play-once/loop/speed controls; reset portrait and world facing. |
| Copper and stations | Place production copper/furnace/anvil fixtures in the current map, including the clearing before a Willowbank visit. Reset depletion and station actions; add/remove ore, ingots, tools and equipment through existing Inventory controls. |
| Smithing and menus | Shared Skills controls for XP/levels; real station interaction plus non-mutating interface previews that grant nothing and do not teleport. Exercise missing ingredients/tool, unreachable station, cancellation and repeated crafting. |
| Supply offers and grants | Place the real provision shelf and mentor offers in any test map; exercise empty/stocked inventory, refill, repeated one-time grants, spell grants, removal, travel and reset without requiring their tutorial. |
| Large-map navigation | Direct positioning at each chamber and the outer loop through debug-only controls; repeat long routes, follower travel, camera occlusion and reachability checks; reset uses the normal shared lifecycle. |
| Equipment/combat | All new items in Inventory controls; worn-model previews; Scrapper/Bruiser fixtures with fight, retreat, leash, respawn, defeat and reset; actual supply/eat interactions. |
| Bow and spells | Equip/style selection, ammo grant/remove, spell learn/reset, inert and live targets, blocked sightline fixture, projectile impact/miss/cancel, live practice respawn. Use production implementations in at least two maps. |
| Crystal picker | Real approach/open/select/travel, non-mutating menu preview, current/new/recommended states, failed landing, cancel before/after switch, source removal, all three destinations and repeated round trips. |

Chapter reset requests shared cancellation and scoped entity/effect resets for its placed content, and clears its pending narrative/objectives; ordinary travel never resets them. Checkpoint loaders explicitly prepare their listed inventory/health/skill prerequisites. Shared full-session reset also resets newly introduced items, skills, equipment, spells and optional quests; targeted fixture resets must not silently erase unrelated progression. Keep every developer control, fixture, mutation hook and debug asset behind the compile-time playground flag.

## Acceptance for the playable chapter

- Complete the normal clearing → Willowbank → Cinderhold route, including all of Basic Training and both optional lessons. Also refuse Basic Training and leave without fighting. Also skip both mentors and leave immediately after graduation; return and complete either one independently.
- Enter Cinderhold before Willowbank with empty inventory and low health; obtain tools, food, ore and equipment locally without a quest or resource dead end.
- Confirm the footprint exceeds both earlier maps and reachable floor meets the larger-area target; time the mandatory route, inspect the optional loops, and profile representative desktop/mobile traversal with actors and effects active. Record frame times, memory and entity counts; tune against an agreed device budget before release.
- See a materially different rocky/cavern environment, readable targets on desktop/mobile, safe stepping, and no roof/wall occlusion that blocks play.
- Compare unarmed and equipped Bruiser attempts at low Combat level. Exercise lethal defeat, Scrapper protection, retreat/pursuit/leash, repeated fights and recovery with retained progress.
- Exercise copper mining and each station recipe in the clearing before Willowbank, then in Cinderhold: missing tools/materials, repeat clicks, movement cancellation, completion, travel, station removal, depletion/respawn and reset. Rewards and consumption occur once.
- Verify all hand-slot combinations, last-copy removal, busy-state rejection, actual dagger/shield stat changes, bow ammunition exhaustion and replacement, spell selection, and out-of-range/blocked-line behavior across maps.
- Exercise supply eligibility/refill, idempotent item/spell grants, safe zones, protected/live encounters and target resets in the clearing before either later tutorial, then in a second area. Confirm the same definitions and controllers run, with no chapter activation required.
- Verify early actions count across areas, interrupted dialogue resumes, completed tasks remain in history, travelling away mid-quest preserves progress, and optional branches cannot block Basic Training completion.
- Travel every directed pair among the three maps. Verify current-location row, mobile/keyboard navigation, closing without travel, repeated clicks, invalidated source/destination, occupied landing, cancellation on either side of the switch, companion arrival and first-visit versus return dialogue.
- Retest the clearing tutorial and peaceful Willowbank; no Cinderhold NPCs, enemies or objectives appear there except explicitly enabled debug fixtures.
- Run relevant unit tests, `npm run build`, `npm run build:debug`, and `npm run check:debug-isolation`. Verify normal play and playground interactions separately; a loaded checkpoint is not a completed playthrough.

## Review before implementation

The draft uses Cinderhold / Bristle / Borin / Fletch / Wisp as working names; four ore for dagger and shield; one Smithing skill; Combat XP shared across styles; free introductory ammunition and Energy Strike (originally a no-mana Spark); and all three crystal destinations available after the first crystal reveal. The user accepted the overall direction and confirmed escalating tutorial sizes leading to a massive chunk-streamed open world. Numerical balance, exact map coordinates, the proposed 40 × 32 footprint and remaining detailed defaults can be refined during implementation planning and playtesting. Shared gameplay ownership and Cinderhold being the largest tutorial area are requirements.

### Bristle introduction revision — 2026-10-06

First arrival is now “Front and center, maggot!” Talking to Bristle plays the slime/backtalk exchange, then offers “Why are you so angry?” or “Sir, yes, sir!” Both converge on the training offer. Every selected response is spoken once by the player through shared character dialogue.

Accepting begins the existing unarmed tutorial. Refusing leaves Basic Training at its introduction, changes its objective to exploring freely, and leaves Bristle distraught. An unseen `???` speaker explains choice and Threat Levels. This is narrative exposition, not an implementation of threat ratings or a change to combat balance. Other mentors and travel remain available. Returning to Bristle offers leaving or changing your mind; accepting restores his usual angry expression and starts training. Reset clears the refusal. Existing `distraught` and `concerned` expressions represent Upset/Confused and Uneasy.

Playground: Cinderhold `arrival` replays the greeting; `meet` opens the full introduction; `refused` opens the return conversation. All use production dialogue and story state. The sarge landmark allows repeated world interactions.
