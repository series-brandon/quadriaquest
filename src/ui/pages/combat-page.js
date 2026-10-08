import {computed, signal} from '../../reactive.js';
import {h} from '../dom.js';
import {iconNode} from '../icon.js';
import {keyedList} from '../list.js';
import {row, section, segmented, toggleSwitch} from '../controls.js';
import {SPELLS, ABILITIES} from '../../combat-styles.js';
import {AURAS} from '../../auras.js';
import {STRATEGIES, backfireBaseDamage, resolvePortions} from '../../combat-formulas.js';
import {playerDefense} from '../../combat-profile.js';
import {TRAINING_GOALS, MODES} from '../../assistance.js';

const title = s => s[0].toUpperCase() + s.slice(1);
const STRATEGY_HELP = {technical: 'No modifiers', accurate: '+10 Accuracy', strong: '+10 Power', fast: '+10 Speed', defensive: '+10 Resistance', agile: '+10 Dodge'};
const HAND_LABEL = {auto: 'Auto', both: 'Both hands', main: 'Main hand', off: 'Off hand'};
const STYLES = ['melee', 'ranged', 'magic'];
const MODE_HELP = {
  simple: 'Auto picks strategy, attacks, abilities and auras for you. You always control movement.',
  pacifist: 'You never attack, and most creatures leave you alone. Eating, defensive auras and warnings help when one doesn’t.',
  expert: 'Every combat choice is yours.',
  custom: 'Your own mix of Auto and Manual. Switching modes never changes these settings.',
};
const AUTO_MANUAL = [{value: 'auto', label: 'Auto'}, {value: 'manual', label: 'Manual'}];
// Policies with Auto/Manual values.
const CHOICE_POLICIES = [['strategy', 'Strategy'], ['attack', 'Attack and spell choice'], ['abilities', 'Abilities'], ['auras', 'Auras']];

