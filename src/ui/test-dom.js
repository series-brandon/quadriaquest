// Test-only: installs a lightweight DOM (linkedom) so UI modules run under `node --test`.
import {parseHTML} from 'linkedom';

export function installDom() {
  const {window, document} = parseHTML('<!doctype html><html><body></body></html>');
  globalThis.window = window;
  globalThis.document = document;
  installDialog(window);
  return document;
}

// linkedom has no HTMLDialogElement: model the parts the modal host uses (the `open`
// attribute, showModal, close and its `close` event).
function installDialog(window) {
  const proto = window.HTMLElement.prototype;
  if ('showModal' in proto) return;
  Object.defineProperty(proto, 'open', {
    configurable: true,
    get() { return this.hasAttribute('open'); },
    set(on) { this.toggleAttribute('open', !!on); },
  });
  proto.showModal = function showModal() { this.setAttribute('open', ''); };
  proto.close = function close() {
    if (!this.hasAttribute('open')) return;
    this.removeAttribute('open');
    this.dispatchEvent(new window.Event('close'));
  };
}
