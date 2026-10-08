import {computed, signal, Signal, untracked} from '../reactive.js';
import {bind, createScope, onCleanup, runInScope} from './scope.js';

// Renders a reactive array into `container`, which the list owns entirely.
// Rows are keyed: an existing row keeps its node, focus and scope, and receives new data
// through its item signal; only added rows are built and only removed rows are disposed.
// Items are compared by identity, so publish new item objects (snapshots) when data changes.
//
//   keyedList(h('ul'), () => effects.value, effect => effect.id, item => h('li', null, () => item.value.label))
export function keyedList(container, items, key, render) {
  const source = items instanceof Signal ? items : computed(items);
  const rows = new Map();

  bind(() => {
    const next = source.value;
    // Row construction and updates must not subscribe this binding to the rows' own reads.
    untracked(() => {
      const order = [];
      const seen = new Set();
      for (const value of next) {
        const id = key(value);
        if (seen.has(id)) throw new Error(`keyedList: duplicate key ${String(id)}`);
        seen.add(id);
        let row = rows.get(id);
        if (row) {
          row.item.value = value;
        } else {
          const item = signal(value);
          const scope = createScope();
          row = {item, scope, node: runInScope(scope, () => render(item, id))};
          rows.set(id, row);
        }
        order.push(row);
      }
      for (const [id, row] of rows) {
        if (seen.has(id)) continue;
        row.scope.dispose();
        row.node.remove();
        rows.delete(id);
      }
      // Move only rows that are out of place.
      let cursor = container.firstChild;
      for (const row of order) {
        if (row.node === cursor) cursor = cursor.nextSibling;
        else container.insertBefore(row.node, cursor);
      }
    });
  });

  onCleanup(() => {
    for (const row of rows.values()) row.scope.dispose();
    rows.clear();
  });
  return container;
}
