import {computed, signal} from '../../reactive.js';
import {h} from '../dom.js';
import {iconNode} from '../icon.js';
import {keyedList} from '../list.js';

export const STATIONS = {
  fire: {title: 'Cooking', noun: 'campfire', article: 'a', verb: 'Cook one', footer: 'Cook a meal, one at a time.'},
  furnace: {title: 'Furnace · Smelting', noun: 'furnace', article: 'a', verb: 'Make one', footer: '20 Smithing XP per completed item. Tools are reusable.'},
  anvil: {title: 'Anvil · Smithing', noun: 'anvil', article: 'an', verb: 'Make one', footer: '20 Smithing XP per completed item. Tools are reusable.'},
};
// Long recipe lists get a search field.
const SEARCH_FROM = 6;

// Station recipe browser (campfire, furnace, anvil) for the modal host: recipes on the left,
// the chosen recipe's ingredients and its make button on the right (one at a time on phones).
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
      status.value = station ? `The ${info.noun} is out of reach. Close and approach it again.` : `Interact with ${info.article} ${info.noun} to use this recipe.`;
      return;
    }
    if (!canMake(inventory, recipes[id])) return;
    close('made');
    onMake(id, station);
  };

  const list = keyedList(h('div', {class: 'q-station__list', role: 'list', 'aria-label': `${info.title} recipes`}), shown, id => id, item => {
    const id = item.peek(), recipe = recipes[id];
    return h('button', {type: 'button', class: 'q-recipe', 'aria-pressed': () => selected.value === id, on: {click: () => choose(id)}},
      h('span', {class: 'q-recipe__icon', 'aria-hidden': 'true'}, iconNode(id)),
      h('span', {class: 'q-recipe__text'},
        h('strong', null, recipe.name),
        h('small', null, () => (canMake(inventory, recipe) ? 'Materials ready' : 'Missing ingredients or tool'))));
  });

  const detail = keyedList(h('div', {class: 'q-station__detail'}), computed(() => (selected.value ? [selected.value] : [])), id => id, item => {
    const id = item.peek(), recipe = recipes[id];
    const ready = computed(() => canMake(inventory, recipe));
    return h('section', {class: 'q-recipe-detail', 'aria-label': recipe.name},
      h('div', {class: 'q-recipe-detail__body'},
        h('button', {type: 'button', class: 'q-station__back', on: {click: () => { viewing.value = false; }}}, 'Back to recipes'),
        h('span', {class: 'q-recipe-detail__hero', 'aria-hidden': 'true'}, iconNode(id)),
        h('h3', null, recipe.name),
        h('p', {class: 'q-page__help'}, `${Number(duration(recipe.duration, recipe).toFixed(1))} sec · Makes 1`),
        items[id]?.description ? h('p', null, items[id].description) : null,
        h('span', {class: 'q-label'}, 'Ingredients'),
        h('ul', {class: 'q-ingredients'}, Object.entries({...recipe.cost, ...recipe.tools}).map(([need, count]) => {
          const owned = () => inventory[need] || 0;
          return h('li', {'data-missing': () => owned() < count},
            h('span', null, `${label(need)}${recipe.tools?.[need] ? ' (reusable)' : ''}`),
            h('strong', {'aria-label': () => `${owned()} owned, ${count} required`}, () => `${owned()} / ${count}`));
        }))),
      h('div', {class: 'q-recipe-detail__actions'},
        h('p', {class: 'q-page__status', role: 'status', hidden: () => !status.value}, status),
        h('button', {type: 'button', class: 'q-button', disabled: () => !station || !ready.value, on: {click: () => make(id)}}, info.verb),
        h('small', {class: 'q-page__help'}, () => (!station ? `Interact with ${info.article} ${info.noun} to use this recipe.` : ready.value ? 'Uses the ingredients shown above.' : 'Gather the missing ingredients and reusable tools.'))));
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
      station?.pack ? h('button', {type: 'button', class: 'q-button q-button--quiet', on: {click: () => { close('packed'); station.pack(); }}}, 'Pack up campfire') : null,
      h('small', {class: 'q-page__help'}, info.footer)));
}
