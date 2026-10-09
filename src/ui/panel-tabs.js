import {computed} from '../reactive.js';
import {bind, onCleanup} from './scope.js';
import {h} from './dom.js';
import {iconNode} from './icon.js';
import {keyedList} from './list.js';

// Tab buttons for a panel host, rendered into `container` (which the tabs own entirely).
// Every matching entry keeps a button, hidden while unavailable, so tab ids stay addressable
// by tutorials and tests. `ids: false` omits ids for secondary copies (the phone bar); every
// copy carries `data-tab` (the tab id) so lessons can guide whichever bar is showing.
// `balance` (the narrowest a tab may be, in px) lays the tabs out in equal columns over balanced
// rows: one row when every tab fits, otherwise 10 tabs as 5 + 5 rather than 8 + 2. The column
// count is published as --q-tab-columns on the container (styled by .q-tabbar).
export function panelTabs(container, host, {filter = () => true, ids = true, onSelect = () => {}, balance = 0} = {}) {
  const entries = computed(() => host.entries.value.filter(filter));
  if (balance) balanceTabs(container, computed(() => entries.value.filter(entry => host.available(entry)).length), balance);
  return keyedList(container, entries, entry => entry.id, item => {
    const entry = item.peek();
    return h('button', {
      type: 'button',
      id: ids ? entry.tab : null,
      'data-tab': entry.tab,
      title: entry.ariaLabel ?? entry.label,
      'aria-label': entry.ariaLabel ?? entry.label,
      'aria-current': () => host.active.value === entry.id,
      class: entry.badge ? 'q-tab--badged' : null,
      hidden: () => !host.available(entry),
      on: {
        click() {
          onSelect(entry);
          host.select(entry.id);
        },
      },
    },
    typeof entry.icon === 'function' ? entry.icon() : iconNode(entry.icon),
    h('span', null, entry.label),
    // Not a span: legacy bar styles hide spans (the text labels) in icon-only layouts.
    entry.badge ? h('i', {class: 'q-badge', hidden: () => !entry.badge.value, 'aria-hidden': 'true'}) : null);
  });
}

// Whether any entry matching `filter` currently has a visible tab.
export function anyAvailable(host, filter) {
  return computed(() => host.entries.value.some(entry => filter(entry) && host.available(entry)));
}

function balanceTabs(container, count, narrowest) {
  let width = 0;
  const apply = () => {
    if (!width) return;
    const n = Math.max(1, count.peek()), rows = Math.ceil((n * narrowest) / width);
    container.style.setProperty('--q-tab-columns', String(Math.ceil(n / rows)));
  };
  bind(() => { count.value; apply(); });
  if (!globalThis.ResizeObserver) return;
  const observer = new ResizeObserver(([entry]) => { width = entry.contentRect.width; apply(); });
  observer.observe(container);
  onCleanup(() => observer.disconnect());
}
