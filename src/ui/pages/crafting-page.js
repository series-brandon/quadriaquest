import {computed, signal} from '../../reactive.js';
import {h} from '../dom.js';
import {iconNode} from '../icon.js';
import {keyedList} from '../list.js';
import {recipeTile, recipeDetailBody, STATION_LABEL} from '../recipe-view.js';
import {RECIPES, canMake, durationFor} from '../../recipes.js';
import {ITEMS} from '../../items.js';

const STATION_NAME = {furnace: 'a furnace', anvil: 'an anvil', fire: 'a campfire'};
const REFUSED = 'Check the required materials and finish your current action first.';

// Crafting page: a searchable grid of recipes (hand-made first, station recipes after) and the
// chosen recipe's detail: time, Ingredients, Tools, Station, what it Makes, and the craft button.
// Materials follow the reactive inventory, times follow the reactive skill records, and the recipe
// in progress follows the crafting system. Filters hide station recipes or the ones you can't make
// yet. Recipes keep stable element ids (choose-<id>, <id>-detail, <id>-duration, craft-<id>)
// because tutorials guide them; every detail exists and only the chosen one shows.
//   selected   signal: the chosen recipe (owned by the host so tutorials can choose)
//   viewing    signal: narrow journals show the detail instead of the grid
//   start(id)  shared crafting; false when refused. onStarted() runs after a start.
export function craftingPage({inventory, skills = () => ({}), active = () => null, start, onStarted = () => {}, selected = signal(Object.keys(RECIPES)[0]), viewing = signal(false), onSelect = id => { selected.value = id; viewing.value = true; }}) {
  const status = signal(''), query = signal(''), showStations = signal(true), showMissing = signal(true);
  const all = Object.keys(RECIPES);
  const ids = [...all.filter(id => !RECIPES[id].station), ...all.filter(id => RECIPES[id].station)];
  const readiness = Object.fromEntries(ids.map(id => [id, computed(() => canMake(inventory, RECIPES[id]))]));
  const shown = computed(() => {
    const text = query.value.trim().toLowerCase();
    return ids.filter(id => (showStations.value || !RECIPES[id].station)
      && (showMissing.value || readiness[id].value)
      && (!text || RECIPES[id].name.toLowerCase().includes(text)));
  });
  let detailArea;

  const choose = id => {
    status.value = '';
    onSelect(id);
    detailArea.scrollIntoView?.({block: 'nearest'});
  };
  const craft = id => {
    if (start(id)) {
      status.value = '';
      onStarted(id);
    } else status.value = REFUSED;
  };

  const tile = item => {
    const id = item.peek(), recipe = RECIPES[id];
    return recipeTile({id, recipe, attrs: {id: `choose-${id}`},
      pressed: () => selected.value === id,
      ready: () => readiness[id].value,
      tag: () => (active() === id ? 'Crafting…' : recipe.station ? STATION_LABEL[recipe.station] ?? recipe.station : ''),
      label: () => `${recipe.name}, ${active() === id ? 'crafting' : recipe.station ? `made at ${STATION_NAME[recipe.station] ?? recipe.station}` : readiness[id].value ? 'materials ready' : 'missing materials'}`,
      onChoose: () => choose(id)});
  };

  const detail = id => {
    const recipe = RECIPES[id];
    const seconds = computed(() => {
      const levels = skills();
      return Number(durationFor(recipe.duration, levels[recipe.skill]?.level || levels.Crafting?.level || 1).toFixed(2));
    });
    return h('article', {class: 'q-recipe-detail', id: `${id}-detail`, 'aria-label': recipe.name, hidden: () => selected.value !== id},
      recipeDetailBody({id, recipe, items: ITEMS, inventory, time: () => `Time · ${seconds.value} seconds`, timeId: `${id}-duration`, onBack: () => { viewing.value = false; }}),
      h('div', {class: 'q-recipe-detail__actions'},
        h('p', {class: 'q-page__status', role: 'status', hidden: () => !status.value || selected.value !== id}, status),
        h('button', {
          type: 'button',
          class: 'q-button',
          id: `craft-${id}`,
          disabled: () => !!recipe.station || !readiness[id].value || active() === id,
          on: {click: () => craft(id)},
        }, () => (active() === id ? 'Crafting…' : recipe.station ? `Make at ${STATION_NAME[recipe.station] ?? recipe.station}` : `Craft ${recipe.name}`))));
  };

  const filter = (label, value) => h('button', {type: 'button', class: 'q-chip-button q-filter', 'aria-pressed': value, on: {click: () => { value.value = !value.peek(); }}},
    iconNode('check'), h('span', null, label));

  return h('div', {class: 'q-page q-crafting-page', 'data-view': () => (viewing.value ? 'detail' : 'list')},
    h('div', {class: 'q-crafting__body'},
      h('div', {class: 'q-crafting__list'},
        h('input', {type: 'search', class: 'q-input q-crafting__search', placeholder: 'Search recipes…', 'aria-label': 'Search recipes', value: query, on: {input: event => { query.value = event.target.value; }}}),
        h('div', {class: 'q-filters', role: 'group', 'aria-label': 'Show recipes'},
          h('span', {class: 'q-label'}, 'Show'),
          filter('Station recipes', showStations),
          filter('Missing ingredients', showMissing)),
        keyedList(h('div', {class: 'q-items', role: 'list', 'aria-label': 'Recipes'}), shown, id => id, tile),
        h('p', {class: 'q-page__help', hidden: () => shown.value.length > 0}, 'No recipes match. Clear the search or show more recipes.')),
      h('div', {class: 'q-crafting__detail', ref: element => { detailArea = element; }}, ids.map(detail))));
}
