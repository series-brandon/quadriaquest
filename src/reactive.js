import {signal} from '@preact/signals-core';

// Shared reactive primitives. Gameplay state that the UI displays is backed by signals,
// so views update when that state changes instead of polling it.
// This is the only module allowed to import the signal library (`npm run check:ui`).
export {signal, computed, effect, batch, untracked, Signal} from '@preact/signals-core';

// A plain-object record (such as the inventory) whose reads subscribe and whose writes notify,
// key by key. Existing code keeps using it as an ordinary object: `record[id]--`,
// `Object.assign(record, …)`, `Object.entries(record)` and JSON all work; enumerating it
// subscribes to the set of keys.
export function reactiveRecord(initial = {}) {
  const target = {...initial};
  const values = new Map();
  const keys = signal(0);
  const cell = key => {
    let value = values.get(key);
    if (!value) values.set(key, value = signal(target[key]));
    return value;
  };
  return new Proxy(target, {
    get(object, key, receiver) {
      if (typeof key === 'symbol') return Reflect.get(object, key, receiver);
      return cell(key).value;
    },
    set(object, key, value) {
      if (typeof key === 'symbol') return Reflect.set(object, key, value);
      const added = !(key in object);
      object[key] = value;
      cell(key).value = value;
      if (added) keys.value++;
      return true;
    },
    deleteProperty(object, key) {
      if (!(key in object)) return true;
      delete object[key];
      cell(key).value = undefined;
      keys.value++;
      return true;
    },
    has(object, key) {
      keys.value;
      return key in object;
    },
    ownKeys(object) {
      keys.value;
      return Reflect.ownKeys(object);
    },
  });
}
