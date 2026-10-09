import {Signal} from '../../reactive.js';
import {h} from '../dom.js';
import {iconNode} from '../icon.js';

const read = value => (value instanceof Signal ? value.value : typeof value === 'function' ? value() : value);

// HUD action button: a small flat-shaded tile for one quick action. State is shown on the
// button itself so the action row needs no extra space:
//   on           a toggle that is active (tinted with the action's color)
//   queued       waiting to attach to the next attack (ring)
//   partial      some, not all, of a group is active
//   unavailable  dimmed but still pressable, so pressing can explain why
//   badge        a small count (food left, quick auras on)
// `kind` selects the color (health, mana, stamina, energy, ki). Reactive props may be signals or
// functions. `toggle: true` exposes aria-pressed for on/off actions.
export function actionButton({id, kind, icon, label, toggle = false, on = false, queued = false, partial = false, unavailable = false, badge = null, onPress}) {
  return h('button', {
    id,
    type: 'button',
    class: `q-action q-action--${kind}`,
    title: label,
    'aria-label': label,
    'aria-pressed': toggle ? on : null,
    'aria-disabled': unavailable,
    'data-on': on,
    'data-queued': queued,
    'data-partial': partial,
    on: {click: onPress},
  },
  iconNode(icon),
  h('span', {class: 'q-action__badge', 'aria-hidden': 'true', hidden: () => read(badge) == null}, badge));
}
