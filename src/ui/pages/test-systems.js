// Test-only: real styles and auras, with assistance and combat reduced to the surfaces pages use
// (settings, permissions, overrides; preview, queue). Shared by the Combat and Powers page tests.
import {signal} from '../../reactive.js';
import {createCombatStyles} from '../../combat-styles.js';
import {createAuras} from '../../auras.js';
import {createPlayerResources} from '../../player-resources.js';

export function combatSystems() {
  const styles = createCombatStyles({equipment: {attack: {}}});
  const resources = createPlayerResources();
  const auras = createAuras({ki: resources.ki});
  const revision = signal(0), bump = () => revision.value++;
  const PRESETS = {
    simple: {attacks: 'allowed', strategy: 'auto', attack: 'auto', abilities: 'auto', auras: 'auto', autoEat: true, emergencyPriority: false, allowRiskySpells: false, auraRecovery: .5, auraGrace: 3, showEnergy: false, showKi: false},
  };
  PRESETS.pacifist = {...PRESETS.simple, attacks: 'prevented', abilities: 'manual'};
  PRESETS.expert = {...PRESETS.simple, strategy: 'manual', attack: 'manual', abilities: 'manual', auras: 'manual', showEnergy: true, showKi: true};
  const state = {mode: 'simple', custom: {...PRESETS.simple}, retaliate: 'smart', style: 'melee', goal: null, permissions: {food: [], spell: [], aura: []}, overrides: {strategy: false, attack: false, auras: {}}};
  const policies = () => (state.mode === 'custom' ? state.custom : PRESETS[state.mode]);
  const calls = [];
  const assistance = {
    revision,
    get settings() { return structuredClone({...state, policies: policies()}); },
    optimizeReport: '',
    setMode(next) { state.mode = next; bump(); },
    setPolicy(key, value) { calls.push(['setPolicy', key, value]); state.custom = {...policies(), [key]: value}; state.mode = 'custom'; bump(); },
    setRetaliate(next) { state.retaliate = next; bump(); },
    setStyle(next) { state.style = next; bump(); },
    setGoal(next) { state.goal = next; bump(); },
    setPermission(kind, id, on) { state.permissions[kind] = on ? state.permissions[kind].filter(x => x !== id) : [...state.permissions[kind], id]; bump(); },
    allowed: (kind, id) => !state.permissions[kind].includes(id),
    optimize() { this.optimizeReport = 'Equipped Copper Dagger.'; bump(); },
    setStrategyManually(id) { state.overrides.strategy = true; styles.setStrategy(id); bump(); },
    selectSpellManually(id) { state.overrides.attack = true; const ok = styles.select(id); bump(); return ok; },
    toggleAuraManually(id) { state.overrides.auras[id] = true; const r = auras.toggle(id); bump(); return r; },
    returnToAuto() { calls.push(['returnToAuto']); state.overrides = {strategy: false, attack: false, auras: {}}; bump(); },
  };
  const combatRevision = signal(0);
  let autoRetaliate = true, pending = null;
  const combat = {
    revision: combatRevision,
    preview: () => ({name: 'Bare hands', min: 1, max: 10, interval: 2.5, combatStyle: 'melee', strategy: styles.strategy, backfirePercent: 0}),
    get autoRetaliate() { return autoRetaliate; },
    setAutoRetaliate(on) { autoRetaliate = on; combatRevision.value++; },
    get pending() { return pending; },
    committedAbility: null,
    queue(id) { pending = pending === id ? null : id; combatRevision.value++; return true; },
  };
  return {styles, auras, resources, assistance, state, combat, calls};
}
