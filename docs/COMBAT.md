# Combat and progression design

This document is the source of truth for QuadriaQuest's combat and associated progression design. Maintain the current rules in place; do not append decision history, superseded alternatives, or conversation transcripts. Implementation status belongs in HANDOFF.md. An unresolved rule is not authorization to invent an implementation.

## Scope and invariants

- Combat takes place continuously in the overworld. Do not introduce turn-based encounters, a separate battle scene, or a paused overworld.
- Use **Threat Level**, never Combat Level, for an informational rating of an entity's combat danger. It does not multiply damage or impose level-gap damage/immunity thresholds. Underlying stats determine combat outcomes; the rating's derivation remains unresolved.
- Adopt the full combat skill, armor skill, proficiency, attribute and associated non-combat progression structure described below. Preserve existing crafting recipes. Exact skill reassignment and rollout boundaries remain unresolved.
- Adopt the numerical combat formulas below, subject to explicit safeguards and unresolved integration rules. Do not silently retune their coefficients.
- Combat, progression, equipment, resources, UI, animation and entity behavior are shared across maps. Areas own placement and narrative only.
- Preserve impact-based aggression, auto-retaliation, smooth pursuit/leash return, and eating during combat. Any proposed replacement must be resolved explicitly.
- Player attacks should be predictable and feel good. Rare random outcomes should benefit the player; rare adverse outcomes require an explicit, clearly communicated design exception. Do not introduce incidental low-probability failure as a default.
- Casting does not inherently require a weapon or empty hands. Equipped weapons remain visible during casting; individual spells may specify channeling requirements.

## Resource-cost balance

Balance costs against the settled 100-point starting pools. Do not import numerical costs without checking uses per full pool, sustained use under regeneration and recovery time. Review costs explicitly rather than applying an automatic blanket multiplier to every spell, ability or aura.

Strong Strike costs 50 Energy at the starting baseline. Energy Strike's explicitly agreed 4-Mana baseline and Rush/Harden's explicitly agreed 0.5 Ki/sec upkeep with 0.5-Ki activation fees remain in force unless individually revised. At current Energy regeneration rates, one 50-Energy use requires 100 seconds of in-combat regeneration or 50 seconds at the out-of-combat rate to replenish; the out-of-combat rate still respects its 5-second exit buffer. Strong Strike is intentionally an occasional burst, not a frequently repeated enhancement. Keep the 50-Energy starting cost and these recovery rates as the baseline: two uses from a full 100-Energy pool before accounting for regeneration. Do not increase Energy recovery merely to make Strong Strike more frequent.

## Enemy baseline

| Enemy | Health | Ordinary damage range | Attack interval | Tutorial protection |
|---|---:|---:|---:|---|
| Goblin Scrapper | 50 | 1–10 | 2.5 seconds | Cannot reduce player health below 1 |
| Goblin Bruiser | 100 | 3–20 | 2 seconds | Can defeat the player |

Scrappers are passive unless provoked; Bruisers are aggressive according to entity configuration. Inert practice targets are distinct from the weakest living enemy and retain 4 HP and no attack. Early-enemy damage is tuned against the player's starting maximum HP:

- The weakest living enemy's maximum damage per hit must not exceed 10% of starting HP under normal starting conditions.
- The next stronger enemy's maximum must not exceed 20% of starting HP under those conditions.
- These are baseline balance ceilings, not absolute post-modifier damage clamps. Unallocated base starting maximum HP is 100, so tune the enemies through their underlying stats to approximately 10 and 20 maximum damage, respecting those normal-encounter ceilings. These values must be outputs of the shared combat formula rather than separate fixed-damage overrides. If starting HP changes by an explicit design decision, rebalance these enemies accordingly; do not make their damage scale dynamically with the player's current or upgraded HP.
- Both early enemies have `can_crit: false` and `can_dodge: false`. Most enemies should be incapable of critical hits; enemy criticals are an explicit exceptional capability.
- In an isolated early encounter, ordinary player vulnerabilities must not amplify these enemies above their baseline ceilings. Their standard attacks and any normal strategy variation must remain within the predictable starting-encounter damage budget.
- External curses, debuffs or other situational modifiers can change the damage taken. They are exceptions to the isolated-encounter baseline, not justification for routine early-enemy damage spikes.

 Starter equipment, food and tutorial difficulty require an explicit balance decision.

## Mathematical safeguards

### Nonnegative damage

Damage can be zero but can never be negative. Negative Accuracy is permitted; the minimum possible damage roll bottoms out at zero, not one.

```text
MAX_HIT = max(1, floor(1 + power_bonus / 10))
MIN_HIT = max(0, min(MAX_HIT, 1 + floor(accuracy_bonus / 10)))
```

For example, an accuracy bonus of -2 produces a minimum roll of 0; sufficiently negative Accuracy still cannot produce a negative roll. A zero-damage attack is a valid resolved attempt, distinct from a miss. Damage application must never turn negative damage into healing.

### Rare critical hits and dodges

Critical hits and dodges should be rare, feel-good surprises, ordinarily no more than a few percentage points. Players should not expect or rely on them. Dedicated critical/dodge builds must not become disproportionately powerful.

```text
player_dodge_percent = clamp(1 + dodge_bonus / 50, 0, 100)
player_critical_percent = clamp(1 + critical_hit_bonus / 50, 0, 100)
```

These formulas use percentage points: a bonus of 50 gives a 2% chance, not a 100% increase in probability expressed as a fraction. The 0–100% clamp is a mathematical validity bound, not an intended achievable gameplay range. No additional numerical gameplay cap has been selected. Bonus budgets across skills, attributes, equipment and buffs must be designed to preserve rarity; flag any conflict with that requirement rather than assuming the validity clamp solves balance.

Players have 0% base miss chance (100% baseline accuracy). Do not perform a default random miss check on player attacks. Accuracy bonuses still determine minimum damage, not hit probability. Guaranteed baseline accuracy does not impose a minimum-damage floor: a connected attack can deal zero damage. Ordinary enemies cannot dodge. Explicitly identified special enemies may have dodge capability as an exception.

Enemy base miss chance is 1%, separate from the player's dodge chance. Retain independent miss and dodge opportunities: an enemy can whiff, or the player can dodge an otherwise connecting attack. Present enemy misses and player dodges as distinct feel-good outcomes. Neither chance replaces the other. With 1% enemy miss and 1% player dodge, the combined avoidance probability is 1 - (0.99 * 0.99) = 1.99%, not 2%. Enemy dodge and critical hits are disabled unless explicitly enabled by `can_dodge` and `can_crit`. Both capabilities are exceedingly rare exceptions reserved for explicitly designed special enemies, such as rare spawns or an occasional boss, with those enemies defined later. Neither capability is enabled for the two early enemies. Players must be clearly informed when an enemy can dodge or critically hit; the presentation must communicate the capability before it produces an unexpected adverse outcome. Critical hits multiply rolled damage by 3 before mitigation. Rates for explicitly enabled enemy dodge/critical capabilities remain unresolved; the attack resolution sequence is defined below. Any enemy dodge or critical capability must satisfy the explicit-exception principle for adverse randomness.

### Immunity

Immunity produces exactly zero damage. No minimum or other damage modifier may force damage through immunity. Explicit `immune_damage_types` applies to matching incoming damage types. Elemental immunity must likewise remain zero.

### XP inverse

The correct inverse of the adopted total-XP curve is:

```text
TotalXP(L) = 12500 * (9^(L / 100) - 1)
raw_level(XP) = 100 * log(1 + XP / 12500) / log(9)
```

Skills and proficiencies start at level 1 with zero XP. Use `min(500, max(1, floor(raw_level(XP))))` for their displayed/effective whole level. Preserve the curve's thresholds for level 2 onward rather than shifting the curve. With whole XP, level 2 is reached at approximately 562 total XP and level 100 at 100,000 XP.

The starting level-1 interval runs from zero XP to the level-2 threshold. UI progress and XP-to-next-level calculations must use zero as the starting boundary for level 1 rather than treating `TotalXP(1)` as already-earned starting XP. The formula's `TotalXP(1)` does not create a separate unlock or starting XP grant. Core levels use this same zero-XP level-1 convention and curve, with their own independently tracked core XP.

## Damage resolution

Accuracy increases minimum damage, while Power increases maximum damage. Descriptions of Accuracy as hit chance do not supersede these explicit formulas.

```text
stat_resistance_pct = applicable_resistance_bonus / 10
resistance_pct = sum(all applicable resistance contributions in percentage points)
damage = max(0, floor(rolled_damage * (1 - resistance_pct / 100)))
```

- Final damage is nonnegative.
- There is no guaranteed minimum final damage, at any Threat Level difference. Zero rolls, full mitigation and positive fractional damage rounded down to zero can all produce zero damage.
- Meaningful damage between similarly threatening opponents is a balance goal, not a hard mathematical floor. Tune progression, equipment and encounters to support that goal.
- Threat Level differences never directly increase, reduce or prevent damage. A stronger opponent is dangerous because of its actual stats, equipment and abilities, not a separate level multiplier.
- Applicable stat-derived resistance may reach a bonus of 1000, giving 100% damage reduction. There is no gameplay cap below 100% reduction. Reaching 1000 should be impossible under normal progression; bonus budgets must reflect this. Do not add a lower balance cap without an explicit decision.
- Resistance must never produce negative damage or heal a target. A 100% reduction produces zero damage; no minimum-damage floor overrides it.
- Vulnerabilities combine additively with matching resistances, with no additional damage-amplification cap. Spell/ability modifier order remains unresolved; rounding and clamping follow the final-result rules below.
- Compute contextual combat values from skills, attributes, strategy, equipment, proficiencies and entity bonuses at runtime. Do not persist a second authoritative derived-combat snapshot.
- Formulas mapping those inputs into bonuses, attack intervals and Threat Level are not yet defined.

### Attack resolution sequence

