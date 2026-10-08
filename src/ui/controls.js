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

// A thin progress bar (0–1). The fill scales on the compositor; the value is exposed to
// assistive tech as a percentage.
export function progressBar({label, value}) {
  const fraction = () => Math.max(0, Math.min(1, read(value) || 0));
  return h('div', {
    class: 'q-progress',
    role: 'progressbar',
    'aria-label': label,
    'aria-valuemin': '0',
    'aria-valuemax': '100',
    'aria-valuenow': () => String(Math.round(fraction() * 100)),
  }, h('span', {class: 'q-progress__fill', style: {transform: () => `scaleX(${fraction()})`}}));
}

// Sub-tabs inside a page: a tablist and one panel per tab. Panels are built once and kept, so
// their scroll, search and open rows survive switching. Arrow keys move between tabs.
//   tabs: [{id, label, badge?, build: () => node}], value: signal of the selected id
let tabsCount = 0;
export function subTabs({label, tabs, value, onChange = next => { value.value = next; }}) {
  const base = `q-tabs-${++tabsCount}`;
  const buttons = [];
  const select = (index, focus = false) => {
    const tab = tabs[(index + tabs.length) % tabs.length];
    onChange(tab.id);
    if (focus) buttons[tabs.indexOf(tab)].focus?.();
  };
  const keys = {ArrowRight: 1, ArrowLeft: -1};
  return h('div', {class: 'q-tabs'},
    h('div', {class: 'q-tabs__list', role: 'tablist', 'aria-label': label}, tabs.map((tab, index) => {
      const selected = () => read(value) === tab.id;
      const button = h('button', {
        type: 'button',
        role: 'tab',
        id: `${base}-${tab.id}`,
        class: 'q-tabs__tab',
        'aria-selected': selected,
        'aria-controls': `${base}-${tab.id}-panel`,
        tabindex: () => (selected() ? '0' : '-1'),
        on: {
          click: () => select(index),
          keydown: event => {
            if (!(event.key in keys)) return;
            event.preventDefault();
            select(index + keys[event.key], true);
          },
        },
      }, tab.label, tab.badge ? h('span', {class: 'q-badge', hidden: () => !read(tab.badge), 'aria-label': tab.badgeLabel ?? null}) : null);
      buttons.push(button);
      return button;
    })),
    tabs.map(tab => h('div', {
      class: 'q-tabs__panel',
      role: 'tabpanel',
      id: `${base}-${tab.id}-panel`,
      'aria-labelledby': `${base}-${tab.id}`,
      hidden: () => read(value) !== tab.id,
    }, tab.build())));
}

// A labelled range input that shows its current value (formatted by `format`).
export function slider({label, value, min = 0, max = 1, step = 0.05, format = v => `${Math.round(v * 100)}%`, onInput}) {
  return h('label', {class: 'q-slider'},
    h('span', {class: 'q-slider__head'}, h('span', {class: 'q-slider__label'}, label), h('b', {class: 'q-slider__value'}, () => format(read(value)))),
    h('input', {type: 'range', min, max, step, value: () => String(read(value)), 'aria-label': label, on: {input: event => onInput(Number(event.target.value))}}));
}
