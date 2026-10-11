import {computed, signal, untracked} from '../../reactive.js';
import {bind} from '../scope.js';
import {h} from '../dom.js';
import {iconNode} from '../icon.js';
import {keyedList} from '../list.js';
import {segmented} from '../controls.js';
import {formatGold, GOLD, NEEDED_TOOLS} from '../../economy.js';

// The shared shop screen (docs/ECONOMY.md) for the modal host: Buy and Sell, the goods on the left
// and the chosen item's detail on the right (one at a time on phones), with quantity buttons
// (1 / 5 / All / a typed amount). Everything comes from the shop system (shops.js): prices, stock,
// what it buys and why not; the inventory is reactive and `shops.revision` follows stock. Trading calls
// the system; `onTrade(changes)` lets the host show the item notice. Selling your last needed tool asks
// first through `confirm({message, onConfirm})`.
export function shopDialog({shopId, shops, items, inventory, wallet, greeting = null, confirm, onTrade = () => {}}) {
  const shop = shops.shops[shopId];
  const mode = signal('buy');
  const chosen = signal(null);
  const viewing = signal(false);
  const amount = signal(1);
  const status = signal('');
  const name = id => items[id]?.name || id;

  const goods = computed(() => {
    shops.revision.value;
    if (mode.value === 'buy') return shop.stock.map(e => e.item);
    return Object.keys(items).filter(id => id !== GOLD && inventory[id] > 0);
  });
  const selected = computed(() => (goods.value.includes(chosen.value) ? chosen.value : goods.value[0] ?? null));
  const max = id => (mode.value === 'buy' ? shops.maxBuy(shopId, id) : shops.maxSell(shopId, id));
  // Why this item can't be traded right now ('' when it can).
  const reason = id => {
    shops.revision.value;
    if (mode.value === 'sell') return shops.sellBlock(shopId, id) || '';
    const left = shops.left(shopId, id);
    if (!left) return 'Sold out';
    return wallet.gold < shops.buyPrice(id) ? 'Not enough gold' : '';
  };
  const price = id => (mode.value === 'buy' ? shops.buyPrice(id) : shops.sellPrice(id));
  const choose = id => { chosen.value = id; viewing.value = true; status.value = ''; };
  // A new item or mode starts at one; the amount never exceeds what you can trade.
  bind(() => { selected.value; mode.value; untracked(() => { amount.value = 1; status.value = ''; }); });

  function trade(id) {
    const n = Math.min(amount.value, max(id));
    if (!(n > 0)) return;
    const done = () => {
      const result = mode.value === 'buy' ? shops.buy(shopId, id, n) : shops.sell(shopId, id, n);
      status.value = result.ok ? `${mode.value === 'buy' ? 'Bought' : 'Sold'} ${name(id)} ×${n}.` : result.reason;
      if (result.ok) { amount.value = 1; onTrade(result.changes); }
    };
    if (mode.value === 'sell' && shops.needsConfirm(id, n)) {
      confirm({message: `Sell your only ${name(id)}? You need it to ${NEEDED_TOOLS[id]}.`, onConfirm: done});
    } else done();
  }

  const list = keyedList(h('div', {class: 'q-items q-shop__list', role: 'list', 'aria-label': () => (mode.value === 'buy' ? `${shop.name} stock` : 'Your items')}), goods, id => `${id}`, item => {
    const id = item.peek(), why = computed(() => reason(id));
    const note = () => {
      shops.revision.value;
      if (mode.value === 'sell') return why.value || `×${shops.spare(id)}`;
      const left = shops.left(shopId, id);
      return left === Infinity ? `You have ${inventory[id] || 0}` : left ? `${left} left` : 'Sold out';
    };
    return h('button', {
      type: 'button', class: 'q-item q-shop__good', 'data-item': id, 'data-blocked': () => !!why.value,
      'aria-pressed': () => selected.value === id,
      'aria-label': () => `${name(id)}, ${formatGold(price(id))}${why.value ? `, ${why.value}` : ''}`,
      on: {click: () => choose(id)},
    },
    h('span', {class: 'q-item__icon', 'aria-hidden': 'true'}, iconNode(id)),
    h('span', {class: 'q-item__name'}, name(id)),
    h('b', {class: 'q-shop__price', 'aria-hidden': 'true'}, () => formatGold(price(id))),
    h('small', {class: 'q-shop__note', 'aria-hidden': 'true'}, note));
  });

  const detail = keyedList(h('div', {class: 'q-shop__detail'}), computed(() => (selected.value ? [`${mode.value}:${selected.value}`] : [])), key => key, item => {
    const id = item.peek().split(':')[1];
    const most = computed(() => (inventory[id], inventory[GOLD], max(id)));
    const n = computed(() => Math.max(1, Math.min(amount.value, most.value || 1)));
    const verb = () => (mode.value === 'buy' ? 'Buy' : 'Sell');
    return h('section', {class: 'q-item-detail q-shop__item', 'aria-label': name(id)},
      h('button', {type: 'button', class: 'q-back q-shop__back', on: {click: () => { viewing.value = false; }}}, iconNode('back'), h('span', null, mode.value === 'buy' ? 'All goods' : 'All items')),
      h('div', {class: 'q-item-detail__head'},
        h('span', {class: 'q-item-detail__icon', 'aria-hidden': 'true'}, iconNode(id)),
        h('div', {class: 'q-item-detail__title'}, h('h3', null, name(id)),
          h('small', null, () => `${verb()} ${formatGold(price(id))} each · you have ${inventory[id] || 0}`))),
      h('p', {class: 'q-item-detail__copy'}, items[id]?.description || ''),
      h('div', {class: 'q-shop__amount', role: 'group', 'aria-label': 'Quantity'},
        ...[1, 5].map(k => h('button', {type: 'button', class: 'q-button q-button--small q-button--quiet', 'aria-pressed': () => n.value === k && most.value >= k, disabled: () => most.value < k, on: {click: () => { amount.value = k; }}}, String(k))),
        h('button', {type: 'button', class: 'q-button q-button--small q-button--quiet', 'aria-pressed': () => most.value > 0 && n.value === most.value, disabled: () => most.value < 1, on: {click: () => { amount.value = most.value; }}}, 'All'),
        h('label', {class: 'q-shop__typed'}, h('span', {class: 'q-label'}, 'Amount'),
          h('input', {type: 'number', class: 'q-input', min: '1', step: '1', inputmode: 'numeric', value: () => String(n.value),
            on: {change: event => { const v = Math.floor(Number(event.target.value)); amount.value = v > 0 ? v : 1; }}}))),
      h('div', {class: 'q-item-detail__actions'},
        h('p', {class: 'q-page__status', role: 'status', hidden: () => !status.value && !reason(id)}, () => status.value || reason(id)),
        h('button', {type: 'button', class: 'q-button', disabled: () => !most.value, on: {click: () => trade(id)}},
          () => `${verb()} ${n.value} for ${formatGold(price(id) * n.value)}`)));
  });

  return h('div', {class: 'q-shop', 'data-view': () => (viewing.value && selected.value ? 'detail' : 'list')},
    h('div', {class: 'q-shop__bar'},
      h('p', {class: 'q-shop__greeting'}, greeting || shop.greeting || ''),
      h('strong', {class: 'q-shop__gold', 'aria-label': () => `Your gold: ${formatGold(wallet.gold)}`}, iconNode('gold'), h('span', {'aria-hidden': 'true'}, () => formatGold(wallet.gold)))),
    h('div', {class: 'q-shop__modes'}, segmented({label: 'Buy or sell', value: mode, options: [{value: 'buy', label: 'Buy'}, {value: 'sell', label: 'Sell'}], onChange: value => { mode.value = value; viewing.value = false; }})),
    h('div', {class: 'q-shop__browser'},
      h('div', {class: 'q-shop__goods'},
        list,
        h('p', {class: 'q-page__help', hidden: () => goods.value.length > 0}, () => (mode.value === 'buy' ? 'Nothing for sale right now.' : 'You have nothing to sell.'))),
      detail));
}
