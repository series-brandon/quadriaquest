# Economy: Gold Pieces, shops and jobs (design draft)

Draft, 2026-10-10. Gold, item values, shops, enemy drops and jobs are implemented (2026-10-11, see *As implemented*). Numbers are starting proposals to tune.

**User decisions (2026-10-10):**
- **An economy is vital for the prototype.** Pacifists must be able to earn a living without fighting, through **jobs** and by **selling what they craft and forage**.
- **One currency: Gold Pieces.**
- **Most things can be sold.** Some can't, such as quest items and companions.
- **Jobs come from two places:** a **quest board** and **townsfolk who ask for repeatable tasks** (for example a post office slime: "I need this package delivered! Go!").
- **Gold Pieces are an inventory item**, a single stack like RuneScape coins.
- **Selling pays 40% of the buy price** to start. A **Merchanting** skill could improve that later, so the base rate may drop lower once it exists.
- **Defeated enemies now drop loot** (gold and items). COMBAT.md is updated to match.
- **Defeat costs nothing.** Defeat sends the player back to an Iter Crystal, and nothing else changes.

As with every system (AGENTS.md), the economy is shared gameplay. Prices, buying, selling, jobs and the shop UI work in any map. A city only places the shops, shopkeepers, boards and job givers, and adds the story around them. Everything can be reached, repeated and reset in the playground.

## What exists today

- The inventory is a plain count per item (`inventory[id] = n`). There's no size limit and no currency.
- `ITEMS` in `items.js` has a name, description and optional icon. There are no prices and no flags for what can be sold.
- Enemies give XP but drop nothing yet. Drops are now decided (see *Enemy drops*).
- `supply-offers.js` hands out free kits. Those stay free and are not a shop.
- There's no save system, so gold is lost on reload like everything else.

## Gold Pieces

- **An inventory item** (user, 2026-10-10): `gold` in `ITEMS`, named **Gold Pieces**, kept as one stack in the inventory like RuneScape coins. Shops, jobs and drops add to and take from that stack. All changes go through two shared helpers, `earnGold(n, source)` and `spendGold(n, reason)`. `spendGold` refuses anything that would go below 0 and returns false. Both report an event that quests, jobs and notices can watch.
- Gold can't be sold, crafted with or eaten. It sorts first in the inventory. Its count also shows in the Inventory header so it's easy to find.
- A pickup or earning shows the usual item notice ("+25 Gold Pieces"). The shop shows the new total.
- The stack's icon changes with the amount (a few coins, a pile, a bag), like RuneScape coins. Short form in tight spaces: "250 GP".

## Item value and what can be sold

**Each item gets a `value`** in `ITEMS`: what it costs to buy from a shop that stocks it. **Selling** to a shop pays `floor(value × 0.4)`, at least 1 (user, 2026-10-10). The gap between buying and selling stops buy-then-sell loops making money. The rate is one shared constant, so a later **Merchanting** skill can raise it per player. If Merchanting is added, the base rate may drop lower so the skill has room to matter.

**Rules for setting values (proposal):**

| Rule | Why |
| --- | --- |
| Something crafted is worth more to sell than its materials | Crafting pays, which is the main income for a pacifist. |
| Cooked food is worth more than raw | Same reason, for cooking. |
| Tools and starter gear are worth little | The waking kit can't fund the early game. |
| Gathered materials rise with the level needed to get them | Higher skills earn more per hour. |
| Nothing earns gold just by buying and reselling | The 0.4 sell rate guarantees it. A test checks every item and recipe. |

A **unit test sweeps every recipe**: a crafted item's sell price must be at least the sum of its inputs' sell prices (or a documented exception). It also checks that no item sells for more than it costs to buy anywhere.

**Selling restrictions:**
- `sellable: false` on an item blocks selling it. Shops show it greyed out with the reason ("Quest item"). Quest items (packages being delivered, letters, keys) always carry it.
- **Companions aren't items** and can never be sold. Their cosmetic items (Companion Top Hat) can be sold unless flagged.
- **Equipped items** have to be unequipped first. The shop shows "Equipped" and doesn't unequip automatically.
- **Your last copy of a tool** (axe, pickaxe, rod, hammer, Flint and Stone): selling it asks first with the compact confirmation ("Sell your only Crude Pickaxe? You need it to mine.").
- Starting kit and tutorial rewards are ordinary items and can be sold unless flagged.

## Shops

