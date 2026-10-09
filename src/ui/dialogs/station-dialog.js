import {computed, signal} from '../../reactive.js';
import {h} from '../dom.js';
import {iconNode} from '../icon.js';
import {keyedList} from '../list.js';
import {recipeTile, recipeDetailBody} from '../recipe-view.js';

export const STATIONS = {
  fire: {title: 'Cooking', noun: 'campfire', verb: 'Cook one'},
  furnace: {title: 'Furnace · Smelting', noun: 'furnace', verb: 'Make one'},
  anvil: {title: 'Anvil · Smithing', noun: 'anvil', verb: 'Make one'},
};
// Long recipe lists get a search field.
const SEARCH_FROM = 6;

// Station recipe browser (campfire, furnace, anvil) for the modal host, laid out like the Crafting
// page (ui/recipe-view.js): a recipe grid on the left, the chosen recipe's detail and its make
// button on the right (one at a time on phones).
// Recipes come from the shared catalogue; what you own follows the reactive inventory, and
// making calls the shared skill through `onMake(id, station)`. `station` is null in previews.
export function stationDialog({kind, recipes, items, inventory, canMake, duration, station, onMake, close}) {
  const info = STATIONS[kind];
  const catalogue = Object.entries(recipes).filter(([, recipe]) => recipe.station === kind);
  const usable = () => !!station?.available();
  const label = id => items[id]?.name || id;
  const query = signal('');
  const viewing = signal(false);
  const status = signal('');
  const shown = computed(() => {
    const text = query.value.toLowerCase();
    return catalogue.filter(([, r]) => `${r.name} ${Object.keys(r.cost).map(label).join(' ')}`.toLowerCase().includes(text)).map(([id]) => id);
  });
  const chosen = signal(catalogue[0]?.[0] ?? null);
  // The selection follows the search: a filtered-out recipe gives way to the first match.
  const selected = computed(() => (shown.value.includes(chosen.value) ? chosen.value : shown.value[0] ?? null));
  const choose = id => { chosen.value = id; viewing.value = true; status.value = ''; };

  const make = id => {
    if (!usable()) {
      status.value = `The ${info.noun} is out of reach. Close and approach it again.`;
      return;
    }
    if (!canMake(inventory, recipes[id])) return;
    close('made');
    onMake(id, station);
  };

  const list = keyedList(h('div', {class: 'q-items q-station__list', role: 'list', 'aria-label': `${info.title} recipes`}), shown, id => id, item => {
    const id = item.peek(), recipe = recipes[id];
    const ready = () => canMake(inventory, recipe);
    return recipeTile({id, recipe, pressed: () => selected.value === id, ready,
      label: () => `${recipe.name}, ${ready() ? 'materials ready' : 'missing ingredients or tool'}`, onChoose: () => choose(id)});
  });

  const detail = keyedList(h('div', {class: 'q-station__detail'}), computed(() => (selected.value ? [selected.value] : [])), id => id, item => {
    const id = item.peek(), recipe = recipes[id];
    const ready = computed(() => canMake(inventory, recipe));
    return h('section', {class: 'q-recipe-detail', 'aria-label': recipe.name},
      recipeDetailBody({id, recipe, items, inventory, time: () => `Time · ${Number(duration(recipe.duration, recipe).toFixed(1))} seconds`, onBack: () => { viewing.value = false; }, atStation: kind}),
      h('div', {class: 'q-recipe-detail__actions'},
        h('p', {class: 'q-page__status', role: 'status', hidden: () => !status.value}, status),
        h('button', {type: 'button', class: 'q-button', disabled: () => !station || !ready.value, on: {click: () => make(id)}}, info.verb)));
  });

  return h('div', {class: 'q-station', 'data-view': () => (viewing.value && selected.value ? 'detail' : 'list')},
    catalogue.length >= SEARCH_FROM ? h('label', {class: 'q-field q-station__search'},
      h('span', {class: 'q-label'}, 'Find a recipe'),
      h('input', {type: 'search', class: 'q-input', placeholder: 'Search recipes…', on: {input: event => { query.value = event.target.value; }}})) : null,
    h('div', {class: 'q-station__browser'},
      h('div', {class: 'q-station__recipes'},
        list,
        h('p', {class: 'q-page__help', hidden: () => shown.value.length > 0}, catalogue.length ? 'No matching recipes.' : 'No recipes at this station yet.')),
      detail),
    h('footer', {class: 'q-station__footer'},
      station?.pack ? h('button', {type: 'button', class: 'q-button q-button--quiet', on: {click: () => { close('packed'); station.pack(); }}}, 'Pack up campfire') : null));
}
