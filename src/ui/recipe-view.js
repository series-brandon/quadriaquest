import {h} from './dom.js';
import {iconNode} from './icon.js';

// Shared recipe UI for the Crafting page and the station dialogs (campfire, furnace, anvil), so
// both browse and read recipes the same way. Owned counts follow the reactive inventory.
export const STATION_LABEL = {furnace: 'Furnace', anvil: 'Anvil', fire: 'Campfire'};

// One recipe in a grid of the inventory's tiles (.q-items): icon, name and a small tag (its station,
// or "Crafting…"), dimmed while ingredients or tools are missing.
//   recipeTile({id, recipe, pressed, ready, tag, label, attrs, onChoose})
//   pressed, ready, tag, label: functions (bindings); attrs: extra attributes such as a stable id.
export function recipeTile({id, recipe, pressed, ready, tag = () => '', label = () => recipe.name, attrs = {}, onChoose}) {
  return h('button', {
    type: 'button',
    class: 'q-item q-recipe-tile',
    'aria-pressed': pressed,
    'aria-label': label,
    'data-missing': () => !ready(),
    ...attrs,
    on: {click: onChoose},
  },
  h('span', {class: 'q-item__icon', 'aria-hidden': 'true'}, iconNode(id)),
  h('span', {class: 'q-item__name'}, recipe.name),
  h('small', {class: 'q-recipe-tile__tag', hidden: () => !tag(), 'aria-hidden': 'true'}, tag));
}

// The body of a recipe's detail: a back button (narrow layouts), the head (icon, name, time), the
// description, then its parts: Ingredients (used up), Tools (kept), Station and Makes. A station
// recipe's Station row is checked when you're at that station (`atStation`, its kind), crossed otherwise.
//   recipeDetailBody({id, recipe, items, inventory, time, timeId, onBack, backLabel, atStation})
//   time: a function giving the time line; timeId: a stable id for it (tutorials, tests).
export function recipeDetailBody({id, recipe, items, inventory, time, timeId = null, onBack, backLabel = 'All recipes', atStation = null}) {
  const name = item => items[item]?.name ?? item;
  const need = (item, count) => {
    const owned = () => inventory[item] || 0;
    return h('li', {'data-missing': () => owned() < count},
      h('span', {class: 'q-recipe-part__item'}, iconNode(item), h('span', null, name(item))),
      h('strong', {'aria-label': () => `${owned()} owned, ${count} required`}, () => `${owned()} / ${count}`));
  };
  const plain = (text, icon = null) => h('li', null, h('span', {class: 'q-recipe-part__item'}, icon ? iconNode(icon) : null, h('span', null, text)));
  const part = (title, rows) => h('section', {class: 'q-recipe-part', 'aria-label': title}, h('h4', {class: 'q-label'}, title), h('ul', {class: 'q-ingredients'}, rows));
  const tools = Object.entries(recipe.tools ?? {});
  const station = () => {
    if (!recipe.station) return plain('None: craft anywhere');
    const label = STATION_LABEL[recipe.station] ?? recipe.station, here = atStation === recipe.station;
    return h('li', {'data-missing': !here},
      h('span', {class: 'q-recipe-part__item'}, h('span', null, label)),
      h('strong', {'aria-label': here ? `At the ${label.toLowerCase()}` : `Needs ${/^[aeiou]/i.test(label) ? 'an' : 'a'} ${label.toLowerCase()}`}, iconNode(here ? 'check' : 'close')));
  };
  return h('div', {class: 'q-recipe-detail__body'},
    h('button', {type: 'button', class: 'q-back q-recipe-detail__back', on: {click: onBack}}, iconNode('back'), h('span', null, backLabel)),
    h('div', {class: 'q-item-detail__head'},
      h('span', {class: 'q-item-detail__icon', 'aria-hidden': 'true'}, iconNode(id)),
      h('span', {class: 'q-item-detail__title'},
        h('h3', null, recipe.name),
        h('small', {id: timeId}, time))),
    items[id]?.description ? h('p', {class: 'q-item-detail__copy'}, items[id].description) : null,
    part('Ingredients', Object.entries(recipe.cost).map(([item, count]) => need(item, count))),
    part('Tools', tools.length ? tools.map(([item, count]) => need(item, count)) : [plain('None needed')]),
    part('Station', [station()]),
    part('Makes', [plain(`${recipe.name} ×${recipe.makes ?? 1}`, id)]));
}
