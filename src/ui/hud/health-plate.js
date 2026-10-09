import {computed, signal, Signal} from '../../reactive.js';
import {h} from '../dom.js';
import {iconNode} from '../icon.js';
import {keyedList} from '../list.js';

const read = value => (value instanceof Signal ? value.value : typeof value === 'function' ? value() : value);

// Shared DANGER_BANDS → the symbol beside an enemy's bar (none while manageable).
const DANGER_ICON = {caution: 'caution', flee: 'danger', imminent: 'danger'};
const DANGER_LABEL = {caution: 'Caution', danger: 'Danger'};
// Control effect kinds (control-effects.js `kinds`) → icons.
const EFFECT_ICON = {stun: 'stunned', immobilize: 'immobilized', slow: 'slowed', immune: 'immune'};

// Health plate floating above a combatant: just a bar, kept small because screen space is at a
// premium. Tiny control-effect icons sit to the right (player and enemies); enemy plates add a
// danger symbol on the left (orange caution triangle, red skull for flee or imminent). Names and
// numbers live in the hover label.
// `value` and `max` are reactive (signals or functions over signal-backed state), so the bar writes
// only when health changes. The owner's frame loop calls place() with screen coordinates and sets
// `visible`, `effects` (a comma-separated kinds string) and `danger` (a DANGER_BANDS band); each
// writes the DOM only on change. Must be built inside a view scope (mount).
export function healthPlate({kind = 'enemy', value, max}) {
  const visible = signal(false);
  const effects = signal('');
  const danger = signal(null);
  const shown = computed(() => Math.max(0, Math.ceil(read(value))));
  const limit = computed(() => read(max));
  const level = computed(() => (limit.value > 0 ? Math.min(1, shown.value / limit.value) : 0));
  const symbol = computed(() => DANGER_ICON[danger.value] ?? null);
  const effectKinds = computed(() => (effects.value ? effects.value.split(',').filter(id => EFFECT_ICON[id]) : []));

  const node = h('div', {
    class: `q-plate q-plate--${kind}`,
    hidden: () => !visible.value,
    'aria-hidden': 'true',
    'data-danger': symbol,
  },
  kind === 'enemy' ? keyedList(h('span', {class: 'q-plate__danger'}), () => (symbol.value ? [symbol.value] : []), id => id,
    item => h('span', {class: `q-plate__symbol q-plate__symbol--${item.peek()}`, title: DANGER_LABEL[item.peek()]}, iconNode(item.peek()))) : null,
  h('div', {class: 'q-plate__bar'}, h('span', {class: 'q-plate__fill', style: {'--q-plate-level': level}})),
  keyedList(h('span', {class: 'q-plate__effects'}), effectKinds, id => id,
    item => h('span', {class: 'q-plate__effect'}, iconNode(EFFECT_ICON[item.peek()]))));

  let placed = '';
  return {
    node,
    visible,
    effects,
    danger,
    // Screen position of the point the plate sits above (bottom-centre of the bar anchored).
    place(x, y) {
      const next = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-100%)`;
      if (next !== placed) node.style.transform = placed = next;
    },
  };
}
