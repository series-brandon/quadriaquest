import {signal, untracked} from '../../reactive.js';
import {h} from '../dom.js';
import {bind, onCleanup} from '../scope.js';
import {keyedList} from '../list.js';
import {iconNode} from '../icon.js';
import {ITEMS} from '../../items.js';

// Brief HUD notices: the message toast, the quest-progress pop-up, the item feed and level-up
// receipts. Each shows when something happens, fades, and takes no space while idle. They must be
// built inside a view scope (mount); their timers end with the view. Ids stay for the shared HUD
// layout rules that position them.

// Fade-out lengths match notices.css.
const TOAST_FADE = 200, OBJECTIVE_FADE = 650, RECEIPT_FADE = 350;

// One short message ("Pack up your existing Campfire first."). show(text) replaces the current one.
export function messageToast({duration = 2600} = {}) {
  const text = signal(''), shown = signal(false);
  let hide = null, clear = null;
  onCleanup(() => { clearTimeout(hide); clearTimeout(clear); });
  const node = h('p', {id: 'toast', class: 'q-toast', role: 'status', 'aria-live': 'polite', hidden: () => !text.value, 'data-shown': shown}, text);
  return {
    node,
    show(message) {
      clearTimeout(hide);
      clearTimeout(clear);
      text.value = message;
      shown.value = true;
      hide = setTimeout(() => {
        shown.value = false;
        clear = setTimeout(() => { text.value = ''; }, TOAST_FADE);
      }, duration);
    },
  };
}

// Quest progress ("Collect ground items · 3/6") from quests.js's `notice` signal:
// {seq, title, current, total} for each real change, or null to dismiss.
export function objectiveToast({notice, duration = 4500}) {
  const goal = signal(null), shown = signal(false);
  let hide = null, clear = null;
  const stop = () => { clearTimeout(hide); clearTimeout(clear); };
  onCleanup(stop);
  bind(() => {
    const next = notice.value;
    untracked(() => {
      stop();
      if (!next) { shown.value = false; goal.value = null; return; }
      goal.value = next;
      shown.value = true;
      hide = setTimeout(() => {
        shown.value = false;
        clear = setTimeout(() => { goal.value = null; }, OBJECTIVE_FADE);
      }, duration);
    });
  });
  const done = () => !!goal.value && goal.value.current >= goal.value.total;
  return h('aside', {id: 'objective-update', class: 'q-objective', role: 'status', hidden: () => !goal.value, 'data-shown': shown, 'data-complete': done},
    h('strong', null, () => (goal.value ? `${done() ? '✓ ' : ''}${goal.value.title} · ${goal.value.current}/${goal.value.total}` : '')),
    h('span', {class: 'q-objective__track', 'aria-hidden': 'true'},
      h('span', {class: 'q-objective__fill', style: {transform: () => `scaleX(${goal.value ? goal.value.current / goal.value.total : 0})`}})));
}

// Item changes as receipts: gains, losses, or "Crafted X" with what it used. Repeated single-item
// changes (picking up more sticks) merge into their receipt; at most four show.
export function itemFeed({duration = 3800, limit = 4} = {}) {
  const entries = signal([]);
  let serial = 0;
  const timers = new Map();
  onCleanup(() => { for (const timer of timers.values()) clearTimeout(timer); });
  const name = id => ITEMS[id]?.name || id;
  const remove = key => {
    clearTimeout(timers.get(key));
    timers.delete(key);
    entries.value = entries.peek().filter(entry => entry.key !== key);
  };
  const schedule = key => {
    clearTimeout(timers.get(key));
    timers.set(key, setTimeout(() => {
      entries.value = entries.peek().map(entry => (entry.key === key ? {...entry, leaving: true} : entry));
      timers.set(key, setTimeout(() => remove(key), RECEIPT_FADE));
    }, duration));
  };

  function show(changes) {
    const values = Object.entries(changes).filter(([, n]) => n);
    if (!values.length) return;
    const crafted = values.some(([, n]) => n < 0) && values.some(([, n]) => n > 0);
    const merge = !crafted && values.length === 1 ? values[0][0] + Math.sign(values[0][1]) : null;
    const current = entries.peek();
    const existing = merge && current.find(entry => entry.merge === merge);
    let key;
    if (existing) {
      key = existing.key;
      const total = {...existing.changes};
      for (const [id, n] of values) total[id] = (total[id] || 0) + n;
      entries.value = current.map(entry => (entry.key === key ? {...entry, changes: total, leaving: false} : entry));
    } else {
      key = `receipt-${++serial}`;
      let next = [...current, {key, merge, crafted, changes: {...changes}, leaving: false}];
      while (next.length > limit) { const [old, ...rest] = next; clearTimeout(timers.get(old.key)); timers.delete(old.key); next = rest; }
      entries.value = next;
    }
    schedule(key);
  }
  function clear() {
    for (const timer of timers.values()) clearTimeout(timer);
    timers.clear();
    entries.value = [];
  }

  const node = keyedList(h('aside', {id: 'item-feed', class: 'q-feed', role: 'status', 'aria-label': 'Item changes'}), entries, entry => entry.key, item => {
    const lines = () => {
      const {changes, crafted} = item.value;
      const gains = Object.entries(changes).filter(([, n]) => n > 0), costs = Object.entries(changes).filter(([, n]) => n < 0);
      return [...gains, ...(crafted ? [] : costs)].map(([id, n]) => ({id, n, label: `${crafted ? 'Crafted ' : n > 0 ? '+' : '−'}${name(id)} ×${Math.abs(n)}`}));
    };
    return h('div', {class: 'q-receipt', 'data-leaving': () => item.value.leaving},
      keyedList(h('div', {class: 'q-receipt__lines'}), lines, line => line.id, line => h('div', {class: 'q-receipt__line', 'data-gain': () => line.value.n > 0},
        h('span', {class: 'q-receipt__icon', 'aria-hidden': 'true'}, iconNode(line.peek().id)),
        h('strong', null, () => line.value.label))),
      h('small', {hidden: () => !item.value.crafted}, () => {
        const costs = Object.entries(item.value.changes).filter(([, n]) => n < 0);
        return item.value.crafted ? `Used ${costs.map(([id, n]) => `${name(id)} ×${-n}`).join(' · ')}` : '';
      }));
  });
  return {node, show, clear};
}

// Level-up receipts from skills.js's `levelNotice` signal ({seq, title, detail}); several can
// show at once, each for `duration` ms.
export function levelUps({notice, duration = 5000}) {
  const items = signal([]);
  const timers = new Set();
  onCleanup(() => { for (const timer of timers) clearTimeout(timer); });
  bind(() => {
    const next = notice.value;
    if (!next) return;
    untracked(() => {
      if (next.clear) { for (const timer of timers) clearTimeout(timer); timers.clear(); items.value = []; return; }
      items.value = [...items.peek(), next];
      const timer = setTimeout(() => { timers.delete(timer); items.value = items.peek().filter(item => item !== next); }, duration);
      timers.add(timer);
    });
  });
  return keyedList(h('div', {id: 'skill-rewards', class: 'q-levels', role: 'status', 'aria-live': 'polite'}), items, item => item.seq,
    item => h('div', {class: 'q-level'}, h('strong', null, item.peek().title), h('span', null, item.peek().detail)));
}
