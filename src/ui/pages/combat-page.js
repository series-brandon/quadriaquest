import {computed, signal} from '../../reactive.js';
import {h} from '../dom.js';
import {iconNode} from '../icon.js';
import {keyedList} from '../list.js';
import {row, section, segmented, toggleSwitch} from '../controls.js';
import {SPELLS, ABILITIES} from '../../combat-styles.js';
import {AURAS} from '../../auras.js';
import {STRATEGIES, backfireBaseDamage, resolvePortions} from '../../combat-formulas.js';
import {playerDefense} from '../../combat-profile.js';
import {TRAINING_GOALS} from '../../assistance.js';

const title = s => s[0].toUpperCase() + s.slice(1);
const STRATEGY_HELP = {technical: 'No modifiers', accurate: '+10 Accuracy', strong: '+10 Power', fast: '+10 Speed', defensive: '+10 Resistance', agile: '+10 Dodge'};
const HAND_LABEL = {main: 'Main hand', off: 'Off hand', alternate: 'Alternate'};
const STYLES = ['melee', 'ranged', 'magic'];

// Combat page (docs/COMBAT.md: minimal setup, advanced controls when wanted). Always visible:
// mode, the attack summary, and either Simple mode's three choices (class, training goal, Optimize)
// or Manual's attack setup. Players see Auto as "Simple" (internally the `auto` control). Strategy,
// spells, abilities, auras and Simple settings are collapsible
// sections whose headers show their current value. Every control calls the shared systems;
// state follows their revisions, so nothing polls or rebuilds while the page is open.
export function combatPage({styles, combat, auras, assistance, equipment, character, health}) {
  const track = (system, read) => computed(() => (system?.revision.value, read()));
  const settings = track(assistance, () => assistance?.settings ?? null);
  const auto = computed(() => !!settings.value && settings.value.control !== 'manual');
  const pacifist = computed(() => !!settings.value?.pacifist);
  const learned = track(styles, () => styles.state.learned);
  const status = signal('');
  const say = result => { status.value = result === true || result === undefined ? '' : String(result || ''); };

  // The next attack as the shared combat profile sees it (equipment, strategy, spell, character).
  const preview = computed(() => {
    styles.revision.value; equipment?.revision.value; character?.revision.value; auras?.revision.value;
    return combat.preview();
  });
  const attackName = computed(() => {
    const p = preview.value;
    return p.spell ? p.name : p.item ? p.name : 'Bare hands';
  });
  const attackFacts = computed(() => {
    const p = preview.value;
    const hand = p.hand && !p.spell ? ` · ${p.hand} hand${p.damageType ? `, ${p.damageType}` : ''}` : '';
    return `${p.min}–${p.max} damage every ${+p.interval.toFixed(2)}s${hand} · trains ${title(p.combatStyle)} ${title(STRATEGIES[p.strategy].skill)}`;
  });
  // Under-level casting shows its backfire chance and whether it could defeat you.
  const backfire = computed(() => {
    const p = preview.value;
    if (!(p.backfirePercent > 0) || !character) return '';
    const defense = playerDefense(character, {incomingStyle: 'magic', shield: equipment?.shield, armor: equipment?.armorPieces || [], bonusResistancePct: auras?.resistancePct || 0});
    const damage = resolvePortions(Object.values(p.elements || {none: 1}).map(share => ({base: backfireBaseDamage(p) * share, resistancePct: defense.resistancePct})));
    return `${+p.backfirePercent.toFixed(2)}% backfire chance: ${damage} damage to you${health && damage >= health.value ? ' — a backfire could defeat you' : ''}`;
  });
  const autoChose = computed(() => {
    if (!auto.value) return '';
    styles.revision.value; auras?.revision.value;
    const spell = styles.state.selected ? SPELLS[styles.state.selected].name : 'weapon or bare hands';
    const on = auras?.state.active.map(id => AURAS[id].name).join(', ') || 'no auras';
    return `Chosen for you: ${title(styles.strategy)} strategy, ${spell}, ${on}.`;
  });

  const modeHelp = computed(() => (pacifist.value
    ? 'Pacifist: you won’t attack. Eating, auras and warnings still help.'
    : auto.value ? 'Simple picks strategy, spells, abilities and auras for you. You always control movement.' : 'Every choice is yours.'));

  // Mode, pacifist and the attack summary are always visible.
  const header = h('div', {class: 'q-page__lead'},
    assistance ? segmented({label: 'Combat control', options: [{value: true, label: 'Simple'}, {value: false, label: 'Manual'}], value: auto, onChange: on => assistance.setControl(on ? 'auto' : 'manual')}) : null,
    assistance ? toggleSwitch({label: 'Pacifist', on: pacifist, onChange: on => assistance.setPacifist(on)}) : null,
    h('p', {class: 'q-page__help'}, modeHelp),
    h('div', {class: 'q-card', role: 'status'},
      h('strong', null, attackName),
      h('small', null, attackFacts),
      h('small', {class: 'q-card__warning', hidden: () => !backfire.value}, iconNode('caution'), backfire),
      h('small', {class: 'q-card__auto', hidden: () => !autoChose.value}, autoChose)));

  // Simple (the `auto` control): class, training goal and Optimize, plus chips for choices the player
  // made themselves, each of which can be handed back.
  const overrides = computed(() => {
    const s = settings.value;
    if (!s) return [];
    return [
      ...(s.manual.strategy ? [{id: 'strategy', label: 'Strategy is your choice', kind: 'strategy'}] : []),
      ...(s.manual.spell ? [{id: 'spell', label: 'Attack is your choice', kind: 'spell'}] : []),
      ...Object.keys(s.manual.auras).map(id => ({id: `aura-${id}`, label: `${AURAS[id].name} is your choice`, kind: 'aura', aura: id})),
    ];
  });
  // Options carry the selection (a select's value can't be set before its options exist).
  const goalValue = computed(() => settings.value?.goal || '');
  const goal = h('select', {
    class: 'q-select',
    'aria-label': 'Train a specific skill',
    on: {change: event => assistance.setGoal(event.target.value || null)},
  }, [['', 'No — best overall'], ...TRAINING_GOALS.map(id => [id, title(id)])].map(([id, label]) => h('option', {value: id, selected: () => goalValue.value === id}, label)));
  const autoPanel = h('div', {class: 'q-page__group', hidden: () => !auto.value},
    h('span', {class: 'q-label'}, 'Class'),
    segmented({label: 'Class', options: STYLES.map(id => ({value: id, label: title(id)})), value: () => settings.value?.style, onChange: id => assistance.setStyle(id)}),
    h('label', {class: 'q-field'}, h('span', {class: 'q-label'}, 'Train a specific skill'), goal),
    h('button', {type: 'button', class: 'q-button', on: {click: () => assistance.optimize()}}, 'Optimize equipment'),
    h('small', {class: 'q-page__help', role: 'status', hidden: () => !(settings.value && assistance.optimizeReport)}, () => (settings.value, assistance?.optimizeReport ?? '')),
    keyedList(h('div', {class: 'q-chips'}), overrides, item => item.id, item => h('button', {
      type: 'button',
      class: 'q-chip-button',
      title: 'Let Simple mode choose again',
      on: {click: () => assistance.returnToAuto(item.peek().kind, item.peek().aura)},
    }, () => item.value.label, ' · Let Simple choose')));

  // Manual: retaliation, what to attack with, which hands and damage types.
  const attackOptions = computed(() => [{value: null, label: 'Weapon'}, ...learned.value.map(id => ({value: id, label: SPELLS[id].name}))]);
  const hands = track(equipment, () => {
    if (!equipment) return [];
    const eligible = equipment.eligibleHands();
    return ['main', 'off', 'alternate'].filter(hand => (hand === 'alternate' ? eligible.length > 1 : eligible.includes(hand)));
  });
  const damageChoices = track(equipment, () => (equipment ? equipment.eligibleHands().flatMap(hand => {
    const attack = equipment.handAttack(hand);
    return (attack.damageTypes || []).length < 2 ? [] : [{hand, types: attack.damageTypes, current: attack.damageType}];
  }) : []));
  const selectAttack = id => {
    const ok = assistance ? assistance.selectSpellManually(id) : styles.select(id);
    say(ok === false ? 'Finish your current action before changing your attack.' : true);
  };
  const manualPanel = h('div', {class: 'q-page__group', hidden: auto},
    toggleSwitch({label: 'Auto-Retaliate', description: 'Fight back when attacked', on: track(combat, () => combat.autoRetaliate), onChange: on => combat.setAutoRetaliate(on)}),
    h('span', {class: 'q-label'}, 'Attack with'),
    // Rebuilt only when the learned spells change.
    keyedList(h('div', {class: 'q-stack'}), computed(() => [attackOptions.value]), options => options.map(option => String(option.value)).join(),
      options => segmented({label: 'Attack with', options: options.peek(), value: track(styles, () => styles.state.selected), onChange: selectAttack})),
    h('span', {class: 'q-label', hidden: () => hands.value.length < 2}, 'Hands'),
    keyedList(h('div', {class: 'q-stack'}), computed(() => (hands.value.length < 2 ? [] : [hands.value])), list => list.join(),
      list => segmented({label: 'Attack hands', options: list.peek().map(hand => ({value: hand, label: HAND_LABEL[hand]})), value: track(equipment, () => equipment.attackHands), onChange: hand => equipment.setAttackHands(hand)})),
    keyedList(h('div', {class: 'q-stack'}), damageChoices, choice => `${choice.hand}:${choice.types.join()}`,
      choice => h('div', null,
        h('span', {class: 'q-label'}, `${title(choice.peek().hand)} hand damage`),
        segmented({label: `${title(choice.peek().hand)} hand damage`, options: choice.peek().types.map(type => ({value: type, label: title(type)})), value: () => choice.value.current, onChange: type => equipment.setDamageType(choice.peek().hand, type)}))));

  // Strategy: which combat skill attacks train.
  const strategy = track(styles, () => styles.strategy);
  const strategySection = section({title: 'Strategy', value: () => title(strategy.value)},
    h('p', {class: 'q-page__help'}, 'Decides which combat skill your attacks train. Applies from your next attack.'),
    h('div', {class: 'q-grid'}, Object.entries(STRATEGIES).map(([id, def]) => h('button', {
      type: 'button',
      class: 'q-tile',
      'aria-pressed': () => strategy.value === id,
      on: {click: () => (assistance ? assistance.setStrategyManually(id) : styles.setStrategy(id))},
    }, h('strong', null, title(id)), h('small', null, `${STRATEGY_HELP[id]} → ${title(def.skill)}`)))));

  // Spells: the quick spell (HUD Mana button) is chosen here, in either mode.
  const quickSpell = track(styles, () => styles.quickSpell);
  const spellSection = section({title: 'Spells', value: () => (quickSpell.value ? `Quick: ${SPELLS[quickSpell.value].name}` : `${learned.value.length} learned`), hidden: () => !learned.value.length},
    h('p', {class: 'q-page__help'}, 'Star a spell to make it your quick spell: the HUD spell button casts it on your next attack, or opens your next fight with it.'),
    h('p', {class: 'q-page__help', hidden: () => !auto.value}, 'The switch decides whether Simple may cast the spell when it picks your attack.'),
    keyedList(h('div', {class: 'q-list'}), learned, id => id, item => row({
      name: SPELLS[item.peek()].name,
      detail: `${SPELLS[item.peek()].mana} Mana · ${SPELLS[item.peek()].castTime}s cast · range ${SPELLS[item.peek()].range}`,
      actions: [
        starButton({label: `Quick spell: ${SPELLS[item.peek()].name}`, on: () => quickSpell.value === item.peek(), onPress: () => styles.setQuickSpell(quickSpell.peek() === item.peek() ? null : item.peek())}),
        // Per-spell permission for Simple's spell choice (assistance's spellExclusions).
        assistance ? h('span', {hidden: () => !auto.value}, toggleSwitch({
          label: `Allow Simple to cast ${SPELLS[item.peek()].name}`,
          on: () => !(settings.value?.advanced.spellExclusions ?? []).includes(item.peek()),
          onChange: on => {
            const list = assistance.settings.advanced.spellExclusions;
            assistance.setAdvanced({spellExclusions: on ? list.filter(x => x !== item.peek()) : [...list, item.peek()]});
          },
        })) : null,
      ],
    })));

  // Abilities: queue one for your next eligible attack.
  const abilityState = track(combat, () => ({pending: combat.pending, committed: combat.committedAbility}));
  const knownAbilities = track(styles, () => Object.keys(ABILITIES).filter(id => styles.knowsAbility(id)));
  const abilitySection = section({title: 'Abilities', value: () => `${knownAbilities.value.length} learned`, hidden: () => !knownAbilities.value.length},
    h('p', {class: 'q-page__help'}, 'Spend Energy when the attack lands. Queue one for your next eligible attack; it never repeats on its own.'),
    keyedList(h('div', {class: 'q-list'}), knownAbilities, id => id, item => {
      const ability = ABILITIES[item.peek()];
      const queued = computed(() => abilityState.value.pending === item.peek() || abilityState.value.committed === ability.name);
      return row({
        name: ability.name,
        detail: `${ability.energy} Energy · ${ability.description}`,
        actions: [h('button', {type: 'button', class: 'q-button q-button--small', 'aria-pressed': queued, on: {click: () => say(combat.queue(item.peek()))}}, () => (queued.value ? 'Queued' : 'Queue'))],
      });
    }));

  // Auras: on/off and the quick-toggle set (HUD Ki button), in either mode.
  const auraState = track(auras, () => ({learned: auras?.state.learned ?? [], active: auras?.state.active ?? [], quick: auras?.quick ?? []}));
  const auraSection = section({title: 'Auras', value: () => `${auraState.value.active.length} on`, hidden: () => !auraState.value.learned.length},
    h('p', {class: 'q-page__help'}, 'Auras drain Ki every second while on; turning one on costs a second of upkeep. Star auras to switch them together with the HUD aura button.'),
    keyedList(h('div', {class: 'q-list'}), () => auraState.value.learned, id => id, item => {
      const aura = AURAS[item.peek()];
      return row({
        name: aura.name,
        detail: `${aura.description} · ${aura.upkeep} Ki/s`,
        actions: [
          starButton({label: `Quick toggle: ${aura.name}`, on: () => auraState.value.quick.includes(item.peek()), onPress: () => auras.setQuick(item.peek(), !auras.isQuick(item.peek()))}),
          toggleSwitch({label: `${aura.name} on`, on: () => auraState.value.active.includes(item.peek()), onChange: () => say(assistance ? assistance.toggleAuraManually(item.peek()) : auras.toggle(item.peek()))}),
        ],
      });
    }));

  // Simple settings: optional preferences with sensible defaults.
  const advanced = computed(() => settings.value?.advanced ?? null);
  const check = (key, label) => h('label', {class: 'q-check'},
    h('input', {type: 'checkbox', checked: () => !!advanced.value?.[key], on: {change: event => assistance.setAdvanced({[key]: event.target.checked})}}), label);
  const number = (key, label, scale, min, max) => h('label', {class: 'q-field'}, h('span', {class: 'q-label'}, label),
    h('input', {type: 'number', class: 'q-input', min, max, value: () => (advanced.value ? Math.round(advanced.value[key] * scale) : ''), on: {change: event => {
      const next = Number(event.target.value);
      if (Number.isFinite(next)) assistance.setAdvanced({[key]: Math.min(max, Math.max(min, next)) / scale});
    }}}));
  const autoSection = assistance ? section({title: 'Simple settings', hidden: () => !auto.value},
    // Simple manages abilities and auras, so their meters and HUD buttons are opt-in here.
    check('showEnergy', 'Show Energy and Quick Ability'),
    check('showKi', 'Show Ki and Quick Auras'),
    check('autoEat', 'Auto-eat before a one-hit defeat'),
    check('emergencyPriority', 'Emergency healing may interrupt my queued actions'),
    check('allowRiskySpells', 'Allow Simple to cast spells with backfire risk'),
    number('auraRecovery', 'Restart auras after exhaustion at Ki %', 100, 1, 100),
    number('auraGrace', 'Aura grace period (seconds)', 1, 0, 30)) : null;

  return h('div', {class: 'q-page q-combat-page'},
    header, autoPanel, manualPanel,
    h('p', {class: 'q-page__status', role: 'status', hidden: () => !status.value}, status),
    strategySection, spellSection, abilitySection, auraSection, autoSection);
}

// Star toggle for "quick" membership (quick spell, quick auras).
function starButton({label, on, onPress}) {
  return h('button', {type: 'button', class: 'q-star', 'aria-label': label, title: label, 'aria-pressed': on, on: {click: onPress}}, iconNode('star'));
}
