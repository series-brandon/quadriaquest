import {computed, signal} from '../../reactive.js';
import {h} from '../dom.js';
import {iconNode} from '../icon.js';
import {keyedList} from '../list.js';
import {subTabs, toggleSwitch} from '../controls.js';
import {SPELLS, ABILITIES} from '../../combat-styles.js';
import {AURAS} from '../../auras.js';
import {TRACKS} from '../../character.js';

const title = s => s[0].toUpperCase() + s.slice(1);
const trackName = id => TRACKS.find(track => track.id === id)?.name ?? id;
// Damage spells earn the shared per-action award (docs/COMBAT.md, combat XP).
const SPELL_XP = '15 XP per cast, +1 per damage dealt';

// Powers page: Spells, Auras and Abilities as sub-tabs. Each lists what you know, plus `listed`
// entries you haven't learned yet (greyed, with requirements and where to learn them); unlisted
// powers stay secret until learned. Quick slots, on/off and per-power "Allow auto use" call the
// shared systems (styles, auras, assistance, combat), whose revisions the page follows.
//   section  signal: the open sub-tab (owned by the host, which can open a given one)
export function powersPage({styles, auras, assistance = null, combat, character = null, section = signal('spells')}) {
  const track = (system, read) => computed(() => (system?.revision.value, read()));
  const settings = track(assistance, () => assistance?.settings ?? null);
  const isAuto = key => !settings.value || settings.value.policies[key] === 'auto';
  const known = track(styles, () => ({spells: new Set(styles.state.learned), abilities: new Set(Object.keys(ABILITIES).filter(id => styles.knowsAbility(id))), quick: styles.quickSpell}));
  const auraState = track(auras, () => ({learned: new Set(auras.state.learned), active: auras.state.active, quick: auras.quick}));
  const shown = (catalogue, learned) => Object.keys(catalogue).filter(id => learned.has(id) || catalogue[id].listed);
  const spells = computed(() => shown(SPELLS, known.value.spells));
  const auraIds = computed(() => shown(AURAS, auraState.value.learned));
  const abilities = computed(() => shown(ABILITIES, known.value.abilities));
  const combatState = track(combat, () => ({pending: combat.pending, committed: combat.committedAbility}));
  const status = signal('');
  const say = result => { status.value = result === true || result === undefined ? '' : String(result || ''); };

  const requirements = def => Object.entries(def.requirements ?? {}).map(([id, level]) => {
    const have = character ? character.level(id) : null;
    return `${trackName(id)} ${level}${have !== null && have < level ? ` (you: ${have})` : ''}`;
  });
  const allow = (kind, id, name, policy) => (assistance ? h('div', {class: 'q-power__allow', hidden: () => !isAuto(policy)}, toggleSwitch({
    label: `Allow auto use`,
    description: policy === 'attack' ? 'Auto may cast it when it picks your attack.' : 'Auto may switch it on to help.',
    on: () => (settings.value, assistance.allowed(kind, id)),
    onChange: on => assistance.setPermission(kind, id, on),
  })) : null);
  const star = ({label, on, onPress}) => h('button', {type: 'button', class: 'q-star', 'aria-label': label, title: label, 'aria-pressed': on, on: {click: onPress}}, iconNode('star'));
  const locked = def => [
    h('p', {class: 'q-power__lock'}, iconNode('caution'), def.unlock ?? 'Not learned yet.'),
    requirements(def).length ? h('small', {class: 'q-power__facts'}, `Requires ${requirements(def).join(', ')}`) : null,
  ];
  // One card per power: header (icon, name, quick star), description, facts, then its controls.
  const card = ({id, def, icon, learned, facts, quick = null, controls = () => []}) => h('article', {class: 'q-power', 'data-locked': () => !learned(), 'aria-label': def.name},
    h('div', {class: 'q-power__head'},
      h('span', {class: 'q-power__icon', 'aria-hidden': 'true'}, iconNode(icon)),
      h('strong', null, def.name),
      quick ? h('span', {hidden: () => !learned()}, quick) : null),
    def.description ? h('p', null, def.description) : null,
    h('small', {class: 'q-power__facts'}, facts),
    h('div', {class: 'q-power__controls', hidden: () => !learned()}, controls()),
    h('div', {hidden: learned}, locked(def)));

  const spellList = () => h('div', {class: 'q-page__group'},
    h('p', {class: 'q-page__help'}, 'Star a spell to make it your quick spell: the HUD spell button casts it on your next attack, or opens your next fight with it.'),
    keyedList(h('div', {class: 'q-powers'}), spells, id => id, item => {
      const id = item.peek(), def = SPELLS[id];
      return card({id, def, icon: 'spell', learned: () => known.value.spells.has(id),
        facts: `${def.base} power · ${def.castTime}s cast · range ${def.range} · ${def.mana} Mana · ${SPELL_XP} · ${title(def.style)}`,
        quick: star({label: `Quick spell: ${def.name}`, on: () => known.value.quick === id, onPress: () => styles.setQuickSpell(known.peek().quick === id ? null : id)}),
        controls: () => [allow('spell', id, def.name, 'attack')]});
    }),
    h('p', {class: 'q-page__help', hidden: () => spells.value.length > 0}, 'No spells yet.'));

  const auraList = () => h('div', {class: 'q-page__group'},
    h('p', {class: 'q-page__help'}, 'Auras drain Ki every second while on; switching one on costs a second of upkeep. Star auras to switch them together with the HUD aura button.'),
    keyedList(h('div', {class: 'q-powers'}), auraIds, id => id, item => {
      const id = item.peek(), def = AURAS[id];
      return card({id, def, icon: 'aura', learned: () => auraState.value.learned.has(id),
        facts: `${def.upkeep} Ki per second while on`,
        quick: star({label: `Quick toggle: ${def.name}`, on: () => auraState.value.quick.includes(id), onPress: () => auras.setQuick(id, !auras.isQuick(id))}),
        controls: () => [
          toggleSwitch({label: 'On', on: () => auraState.value.active.includes(id), onChange: () => say(assistance ? assistance.toggleAuraManually(id) : auras.toggle(id))}),
          allow('aura', id, def.name, 'auras'),
        ]});
    }),
    h('p', {class: 'q-page__help', hidden: () => auraIds.value.length > 0}, 'No auras yet.'));

  const abilityList = () => h('div', {class: 'q-page__group'},
    h('p', {class: 'q-page__help'}, 'Abilities spend Energy when the attack lands. Queue one for your next eligible attack; it never repeats on its own.'),
    keyedList(h('div', {class: 'q-powers'}), abilities, id => id, item => {
      const id = item.peek(), def = ABILITIES[id];
      const queued = computed(() => combatState.value.pending === id || combatState.value.committed === def.name);
      return card({id, def, icon: id, learned: () => known.value.abilities.has(id),
        facts: `${def.energy} Energy · ${title(def.style)} · ${title(def.strategy)} strategy`,
        controls: () => [h('button', {type: 'button', class: 'q-button q-button--small', 'aria-pressed': queued, on: {click: () => say(combat.queue(id))}}, () => (queued.value ? 'Queued' : 'Queue'))]});
    }),
    h('p', {class: 'q-page__help', hidden: () => abilities.value.length > 0}, 'No abilities yet.'));

  return h('div', {class: 'q-page q-powers-page'},
    h('p', {class: 'q-page__status', role: 'status', hidden: () => !status.value}, status),
    subTabs({label: 'Powers', value: section, tabs: [
      {id: 'spells', label: 'Spells', build: spellList},
      {id: 'auras', label: 'Auras', build: auraList},
      {id: 'abilities', label: 'Abilities', build: abilityList},
    ]}));
}
