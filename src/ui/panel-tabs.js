import {computed} from '../reactive.js';
import {h} from './dom.js';
import {iconNode} from './icon.js';
import {keyedList} from './list.js';

// Tab buttons for a panel host, rendered into `container` (which the tabs own entirely).
// Every matching entry keeps a button, hidden while unavailable, so tab ids stay addressable
// by tutorials and tests. `ids: false` omits ids for secondary copies (the phone bar).
export function panelTabs(container, host, {filter = () => true, ids = true, onSelect = () => {}} = {}) {
  const entries = computed(() => host.entries.value.filter(filter));
  return keyedList(container, entries, entry => entry.id, item => {
    const entry = item.peek();
    return h('button', {
      type: 'button',
      id: ids ? entry.tab : null,
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
