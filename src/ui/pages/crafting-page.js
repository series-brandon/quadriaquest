import {computed, signal} from '../../reactive.js';
import {h} from '../dom.js';
import {iconNode} from '../icon.js';
import {RECIPES, canMake, durationFor} from '../../recipes.js';
import {ITEMS} from '../../items.js';

const STATION_NAME = {furnace: 'a furnace', anvil: 'an anvil', fire: 'a campfire'};
const REFUSED = 'Check the required materials and finish your current action first.';

// Crafting page: every recipe, hand-made first and station recipes after, with the chosen
// recipe's ingredients, time and craft button. Materials follow the reactive inventory, times
// follow the reactive skill records, and the recipe in progress follows the crafting system.
// Recipes keep stable element ids (choose-<id>, <id>-detail, <id>-duration, craft-<id>) because
// tutorials guide them; every detail exists and only the chosen one shows.
//   selected   signal: the chosen recipe (owned by the host so tutorials can choose)
//   viewing    signal: phones show the detail instead of the list
//   start(id)  shared crafting; false when refused. onStarted() runs after a start.
export function craftingPage({inventory, skills = () => ({}), active = () => null, start, onStarted = () => {}, selected = signal(Object.keys(RECIPES)[0]), viewing = signal(false), onSelect = id => { selected.value = id; viewing.value = true; }}) {
  const status = signal('');
  const ids = Object.keys(RECIPES);
  const hand = ids.filter(id => !RECIPES[id].station), stations = ids.filter(id => RECIPES[id].station);
  const ready = id => computed(() => canMake(inventory, RECIPES[id]));
  const readiness = Object.fromEntries(ids.map(id => [id, ready(id)]));
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

  const chooser = id => {
    const recipe = RECIPES[id];
    return h('button', {
      type: 'button',
      class: 'q-recipe',
      id: `choose-${id}`,
      'aria-pressed': () => selected.value === id,
      on: {click: () => choose(id)},
    },
    h('span', {class: 'q-recipe__icon', 'aria-hidden': 'true'}, iconNode(id)),
    h('span', {class: 'q-recipe__text'},
      h('strong', null, recipe.name),
      h('small', null, () => (active() === id ? 'Crafting…' : recipe.station ? `Made at ${STATION_NAME[recipe.station] ?? recipe.station}` : readiness[id].value ? 'Materials ready' : 'Missing materials'))));
  };

  const detail = id => {
    const recipe = RECIPES[id];
    const seconds = computed(() => {
      const all = skills();
      return Number(durationFor(recipe.duration, all[recipe.skill]?.level || all.Crafting?.level || 1).toFixed(2));
    });
    return h('article', {class: 'q-recipe-detail', id: `${id}-detail`, 'aria-label': recipe.name, hidden: () => selected.value !== id},
      h('div', {class: 'q-recipe-detail__body'},
        h('button', {type: 'button', class: 'q-back q-crafting__back', on: {click: () => { viewing.value = false; }}}, iconNode('back'), h('span', null, 'All recipes')),
        h('span', {class: 'q-recipe-detail__hero', 'aria-hidden': 'true'}, iconNode(id)),
        h('h3', null, recipe.name),
        h('p', {class: 'q-page__help', id: `${id}-duration`}, () => `Time · ${seconds.value} seconds`),
        ITEMS[id]?.description ? h('p', null, ITEMS[id].description) : null,
        h('span', {class: 'q-label'}, 'Ingredients'),
        h('ul', {class: 'q-ingredients'}, Object.entries({...recipe.cost, ...recipe.tools}).map(([need, count]) => {
          const owned = () => inventory[need] || 0;
          return h('li', {'data-missing': () => owned() < count},
            h('span', null, `${ITEMS[need]?.name ?? need}${recipe.tools?.[need] ? ' (reusable)' : ''}`),
            h('strong', {'aria-label': () => `${owned()} owned, ${count} required`}, () => `${owned()} / ${count}`));
        }))),
      h('div', {class: 'q-recipe-detail__actions'},
        h('p', {class: 'q-page__status', role: 'status', hidden: () => !status.value || selected.value !== id}, status),
        h('button', {
          type: 'button',
          class: 'q-button',
          id: `craft-${id}`,
          disabled: () => !!recipe.station || !readiness[id].value || active() === id,
          on: {click: () => craft(id)},
        }, () => (active() === id ? 'Crafting…' : recipe.station ? `Make at ${STATION_NAME[recipe.station] ?? recipe.station}` : `Craft ${recipe.name}`)),
        h('small', {class: 'q-page__help'}, () => (recipe.station ? 'Use the station’s menu to make this.' : readiness[id].value ? 'Makes 1. Uses the ingredients shown above.' : 'Gather the missing ingredients and reusable tools.'))));
  };

  return h('div', {class: 'q-page q-crafting-page', 'data-view': () => (viewing.value ? 'detail' : 'list')},
    h('div', {class: 'q-crafting__body'},
      h('div', {class: 'q-crafting__list'},
        h('div', {class: 'q-list', role: 'group', 'aria-label': 'Hand crafting'}, hand.map(chooser)),
        stations.length ? h('span', {class: 'q-label'}, 'At stations') : null,
        h('div', {class: 'q-list', role: 'group', 'aria-label': 'Station recipes'}, stations.map(chooser))),
      h('div', {class: 'q-crafting__detail', ref: element => { detailArea = element; }}, ids.map(detail))));
}