- **One shared shop system and screen**, built with the UI kit (`src/ui/`), fullscreen on phones, with **Buy** and **Sell** tabs. It shows item, price, how many you own, and quantity buttons (1 / 5 / All / a typed amount). Buying more than you can afford, or selling a blocked item, is disabled with its reason. There's no second confirmation, except for the last-tool rule.
- **A shop definition** has an id, a name, its **stock** (items with optional limits), and **what it buys**: `all` (general store) or a list of categories (the smith buys metal and gear). Shops only buy at the standard rate in the prototype. Better rates at specialist shops come later.
- **Stock:** basic goods are unlimited. Limited items show the quantity left and restock over time (real minutes for the prototype, the clock later). Items the player sells don't appear in a shop's stock in the prototype.
- **Opened from:** talking to a shopkeeper (a dialogue option "Let's trade"), or clicking a market stall. Both open the same screen with the shop's id. The building or stall knows only the id. Shops work in any map: the playground can put a counter anywhere.
- **Starter shops for the capital (proposal):** General Store (buys all, sells basic tools, food and materials), Smithy (metal, weapons, shields), Fishmonger or Market stall (fish, cooked food), Tailor/Hatter (cosmetic hats; a gold sink).

## Jobs

Jobs are **repeatable paid tasks**, separate from story quests. They appear on the Quests page in a **Jobs** section with their own progress and history.

**Kinds of job (prototype set):**

| Kind | Example | Done when |
| --- | --- | --- |
| `deliver` | "Take this package to the baker." | Talking to the recipient while holding the package item (`sellable: false`). The giver hands it over when you accept. |
| `bring` | "Bring me 10 Small Logs." | Handing in the items. They're taken when you hand them in, not when you accept. |
| `craft` | "Make 3 Cooked Pondfish for the inn." | Handing in the crafted items. Items crafted earlier count too. |
| `gather` | "Catch 5 Pondfish." | Counted from shared completion events after accepting, then a handoff to the giver. |

**Two places to get jobs:**
- **The quest board** in the town square, a prop with a `read` spot. It shows about 4 jobs from a pool, each with giver, task, reward and a rough location. Taking one marks it as yours. Finishing or abandoning one brings in a new job after a short delay. The board offers a mix of kinds, and at least one job that needs no combat and no tools, so a new player always has something to do.
- **Townsfolk who ask.** Some townsfolk carry a repeatable job, shown with a marker over their head. The post office slime always has a delivery to a random address in town, and a cooldown before the next. Other givers (baker, smith, fishmonger) ask for their trade's goods.

**Rules (proposal):**
- **Several active jobs at once**, up to 3 board jobs plus one per townsfolk giver.
- **No timers** in the prototype: cozy first. Abandoning a job is free. A delivery package is returned to the giver when you abandon it.
- **Rewards** are Gold Pieces plus a small XP grant to the related skill (fishing XP for a fish job). Delivery pays by distance. Rewards are tuned so an hour of jobs plus selling earns about as much as an hour of fighting would earn in value; the exact rate is set when numbers exist.
- **Addresses** for deliveries are buildings with doors and a recipient townsfolk or door drop-off spot (CITY.md). That's the one part of jobs that depends on the city; other kinds work anywhere.
- Jobs are counted from shared events (`resource`, `crafted`, gold, handoff), never by area code. A board or giver can be placed in any map.

## Enemy drops

Defeated enemies now drop loot (user, 2026-10-10). The rules belong in COMBAT.md; the economy part is here.

- **Each enemy has a drop table** in its stat sheet (`ENEMIES` in `combat-rules.js`): an optional gold range, items that always drop, and chance rolls (`{item, chance, count}`). Drops are rolled once, on the shared victory event, from the same code in every map. A playground override can fix the random seed.
- **Drops land on the ground** where the enemy was defeated, as one **loot pile** you click to pick up. The pile uses the shared ground-pickup lifecycle. It belongs to whoever defeated the enemy and disappears after a few minutes (starting at 3) if left alone. **The player always clicks the pile to pick it up** (user, 2026-10-10). No mode or assistance picks it up automatically for now.
- **No drops from** inert training targets, scripted story fights, or creatures with no reward (the Cinder Golem, for now). Practice enemies can drop loot; the tutorial's waking reset clears it anyway.
- **Balance:** combat income from drops counts toward the shared earning target, so jobs and selling stay competitive for pacifists. Drops favour materials (hides, ore, food) that feed crafting and selling over large amounts of gold.

## Playground coverage

Required in the same change as each part:
- **Gold:** add, remove and set Gold Pieces through the debug inventory controls. Reset to 0.
- **Drops:** roll any enemy's drop table without a fight, and show its odds. Spawn a loot pile anywhere. Fix the random seed.
- **Prices:** a price list with value, sell price, sellable flag, and recipe margin checks highlighted.
- **Shops:** open any shop by id from the playground, plus a test counter fixture that can be placed in any map with a shopkeeper. Reset stock.
- **Jobs:** a test board fixture and a test giver in any map. Spawn a job of each kind, complete or abandon it instantly, reset all jobs and cooldowns. Deliveries in the playground use test addresses until the city exists.