Resolve ordinary attacks in this order:

1. Check the attacker's miss chance. A miss ends hit resolution; do not also roll a dodge or critical hit. Players have zero base miss chance and skip that default random check.
2. For an otherwise connecting attack, check the defender's dodge chance if eligible. A dodge ends hit resolution; do not roll damage or a critical hit.
3. If neither avoidance outcome occurs, roll damage and check for a critical hit if the attacker is eligible. A critical multiplies the rolled damage by 3 before mitigation.
4. Resolve applicable resistance, vulnerability and immunity for each damage portion, then combine and round under the shared final-result rules.

Enemy misses and player dodges remain separate outcomes, with the dodge opportunity conditional on the attack not missing. Avoided attacks cannot critically hit. Resolved misses and dodges still follow the existing attack-attempt aggro, paid-cost and eligible base-XP rules. Spell backfires retain their explicitly separate no-dodge/no-critical resolution rules. The placement of other spell and ability modifiers remains to be specified.

### Resistance categories and additive stacking

Resistance applies according to the incoming damage's categories, not a universal defense layer. Magical resistance applies to magical damage; elemental resistance applies to its element regardless of whether the damage is magical or physical. Physical fire damage is possible and does not become magical merely because it carries the Fire element.

Add matching resistance contributions in percentage points, then apply one resulting reduction. Do not multiply separate category reductions or apply an already combined resistance value a second time. Convert stat-derived resistance bonuses via `/10` and fractional elemental resistance values via `*100` before adding; each contribution is counted once.

For a target with 10% Magical resistance and 50% Fire resistance, with no other applicable resistances:

| Incoming damage | Matching resistance | Final damage from a 100-damage input |
|---|---:|---:|
| Magical Fire | 10% + 50% = 60% | 40 |
| Magical Water | 10% | 90 |
| Physical Fire | 50% | 50 |

Negative resistance represents vulnerability and participates in the same additive sum as positive resistance. For a magical Fire portion, -50% Fire resistance and +10% Magical resistance sum to -40%, giving a multiplier of `1 - (-0.40) = 1.4`. There is no additional cap on amplification from negative total resistance. Content and bonus budgets should avoid extreme vulnerability stacking in normal play; add a balance cap only through an explicit design decision. Explicit immunity remains authoritative, and resistance/vulnerability applies only to matching portions.

Define attack categories and resistance sources explicitly. Content, equipment and bonus budgets must prevent unintended overlapping stacks; do not compensate for ambiguous categories with an unapproved balance cap. Total reduction of 100% or more cannot produce negative damage. Explicit immunity still takes precedence.

### Item damage modifiers

Items primarily contribute bonuses and modifiers to attacks. Support both of these configurable effects:

Use **damage infusion** for adding a damage/elemental type to a configured share of each attack. Infusion preserves all existing damage categories and their applicable modifiers; it does not replace or convert them.

- **Full infusion:** “Infuses all attack damage with Fire.” All damage keeps its existing applicable modifiers and also uses Fire modifiers, additively.
- **Partial infusion:** “Infuses 30% of each attack's damage with Fire.” The affected 30% keeps all existing modifiers and additionally uses Fire modifiers, additively; the remaining 70% uses only its existing modifiers.
- A physical slicing attack partially infused with Fire remains physical slicing throughout. Its infused portion is also Fire; it does not become Magic merely because it is elemental.
- The percentage describes a share of every attack's damage, not a chance to trigger, a percentage of attacks, or bonus damage added on top. Infusion itself does not add a second full-strength hit or an extra damage roll. Fire modifiers may subsequently increase or reduce the affected damage.
- For resistance, sum the matching original categories and the infused category once each for the affected portion. Apply only the original matching categories to the unaffected portion.

### Multiple infusions

Infusions occupy separate, non-overlapping portions of the original attack damage. All portions retain the attack's original categories and modifiers. Resolve their shares together, independent of equipment or buff application order.

Let `p_i` be each configured infusion percentage and `S` their sum:

```text
effective_infusion_percent_i = p_i * min(1, 100 / S)  // when S > 0
uninfused_percent = max(0, 100 - S)
```

When there are no infusions, all damage is uninfused. When the total is at most 100%, use the configured shares and leave the remainder unchanged. When it exceeds 100%, proportionally normalize the shares to total 100%; do not add damage or create overlapping infused portions.

| Configured infusions | Effective damage portions |
|---|---|
| 30% Fire + 20% Water | 30% Fire-infused, 20% Water-infused, 50% uninfused |
| 75% Fire + 75% Water | 50% Fire-infused, 50% Water-infused |
| 100% Fire + 50% Water | 2/3 Fire-infused, 1/3 Water-infused |

Separate Fire and Water infusions do not create a combined Fire/Water portion and do not average their elemental resistances together. Calculate applicable modifiers for each portion independently. Intrinsically multi-element spells also resolve separate elemental portions, as specified in Magic.

Normal item, buff and encounter design should make extreme infusion stacking and combinations requiring normalization difficult to reach. Normalization is a deterministic fallback for valid combinations, not a target for routine builds. Avoid creating excessive stacking edge cases through ordinary content.

### Final-result rounding and clamping

Keep intermediate calculations at full precision. Round and clamp end results rather than intermediate contributions. In particular, do not round each infused damage portion: apply its own resistance/immunity and the nonnegative portion safeguard below, combine resolved portions, then round the final attack damage down once and ensure the final result is nonnegative. Two portions of 3.6 damage produce `floor(7.2) = 7`, not 6.

The same end-result principle applies to other calculated outputs: apply their specified rounding/bounds after combining their relevant inputs. Do not introduce intermediate rounding or clamping silently. If this would create an unintended result or conflict with an existing formula, call out the specific case and resolve it with the user before implementation.

Definitions of discrete outputs such as attack-roll bounds, chance percentages and whole skill levels still require explicit output boundaries. Review existing formula clamps at those boundaries; do not use this principle to silently change adopted coefficients or remove deliberate normalization.

**Explicit exception: prevent negative damage within each portion.** Resistance or immunity affecting one portion must never absorb unrelated damage. For each portion, use a resistance multiplier of at least zero; explicit matching immunity yields zero for that portion. Retain fractional damage after this safeguard. Sum the nonnegative portion results and round down only once at the end.

```text
portion_resistance_multiplier = max(0, 1 - applicable_resistance_pct / 100)
resolved_portion_damage = 0 if immune else portion_damage * portion_resistance_multiplier
final_attack_damage = max(0, floor(sum(resolved_portion_damage)))
```

For 50 Fire-infused damage against 150% applicable resistance plus 50 uninfused damage against no resistance, the portions resolve to 0 and 50, totaling 50 damage. Excess Fire resistance cannot reduce the uninfused portion. This is a local safeguard, not permission to round individual portions.

The order for offensive additive modifiers relative to rolls, criticals and other effects remains unresolved.

## Strategies, styles and damage types

One strategy is selected at a time. Technical has no modifiers. Each specialized strategy adds 10 to its favored bonus and subtracts 2 from the other four: Accuracy, Power, Speed, Resistance and Dodge. Negative bonuses are permitted; damage/chance safeguards still apply.

| Strategy | Favored contribution | Associated skill |
|---|---|---|
| Technical | None | Technique |
| Accurate | Accuracy | Accuracy |
| Strong | Power | Power |
| Fast | Attack speed | Speed |
| Defensive | Resistance | Defense |
| Agile | Dodge | Agility |

Attack strategy dictates the receiving skill using the mapping above, within the attack's combat style (Melee, Ranged or Magic). The full strategy XP award goes to that one skill; do not split it among the six combat skills. For example, a Strong melee attack awards Melee Power XP, while an Accurate magic attack awards Magic Accuracy XP. Applicable proficiency XP is awarded separately. Enemy strategies and damage types use weighted allowed tables; when to reroll them in real time remains unresolved.

Attack styles are Melee, Ranged and Magic. Physical damage types are Slicing, Piercing, Bludgeoning, Crushing and Chopping; magic additionally carries elements. Weapon configuration determines available damage types. The player chooses one supported damage type per hand independently. Each strike uses the striking hand's selected type. Single-type weapons automatically use their only type and require no selection input. If an equipment change invalidates a hand's selection, that hand falls back to the first supported type of its new weapon without changing the other hand's selection. Unarmed fists use Bludgeoning with zero equipment bonuses. Dual-wield choices are restricted to the types supported by the weapon in the corresponding hand; one hand cannot borrow a damage type from the other weapon. Timing and per-strike properties follow the rules below.

Damage-type advantages must be defined through actual resistance/equipment values; descriptive armor matchups are not an additional implicit multiplier. Use shared stab/slash/punch/bow/casting/block animations appropriate to the action and equipment.

## Equipment bonuses and dual wielding

Separate equipped bonuses into two explicit scopes:

- **Character-wide bonuses:** attributes, resistance, resource bonuses and explicitly global attack bonuses apply while the item is equipped. Both equipped weapons may contribute these bonuses.
- **Weapon attack properties:** the weapon's supported damage types, interval, infusion and weapon-specific offensive bonuses apply only when that weapon strikes. Do not automatically copy the other weapon's attack properties into a strike. An item explicitly modifying all attacks is a deliberate character-wide effect, not the default scope of weapon offense.

Dual wielding alternates hands on one shared sequential attack timer. Each attack uses its striking weapon's interval and properties, shared character stats and selected strategy. The other hand does not run a second concurrent timer or add a simultaneous hit. No automatic dual-wield speed bonus is specified.

For a 1-second dagger followed by a 2-second sword, the timing is: dagger resolves at 1s, sword at 3s, dagger at 4s, sword at 6s. Each next hand spends its own interval before resolving. Combining a slower weapon with a faster one can slow the faster weapon's strike frequency; dual wielding is not an automatic doubling of attack frequency.

