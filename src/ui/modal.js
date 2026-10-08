import {computed, signal} from '../reactive.js';
import {h, mount} from './dom.js';
import {iconNode} from './icon.js';

// Modal host: the one owner of utility dialogs (stations, destinations, naming, confirmations).
// Each `open` builds its content in its own scope inside a native modal <dialog> with the shared
// frame (title, close button, sizes and phone layout); closing disposes that scope and removes
// the dialog, so nothing lingers or keeps updating while closed.
//
// open({
//   id,           one dialog per id; opening an open id replaces it
//   title,        heading text (also the accessible name unless `label` is given)
//   label,        accessible name when it should differ from the title
//   size,         'sheet' (default), 'wide' (two-pane browsers) or 'compact' (short confirmations,
//                 which stay centered on phones); sheet and wide go edge-to-edge on phones
//   flush,        the content manages its own padding and scrolling
//   required,     no close button; Escape and closeAll leave it open (finish it to close)
//   onClose,      (reason) => void after it closes: 'dismiss', 'replaced', a closeAll reason, or
//                 whatever reason the content passed to close()
//   build,        ({close}) => content nodes
// }) → {close(reason), isOpen}
export function createModalHost({parent = document.body} = {}) {
  const entries = new Map();
  const openIds = signal([]);
  const sync = () => { openIds.value = [...entries.keys()]; };

  function finish(id, entry, reason) {
    if (entries.get(id) !== entry) return;
    entries.delete(id);
    sync();
    if (entry.dialog.open) entry.dialog.close();
    entry.view.dispose();
    if (entry.returnFocus?.isConnected) entry.returnFocus.focus?.();
    entry.onClose?.(reason);
  }

  function open({id, title = '', label = title, size = 'sheet', flush = false, required = false, onClose = null, build}) {
    if (entries.has(id)) close(id, 'replaced');
    const entry = {required, onClose, returnFocus: document.activeElement ?? null};
    const closeThis = (reason = 'closed') => finish(id, entry, reason);
    const dismiss = () => { if (!required) closeThis('dismiss'); };
    entry.view = mount(() => h('dialog', {
      class: `q-modal q-modal--${size}`,
      'aria-label': label || null,
      on: {
        // Escape: dismiss through the host so required dialogs stay open.
        cancel: event => { event.preventDefault(); dismiss(); },
        // A close the host didn't make (the browser's own): reopen required dialogs, else tidy up.
        close: () => {
          if (entries.get(id) !== entry) return;
          if (required) entry.dialog.showModal();
          else closeThis('dismiss');
        },
      },
    },
    title || !required ? h('header', {class: 'q-modal__header'},
      title ? h('h2', {class: 'q-modal__title'}, title) : null,
      required ? null : h('button', {type: 'button', class: 'q-modal__close', 'aria-label': `Close ${label || 'dialog'}`, on: {click: dismiss}}, iconNode('close'))) : null,
    h('div', {class: flush ? 'q-modal__body q-modal__body--flush' : 'q-modal__body'}, build({close: closeThis}))));
    entry.dialog = entry.view.node;
    entries.set(id, entry);
    parent.append(entry.dialog);
    entry.dialog.showModal();
    sync();
    return {close: closeThis, get isOpen() { return entries.get(id) === entry; }};
  }

  function close(id, reason = 'closed') {
    const entry = entries.get(id);
    if (!entry) return false;
    finish(id, entry, reason);
    return true;
  }

  // Closes every dialog that may be dismissed (e.g. when an attack starts on a phone).
  function closeAll(reason = 'closed') {
    for (const [id, entry] of [...entries]) if (!entry.required) finish(id, entry, reason);
  }

  return {
    open,
    close,
    closeAll,
    isOpen: id => openIds.value.includes(id),
    anyOpen: computed(() => openIds.value.length > 0),
  };
}

// A short confirmation: one message and two actions, compact and centered on every screen.
export function confirmModal(host, {id = 'confirm', title, message, confirm = 'OK', cancel = 'Cancel', onConfirm, onCancel = null}) {
  return host.open({
    id,
    title,
    size: 'compact',
    onClose: reason => { if (reason !== 'confirmed') onCancel?.(); },
    build: ({close}) => [
      h('p', {class: 'q-modal__message'}, message),
      h('div', {class: 'q-modal__actions'},
        h('button', {type: 'button', class: 'q-button', autofocus: true, on: {click: () => { close('confirmed'); onConfirm(); }}}, confirm),
        h('button', {type: 'button', class: 'q-button q-button--quiet', on: {click: () => close('cancelled')}}, cancel)),
    ],
  });
}
