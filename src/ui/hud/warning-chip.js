import {computed, signal, Signal, untracked} from '../../reactive.js';
import {h} from '../dom.js';
import {bind, onCleanup} from '../scope.js';

const read = value => (value instanceof Signal ? value.value : typeof value === 'function' ? value() : value);
// Matches the chip's fade-out in warning-chip.css; the text clears after it (also with reduced motion).
const FADE_MS = 300;

// Transient combat warning: appears when a new message arrives, then fades after `duration` ms.
// It takes no space while idle. Persistent danger is shown on enemy health plates, so a warning that
// simply continues does not reappear; it shows again only when the message changes.
//   advice    reactive source of the current advice (empty string when none)
//   announce  call for one-off events ("Under attack!")
// Must be built inside a view scope (mount); its timers are cleared with the view.
export function warningChip({id, advice, duration = 3000}) {
  const message = signal('');
  const shown = signal(false);
  let hide = null, clear = null;

  function announce(text) {
    if (!text) return;
    clearTimeout(hide);
    clearTimeout(clear);
    message.value = text;
    shown.value = true;
    hide = setTimeout(() => {
      shown.value = false;
      clear = setTimeout(() => { message.value = ''; }, FADE_MS);
    }, duration);
  }

  const current = computed(() => read(advice) || '');
  bind(() => {
    const text = current.value;
    untracked(() => announce(text));
  });
  onCleanup(() => { clearTimeout(hide); clearTimeout(clear); });

  const node = h('p', {
    id,
    class: 'q-chip',
    role: 'status',
    'aria-live': 'polite',
    hidden: () => !message.value,
    'data-shown': shown,
  }, message);
  return {node, announce};
}
