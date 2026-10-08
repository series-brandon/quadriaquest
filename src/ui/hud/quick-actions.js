import {computed} from '../../reactive.js';
import {actionButton} from './action-button.js';
import {ABILITIES, SPELLS} from '../../combat-styles.js';
import {FOODS} from '../../player-health.js';
import {ITEMS} from '../../items.js';

// The HUD action row: one quick action under each resource meter, in meter order
// (health, mana, stamina, energy, ki). Each slot calls the shared gameplay systems; none of
// them implements gameplay. State follows the systems' signals and revisions (no polling).
//
//   Eat           the chosen quick food (Health)
//   Quick spell   queues one cast of the quick spell (Mana; docs/COMBAT.md, Quick slots)
//   Sprint        toggles sprinting (Stamina)
//   Strong Strike queues the ability for the next melee attack (Energy)
//   Quick auras   switches the quick-aura set on or off together (Ki)
//
// `quickFood` is a signal holding a FOODS id. `ate()` lets the HUD react to eating (journal
// compaction); `openCombat()` opens the Combat page where quick slots are chosen.
export function quickActions({inventory, food, quickFood, resources, styles, combat, auras, assistance, toast, ate = () => {}, openCombat}) {
  // Gameplay getters that are not themselves signals are read through their system's revision.
  const track = (system, read) => computed(() => (system.revision.value, read()));

  const foodName = computed(() => ITEMS[quickFood.value]?.name ?? 'food');
  const foodCount = computed(() => inventory[quickFood.value] || 0);
  const eat = actionButton({
    id: 'quick-food', kind: 'health', icon: 'quickEat',
    label: () => (food.working ? `Eating ${foodName.value}` : `Eat ${foodName.value} (${foodCount.value} left)`),
    on: () => food.working,
    unavailable: () => foodCount.value === 0 || food.cooldown > 0,
    badge: foodCount,
    onPress() {
      if (!FOODS[quickFood.peek()]) return;
      if (!foodCount.peek()) toast(`No ${foodName.peek()} left.`);
      else if (food.start(quickFood.peek())) ate();
    },
  });

  const spell = track(styles, () => styles.quickSpell);
  const spellQueued = track(combat, () => !!spell.value && combat.queuedSpell === spell.value);
  const quickSpell = actionButton({
    id: 'quick-spell', kind: 'mana', icon: 'spell',
    label: () => {
      const chosen = SPELLS[spell.value];
      if (!chosen) return 'Quick spell: choose one on the Combat page';
      return spellQueued.value ? `${chosen.name} queued for your next attack (press to withdraw)` : `Cast ${chosen.name} on your next attack (${chosen.mana} Mana)`;
    },
    queued: spellQueued,
    unavailable: () => !SPELLS[spell.value] || resources.mana.value < SPELLS[spell.value].mana,
    onPress() {
      if (!spell.peek()) return openCombat();
      const result = combat.queueSpell(spell.peek());
      if (result !== true) toast(result);
    },
  });

  const sprint = actionButton({
    id: 'toggle-sprint', kind: 'stamina', icon: 'sprint', toggle: true,
    label: () => (resources.sprint ? 'Stop sprinting' : 'Sprint'),
    on: () => resources.sprint,
    unavailable: () => resources.stamina.value === 0,
    onPress() {
      if (resources.stamina.value === 0) toast('Too tired to sprint.');
      else resources.toggle();
    },
  });

  const strike = ABILITIES.strongStrike;
  const strikeKnown = track(styles, () => styles.knowsAbility('strongStrike'));
  const strikeQueued = track(combat, () => combat.pending === 'strongStrike' || combat.committedAbility === strike.name);
  const strongStrike = actionButton({
    id: 'quick-strong-strike', kind: 'energy', icon: 'strongStrike',
    label: () => (!strikeKnown.value ? `${strike.name}: not learned` : strikeQueued.value ? `${strike.name} queued for your next melee attack (press to withdraw)` : `${strike.name} (${strike.energy} Energy, next melee attack)`),
    queued: strikeQueued,
    unavailable: () => !strikeKnown.value || resources.energy.value < strike.energy,
    onPress() {
      const result = combat.queue('strongStrike');
      if (result !== true) toast(`${strike.name}: ${result}`);
    },
  });

  const auraState = track(auras, () => auras.quickState);
  const aurasOn = track(auras, () => auras.quick.filter(id => auras.isActive(id)).length);
  const quickAuras = actionButton({
    id: 'quick-auras', kind: 'ki', icon: 'aura', toggle: true,
    label: () => ({none: 'Quick auras: choose them on the Combat page', off: 'Turn quick auras on', partial: 'Turn quick auras off (some are on)', on: 'Turn quick auras off'})[auraState.value],
    on: () => auraState.value === 'on',
    partial: () => auraState.value === 'partial',
    unavailable: () => auraState.value === 'none',
    badge: () => (aurasOn.value ? aurasOn.value : null),
    onPress() {
      if (auraState.peek() === 'none') return openCombat();
      const result = auras.toggleQuick(id => (assistance ? assistance.toggleAuraManually(id) : auras.toggle(id)));
      if (result !== true) toast(result);
    },
  });

  return {eat, quickSpell, sprint, strongStrike, quickAuras};
}