Each hand's strike resolves its own damage and awards strategy XP, the striking weapon's proficiency XP, and applicable elemental XP according to existing rules. Merely equipping the other weapon does not grant its proficiency XP on that strike. If both weapons share a proficiency, each strike awards that proficiency once.

Equipment changes are allowed during combat. An already-committed attack retains the weapon and offensive stats it committed with, even if equipment changes before impact. New equipment applies to subsequent attacks; swapping gear cannot change a projectile already in flight. Resolve damage and proficiency attribution from the committed attack rather than whatever happens to be equipped at impact.

An attack commits when its windup begins. Lock its weapon, offensive stats and attack timing at that point. Equipment swaps do not restart, shorten or modify the committed attack. The next attack uses the new setup and its own interval; do not carry a faster weapon's timing into an attack using a slower replacement.

Strategy, selected spell and per-hand damage type may also be changed during combat. Changes affect only subsequent attacks. At windup start, retain the committed strategy, spell (if any), damage type and strategy-skill XP destination along with the weapon, offensive stats and timing. A later selection change cannot alter that attack or redirect its XP. Apply the same rule to projectiles that remain in flight.

Evaluate the defender's defensive stats at hit time, not the attacker's windup start. Use the defender's then-current resistance, equipped armor/shield and defensive buffs when resolving the incoming attack. Equipment or protection gained before impact can affect that hit. This does not change the attacker's committed offensive snapshot.

Movement cancels an attack still in windup if it has not struck or released its projectile. Commitment locks the attack's data but does not make its windup uninterruptible. A cancelled windup grants no attack XP. A projectile already released continues to resolution despite the attacker's movement, using its committed offensive snapshot and the defender's stats at impact.

Consume attack resources—arrows, spell Mana and required consumed items, and ability Energy—when the attack strikes or releases its projectile, not at windup start. A windup cancelled before that point spends none of these resources. Charge each attack once; a released attack is not refunded because it misses, is dodged or deals zero damage, including immunity. Costs use the committed attack, not a later spell/weapon selection.

Check that required consumable resources are available before beginning windup and recheck immediately before strike/projectile release. If a resource change during windup makes the committed attack unaffordable—for example, a mana drain—cancel the windup. The cancelled attack does not strike or release a projectile, spends no attack resources and grants no attack XP. Revalidate against the committed attack's requirements, not a later selection. Never allow a negative resource balance or a cost-free release through a resource race. If the selected attack cannot be afforded, pause auto-attacking while retaining its target and selected attack. Resume when the required resources become sufficient, using the normal eligibility checks and attack windup. Do not automatically switch weapons or spells to bypass the shortage. Moving away or explicitly cancelling combat clears this pending attack intent.

Show a clear, visible explanation that the attack cannot be made and identify the reason, such as insufficient Mana, missing ammunition, insufficient Energy or a missing consumed spell item. Keep the blocked reason current while waiting and clear it when the attack can proceed or the intent is cancelled. Present the status without repeatedly spamming messages on every retry check.

A cancelled windup loses all timing progress. Restarting requires a fresh full attack interval; do not retain partial charge or shorten the next attack. In dual wielding, cancellation does not advance the hand sequence: the cancelled hand remains next. Advance alternation only when an attack actually strikes or releases its projectile, regardless of its later hit/dodge/damage outcome.

Start a new dual-wield sequence with the main hand, then alternate. Switching targets during uninterrupted combat preserves the current hand sequence rather than resetting it to the main hand. Cancellation retains the pending hand as described above; restarting a cancelled windup is not a new sequence. Reset the next hand to main hand when the shared combat state ends, after its 5-second exit buffer. Switching targets or cancelling an attack while that state remains active, including during the exit buffer, preserves the pending hand. Use the same combat-state boundary as resource regeneration rather than a separate dual-wield timeout.

Weapon handedness and offhand eligibility are explicit item configuration. Do not assume every one-handed weapon is eligible for offhand use. Two-handed weapons occupy both hands and cannot be combined with an offhand weapon or shield. Determine eligible equipment combinations through shared item/equipment rules, not hardcoded area exceptions. Mixed weapon-type compatibility must follow the configured eligibility; no blanket authorization of every unusual pairing is implied.

Weapon Technique requirements are soft requirements: players may equip a weapon above their current Technique level, but use it with reduced effectiveness. The equipment UI must clearly identify the unmet requirement and resulting penalty. This does not bypass handedness or offhand eligibility rules. For an unmet Technique requirement, use:

```text
weapon_effectiveness = clamp(player_technique_level / required_technique_level, 0.1, 1)
```

A player at Technique 10 using a weapon requiring Technique 20 has 50% effectiveness. Effectiveness cannot exceed 100% from meeting/exceeding the requirement and bottoms out at 10%. A weapon without any configured requirements has full effectiveness. The minimum is a deliberate effectiveness floor, not a minimum-damage guarantee. Because even an extreme level mismatch retains 10% effectiveness, item bonus budgets must be checked so severely under-level equipment does not unintentionally dominate appropriate-level gear.

Apply the effectiveness multiplier only to the weapon's positive bonuses. Do not reduce the player's underlying skills or attributes, bonuses from other equipment, or the weapon's negative modifiers/penalties. A +20 weapon bonus at 50% effectiveness contributes +10; a -4 penalty remains -4. The scope is the weapon's contributions, not a multiplier on the entire final attack damage. Preserve intermediate precision and use the established final-result rounding rules.

For equipment with multiple requirements, calculate the player's current value divided by the required value for each configured requirement and use the lowest ratio for that item's effectiveness: `clamp(min(requirement_ratios), 0.1, 1)`. Apply this independently to each equipped item, including weapons and armor. Do not multiply separate requirement penalties. Scale only the item's positive bonuses; negative modifiers remain at full strength. Equipment has no backfire mechanic. For example, ratios of 1 and 0.5 give 50% effectiveness, while any lowest ratio below 0.1 still yields 10% effectiveness.

Under-level equipment retains its configured base attack interval, reach, supported damage types and hand requirements. These basic properties are not scaled by requirement effectiveness; reduced positive bonuses provide the under-level penalty without changing the weapon's basic behavior. Ordinary shared timing modifiers still apply normally. Define under-level behavior explicitly for each special item effect rather than treating it as a numeric bonus. The usual behavior is to grant the ability or apply the status at its full configured strength, provided its normal hit, trigger and other requirements are met. Under-level equipment effectiveness does not automatically weaken or disable these effects. Exceptionally powerful or special effects may specify stricter requirements or other explicit under-level behavior. Each effect definition must state its policy; do not infer an exception from rarity or power alone.

Equipment-granted abilities are rare special item effects, not a standard property of equipment. An item grants access to its ability only while equipped; equipping it does not permanently teach the ability. Removing the granting item removes that source of access. An independently learned permanent version remains available without the item. If the granting item is removed after an ability commits at windup start, that committed action may finish under the shared snapshot, resource and cancellation rules; losing the item alone does not cancel it. A queued ability that has not committed is cancelled if removing the item leaves no valid source of access. An independently learned version or another equipped granting source preserves access. New uses require current access. This is the initial policy and may be revised through deliberate balance tuning.

Armor skill requirements are also soft. Players may equip armor above their current level in its relevant Light Armor, Medium Armor or Heavy Armor skill. For each piece independently:

```text
armor_effectiveness = clamp(player_relevant_armor_skill_level / required_armor_skill_level, 0.1, 1)
```

Apply this multiplier only to that armor item's positive bonuses. Keep its penalties, the player's underlying stats and other items' bonuses unchanged. Pieces with no armor-skill requirement have full effectiveness. Show unmet requirements and the resulting reduced bonuses clearly in the equipment UI. These effectiveness rules do not change the established pre-mitigation basis for armor training XP.

Ordinary incoming damage does not interrupt an attack windup. A stun or explicit interrupt effect cancels an unreleased windup using the shared cancellation rules: lose windup progress, spend no unreleased attack resources, retain the pending dual-wield hand and clear any ability assigned to the cancelled attack. Immobilization alone prevents movement but does not automatically interrupt or prevent attacks; normal range and other attack requirements still apply. Released projectiles retain their existing independent resolution behavior. Any other interruption semantics must be explicitly resolved before implementation; the dual-wield sequence reset boundary is defined above.

## Progression

Replace the standalone Combat skill with Technique, Accuracy, Power, Defense, Agility and Speed for each of Melee, Ranged and Magic. Add Light Armor, Medium Armor and Heavy Armor skills.

Weapon proficiencies: unarmed, sword, dagger, axe, hammer, spear, bow, crossbow, staff, wand and shield. Armor proficiencies: helm, chest, hands, legs, feet, back and ward. Element proficiencies correspond to the elements below. Proficiencies progress through use; exact XP events and rates are unresolved.

Proposed attack XP uses the adopted source coefficients:

```text
strategy_xp = 50 + 10 * actual_hp_removed
action_progression_xp = sum(actual_skill_and_proficiency_xp_awards_from_one_action)
conversion_total = core_xp_remainder + action_progression_xp
core_xp_from_progression = floor(conversion_total / 5)
core_xp_remainder = conversion_total - 5 * core_xp_from_progression
total_core_xp = core_xp_from_progression + additional_core_experience
```

