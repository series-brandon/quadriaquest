# Economy: Gold Pieces, shops and jobs (design draft)

Draft, 2026-10-10. Nothing here is implemented. Numbers are starting proposals to tune.

**User decisions (2026-10-10):**
- **An economy is vital for the prototype.** Pacifists must be able to earn a living without fighting, through **jobs** and by **selling what they craft and forage**.
- **One currency: Gold Pieces.**
- **Most things can be sold.** Some can't, such as quest items and companions.
- **Jobs come from two places:** a **quest board** and **townsfolk who ask for repeatable tasks** (for example a post office slime: "I need this package delivered! Go!").

As with every system (AGENTS.md), the economy is shared gameplay. Prices, buying, selling, jobs and the shop UI work in any map. A city only places the shops, shopkeepers, boards and job givers, and adds the story around them. Everything can be reached, repeated and reset in the playground.

## What exists today

- The inventory is a plain count per item (`inventory[id] = n`). There's no size limit and no currency.
- `ITEMS` in `items.js` has a name, description and optional icon. There are no prices and no flags for what can be sold.
- Enemies give XP but drop nothing (COMBAT.md proposes no item drops).
- `supply-offers.js` hands out free kits. Those stay free and are not a shop.
- There's no save system, so gold is lost on reload like everything else.

## Gold Pieces

- **A wallet, not an inventory item (proposal).** `gold` is a player resource shown in the Inventory header and the sidebar overview, not a stack among items. It can't be dropped, used as a crafting material, or sold by mistake. All changes go through `wallet.earn(n, source)` and `wallet.spend(n, reason)`. `spend` refuses anything that would go below 0 and returns false, and both report an event that quests, jobs and notices can watch.
- Earning shows a small gold notice (reusing the item notices). Spending doesn't need one; the shop shows the new total.
- Icon: a gold coin in the icon set. Name everywhere: **Gold Pieces**, written as "250 GP" in tight spaces.

## Item value and what can be sold

**Each item gets a `value`** in `ITEMS`: what it costs to buy from a shop that stocks it. **Selling** to a shop pays `floor(value × 0.4)`, at least 1. The gap between buying and selling stops buy-then-sell loops making money.

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
- Jobs are counted from shared events (`resource`, `crafted`, wallet, handoff), never by area code. A board or giver can be placed in any map.

## Playground coverage

Required in the same change as each part:
- **Wallet:** show, add, remove and set gold. Reset to 0.
- **Prices:** a price list with value, sell price, sellable flag, and recipe margin checks highlighted.
- **Shops:** open any shop by id from the playground, plus a test counter fixture that can be placed in any map with a shopkeeper. Reset stock.
- **Jobs:** a test board fixture and a test giver in any map. Spawn a job of each kind, complete or abandon it instantly, reset all jobs and cooldowns. Deliveries in the playground use test addresses until the city exists.

## Plan

1. **Wallet and values.** `gold`, `value` and `sellable` on every item. Price tests. Wallet notices and display.
2. **Shared shop screen and shop definitions.** A playground counter in any map, a General Store, selling restrictions.
3. **Jobs.** The four kinds, Jobs on the Quests page, quest board prop, giver marker, test addresses.
4. **City hookup** (with CITY.md): shop buildings, shopkeepers, the town square board and the post office slime with real addresses.

## Open questions for the user

1. **Wallet or item?** Gold as a separate wallet (proposed) or as an item stack in the inventory, like RuneScape coins?
2. **Sell rate:** is 40% of the buy price right as a starting point?
3. **Should enemies drop anything** (gold or items), now that there's something to spend on? COMBAT.md currently proposes no drops.
4. **Death penalty:** should being defeated cost gold? Proposal: no, in keeping with the cozy direction.
