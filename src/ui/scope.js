import {effect} from '../reactive.js';

// Every binding belongs to a scope so it can be disposed with the view that created it.
// Views are built inside `runInScope` (usually through `mount` or `keyedList`); bindings
// created anywhere else throw, which keeps leaked effects from accumulating.
let current = null;

export function createScope() {
  const cleanups = [];
  return {
    add(cleanup) {
      cleanups.push(cleanup);
    },
    dispose() {
      while (cleanups.length) cleanups.pop()();
    },
  };
}

export function runInScope(scope, build) {
  const previous = current;
  current = scope;
  try {
    return build();
  } finally {
    current = previous;
  }
}

function owner(what) {
  if (!current) throw new Error(`${what} must run while building a view (inside mount, keyedList or runInScope).`);
  return current;
}

export function onCleanup(cleanup) {
  owner('onCleanup').add(cleanup);
}

// Runs `fn` now and whenever a signal it reads changes. Bindings only write to the DOM;
// they must not build views, which would create bindings outside any scope.
export function bind(fn) {
  const scope = owner('bind');
  const dispose = effect(fn);
  scope.add(dispose);
  return dispose;
}
