import {computed, signal} from '../../reactive.js';
import {h} from '../dom.js';
import {iconNode} from '../icon.js';
import {keyedList} from '../list.js';
import {toggleSwitch} from '../controls.js';
import {ITEMS} from '../../items.js';

const REFUSED = 'Finish what you’re doing first.';

// Inventory page: a grid of item stacks and the chosen item's detail (description, actions such
// as Eat, Equip or Place, and per-item permissions such as Allow auto eating). Item actions and
// settings come from the shared systems that own them:
//   actions(id)  → [{label, disabled, run}]: `disabled` uses state the page can follow (the
//                  reactive inventory, signals, `track`); run() returns false when refused.
//   settings(id) → [{label, checked(), onChange(on)}].
//   isEquipped(id), track() reads the revisions of systems the actions depend on.
// `view` holds the search, chosen item and phone detail view (inventoryView()); its owner may
// reset it, as the Sticks lesson does. `guide` ({item, action} or null) highlights a stack until it
// is chosen, then that item's action button with the matching label (Eat, Place…). From another
// item's detail in a narrow journal it highlights the way back to the list.
export function inventoryView() {
  const view = {query: signal(''), chosen: signal(null), viewing: signal(false)};
  view.reset = () => {
    view.query.value = '';
    view.chosen.value = null;
    view.viewing.value = false;
  };
  return view;
}

export function inventoryPage({inventory, actions = () => [], settings = () => [], isEquipped = () => false, track = () => {}, onSelect = () => {}, guide = signal(null), view = inventoryView()}) {
  const {query, chosen, viewing} = view;
  const status = signal('');

  const owned = computed(() => Object.keys(ITEMS).filter(id => inventory[id] > 0));
  const shown = computed(() => {
    const text = query.value.trim().toLowerCase();
    return text ? owned.value.filter(id => ITEMS[id].name.toLowerCase().includes(text)) : owned.value;
  });
  // The detail shows the chosen item while you have it; otherwise the first stack shown.
  const selected = computed(() => (shown.value.includes(chosen.value) ? chosen.value : shown.value[0] ?? null));
  const equipped = id => computed(() => (track(), !!isEquipped(id)));

  let detailArea;
  const choose = id => {
    chosen.value = id;
    viewing.value = true;
    status.value = '';
    onSelect(id);
    // Below the stacks (narrow journals), bring the chosen item's detail into view.
    detailArea.scrollIntoView?.({block: 'nearest'});
  };
  const run = action => {
    status.value = action.run() === false ? REFUSED : '';
  };

  const grid = keyedList(h('div', {class: 'q-items', role: 'list', 'aria-label': 'Items'}), shown, id => id, item => {
    const id = item.peek(), name = ITEMS[id].name, worn = equipped(id);
    return h('button', {
      type: 'button',
      class: 'q-item',
      'data-item': id,
      'data-guide': () => guide.value?.item === id && chosen.value !== id,
      'aria-pressed': () => selected.value === id,
      'aria-label': () => `${name}${worn.value ? ', equipped' : ''}, quantity ${inventory[id]}`,
      on: {click: () => choose(id)},
    },
    h('span', {class: 'q-item__icon', 'aria-hidden': 'true'}, iconNode(id)),
    h('span', {class: 'q-item__name'}, name),
    h('b', {class: 'q-item__count', 'aria-hidden': 'true'}, () => `×${inventory[id]}`),
    h('small', {class: 'q-item__worn', hidden: () => !worn.value, 'aria-hidden': 'true'}, 'Equipped'));
  });

  const detail = keyedList(h('div', {class: 'q-inventory__detail', ref: element => { detailArea = element; }}), computed(() => (selected.value ? [selected.value] : [])), id => id, item => {
    const id = item.peek(), worn = equipped(id);
    const itemActions = computed(() => (track(), inventory[id], actions(id).map((action, index) => ({...action, index}))));
    return h('section', {class: 'q-item-detail', 'aria-label': ITEMS[id].name, 'aria-live': 'polite'},
      h('button', {type: 'button', class: 'q-back q-inventory__back', 'data-guide': () => !!guide.value?.item && guide.value.item !== id && viewing.value, on: {click: () => { viewing.value = false; }}}, iconNode('back'), h('span', null, 'All items')),
      h('div', {class: 'q-item-detail__head'},
        h('span', {class: 'q-item-detail__icon', 'aria-hidden': 'true'}, iconNode(id)),
        h('span', {class: 'q-item-detail__title'},
          h('h3', null, ITEMS[id].name),
          h('small', null, () => `Quantity ${inventory[id] ?? 0}${worn.value ? ' · Equipped' : ''}`))),
      h('p', {class: 'q-item-detail__copy'}, ITEMS[id].description),
      keyedList(h('div', {class: 'q-item-detail__actions'}), itemActions, action => action.index, action => h('button', {
        type: 'button',
        class: 'q-button',
        disabled: () => !!action.value.disabled,
        'data-guide': () => !!guide.value?.action && guide.value.item === id && chosen.value === id && guide.value.action === action.value.label,
        on: {click: () => run(action.peek())},
      }, () => action.value.label)),
      h('p', {class: 'q-page__status', role: 'status', hidden: () => !status.value}, status),
      keyedList(h('div', {class: 'q-item-detail__settings'}), computed(() => (track(), settings(id))), setting => setting.label,
        setting => toggleSwitch({label: setting.peek().label, on: () => setting.value.checked(), onChange: on => setting.peek().onChange(on)})));
  });

  return h('div', {
    class: 'q-page q-inventory-page',
    'data-view': () => (viewing.value && selected.value ? 'detail' : 'list'),
  },
  h('input', {
    type: 'search',
    class: 'q-input q-inventory__search',
    placeholder: 'Search items…',
    'aria-label': 'Search inventory',
    value: query,
    on: {input: event => { query.value = event.target.value; viewing.value = false; }},
  }),
  h('div', {class: 'q-inventory__body'},
    h('div', {class: 'q-inventory__stacks'},
      grid,
      h('p', {class: 'q-page__help', hidden: () => shown.value.length > 0}, () => (query.value ? 'No matching items.' : 'Your inventory is empty.'))),
    detail));
}