Award combat attack XP immediately when each attack resolves, including base strategy XP for resolved misses and zero-damage attempts. Do not defer earned attack XP until victory or require a collection popup. Retreat or defeat does not revoke XP already awarded. Award once per resolved attack, not for selection or windup. The damage term counts only actual target HP removed, not overkill or pre-mitigation damage. A calculated 20-damage hit against a target with 3 HP remaining earns `50 + 10 * 3 = 80` strategy XP. Attackable entities can modify this base award as specified below. A resolved attack that deals zero damage because of immunity still earns the base 50 strategy XP, subject to the attacked entity's XP multiplier and the receiving skill's level cap. Immunity alone does not disqualify an attack from XP. Configure low-risk or low-level immune enemies with appropriate XP modifiers/caps so high-level skills cannot gain unrestricted risk-free XP from them. For core conversion, aggregate all actual skill and proficiency XP awarded by one action after modifiers and caps, then apply the /5 conversion once to that sum. One action granting 6 XP to one progression track and 4 XP to another contributes 10 XP to the conversion and yields 2 core XP; do not round or convert each track separately. Carry the unconverted remainder forward between actions. Award one whole core XP per five actual skill/proficiency XP earned; do not round each action upward or discard the remainder. The remainder is measured in source progression-XP units and remains in the range [0, 5). For separate actions granting 6 and 4 progression XP, the first grants 1 core XP and carries 1; the second grants 1 core XP and leaves 0, for 2 core XP total. Keep a single per-player conversion remainder across progression sources rather than resetting it on action, skill or combat changes. Attackable entities may configure a flat `additional_core_experience` reward, awarded once on defeat in addition to progression-derived core XP. It defaults to zero and is zero for all current enemies and practice targets. This direct reward is not passed through the /5 conversion and does not alter its carried remainder.

### Weapon proficiency XP

A resolved attack using a weapon awards XP to the proficiency for the weapon type used, separately from strategy skill XP:

```text
weapon_proficiency_base_xp = 50 + 10 * actual_hp_removed
```

Apply the attacked entity's XP multiplier and that proficiency's own level cap/no-overflow rule to its award. Resolved misses and zero-damage attacks receive the base award when eligible; overkill contributes nothing. Award immediately on resolution and include only the resulting actual award in the action's aggregate progression-to-core conversion. Weapon proficiency rates can be tuned independently through an explicit design decision.

Bare-handed attacks award Unarmed proficiency XP using the same formula and entity modifier/cap rules, alongside the strategy-selected melee skill. Unarmed combat is a supported long-term specialization: players can develop into unarmed masters rather than being required to abandon fists after the tutorial. Exact proficiency stat contributions and progression balance remain to be defined.

Casting while merely holding a weapon does not award that weapon's proficiency XP. For example, a sword or dagger remaining equipped and visible during casting does not train Sword or Dagger proficiency. Do not award XP merely for an equipped item that was not used in the attack.

A staff or wand actively used to channel a spell awards its corresponding weapon proficiency XP alongside the spell's strategy-skill and elemental proficiency awards. Use `50 + 10 * actual_hp_removed`, applying the target's XP multiplier and that proficiency's independent cap/no-overflow rule. Award immediately on resolution and include only actual XP awarded in the action's aggregate progression-to-core conversion. Merely holding the item without using it to channel remains insufficient.

For dual wielding, each alternating strike awards proficiency XP only for the weapon used in that strike; apply the standard formula and entity restrictions to that individual resolved attack.

### Elemental proficiency XP

An elemental spell attack generates one shared elemental proficiency XP pool:

```text
elemental_proficiency_base_xp_pool = 50 + 10 * actual_hp_removed
```

Distribute this pool among the spell's elements; do not grant a full pool per element. Multi-element spells do not receive extra total elemental proficiency XP merely for containing more elements. Elemental proficiency XP is separate from the strategy-selected magic skill award. Apply entity XP modifiers and each receiving proficiency's own cap/no-overflow rules, and use only actual XP awarded for core conversion.

Allocate the shared pool according to the spell's configured elemental damage proportions, before resistance or immunity. A 75% Fire / 25% Earth spell distributes a 100-XP pool as 75 Fire proficiency XP and 25 Earth proficiency XP. Target defenses do not change those proportions; actual total HP removed still determines the pool size. Do not split equally unless the configured damage shares are equal.

Do not redistribute elemental XP blocked by a receiving proficiency's cap. Allocate the pool by configured shares first, apply each proficiency's eligibility and remaining room independently, and discard any blocked or excess allocation. For a 75 Fire / 25 Earth XP allocation with Fire already at the entity's cap, award 0 Fire and 25 Earth. Only actual awarded XP contributes to core conversion; discarded allocations do not.

Element-infused weapon attacks award elemental proficiency XP alongside weapon proficiency and the strategy-selected combat skill. Use the same base elemental pool, `50 + 10 * actual_hp_removed`, and allocate only the share corresponding to each effective infusion percentage, after infusion normalization and before target resistance. A 30% Fire infusion awards Fire 30% of that pool; the uninfused 70% grants no elemental proficiency XP. Multiple infusions use their separate effective portions, so 75% Fire plus 75% Water normalizes to a 50%/50% XP allocation. Do not expand a partial infusion into a full elemental pool award.

Apply entity XP modifiers and each elemental proficiency's independent cap/no-overflow rule. Discard blocked allocations without redistribution, and include only actual XP awarded in the action's progression-to-core conversion.

### Shield proficiency XP

An incoming attack that connects while a shield is equipped grants Shield proficiency XP, including a connected hit reduced to zero damage. Enemy misses and player dodges do not grant Shield XP. Outgoing attacks and merely carrying an equipped shield do not grant Shield XP.

For each eligible connected incoming attack:

```text
shield_proficiency_base_xp = 50 + 10 * incoming_damage_before_mitigation
```

Use the incoming attack's damage before defensive mitigation, not HP actually lost or the amount prevented by the shield. Better defenses must not reduce the training reward. A 10-damage incoming attack grants 150 base Shield XP whether defenses reduce its damage to 8, 2 or zero. Count the attack once, not once per damage portion.

Apply the attacking enemy's XP multiplier and level cap to the Shield award, checking the player's Shield proficiency level independently. Award zero at or above the cap; below it, limit the modified award to the XP remaining before the cap threshold. Discard excess XP rather than redistributing it. A source enemy with a 0.5 XP multiplier halves the Shield base award. Only actual awarded Shield XP contributes to progression-derived core XP.

### Armor progression

An incoming attack that connects while armor is worn triggers armor progression, including a connected hit reduced to zero damage. Enemy misses and player dodges do not grant armor progression XP. Merely wearing armor without receiving connected attacks does not train it.

This trigger applies to the armor skills and applicable equipped-slot proficiencies. The base armor XP calculation is:

```text
armor_base_xp = 50 + 10 * incoming_damage_before_mitigation
```

Better armor must not reduce its training reward: use incoming damage before mitigation rather than HP lost. A 10-damage incoming attack produces 150 base armor XP regardless of how much damage the armor prevents. Count the incoming attack once, not once per damage portion.

Armor skills share one pool per eligible incoming attack. Divide it among Light Armor, Medium Armor and Heavy Armor in proportion to the number of equipped armor pieces in each class. Three Heavy pieces and one Light piece allocate 75% of the armor-skill pool to Heavy Armor and 25% to Light Armor. Do not grant a full pool to each represented armor class. Only equipped armor pieces participate in this class allocation.

Armor-slot proficiencies receive a separate pool equal to `armor_base_xp`, in addition to the armor-skill pool. Divide the proficiency pool equally among equipped armor pieces and award each share to that piece's slot proficiency (helm, chest, hands, legs, feet, back or ward as applicable). A 150-XP proficiency pool with three equipped armor pieces awards 50 XP to each receiving slot proficiency. Do not grant a full pool to each piece; empty slots receive no allocation.

Both armor pools use the attacking enemy's XP multiplier and level cap. Allocate their shares as defined above, then evaluate each receiving armor skill or slot proficiency independently against its own level and remaining XP room. Award zero at or above the cap; limit the final eligible award to the cap threshold with no overflow. Discard blocked or excess allocations without redistributing them to other armor classes or slots.

Only armor skill and slot proficiency XP actually awarded after modifiers and caps contributes to the incoming action's aggregate progression-to-core conversion. Combine it with any other progression awards from that same incoming action, including eligible Shield XP, before converting once and carrying the remainder.

### Configurable attackable XP modifiers

Anything attackable can configure modifiers to the XP earned by attacking it, including an XP multiplier and a level-based cutoff. These are shared entity settings, not location-specific tutorial logic.

Practice targets award 50% of normal eligible XP (a 0.5 multiplier, or 50% reduction) only while the receiving skill is below level 3. Once that skill reaches level 3, it earns zero further target XP. Evaluate the cutoff against the specific skill receiving XP, independently for each skill; never use core level, Threat Level or another skill's level. A skill at or above the configured cutoff earns zero XP from that entity while other eligible skills can still train on it. This is an exclusive eligibility bound: `receiving_skill.level < xp_level_cap`. Limit the final eligible award to the XP remaining before the cap's level threshold. Apply the entity XP modifier, then limit the earned award to that remaining amount; no overflow XP is granted. For example, if the skill needs 10 XP to reach level 3 and the modified award would be 40 XP, grant only 10 XP. Do not remove existing XP from a skill already at or above the cap.

Apply the attackable entity's XP multiplier and level cap to each receiving skill or proficiency independently, including weapon and elemental proficiencies. Each uses its own current level and XP threshold, never the level of the strategy skill or another proficiency. The same no-overflow rule applies: an eligible proficiency can earn only the XP remaining before its configured cap.

Derive core XP only from the sum of skill and proficiency XP actually awarded after these reductions and caps. Do not convert nominal, discarded or over-cap XP into core XP, and do not apply the entity multiplier again to the derived core award. If every receiving skill and proficiency earns zero, derived core XP is also zero. A separately configured flat defeat reward may grant additional core XP; it is zero for current enemies and practice targets. Do not infer a bonus defeat reward where none is configured.

Playground entity controls must expose these modifiers and cutoff behavior using the production XP implementation, including mixed eligibility (one receiving skill/proficiency capped while another can still earn XP).

Skills and all proficiencies—weapon (including Unarmed and Shield), armor-slot and elemental—start at level 1 and extend to level 500 using the same adopted XP curve. Each track maintains its own XP and level. Core progression tracks its own XP and also uses the same level-1-to-500 curve and zero-XP starting convention. At the 5:1 progression-to-core conversion, core level 100 requires 500,000 total actual skill/proficiency XP awarded, excluding additional direct core rewards. Milestone skill XP from the curve is 100,000 at level 100; 1,000,000 at 200; 9,100,000 at 300; 82,000,000 at 400; 738,100,000 at 500. Desired training times and unlock-dependent XP rates need reconciliation; do not treat approximate time estimates as a second XP formula.