// Combat page (docs/COMBAT.md: Modes, policies and overrides). Always visible: the mode selector,
// quick settings that never change the mode (retaliate; class and training goal while those
// policies are Auto), any one-time overrides with Return to Auto, and the attack summary.
// Attack setup, strategy, spells, abilities, auras and mode settings are collapsible sections
// whose headers show their current value. Every control calls the shared systems; state follows
// their revisions, so nothing polls or rebuilds while the page is open.
// `guide` (signal, optional): 'mode' highlights the mode dropdown until a mode is chosen.
// `openPowers` (optional) opens the Powers page, which holds the full spell, aura and ability lists.
export function combatPage({styles, combat, auras, assistance, equipment, character, health, guide = null, openPowers = null}) {
  const track = (system, read) => computed(() => (system?.revision.value, read()));
  const settings = track(assistance, () => assistance?.settings ?? null);
  const policy = key => computed(() => settings.value?.policies[key]);
  const isAuto = key => !settings.value || settings.value.policies[key] === 'auto';
  const prevented = computed(() => settings.value?.policies.attacks === 'prevented');
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
    // Dual wielding: the off hand's follow-up (reduced damage) in the same cycle.
    const f = p.followUp, scale = f?.offHandPenalty ?? 1;
    const second = f ? `, then ${Math.round(f.min * scale)}–${Math.round(f.max * scale)} off hand${f.damageType ? `, ${f.damageType}` : ''}` : '';
    return `${p.min}–${p.max} damage${f ? ' main hand' : ''}${second} every ${+p.interval.toFixed(2)}s${f ? '' : hand} · trains ${title(p.combatStyle)} ${title(STRATEGIES[p.strategy].skill)}`;
  });
  // Under-level casting shows its backfire chance and whether it could defeat you.
  const backfire = computed(() => {
    const p = preview.value;
    if (!(p.backfirePercent > 0) || !character) return '';
    const defense = playerDefense(character, {incomingStyle: 'magic', shield: equipment?.shield, armor: equipment?.armorPieces || [], bonusResistancePct: auras?.resistancePct || 0});
    const damage = resolvePortions(Object.values(p.elements || {none: 1}).map(share => ({base: backfireBaseDamage(p) * share, resistancePct: defense.resistancePct})));
    return `${+p.backfirePercent.toFixed(2)}% backfire chance: ${damage} damage to you${health && damage >= health.value ? ' — a backfire could defeat you' : ''}`;
  });
  // What Auto currently decides, for the policies left to it (overridden ones are yours).
  const autoChose = computed(() => {
    const s = settings.value;
    if (!s) return '';
    styles.revision.value; auras?.revision.value;
    const parts = [];
    if (s.policies.strategy === 'auto' && !s.overrides.strategy) parts.push(`${title(styles.strategy)} strategy`);
    if (s.policies.attack === 'auto' && !s.overrides.attack && s.policies.attacks !== 'prevented') parts.push(styles.state.selected ? SPELLS[styles.state.selected].name : 'weapon or bare hands');
    if (s.policies.auras === 'auto' && !Object.keys(s.overrides.auras).length) parts.push(auras?.state.active.map(id => AURAS[id].name).join(', ') || 'no auras');
    return parts.length ? `Auto chose: ${parts.join(', ')}.` : '';
  });

  // Mode selector and its description. Its options carry the selection.
  const mode = computed(() => settings.value?.mode ?? 'simple');
  const modeSelect = h('label', {class: 'q-field'},
    h('span', {class: 'q-label'}, 'Mode'),
    h('select', {class: 'q-select', 'aria-label': 'Combat mode', 'data-guide': () => guide?.value === 'mode', on: {change: event => { assistance.setMode(event.target.value); if (guide) guide.value = null; }}},
      MODES.map(id => h('option', {value: id, selected: () => mode.value === id}, title(id)))));

  // Quick settings: never change the mode.
  const goalValue = computed(() => settings.value?.goal || '');
  const quick = h('div', {class: 'q-page__group'},
    h('div', {class: 'q-page__group', hidden: prevented},
      h('span', {class: 'q-label'}, 'Retaliate'),
      segmented({label: 'Retaliate', options: [{value: 'smart', label: 'Smart', title: 'Fight back unless the enemy is too dangerous'}, {value: 'always', label: 'Always'}, {value: 'never', label: 'Never'}], value: () => settings.value?.retaliate, onChange: next => assistance.setRetaliate(next)})),
    h('div', {class: 'q-page__group', hidden: () => !isAuto('attack') || prevented.value},
      h('span', {class: 'q-label'}, 'Class'),
      segmented({label: 'Class', options: STYLES.map(id => ({value: id, label: title(id)})), value: () => settings.value?.style, onChange: id => assistance.setStyle(id)}),
      h('small', {class: 'q-page__help', role: 'status', hidden: () => !(settings.value && assistance.optimizeReport)}, () => (settings.value, assistance?.optimizeReport ?? ''))),
    h('label', {class: 'q-field', hidden: () => !isAuto('strategy') || prevented.value},
      h('span', {class: 'q-label'}, 'Train a specific skill'),
      h('select', {class: 'q-select', 'aria-label': 'Train a specific skill', on: {change: event => assistance.setGoal(event.target.value || null)}},
        [['', 'No — best overall'], ...TRAINING_GOALS.map(id => [id, title(id)])].map(([id, label]) => h('option', {value: id, selected: () => goalValue.value === id}, label)))));

  // One-time overrides: what you're choosing yourself this fight, how to make it permanent, and a
  // single button to hand everything back to Auto.
  const overrides = computed(() => {
    const o = settings.value?.overrides;
    if (!o) return [];
    return [
      ...(o.strategy ? [{id: 'strategy', label: 'Strategy', policy: 'strategy', noun: 'my strategy'}] : []),
      ...(o.attack ? [{id: 'attack', label: 'Attack choice', policy: 'attack', noun: 'my attacks'}] : []),
      ...Object.keys(o.auras).map(id => ({id: `aura-${id}`, label: AURAS[id].name, policy: 'auras', noun: 'my auras'})),
    ];
  });
  const overridePanel = h('div', {class: 'q-note', hidden: () => !overrides.value.length},
    h('strong', null, 'Your choice for this fight'),
    keyedList(h('div', {class: 'q-list'}), overrides, item => item.id, item => row({
      name: () => item.value.label,
      detail: 'Auto takes over again when the fight ends.',
      actions: [h('button', {
        type: 'button',
        class: 'q-chip-button',
        title: 'Sets this policy to Manual (switches to Custom)',
        on: {click: () => assistance.setPolicy(item.peek().policy, 'manual')},
      }, () => `Always choose ${item.value.noun}`)],
    })),
    h('button', {type: 'button', class: 'q-button', on: {click: () => assistance.returnToAuto()}}, 'Return to Auto'));

  const header = h('div', {class: 'q-page__lead'},
    assistance ? modeSelect : null,
    assistance ? h('p', {class: 'q-page__help'}, () => MODE_HELP[mode.value]) : null,
    h('div', {class: 'q-card', role: 'status'},
      h('strong', null, attackName),
      h('small', null, attackFacts),
      h('small', {class: 'q-card__warning', hidden: () => !backfire.value}, iconNode('caution'), backfire),
      h('small', {class: 'q-card__auto', hidden: () => !autoChose.value}, autoChose)));

  // Attack setup: what to attack with, which hands and damage types. Choosing an attack while
  // Attack and spell choice is Auto is a one-time override.
  const attackOptions = computed(() => [{value: null, label: 'Weapon'}, ...learned.value.map(id => ({value: id, label: SPELLS[id].name}))]);
  const hands = track(equipment, () => {
    if (!equipment) return [];
    const eligible = equipment.eligibleHands();
    // Auto (default): every hand that can strike, and Optimize may choose the hands.
    return ['auto', 'both', 'main', 'off'].filter(hand => (hand === 'auto' ? true : hand === 'both' ? eligible.length > 1 : eligible.includes(hand)));
  });
  const damageChoices = track(equipment, () => (equipment ? equipment.eligibleHands().flatMap(hand => {
    const attack = equipment.handAttack(hand);
    return (attack.damageTypes || []).length < 2 ? [] : [{hand, types: attack.damageTypes, current: attack.damageType}];
  }) : []));
  const selectAttack = id => {
    const ok = assistance ? assistance.selectSpellManually(id) : styles.select(id);
    say(ok === false ? 'Finish your current action before changing your attack.' : true);
  };
  const attackSection = section({title: 'Attack setup', value: attackName, hidden: prevented},
    h('span', {class: 'q-label'}, 'Attack with'),
    keyedList(h('div', {class: 'q-stack'}), computed(() => [attackOptions.value]), options => options.map(option => String(option.value)).join(),
      options => segmented({label: 'Attack with', options: options.peek(), value: track(styles, () => styles.state.selected), onChange: selectAttack})),
    h('span', {class: 'q-label', hidden: () => hands.value.length < 2}, 'Hands'),
    keyedList(h('div', {class: 'q-stack'}), computed(() => (hands.value.length < 2 ? [] : [hands.value])), list => list.join(),
      list => segmented({label: 'Attack hands', options: list.peek().map(hand => ({value: hand, label: HAND_LABEL[hand]})), value: track(equipment, () => { const choice = equipment.attackHandsChoice; return choice == null ? 'auto' : hands.peek().includes(choice) ? choice : equipment.attackHands; }), onChange: hand => equipment.setAttackHands(hand)})),
    keyedList(h('div', {class: 'q-stack'}), damageChoices, choice => `${choice.hand}:${choice.types.join()}`,
      choice => h('div', null,
        h('span', {class: 'q-label'}, `${title(choice.peek().hand)} hand damage`),
        segmented({label: `${title(choice.peek().hand)} hand damage`, options: choice.peek().types.map(type => ({value: type, label: title(type)})), value: () => choice.value.current, onChange: type => equipment.setDamageType(choice.peek().hand, type)}))));

  // Strategy: which combat skill attacks train.
  const strategy = track(styles, () => styles.strategy);
  const strategySection = section({title: 'Strategy', value: () => title(strategy.value)},
    h('div', {class: 'q-grid'}, Object.entries(STRATEGIES).map(([id, def]) => h('button', {
      type: 'button',
      class: 'q-tile',
      'aria-pressed': () => strategy.value === id,
      on: {click: () => (assistance ? assistance.setStrategyManually(id) : styles.setStrategy(id))},
    }, h('strong', null, title(id)), h('small', null, `${STRATEGY_HELP[id]} → ${title(def.skill)}`)))));

  // Powers in brief: queue abilities and switch auras mid-fight. Descriptions, quick slots and
  // "Allow auto use" live on the Powers page (openPowers).
  const quickSpell = track(styles, () => styles.quickSpell);
  const abilityState = track(combat, () => ({pending: combat.pending, committed: combat.committedAbility}));
  const knownAbilities = track(styles, () => Object.keys(ABILITIES).filter(id => styles.knowsAbility(id)));
  const auraState = track(auras, () => ({learned: auras?.state.learned ?? [], active: auras?.state.active ?? []}));
  const powersValue = () => {
    const parts = [];
    if (quickSpell.value) parts.push(`Quick: ${SPELLS[quickSpell.value].name}`);
    if (auraState.value.learned.length) parts.push(`${auraState.value.active.length} aura${auraState.value.active.length === 1 ? '' : 's'} on`);
    return parts.join(' · ') || `${learned.value.length + knownAbilities.value.length + auraState.value.learned.length} learned`;
  };
  const powersSection = section({title: 'Powers', value: powersValue, hidden: () => !(learned.value.length || knownAbilities.value.length || auraState.value.learned.length)},
    keyedList(h('div', {class: 'q-list'}), knownAbilities, id => id, item => {
      const ability = ABILITIES[item.peek()];
      const queued = computed(() => abilityState.value.pending === item.peek() || abilityState.value.committed === ability.name);
      return row({
        name: ability.name,
        detail: `${ability.energy} Energy`,
        actions: [h('button', {type: 'button', class: 'q-button q-button--small', 'aria-pressed': queued, on: {click: () => say(combat.queue(item.peek()))}}, () => (queued.value ? 'Queued' : 'Queue'))],
      });
    }),
    keyedList(h('div', {class: 'q-list'}), () => auraState.value.learned, id => id, item => {
      const aura = AURAS[item.peek()];
      return row({
        name: aura.name,
        detail: `${aura.upkeep} Ki/s`,
        actions: [toggleSwitch({label: `${aura.name} on`, on: () => auraState.value.active.includes(item.peek()), onChange: () => say(assistance ? assistance.toggleAuraManually(item.peek()) : auras.toggle(item.peek()))})],
      });
    }),
    openPowers ? h('button', {type: 'button', class: 'q-button q-button--quiet', on: {click: () => openPowers()}}, 'All spells, auras and abilities') : null);

  // Mode settings: every policy. Changing one from a preset switches to Custom.
  const setPolicy = (key, value) => assistance.setPolicy(key, value);
  const policySwitch = (key, label) => toggleSwitch({label, on: policy(key), onChange: on => setPolicy(key, on)});
  const number = (key, label, scale, min, max) => h('label', {class: 'q-field'}, h('span', {class: 'q-label'}, label),
    h('input', {type: 'number', class: 'q-input', min, max, value: () => (settings.value ? Math.round(settings.value.policies[key] * scale) : ''), on: {change: event => {
      const next = Number(event.target.value);
      if (Number.isFinite(next)) setPolicy(key, Math.min(max, Math.max(min, next)) / scale);
    }}}));
  const modeSection = assistance ? section({title: 'Mode settings', value: () => title(mode.value)},
    h('span', {class: 'q-label'}, 'Attacks'),
    segmented({label: 'Attacks', options: [{value: 'allowed', label: 'Allowed'}, {value: 'prevented', label: 'Prevented'}], value: policy('attacks'), onChange: next => setPolicy('attacks', next)}),
    CHOICE_POLICIES.map(([key, label]) => h('div', {class: 'q-page__group'},
      h('span', {class: 'q-label'}, label),
      segmented({label, options: AUTO_MANUAL, value: policy(key), onChange: next => setPolicy(key, next)}))),
    policySwitch('autoEat', 'Auto-eat before a one-hit defeat'),
    policySwitch('emergencyPriority', 'Emergency healing may interrupt my queued actions'),
    policySwitch('allowRiskySpells', 'Allow Auto to cast spells with backfire risk'),
    policySwitch('showEnergy', 'Show Energy and Quick Ability'),
    policySwitch('showKi', 'Show Ki and Quick Auras'),
    number('auraRecovery', 'Restart auras after exhaustion at Ki %', 100, 1, 100),
    number('auraGrace', 'Aura grace period (seconds)', 1, 0, 30)) : null;

  return h('div', {class: 'q-page q-page--form q-combat-page'},
    header, assistance ? quick : null, overridePanel,
    h('p', {class: 'q-page__status', role: 'status', hidden: () => !status.value}, status),
    attackSection, strategySection, powersSection, modeSection);
}
