// Shared reactive primitives. Gameplay state that the UI displays is backed by signals,
// so views update when that state changes instead of polling it.
// This is the only module allowed to import the signal library (`npm run check:ui`).
export {signal, computed, effect, batch, untracked, Signal} from '@preact/signals-core';
