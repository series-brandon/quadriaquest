// Test-only: installs a lightweight DOM (linkedom) so UI modules run under `node --test`.
import {parseHTML} from 'linkedom';

export function installDom() {
  const {window, document} = parseHTML('<!doctype html><html><body></body></html>');
  globalThis.window = window;
  globalThis.document = document;
  return document;
}