## As implemented (gold, values and shops, 2026-10-11)

User decision (2026-10-11): this phase builds gold, values and shops, hooked up to Gelton; enemy drops and jobs come later.

- **Gold** (`economy.js`): `gold` is the first item in `ITEMS` (Gold Pieces, `sellable: false`), so it sorts first. `createWallet({inventory})` has `earn`, `spend` (refuses to go below zero), `set` and `gold`; each change is reported through `last` (a signal) and `onChange` listeners for future notices, quests and jobs. `formatGold` gives the short form ("1,250 GP"). The Inventory page shows the total at the top, and each item's detail says what it sells for. The coin icon doesn't yet change with the amount.
- **Values** (`items.js`): every item has a `value` and a `category` (metal, weapon, armour, ammo, tool, wood, stone, fish, food, hat, currency). `SELL_RATE` is 0.4 and `sellPrice` is `floor(value × 0.4)`, at least 1. `economy.test.js` sweeps every recipe both ways: the result sells for at least its materials' sell prices, and for less than buying those materials costs. So crafting pays, and buying, crafting and reselling never does.
- **Shops** (`shops.js`): `SHOPS` covers the general store, smithy, weaponsmith, armourer, fishmonger, grocer, bakery, tavern, inn, hatter, carpenter and market stall. Each has a name, a greeting, its stock (unlimited unless `limit`; limited stock comes back one at a time every `RESTOCK_MINUTES` = 5 real minutes) and what it buys (`all` or categories).
  - `createShops` does the buying and selling. Each refusal has a reason the screen shows: sold out, not enough gold, "doesn't buy this", equipped (worn copies, including the companion's hat, can't be sold), or quest item.
  - Selling your last needed tool (`NEEDED_TOOLS`) asks first, using the compact confirmation.
  - Building uses map to shops (`SHOP_FOR_USE`; a building's own `desc.shop` wins).
- **Shop screen** (`ui/dialogs/shop-dialog.js`, opened by `shop-menu.js` on the modal host) has:
  - The keeper's greeting and your gold.
  - Buy and Sell, and the goods with their price and stock or quantity owned. Blocked items are dimmed with their reason.
  - The chosen item's detail, with 1, 5, All or a typed amount.
  - A wide layout on desktop and fullscreen one-view-at-a-time on phones.

  Trades show "Bought X ×n · Paid N GP" or "Sold X ×n · Received N GP" receipts in the shared item feed.
- **Where shops open:**
  - A **shop counter** (shop, bar and fish counters are now clickable, *Trade at counter*) opens its building's shop.
  - A **market stall** opens the market (or a stall's own `shop` in map data).
  - A **shopkeeper minding the counter** or a **vendor at a stall** greets you and opens their shop (`townsfolk.js` `person.shop`).
  - Any map works: the playground can place a counter anywhere. The keeper stands behind the counter, so clicking the keeper may walk you round behind it; the counter itself is the quick way.
- **Playground** (Economy fieldset):
  - Set gold, +100 or reset it to 0.
  - Open any shop.
  - Place a real counter for any shop beside you in any map, or remove it.
  - Reset stock.
  - A price list (value, sell price, category, sellable).
  - Gold is also in the Inventory item list.
- **Not yet:** a coin icon that grows with the amount, better rates at specialist shops, a save system (gold is lost on reload, like everything else).

## As implemented (enemy drops and jobs, 2026-10-11)

User request (2026-10-11): "Let's do enemy drops and jobs next."

- **Drops:**
  - Tables, the roller and odds are in `drops.js` (also a seeded random for the playground and tests).
  - The loot pile is `loot-piles.js`, with its model in `loot-pile-model.js`: a tied sack, with coins when it holds gold. It is clicked to pick up and lasts 180 s. Each pile shows its items as receipts.
  - Rolled on every victory through the combat system's single `won` handler. Fixing this found a duplicate `won` key that had silently dropped the victory sound and happy face; both are back.
  - See COMBAT.md *Defeat drops*.
- **Jobs** (`jobs.js`):
  - All four kinds. The board pool has 12 jobs: bring sticks, rocks, logs, ore or stone; craft meals, rods or a dagger; gather fish, logs, ore or sticks. Four are posted at a time; you can take three, and each taken offer is replaced 20 s later. At least one posted job always needs no tools.
  - Townsfolk `GIVERS`: post (deliveries, 12–30 GP, 30 s cooldown), smith (bring ore), fishmonger (gather fish), baker (craft meals).
  - Gather jobs count from the shared gathering and fishing events after you accept.
  - Deliveries give a `package` (not sellable). You hand it in by talking to the recipient. Recipients are townsfolk with a house or shop in the giver's city.
  - Abandoning is free, and a package goes back.
  - Rewards are gold plus a little XP in the related skill (`grantSkillXp`).
- **Where jobs come from:**
  - Any noticeboard opens the **job board** (`ui/dialogs/job-board.js`: posted jobs with Take job, your board jobs with Hand in and Abandon).
  - **Talking to townsfolk** opens a compact talk dialog (`ui/dialogs/talk-dialog.js`) with their line and what they have for you: hand over a package or hand in a job, accept their job, or trade. With only a shop it opens directly, as before.
  - In Gelton: Pim of the Post in the square (deliveries), and the smithy, fishmonger and bakery keepers. They show a gold "!" marker (`job-marker.js`) while they have a job for you, and a parcel marker while you owe them a hand-in.
- **Quests page:** a Jobs section (`ui/job-view.js` cards: progress, where to hand in, reward, Abandon). Hand-ins show "Handed in X · Earned N GP" receipts.
- **Playground** (Drops & jobs fieldset):
  - Drops: roll any enemy's table with its odds, drop a real pile beside you (rolled or a test pile), fix or clear the seed, clear piles.
  - Jobs: open the board, place a noticeboard anywhere, stand-in givers of each kind and a stand-in recipient (any map), finish all jobs, hand in all, abandon all, clear cooldowns, reset.
  - The model catalogue has the loot pile and both job markers.
- **Gathering (2026-10-11):** Gelton's park has trees, sticks and rocks, and its countryside has woods, fishing water and copper outcrops (WORLD.md), so every job kind can be done after waking.

## Conversational jobs and the post office (user request, 2026-10-12)

- **Talking** (`townsfolk-talk.js`): talking to townsfolk opens the character dialogue box (portrait, name, choices). Someone with something for you says "What can I do for you?" and offers whichever of these apply: *I have a package for you.*, *I have your 3 Raw Pondfish.* (or *I delivered the package.*), *About that job…*, *Do you have any jobs for me?*, *I'd like to browse your wares.* and *Nothing, thanks.* Anyone else just says their line. The old compact talk popup is gone.
- **Shopkeepers' jobs** (`jobs.js` `SHOP_WANTS`): every keeper whose shop has wants gives jobs. These are items the shop deals in, each with a reason in their own words:
  - the fishmonger: pondfish to catch or bring;
  - the smithy: ore and ingots;
  - food shops: cooked fish;
  - the carpenter: logs and sticks;
  - and so on. The hatter asks for nothing.

  The amount is random within the want's range. Pay is the item's value × count + 2 + a random bit up to the item's value (at least 3), plus some XP in the matching skill. The conversation goes "Well… I need 4 Raw Pondfish. The morning catch was thin." then "I'll pay you 37 gold if you bring me 4 Raw Pondfish, what do you say?" with *I'll do it!* or *I don't have time, sorry.* The same offer stands until taken; one job per giver, then a 45 s cooldown.
- **Markers:** no "!" over givers. A parcel marker shows only over someone you owe: a package's recipient, or a giver whose job is ready.
- **Post office:** the shop nearest the square is Pim's *Post office* (use `postOffice`: counter, desk, cupboard, shelves, parcels; parcel sign). Pim keeps it from behind the counter.
- **Deliveries in two steps:** take the package to its recipient (they thank you and send you back), then return to Pim, who pays (`jobs.deliver` then `handIn`). The job card says *Return to Pim of the Post* once delivered.
- **Talking across counters:** counters and stalls are `reachOver`. `interactionRoute` lets you stand on the far side of one, so keepers behind counters can be talked to.

## Plan

1. **Gold and values.** (done 2026-10-11) The `gold` item, `value` and `sellable` on every item, the gold helpers, price tests and notices.
2. **Shared shop screen and shop definitions.** (done 2026-10-11) A playground counter in any map, a General Store, selling restrictions.
3. **Enemy drops.** (done 2026-10-11) Drop tables, loot piles, pickup, COMBAT.md rules.
4. **Jobs.** (done 2026-10-11) The four kinds, Jobs on the Quests page, quest board prop, giver marker, test addresses.
5. **City hookup** (with CITY.md): shop buildings, shopkeepers, the town square board and the post office slime with real addresses. (Shops done 2026-10-11; the board and post office come with jobs.)

## Open questions for the user

None at the moment. (Gathering in Gelton was answered 2026-10-11: park gather spots in the city and countryside around it; see WORLD.md.)
