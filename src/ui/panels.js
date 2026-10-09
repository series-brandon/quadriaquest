import {batch, computed, signal, Signal} from '../reactive.js';
import {bind, createScope, runInScope} from './scope.js';

// Panel registry and host: the single source of truth for which journal page is open,
// whether the page tabs are showing, and which tabs are available. Pages register once;
// their `hidden` state, the tab bars and the journal shell all follow these signals, so no
// module lists panel ids, hides another module's elements or watches the DOM.
//
// register({
//   id,                 panel id ('skills')
//   label, icon,        tab text and icon name (or a function returning an icon node)
//   ariaLabel,          accessible name when it should differ from the label
//   tab,                tab button id (default 'open-' + id); tutorials and tests target it
//   element,            the page element; omit for launcher tabs with only an `action`
//   order,              tab position (ascending)
//   primary,            shown in the compact (phone) tab bar rather than under More
//   available,          initial tab availability (default true)
//   select,             tab click; default opens the page. Return nothing.
//   action,             launcher tabs: run instead of opening a page
//   dismiss,            the page's own close behaviour (close button, Escape)
//   closeLocked,        signal/function: true while the page may not be closed
//   returnTo,           closing goes back to whatever was showing before (Quests)
//   badge,              signal: true shows an attention dot on the tab (e.g. unspent points)
// })
//
// `defaultDismiss` closes a page that has no `dismiss` of its own (the game routes it through
// its close rules). A pinned tab bar stays visible regardless of navOpen (the docked journal).
export function createPanelHost({defaultDismiss = null} = {}) {
  const scope = createScope();
  const entries = signal([]);
  const availability = signal({});
  const active = signal(null);
  const navOpen = signal(false);
  const navPinned = signal(false);
  // What `returnTo` pages restore when dismissed.
  let previous = null;

  const find = id => entries.peek().find(entry => entry.id === id);
  const require = id => {
    const entry = find(id);
    if (!entry) throw new Error(`Unknown panel: ${id}`);
    return entry;
  };
  const read = value => (value instanceof Signal ? value.value : typeof value === 'function' ? value() : !!value);

  const isAvailable = entry => availability.value[entry.id] ?? entry.available ?? true;
  const activeEntry = computed(() => entries.value.find(entry => entry.id === active.value) ?? null);
  const closeLocked = computed(() => !!activeEntry.value?.closeLocked && read(activeEntry.value.closeLocked));

  function register(definition) {
    if (find(definition.id)) throw new Error(`Panel already registered: ${definition.id}`);
    const entry = {tab: `open-${definition.id}`, order: 100, ...definition};
    entries.value = [...entries.peek(), entry].sort((a, b) => a.order - b.order);
    if (entry.element) {
      runInScope(scope, () => bind(() => {
        entry.element.hidden = active.value !== entry.id;
      }));
    }
    return entry;
  }

  function open(id) {
    const entry = require(id);
    batch(() => {
      if (entry.returnTo) {
        if (active.peek() !== id) previous = {active: active.peek(), navOpen: navOpen.peek()};
      } else {
        previous = null;
      }
      active.value = id;
      navOpen.value = false;
    });
  }

  // Closes every page and the tab bar (the legacy closeMenus).
  function close() {
    batch(() => {
      previous = null;
      active.value = null;
      navOpen.value = false;
    });
  }

  // A tab click: launcher action, the page's custom select, or a plain open.
  function select(id) {
    const entry = require(id);
    if (entry.action) entry.action();
    else if (entry.select) entry.select();
    else open(id);
  }

  // The open page's own close behaviour. `returnTo` pages restore what they replaced.
  function dismiss() {
    const entry = activeEntry.peek();
    if (!entry || closeLocked.peek()) return false;
    if (entry.dismiss) {
      entry.dismiss();
      return true;
    }
    if (entry.returnTo) return back();
    if (defaultDismiss) defaultDismiss();
    else close();
    return true;
  }

  // Restores the page (and tab bar state) a `returnTo` page replaced; with no page to
  // return to, closes everything.
  function back() {
    const restore = previous;
    if (!restore?.active) {
      close();
      return true;
    }
    batch(() => {
      previous = null;
      active.value = restore.active;
      navOpen.value = restore.navOpen;
    });
    return true;
  }

  return {
    register,
    open,
    close,
    select,
    dismiss,
    back,
    // State, read-only outside the host.
    active: computed(() => active.value),
    activeEntry,
    navOpen: computed(() => navOpen.value),
    navShown: computed(() => navOpen.value || navPinned.value),
    closeLocked,
    entries: computed(() => entries.value),
    isOpen: id => active.peek() === id,
    isAvailable: id => isAvailable(require(id)),
    entry: find,
    entryForTab: tab => entries.peek().find(entry => entry.tab === tab),
    available: entry => isAvailable(entry),
    setAvailable(id, value) {
      require(id);
      availability.value = {...availability.peek(), [id]: !!value};
    },
    setNavPinned(value) {
      navPinned.value = !!value;
    },
    showNav() {
      navOpen.value = true;
    },
    hideNav() {
      navOpen.value = false;
    },
    toggleNav() {
      navOpen.value = !navOpen.peek();
    },
  };
}