Total Level sums skill levels; Total Proficiency sums proficiency levels. Neither is automatically Threat Level.

## Attributes and resources

Attributes progress through core levels and freely assignable attribute points. Each core level gained awards 3 points; starting at core level 1 does not itself grant a level-up award. Core levels 2 through 100 therefore grant 297 points.

Character creation grants a one-time allocation of 3 freely assignable attribute points and introduces attribute allocation. Combined with the 297 points from core levels 2 through 100, this makes 300 points available by core level 100. Grant creation points only once per character; revisiting creation UI, repeating interactions or travelling must not duplicate them. This is a creation grant, not an additional core-level-1 level-up award.

Before creation-point allocation, the five resource-capacity attributes—Constitution, Mentis, Endurance, Tenacity and Aura—start at 10. All other attributes start at 1, including the regeneration attributes. These are fixed base values, not extra spendable points. The three freely assignable creation points are additional.

Allocating creation points can increase the corresponding resource maximum. Resource maxima scale linearly from their capacity attributes. Point allocation can raise each attribute to level 500, counting its fixed starting value plus allocated points. This is an allocation cap, not a hard cap on the effective attribute: equipment and temporary buffs may raise the effective value above 500. Bonus values do not consume allocation capacity or reduce the number of points the player may invest. Resource-capacity attributes at an allocated level of 500 provide 5,000 maximum points in their corresponding resource before equipment or buff adjustments. Other per-point contributions remain unresolved. Respec access is defined below.

Items may grant additional spendable attribute points, allowing a player to eventually max every attribute over a very long progression period. Limit attribute growth through the per-attribute level cap, not a shared lifetime allowance for item-granted points. Attribute-point items cannot be consumed when already allocated points plus unspent points are sufficient to bring every attribute to its allocation cap. Keep the item in inventory and explain that no additional attribute points are needed. Calculate remaining allocation capacity from fixed base values and invested points, ignoring equipment and buff bonuses; unspent points count toward filling that capacity. Most attribute-point items should grant 1 spendable point; larger configured grants are supported. If an item grants more points than the remaining shortfall after counting allocated and unspent points, allow consumption only after a clear confirmation states how many points will be received and how many will be lost. Grant only the remaining shortfall and discard the excess. For example, a 5-point item with a 2-point shortfall grants 2 points and loses 3 upon confirmation. Cancelling preserves the item and grants nothing. When the shortfall is zero, the item remains unusable under the rule above. Specific item definitions and acquisition rates remain unresolved.

### Attribute redistribution

Players may redistribute invested attribute points only at an Iter Crystal, outside combat. The service is free for now. Preserve fixed starting attribute values: resource-capacity attributes remain based at 10 and all other attributes at 1. Redistribution reassigns creation, core-level and item-granted points from the same spendable pool; all three sources are fully redistributable. Preserve their combined total across invested and unspent points. A respec cannot refund fixed base values, grant extra points or require attribute-point items to be consumed again.

A completed respec fully restores Health, Mana, Stamina, Energy and Ki and removes all nonpersistent effects, buffs and debuffs. Preserve effects maintained by equipped items and otherwise permanent effects. Recalculate the resulting stats and maxima from the new allocation and retained persistent sources, then fill all five pools to those maxima. Temporary-effect removal does not delete permanent learned spells, learned auras, skill/proficiency progress or equipment.

Respec restoration is intentional, not an exploit to prevent through partial refills. Put this interaction in the shared Iter Crystal service so it works wherever a crystal is placed; do not gate it to a named tutorial area.

A respec cost is planned. Its currency and amount are not yet defined; do not implement a cost until specified. The Iter Crystal requirement applies now.

Iter Crystals also offer a separate **Restore** action, available outside combat and free for now. It performs the same full refill and nonpersistent-effect cleanse without changing attributes, spent points or unspent points. Preserve equipment-maintained and otherwise permanent effects, recalculate maxima after cleansing, then fully refill all five resources. Players do not need to perform a respec to recover. Both actions reuse the same shared restoration implementation; restoration is not an automatic consequence of teleporting or opening the crystal menu. A planned respec cost does not implicitly establish a future Restore cost.

Restore preserves currently active auras as an explicit exception to its nonpersistent-effect cleanse. Their effects remain active and normal continuous Ki upkeep continues; Restore does not toggle them or charge another activation fee. Recalculate maxima with those retained aura effects before fully refilling resources. Inactive auras remain off.

Respec deactivates all active auras before recalculating maxima and refilling resources. Remove their effects and stop their Ki upkeep. Learned auras remain learned, but stay off until the player manually reactivates them under the normal activation rules and costs.

| Resource | Maximum attribute | Regeneration attribute | Purpose |
|---|---|---|---|
| HP / Health | Constitution | Regeneration | Survival |
| MP / Mana | Mentis | Fortitude | Spells |
| SP / Stamina | Endurance | Recovery | Sprint and dodge |
| EP / Energy | Tenacity | Recuperation | Abilities |
| KP / Ki | Aura | Meditation | Sustained auras |

Other attributes: Strength (melee power/carrying capacity), Toughness (resistance/carrying capacity), Intelligence (magic), Dexterity (dodge), Celerity (attack/movement speed), Charisma (social), Luck (critical/favorable outcomes). Strength adds to melee power and Intelligence to magic power at 1:1. Other coefficients are unresolved.

The attribute-derived resource maxima are:

```text
max_hp = Constitution * 10
max_mana = Mentis * 10
max_stamina = Endurance * 10
max_energy = Tenacity * 10
max_ki = Aura * 10
```

At their base attributes of 10, all five maxima are 100 before creation-point investment. Each additional point adds 10 to the corresponding pool; for example, Constitution 13 gives 130 maximum HP. No additive base offset is used. The formulas for equipment/buff contributions to maxima and any explicitly supported temporary over-max resources remain unresolved; current-amount handling is defined below.

Equipment changes preserve the current absolute amount of each resource, clamping it only when it exceeds the resulting maximum: `new_current = min(old_current, new_maximum)`. Apply this to Health, Mana, Stamina, Energy and Ki. Increasing a maximum through equipment does not refill the pool or preserve its percentage. For example, equipping +50 maximum HP at 80/100 leaves 80/150; removing it at 140/150 leaves 100/100. This clamp is not combat damage and does not trigger hit reactions or damage-based XP. Explicit Iter Crystal restoration remains a separate refill action.

Temporary buffs that change resource maxima use the same current-amount rule for all five resources. Applying a maximum increase does not automatically refill the resource; when the buff expires or is removed, clamp the current amount only if it exceeds the resulting maximum. A buff may explicitly include a separate healing or restoration effect; do not infer one from its maximum increase. Maximum-change clamping is not combat damage and does not trigger hit reactions or damage-based XP.

Ordinary healing and resource restoration cannot raise Health, Mana, Stamina, Energy or Ki above the current maximum. Limit the amount restored to the available capacity and discard excess; do not bank it for later. Overhealing or other over-max resources require an effect that explicitly permits them and defines their limits and expiry behavior. No generic overflow allowance is implied.

 Sprint currently doubles movement speed and drains one Stamina per 0.5 moving seconds. Athletics/Celerity/Rush stacking and limits must be specified before changing that behavior.

### Resource precision and display

Track Health, Mana, Stamina, Energy and Ki with fractional precision internally. Preserve fractional regeneration and costs rather than rounding each update. Display current resource amounts as whole numbers rounded up (`ceil(current_amount)`), so a positive fraction never displays as zero. Display rounding never changes stored values: affordability, depletion and other gameplay checks use the exact internal amount. For example, 0.5 Ki displays as 1 but cannot pay a 1-Ki cost. This display rule does not change separately defined cost rounding, such as rounding the final Mana cost up.

### Regeneration attribute scaling

Each regeneration attribute starts at 1. Each point above 1 adds 10% of its resource's baseline regeneration rate:

```text
regen_rate = baseline_regen_rate * (1 + 0.1 * (regeneration_attribute - 1))
```

Apply Regeneration to HP, Fortitude to Mana, Recovery to Stamina, Recuperation to Energy and Meditation to Ki. At attribute 11, the corresponding baseline rate doubles. Scale the rate rather than subtracting from a regeneration interval. Use the applicable in-combat or out-of-combat baseline; the existing combat buffer, no-Stamina-regeneration-while-sprinting rule and no-Ki-regeneration-with-active-auras rule still apply.

The 0.1 coefficient is the initial tuning value and may be revised through deliberate balance testing. Preserve full precision during rate calculation; preserve fractional resource accumulation under the shared precision rule.

### Health regeneration

HP regenerates naturally both outside combat and during combat. Starting rates are **1 HP every 6 seconds outside combat** and **1 HP every 12 seconds in combat**. This is slow passive recovery; food and active healing remain the practical means of recovering substantial HP.

Apply the shared regeneration-attribute scaling formula. Preserve fractional resource accumulation under the shared precision rule. Do not assume HP recovery is disabled in combat or substitute faster starting rates.

### Stamina regeneration

Stamina regenerates whenever the player is not actively sprinting, including ordinary walking, standing still and fighting. Active sprinting stops Stamina regeneration while its existing movement-based drain applies. Having the sprint toggle enabled while stationary does not count as actively sprinting. Starting recovery is 1 Stamina per second while not actively sprinting, including during combat. With the baseline sprint drain of 2 Stamina per second, 10 seconds of sprinting spends 20 Stamina and requires 20 seconds of non-sprinting recovery. Apply the shared scaling formula using Recovery. Preserve fractional resource accumulation under the shared precision rule.

### Ki regeneration

