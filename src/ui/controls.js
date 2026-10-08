import {Signal} from '../reactive.js';
import {h} from './dom.js';

const read = value => (value instanceof Signal ? value.value : typeof value === 'function' ? value() : value);

// Shared form controls for kit pages. Values are reactive (signals or functions); controls call
// back on change and never hold their own copy of state.

// One choice from a few options, as a row of pressed/unpressed buttons.
export function segmented({label, options, value, onChange}) {
  return h('div', {class: 'q-segmented', role: 'group', 'aria-label': label},
    options.map(option => h('button', {
      type: 'button',
      class: 'q-segmented__option',
      'aria-pressed': () => read(value) === option.value,
      title: option.title ?? null,
      on: {click: () => onChange(option.value)},
    }, option.label)));
}

// An on/off setting with its label (and optional description) beside it.
export function toggleSwitch({label, description = null, on, onChange}) {
  return h('button', {
    type: 'button',
    class: 'q-switch',
    role: 'switch',
    'aria-checked': () => !!read(on),
    on: {click: () => onChange(!read(on))},
  },
  h('span', {class: 'q-switch__text'}, h('span', {class: 'q-switch__label'}, label), description ? h('small', null, description) : null),
  h('span', {class: 'q-switch__track', 'aria-hidden': 'true'}, h('span', {class: 'q-switch__thumb'})));
}

// A collapsible page section whose header shows its current value, so a closed section still
// tells you what it is set to.
export function section({title, value = null, open = false, hidden = false}, ...children) {
  return h('details', {class: 'q-section', open, hidden},
    h('summary', {class: 'q-section__summary'}, h('span', {class: 'q-section__title'}, title), value === null ? null : h('span', {class: 'q-section__value'}, value)),
    h('div', {class: 'q-section__body'}, children));
}

// A list row: text on the left (name and an optional detail line), actions on the right.
export function row({name, detail = null, actions = []}) {
  return h('div', {class: 'q-row'},
    h('div', {class: 'q-row__text'}, h('span', {class: 'q-row__name'}, name), detail === null ? null : h('small', {class: 'q-row__detail'}, detail)),
    h('div', {class: 'q-row__actions'}, actions));
}
