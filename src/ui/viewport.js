import {signal} from '../reactive.js';

// The single layout breakpoint. CSS repeats it literally (media queries cannot use variables);
// `npm run check:ui` verifies UI stylesheets use only these widths.
export const COMPACT_MAX_WIDTH = 700;
export const COMPACT_QUERY = `(max-width: ${COMPACT_MAX_WIDTH}px)`;

let query = null;
let compact = null;

// Shared MediaQueryList for legacy code that still listens for `change` events.
export function compactQuery() {
  query ??= matchMedia(COMPACT_QUERY);
  return query;
}

// True on phone-sized layouts (fullscreen menus, floating HUD).
export function compactViewport() {
  if (!compact) {
    compact = signal(compactQuery().matches);
    compactQuery().addEventListener('change', event => {
      compact.value = event.matches;
    });
  }
  return compact;
}
