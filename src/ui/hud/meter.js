import {computed} from '../../reactive.js';
import {h, svg} from '../dom.js';
import {resourceTone} from '../../player-resources.js';
import {displayResource} from '../../combat-formulas.js';

// Low-poly gauge: a flat-shaded bevelled tile (lit from the upper left, like the world) whose
// well holds two-tone essence. The level follows a shared signal-backed pool
// (`createResource`); bindings write only when the whole-number display or maximum changes.
// `kind` selects the color (health, mana, stamina, energy, ki).
//
// Layers, all static except the level:
//   base   SVG: the empty well (the whole tile, so no edge of it meets the bevel) and its band
//   well   HTML: a window slides down over counter-transformed essence (compositor only);
//          the surface line rides on the window's edge
//   face   SVG: the bevel ring (which also covers the well's square corners), a highlight
//          shard, the rim and the number (repainted only when it changes)
// Geometry is in a 52-unit box and derives from BEVEL alone. The well extends UNDERLAP units
// under the bevel so no moving edge ever meets the bevel's anti-aliased inner edge, which
// otherwise shows a flickering light seam while the level animates.
const SIZE = 52;
const CHAMFER = 7;
const BEVEL = 3.5;
const UNDERLAP = 1;
const WELL_INSET = BEVEL - UNDERLAP;

// The chamfered square inset by `inset`; diagonal edges stay parallel to the outline.
function octagon(inset) {
  const corner = CHAMFER + inset * (Math.SQRT2 - 1);
  const far = SIZE - inset, cornerFar = SIZE - corner;
  return [[corner, inset], [cornerFar, inset], [far, corner], [far, cornerFar],
    [cornerFar, far], [corner, far], [inset, cornerFar], [inset, corner]];
}
const OUTER = octagon(0);
const INNER = octagon(BEVEL);
const UNDER = octagon(BEVEL - UNDERLAP);
// Bevel faces, clockwise from the top edge; CSS shades each by its angle to the light.
const BEVEL_FACES = ['top', 'top-right', 'right', 'bottom-right', 'bottom', 'bottom-left', 'left', 'top-left'];

const round = value => +value.toFixed(3);
const points = list => list.map(([x, y]) => `${round(x)},${round(y)}`).join(' ');
const bevelFace = index => points([OUTER[index], OUTER[(index + 1) % 8], INNER[(index + 1) % 8], INNER[index]]);
// Shaded strip along the top of the empty well.
const BAND = points([UNDER[7], UNDER[0], UNDER[1], UNDER[2], [SIZE - WELL_INSET, BEVEL + 4], [WELL_INSET, BEVEL + 4]]);
const SHARD = points([[BEVEL + 4, BEVEL + 3], [BEVEL + 14, BEVEL + 3], [BEVEL + 6, BEVEL + 11], [BEVEL + 2, BEVEL + 11]]);
// The well is a square, so clip it to the tile's outline; its corners would otherwise
// show outside the chamfers.
const WELL_SPAN = SIZE - 2 * WELL_INSET;
const WELL_CLIP = `polygon(${OUTER.map(([x, y]) => `${round((x - WELL_INSET) / WELL_SPAN * 100)}% ${round((y - WELL_INSET) / WELL_SPAN * 100)}%`).join(', ')})`;
// CSS layout of the well: its inset, and how far the surface travels from full to empty
// (the opening plus the underlap, as fractions of the tile).
const WELL_STYLE = {
  '--q-meter-well-inset': round(WELL_INSET / SIZE),
  '--q-meter-travel': round((SIZE - 2 * BEVEL + UNDERLAP) / SIZE),
  'clip-path': WELL_CLIP,
};

export function resourceMeter({id, kind, label, resource, hidden = false}) {
  const shown = computed(() => displayResource(resource.value));
  const max = computed(() => resource.max);
  const level = computed(() => (max.value > 0 ? shown.value / max.value : 0));
  const describe = computed(() => `${shown.value} of ${max.value} ${label.toLowerCase()}`);

  return h('div', {
    id,
    class: `q-meter q-meter--${kind}`,
    role: 'meter',
    hidden,
    'aria-label': label,
    'aria-valuemin': 0,
    'aria-valuemax': max,
    'aria-valuenow': shown,
    'aria-valuetext': describe,
    title: () => `${label}: ${shown.value} / ${max.value}`,
    'data-tone': () => resourceTone(shown.value, max.value),
    'data-full': () => level.value >= 1,
    'data-empty': () => level.value <= 0,
    style: {'--q-meter-level': level, '--q-meter-travel': WELL_STYLE['--q-meter-travel']},
  },
  svg('svg', {class: 'q-meter__base', viewBox: '0 0 52 52', 'aria-hidden': 'true'},
    svg('polygon', {class: 'q-meter__empty', points: points(OUTER)}),
    svg('polygon', {class: 'q-meter__empty-band', points: BAND})),
  h('div', {class: 'q-meter__well', 'aria-hidden': 'true', style: WELL_STYLE},
    h('div', {class: 'q-meter__window'},
      h('div', {class: 'q-meter__contents'},
        svg('svg', {class: 'q-meter__essence', viewBox: '0 0 42 42', preserveAspectRatio: 'none'},
          svg('polygon', {class: 'q-meter__essence-lit', points: '0,0 42,0 0,42'}),
          svg('polygon', {class: 'q-meter__essence-shade', points: '42,0 42,42 0,42'})))),
    h('div', {class: 'q-meter__surface'})),
  svg('svg', {class: 'q-meter__face', viewBox: '0 0 52 52', 'aria-hidden': 'true'},
    BEVEL_FACES.map((face, index) => svg('polygon', {class: `q-meter__bevel q-meter__bevel--${face}`, points: bevelFace(index)})),
    svg('polygon', {class: 'q-meter__shard', points: SHARD}),
    svg('polygon', {class: 'q-meter__rim', points: points(OUTER)}),
    svg('text', {class: 'q-meter__value', x: 26, y: 27.5, 'text-anchor': 'middle', 'dominant-baseline': 'central'}, shown)));
}
