import {computed} from '../reactive.js';
import {h} from './dom.js';
import {formatGold} from '../economy.js';
import {itemStats, itemRequirements, itemUses, itemPrice} from '../item-facts.js';

// An item's facts in an item detail (Inventory, shops, Crafting): titled parts of label/value rows for
// Stats, Requires, Use and, with `quantity`, Value. The numbers come from the shared item facts
// (item-facts.js). Options:
//   quantity()     → how many you hold; adds the Value part (quantity, shop value, sale price).
//   levelOf(track) → your level in a track; requirement rows then show yours and whether it is met.
//   track()        reads the revisions levelOf depends on.
// Parts with nothing to show are left out.
export function itemInfo(id, {quantity = null, levelOf = null, track = () => {}} = {}) {
  const part = (name, rows, extra = null) => h('section', {class: 'q-item-info__part', 'aria-label': name},
    h('h4', {class: 'q-label'}, name),
    h('dl', {class: 'q-facts'}, rows.map(row => h('div', {class: 'q-facts__row', 'data-missing': row.missing ?? false},
      h('dt', null, row.label),
      h('dd', null, row.value)))),
    extra);

  const stats = itemStats(id), uses = itemUses(id), price = itemPrice(id);
  const needs = computed(() => (track(), itemRequirements(id, levelOf)));
  const requires = needs.peek().rows.map((row, index) => {
    const now = () => needs.value.rows[index];
    return {
      label: row.label,
      value: () => (now().have == null ? `Level ${row.level}` : `Level ${row.level} · you ${now().have}`),
      missing: () => now().met === false,
    };
  });
  const weaker = () => needs.value.effectiveness < 1;
  const sale = () => {
    if (!price.sellable) return 'Can’t be sold';
    const n = quantity(), each = formatGold(price.each);
    return n > 1 ? `${each} each · ${formatGold(price.each * n)} for all` : each;
  };

  return h('div', {class: 'q-item-info'},
    stats.length ? part('Stats', stats) : null,
    requires.length ? part('Requires', requires,
      h('p', {class: 'q-item-info__note', hidden: () => !weaker()}, () => `Bonuses work at ${Math.round(needs.value.effectiveness * 100)}% until you meet these.`)) : null,
    uses.length ? part('Use', uses) : null,
    quantity ? part('Value', [
      {label: 'Quantity', value: () => String(quantity())},
      ...(price.value ? [{label: 'Shop value', value: `${formatGold(price.value)} each`}] : []),
      {label: 'Sells for', value: sale},
    ]) : null);
}