Ki regenerates only while all auras are inactive. If any aura is active, Ki regeneration stops; do not regenerate Ki to offset active-aura upkeep. While all auras are off, starting recovery is 1 Ki per second outside combat and 1 Ki every 2 seconds (0.5 per second) in combat. Use the same combat-activity/pursuit classification and 5-second exit buffer as Mana and Energy. Apply the shared scaling formula using Meditation. Preserve fractional resource accumulation under the shared precision rule.

### Energy regeneration

Energy regenerates naturally at a starting rate of 1 Energy per second outside combat and 1 Energy every 2 seconds (0.5 per second) in combat. Use the same combat-activity/pursuit classification and 5-second exit buffer as Mana regeneration. Apply the shared scaling formula using Recuperation. Preserve fractional resource accumulation under the shared precision rule.

### Mana regeneration

Mana regenerates naturally both outside combat and during combat. Starting regeneration is 1 Mana per second outside combat and 1 Mana every 2 seconds (0.5 Mana per second) in combat. Without spending, restoring an empty 100-Mana pool takes 100 seconds outside combat or 200 seconds in combat. Use real-time regeneration rather than turn-based recovery.

Use the slower in-combat rate while the player is attacking, being attacked or actively pursued by an aggro enemy. Once all of those conditions cease, retain the slower rate for 5 seconds before resuming out-of-combat regeneration. Renewed combat activity or pursuit restarts that buffer; misses and zero-damage attacks still count as combat activity. Do not grant faster regeneration during brief retreats or pauses. This regeneration classification does not change impact-based aggression or make a passive enemy aggro at windup.

Apply the shared scaling formula using Fortitude. Preserve fractional resource accumulation under the shared precision rule. Resource-shortage pauses can resume selected attacks as Mana becomes sufficient under the shared attack rules; do not bypass normal costs or windup.

## Magic

Spells are permanently learned, with offensive, defensive, status and utility effects. Players start with **no spells learned**. Wisp teaches **Energy Strike** as the first spell; do not grant a spell automatically at character creation or merely on entering Cinderhold. The spell UI shows the empty learned state until that lesson is accepted. Energy Strike is the beginner spell taught by Wisp rather than Spark. Future learning sources can include consumable learning items and NPC teaching; no additional starter spell is implied. Costs may include Mana, consumed items and reusable channeling items. No inherent equipment requirement applies to all spells.

Energy Strike requires Magic Technique level 1 and has a starting base cost of 4 Mana per cast. It uses the same requirement, effectiveness and backfire rules as other spells, with no special non-backfire exemption. A caster meeting its level-1 requirement has zero backfire chance through the shared rule. It must still be learned from Wisp.

Magic Technique and the spell's elemental proficiency improve spellcasting Mana efficiency. For a multi-element spell, weight elemental proficiency levels by the spell's configured elemental damage proportions rather than summing them. For example, a 75% Fire / 25% Earth spell uses `0.75 * Fire proficiency + 0.25 * Earth proficiency` as its elemental proficiency input. Additional elements do not automatically increase the discount, and target resistance does not alter these weights.

For Mana-costing spells, combine all efficiency contributions at full precision, round the resulting cost up once, then apply the 1-Mana minimum:

```text
final_mana_cost = max(1, ceil(cost_after_efficiency))
```

A calculated cost of 3.2 consumes 4 Mana; a calculated cost of 3 consumes 3 Mana. Efficiency cannot make a Mana-costing spell free. Rounding and the floor apply to the final combined cost, not separately to each element or efficiency source. Technique and weighted elemental proficiency contribute equally through diminishing returns:

```text
cost_after_efficiency = base_mana_cost / (1 + ((magic_technique_level - 1) + (weighted_elemental_proficiency_level - 1)) / 200)
final_mana_cost = max(1, ceil(cost_after_efficiency))
```

Preserve full precision for weighted proficiency and the efficiency divisor. With both Technique and elemental proficiency at level 1, Energy Strike costs 4 Mana; at 51 it costs 3; at 101 it costs 2; at 301 it costs 1. The level-1 baseline preserves starting spell costs. Higher-level spells use their own base Mana cost in the same shared formula. Any future effects that drain effective skill levels below 1 require explicit handling rather than silently creating invalid efficiency denominators. Energy Strike's 4-Mana cost is its starting baseline, not an immutable cost at every progression level.

Basic elements: Energy, Wind, Earth, Water, Fire. Advanced: Explosive, Dust, Mist, Mud, Lava, Steam, Smoke. Dark: Blood, Shadow, Death. Holy: Light, Life, Soul. God: Time, Gravity, Space, Mind.

```text
element_resistance_pct = resistance_value * 100
// Add to other matching resistance percentages; apply the combined reduction once.
element_proficiency_power_bonus = proficiency_level / 20
```

Unlisted elemental resistance is zero (neutral); negative values confer vulnerability; an elemental resistance value of 1 or above represents immunity. Multi-element spells divide their damage into separate elemental portions. Each portion independently sums its matching resistances (including Magical resistance), resolves immunity and uses the nonnegative portion safeguard. Do not average elemental resistances across the whole spell. An immunity to one element blocks only its matching portion, not the other elemental portions. Sum resolved portions at full precision, then round down once for the final attack. Exact elemental shares are spell configuration and still require definition; do not assume every multi-element spell has equal shares. For a spell configured as 50% Fire and 50% Earth, Fire immunity blocks the Fire half while the Earth half resolves normally. Do not apply an additional elemental multiplier after a portion's combined reduction. Basic direction is Fire > Wind > Earth > Water > Fire; Dark and Holy oppose each other, while God elements have no inherent weakness. Exact resistance values and all composite-element definitions require content configuration.

Magic uses the same strategies and damage framework. Spell effects supply `base_power` as a multiplier; elemental proficiency XP uses one shared pool distributed according to configured elemental damage proportions before resistance. Healing XP uses the actual-restoration rule and progression destinations below; utility XP uses the base-plus-success-bonus rule below; combined modifier ordering still needs definition.

Successful damaging player spells use the normal player critical-hit chance and 3× rolled-damage multiplier before resistance and immunity. Follow the shared attack resolution sequence; a multi-element spell has one attack-level critical outcome, applied consistently across its configured damage portions rather than independently rolled for each element. Spell backfires cannot critically hit. Successful player healing spells also use the normal player critical-hit chance. A critical heal multiplies the normal calculated healing amount by 3 before limiting actual recovery to the recipient's missing HP. Ordinary healing cannot exceed the recipient's current maximum HP; discard excess healing under the shared restoration rule. This critical-healing rule does not automatically apply to food, passive regeneration or Iter Crystal restoration. Critical outcomes affect only damage or healing amounts. They do not increase buff/debuff strength, duration, stacks, refresh duration or control-protection windows. For spells with both damage/healing and other effects, only the damage/healing component receives the critical multiplier; the other effects resolve normally.

Healing-spell XP is based on actual HP restored when the healing resolves:

```text
healing_xp = 50 + 10 * actual_hp_restored   if actual_hp_restored > 0
healing_xp = 0                            otherwise
```

Count only the recipient's actual increase in HP after the maximum-HP limit, including any effective additional recovery from a critical heal. Excess healing contributes no XP. A successful cast that restores no HP awards no healing XP, including no base award. For example, a 30-point heal on a recipient missing 8 HP yields a base healing-XP amount of 130; casting on a full-health recipient yields zero. This does not change the separately specified spell-backfire XP rules. Healing uses the same progression destinations as offensive magic. Award the healing-XP amount to the Magic skill selected by the committed attack strategy. Create one elemental proficiency pool of that same amount and split it according to the spell's configured elemental proportions. When actively channeling through a staff or wand, award its corresponding weapon proficiency that same amount; merely holding unrelated equipment grants no weapon proficiency XP. Do not divide one shared amount among the strategy, elemental and channeling pools. A zero-restoration cast grants zero to all these pools. Aggregate actual awarded progression XP for the existing core conversion and remainder rules. Self-healing earns the same XP as healing another recipient, using actual HP restored and the same progression destinations; there is no self-healing XP penalty. Healing XP does not depend on what caused the missing HP. Enemy damage, environmental hazards and self-inflicted spell backfires are equally eligible for later healing XP. Do not track injury provenance or transfer the original damage source's XP modifiers/caps into the healing award. Deliberate injury-and-heal training is permitted under these rules. This does not award defensive XP for the original self-inflicted damage. Healing recipients award full healing XP by default (multiplier 1, no recipient-specific level cutoff). Recipients may configure a healing-specific XP multiplier and receiving-skill/proficiency level cap independently of their attack XP settings. Never automatically inherit attack XP restrictions for healing. Apply healing recipient modifiers and caps independently to each receiving progression track using the shared exclusive-cutoff, threshold truncation and no-redistribution rules. Derive core XP only from actual progression XP awarded after these adjustments; do not apply the multiplier again to core XP. These settings belong to shared recipient configuration and must be exposed in the dev playground alongside healing and reset controls.

Utility spells define a base XP award for a resolved attempt, whether it succeeds or fails, plus an additional bonus awarded only on success:

```text
utility_xp = configured_base_xp + (configured_success_bonus_xp if successful else 0)
```

Each utility spell explicitly configures its own base XP and success-bonus XP; there is no shared 50-XP base default. Each utility spell must also define what constitutes success. A resolved failure receives its base award even though the intended effect did not occur. Selection, blocked attempts and cancelled windups are not resolved casts and grant no XP under the shared cancellation rules. Grant the base at most once per resolved cast; a backfire must not duplicate the base award through both utility and backfire XP paths. Utility spells use the same progression destinations as other magic. Award the resolved utility-XP amount to the Magic skill selected by the committed strategy, use an equal-sized elemental proficiency pool split by the spell's configured elemental proportions, and award the same amount to the corresponding staff/wand proficiency when actively channeling through one. Merely holding unrelated equipment does not award its proficiency XP. These are separate applicable pools, not a single amount divided among strategy, elements and channeling. Aggregate actual progression XP awarded for the shared core conversion and remainder rules. A utility spell backfire awards only that spell's configured base XP through these applicable progression pools, with no success bonus and no additional generic backfire award. Concrete per-spell base/bonus values remain to be specified.

Targeted utility spells use the intended target's applicable XP multipliers and rules. Utility-specific target settings remain independent of attack and healing settings and default to full XP with no target-specific cutoff. Non-targeted utility spells have no target multiplier or target rules to apply; use their configured XP awards subject to ordinary progression limits. Apply the same target restrictions to success, resolved failure and backfire, using the shared per-track cutoff, threshold truncation, no-redistribution and actual-award core conversion rules. Campfire creation and freezing a target are illustrative examples only, not approved spells or implementation requirements. Playground controls must expose targeted utility training restrictions and non-targeted utility casts through their production implementations.

A utility cast earns its success bonus only when it actually applies or refreshes its intended effect. A resolved cast that changes nothing earns base XP only. Buffs and debuffs do not stack by default: each effect explicitly defines whether reapplication refreshes its duration or fails while that effect is already active. A refresh earns the success bonus; a resolved failure earns only base XP. By default, a permitted refresh resets the remaining duration to the effect's normal full length; it does not add duration to the remaining time. Disabling effects that prevent acting or moving use predictable repeat-control protection instead of a random resistance chance. They cannot refresh while active. Once a disabling effect ends, the target gains a clearly displayed immunity window against its control category. Related spells share that protection, and it applies across casters; changing spells or casters cannot bypass it. Players receive the same category-based repeat-control protection as enemies, including no refresh while disabled and the subsequent visible immunity window. Multiple enemies cannot bypass player protection by alternating casters or related disabling effects. Use one shared control-resistance implementation for player and enemy recipients. Each disabling effect defines its duration, control category and subsequent resistance-window duration. Removing a disable early with a cleanse starts its normal category resistance window immediately. A cleanse may additionally grant explicitly configured protection for X seconds. For each covered control category, retain whichever protection expires later: the removed effect's built-in window, the cleanse-granted window or existing protection. Compare remaining durations from the time of cleansing; never add the durations together or shorten existing protection. For example, a cleanse granting 10 seconds of protection overrides a removed effect's 6-second window; a 4-second cleanse does not shorten that 6-second window. Protection applies only to the categories explicitly covered, not automatically to all debuffs. A protection-granting cleanse can succeed even when there is no effect to remove, provided it applies protection or extends its expiry. This permits preventative casting. For spell XP, removing an eligible effect or applying/extending protection qualifies for the success bonus once per resolved cast; a cast that removes nothing and leaves protection unchanged earns only eligible base XP. Preventative protection follows the same longest-remaining-duration rule and never adds durations together.

For spells combining damage and a disabling effect, resolve damage mitigation and control eligibility independently. Immunity or repeat-control protection against the disable blocks that effect but does not block the spell's damage. Resolve damage using its normal applicable resistances, vulnerabilities and damage immunities. Do not treat control immunity as whole-spell immunity. Conversely, a spell that hits may apply its control/debuff even when its damage resolves to zero, including through damage resistance or immunity. Check the effect's own eligibility, immunity and repeat-control protection independently. A miss or dodge prevents the hit-dependent control/debuff as well as the damage; a backfire does not deliver the intended effect to the target. Spells combining damage and a debuff use one combined XP calculation: base XP plus the normal actual-damage term (`10 * actual_target_hp_removed`) plus a spell-configured success bonus if the debuff actually applies or refreshes. Do not grant a second base award for the debuff or independently award duplicate offensive and utility progression. Compute the combined amount once, then use it for the applicable Magic strategy, elemental and actively channeling weapon proficiency pools under their shared allocation rules. An immune or otherwise unsuccessful debuff grants no effect-success bonus, even if damage occurs; a connected zero-damage spell can earn the bonus if its debuff applies. Backfires grant only eligible base XP, with no target-damage term or effect-success bonus. Damage-bearing spells use the intended target's attack XP multiplier and receiving-track caps for the entire combined award, including the debuff success bonus. Utility-only spells use the target's utility XP settings. Choose by the spell's configured effects, not by damage actually dealt: zero damage or a backfire does not switch a damage-bearing spell to utility XP settings. Apply only the selected settings, once per receiving pool under the shared allocation/cap rules; do not stack attack and utility restrictions. During the active effect or its category immunity window, repeated applications of that category fail rather than extending the disable. A resolved cast that fails for this reason receives eligible base XP only, with no success bonus. Ordinary non-disabling buffs/debuffs retain their configured refresh-or-fail behavior. Concrete categories and timings remain to be defined; a 3-second immobilize followed by 6 seconds of immunity is illustrative only, not a configured spell or global timing rule. Do not infer increased potency or additional stacks from repeated application. Any stacking exception must be explicitly designed. This reapplication rule concerns repeated instances of the same effect and does not prevent different auras or distinct effects from coexisting under their own combination rules.

Players may cast a learned spell below its skill requirements. For each configured skill or proficiency requirement, calculate `current_level / required_level` and use the lowest ratio as `requirement_ratio`. Scale damage/healing with `clamp(requirement_ratio, 0.1, 1)` while retaining its full normal resource/item cost. A level-10 caster using a level-20 spell produces 50% of its normal damage or healing. Spells with no skill/proficiency requirements have full effectiveness and no backfire risk. Preserve precision and apply the established final-result rounding rules. On a successful under-level cast, buffs and debuffs apply at their normal configured strength and duration, subject to ordinary target eligibility, immunity and refresh/control-protection rules. Do not scale their potency, duration or protection windows by the under-level effectiveness multiplier; increased backfire risk is the under-level penalty for those components. In mixed spells, continue applying the effectiveness reduction to damage/healing only. Handling of other non-damage/non-healing effects remains unresolved.

Spell mishaps/backfires are an explicit risk of casting below a spell's skill requirements. If the caster meets all of the spell's skill requirements, backfire chance is zero; do not retain a residual random failure chance for qualified casting. For under-level casting, clearly display the risk before the player casts, consistent with the rule that adverse randomness must be explicit.

Backfire chance must increase with the caster's skill shortfall and become substantial for extreme mismatches, such as a level-1 caster attempting a level-100 spell. A small universal backfire-chance cap does not meet this design intent. Meeting all requirements still gives zero backfire chance.

Use a squared skill-shortfall curve based on the lowest requirement ratio:

```text
if no_requirements or requirement_ratio >= 1:
    backfire_chance_percent = 0
else:
    backfire_chance_percent = clamp(100 * (1 - requirement_ratio)^2, 0, 100)
```

Use the actual skill ratio, separate from the 10% spell-effectiveness floor. Check whether requirements are met before squaring so exceeding the requirement cannot reintroduce backfire risk. There is no additional probability cap below 100%.

For a level-100 spell: level 1 gives 98.01% backfire chance; level 10 gives 81%; level 50 gives 25%; level 75 gives 6.25%; level 90 gives 1%; level 100 or above gives zero. Successful casts still use the separate under-level effectiveness penalty. With multiple requirements, make one backfire roll per cast using the lowest ratio; do not roll separately for each requirement or multiply their penalties. Meeting Technique but having 10/20 in a required proficiency gives a ratio of 0.5, 50% damage/healing effectiveness and a 25% backfire chance. Successful buff/debuff components retain normal strength and duration.

Resolve backfire at spell release, after confirming that the committed cast can pay its required costs. A backfire consumes the normal casting resources/items and replaces the intended spell effect with the mishap. Do not also apply the normal effect to the intended target or launch its normal spell projectile. Windups cancelled before release do not pay the casting cost or resolve a backfire.

Backfires affect only the caster by default, and caster-only is the expected sole backfire target model. Do not damage allies, bystanders or an area around the caster. No additional backfire target types are planned; introducing one would require an explicit design decision.

Backfire base damage is 50% of the spell's normal maximum damage, evaluated before the under-level spell-effectiveness penalty and target resistance:

```text
backfire_base_damage = 0.5 * normal_spell_max_damage_before_underlevel_penalty_and_resistance
```

For a spell whose normal maximum damage is 40, a caster at 50% effectiveness can successfully cast for up to 20 damage before target resistance; a backfire instead produces 20 base damage to the caster. Improving skill reduces backfire probability, and meeting the requirements eliminates it; do not reduce the backfire's base damage by the under-level effectiveness penalty. Keep fractional intermediate values and follow the final-result rounding rules.

For healing spells, use normal maximum healing as the equivalent spell-power value and apply the same 50% multiplier. Utility spells without a damage or healing value require an explicit backfire-power value used as the equivalent maximum before that multiplier. Do not substitute an implicit percentage of maximum HP.

Backfire damage is magical and uses the spell's configured elements. For multi-element spells, divide the backfire base damage into the same configured elemental proportions and resolve each portion independently against the caster's then-current applicable Magical and elemental resistances/vulnerabilities and immunities. Sum matching resistances additively, prevent negative damage within each portion, then sum portions and round the final result down once. A 20-damage Fire backfire against 50% applicable caster resistance deals 10 damage.

Backfires cannot critically hit. Calculate their base from the spell's normal non-critical maximum, and never apply a critical multiplier or critical roll to the mishap itself. This preserves the defined spell-power-based severity without an extra random damage spike.

Backfires cannot be dodged. Do not roll the caster's dodge chance against their own mishap. This does not bypass applicable resistance or immunity; they still resolve as specified above.

A backfired cast grants the normal eligible base progression XP for a zero-target-damage casting attempt. All spell categories retain eligible base XP on backfire, including healing spells. Offensive and healing backfires use the 50-XP base amount for each applicable progression pool; utility backfires use their spell-configured base instead. Award no damage/healing term, success bonus or second backfire award. A healing backfire is distinct from a successful healing cast that restores zero HP: the former retains base XP, while the latter grants zero under the actual-restoration rule. Use the committed strategy's receiving magic skill, the spell's elemental pool allocation and any eligible actively channeling staff/wand proficiency. Offensive backfires apply the intended target's attack XP modifiers and caps. Healing backfires apply the intended recipient's healing-specific XP multiplier and caps, including when self-targeted; do not substitute attack XP settings or settings from a different recipient just because the backfire damages the caster. Apply each receiving track's independent cap/no-overflow rule. Targeted utility backfires use the intended target's utility-specific XP modifiers and caps; untargeted utility backfires have no recipient modifier or cutoff. Count zero actual target HP removed; never substitute self-inflicted damage into any damage-based XP calculation. Aggregate only actual awarded XP for core conversion under the shared rules.

Elemental immunity can make the matching backfire portions deal zero to the caster without preventing the backfire outcome: the normal spell effect still fails, resources are still consumed and the same eligible base XP rules apply. A Fire-immune caster can therefore safely absorb the Fire damage of their own mishap, while non-Fire portions remain independently subject to their own defenses.

Backfire damage can reduce the caster to zero HP and cause defeat through the normal defeat flow. There is no hidden leave-at-1-HP safeguard for a mishap. Do not inherit an intended target's tutorial protection, such as the Scrapper's nonlethal attack configuration, onto self-inflicted backfire damage. The spell UI must clearly warn when potential backfire damage can be lethal, using the known cast power, caster defenses and current HP; defensive state is still evaluated at resolution.

Self-inflicted backfires grant no defensive progression: no armor-skill XP, armor-slot proficiency XP or Shield proficiency XP, regardless of damage taken or prevented. Only the eligible base casting progression specified above is awarded. Do not treat the caster's own mishap as an enemy attack for defensive XP or grant any corresponding defensive-derived core XP. Other unlisted consequences remain unresolved; do not implement additional rewards or effects by assumption.

Energy Strike damage/timing tuning, Mana-efficiency progression, other spell costs and manual/autocast controls remain unresolved. Resource availability, consumption and paused attack intent follow the shared attack rules.

## Abilities and auras

Abilities use Energy. Bristle teaches Strong Strike during his combat lesson; it is not granted automatically at character creation. Strong Strike is the introductory ability: melee, selected supported damage type, Strong strategy, starting cost 50 EP, double maximum damage and an enhanced minimum for one attack as defined below. Ability Energy is consumed at strike/projectile release under the shared attack resource rule. Strong Strike forces Strong strategy for its one enhanced melee attack; it does not require the player to select Strong first and does not change their normal strategy selection. That attack uses Strong modifiers and awards its strategy XP to Melee Power, subject to the normal entity XP rules. Subsequent normal attacks use the player's selected strategy again. Commit the override and its XP destination with the attack at windup start.

Strong Strike sets its damage bounds from the corresponding ordinary attack using the same committed Strong-strategy stats:

```text
strong_strike_max = 2 * normal_max
strong_strike_min = max(2 * normal_min, 0.5 * strong_strike_max)
```

This guarantees a roll of at least half the enhanced maximum before mitigation, even when negative Accuracy makes the ordinary minimum zero. Ordinary ranges of 0–10, 1–10 or 3–10 all become 10–20; a 7–10 range becomes 14–20, preserving the benefit of higher Accuracy. This is an ability-specific roll minimum, not a guaranteed final-damage floor: resistance and immunity still apply normally and may reduce damage to zero.

Strong Strike can critically hit using the normal player critical chance; the ability does not increase that chance. Roll within its enhanced bounds, then multiply the rolled damage by 3 on a critical hit before mitigation. A Strong Strike range of 10–20 becomes 30–60 on a critical before resistance. Its highest critical roll is 6 times the corresponding ordinary attack maximum with the same Strong-strategy stats. The critical remains a rare bonus, not a guaranteed result of using the ability.

Pressing Use Strong Strike queues one use for the next eligible melee attack. It does not modify an attack that has already committed at windup start. Use the queued override when the next eligible attack begins; after that use, return to normal attacks rather than automatically repeating the ability. A further use requires another player activation.

If the attack assigned to the queued Strong Strike is cancelled for any reason, cancel that ability use as well. Do not restore it to the queue or carry it into a later attack or fight. This includes cancellation during windup from movement, explicit combat cancellation or becoming unable to afford the committed attack. No Energy is spent before strike/release. Any later Strong Strike requires a new player activation; generic paused auto-attack intent must not resurrect the cancelled ability.

Strong Strike has no separate ability cooldown. Its normal attack timing and 50-Energy starting cost govern use; each use still requires a player activation and consumes Energy at strike/release. Do not introduce an additional cooldown timer.

Behavior for a queued ability that has not yet been assigned to an attack when eligibility/resources change, repeated queue-button presses and any future ability-cost efficiency progression remain unresolved.

Players start with no learned auras. A dedicated Ki/Aura mentor introduces Ki management and teaches auras; do not grant Rush or Harden automatically at character creation. The mentor lives in Cinderhold and offers an optional lesson alongside the ranged and magic mentors. Learning Ki/Auras is not required to finish basic training or leave the area. The introductory lesson teaches both Rush and Harden and demonstrates using each alone and together, activation fees, continuous upkeep, stacking, exhaustion and Ki recovery. Mentor identity, exact placement and detailed lesson dialogue remain unresolved. Keep aura mechanics shared; the mentor owns the lesson narrative and invokes shared learning/activation systems.

Auras are permanently learned, independently toggled, stackable effects sustained by Ki without item costs. Each aura specifies one continuous Ki cost per second, unchanged by combat state. Different auras may have different rates. Combined upkeep is the sum of all active aura rates; do not switch to per-round costs or a separate in-combat upkeep rate. Ki regeneration remains disabled while any aura is active.

Activating an aura immediately consumes Ki equal to one second of that aura's configured upkeep, in addition to continuous drain while active. Charge every activation, including reactivation after toggling off. For an aura costing 0.5 Ki per second, activation costs 0.5 Ki and ongoing upkeep continues at 0.5 Ki per second. This is an activation fee, not a prepaid interval that suspends ongoing drain. Do not charge again merely because combat state changes.

When Ki reaches zero, automatically deactivate all active auras and end their effects. With all auras off, Ki can regenerate under its normal recovery rules. Leave auras off until the player explicitly reactivates them; do not auto-restart on recovery, maintain a priority subset or cycle effects on/off. Each manual reactivation pays the normal activation fee.

Aura fees and upkeep use the shared fractional resource tracking and rounded-up whole-number display. A per-second rate need not be a whole integer.

Rush costs 0.5 Ki per second while active, plus a 0.5 Ki fee on each activation. With 100 starting Ki and no other active auras, it runs for 199 seconds after paying the activation fee (roughly 3 minutes 20 seconds). Rush grants +10% movement speed whenever active, both inside and outside combat. It grants no attack-speed bonus and does not switch effects with combat state. Rush and sprint add their percentage bonuses against normal movement speed: sprint contributes +100%, Rush contributes +10%, and both together yield 210% of normal speed, not 220%. Do not multiply those bonuses together. Harden costs 0.5 Ki per second while active, plus a 0.5 Ki fee on each activation. Running Rush and Harden together costs 1 Ki per second after a combined 1-Ki activation fee. Harden protects the player whenever active, inside or outside combat, including against applicable spell backfire damage. Its effect and continuous upkeep do not switch with combat state. Harden adds 10 percentage points to each incoming damage portion's applicable resistance total. Apply that bonus once per portion, not once per matching category: 20% applicable resistance becomes 30%, and a Magical Fire portion does not receive separate +10% bonuses for Magical and Fire. This is additive resistance, not a separate multiplicative damage-reduction step. All normal per-portion resistance, immunity and final rounding rules still apply. Detailed mentor dialogue and other effect-stacking details remain unresolved. Do not copy per-turn timing into the real-time game.

## Associated non-combat systems

Retain existing recipes while designing the expanded skills: Skill Regeneration, Dexterity (shortcuts), Cooking, Fishing, Trapping, Gathering, Mining, Lumberjack, Mercantile, Speechcraft, Athletics, Pickpocketing, Stealing, Lockpicking, Crafting, Weaving, Glass Working, Stone Working, Construction, Farming, Apothecary, Metalsmithing, Runesmithing, Leatherworking, Woodworking, Fletching, Bowyer, Artificer, Jeweler, Clothier, Enchanting, Incantation, Summoning, Exploration and Slayer.

Resolve existing-skill mapping and distinguish the Dexterity skill from the attribute. Skill draining/restoration, carrying capacity, social checks and new world interactions require explicit scope decisions. The source's stone/flint/flax/cordage recipe chain does not replace current recipes.

## Outstanding decisions

Review these one at a time; update the relevant sections in place as each is settled.

1. Elemental portion shares for spell definitions and composite-element mappings.
2. Equipment/buff contribution formulas for resource maxima and explicitly permitted over-max effects.
3. Special-enemy dodge/critical rates; remaining spell/ability damage modifier order.
4. Missing stat, speed and Threat formulas; rarity-preserving bonus budgets.
5. Attribute-point item definitions and acquisition rates; planned respec cost.
6. Remaining interruption behavior.
7. Resource baselines, regeneration, overheal and sprint stacking.
8. Energy Strike damage/timing, Mana-efficiency progression, spell costs/controls and remaining special effects.
9. Concrete item eligibility and special-effect exception configuration.
10. Enemy decisions, definition of in-combat state, abilities and aura timing/stacking/exhaustion.
11. Resource/action UI, non-combat skill mapping and rollout scope.
12. Tutorial protection, food, starter balance and supplies.

## Implementation requirements

Do not implement unresolved rules as assumed defaults. Every new behavior must have production-backed dev playground controls, repeat/reset coverage and appropriate normal-flow verification. Keep debug code behind the compile-time playground flag. Batch slow performance checks at meaningful milestones, not after each design decision or edit.
