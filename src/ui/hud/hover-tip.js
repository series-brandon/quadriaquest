import {signal, batch} from '../../reactive.js';
import {h} from '../dom.js';

// The hover hint beside the pointer: what a click does ("Move here", "Gather Sticks", "Attack Burrow Vole"). An
// opponent's line passes its `verb` ("Attack") apart from its name, so the verb reads lighter than the name.
// An opponent adds a second line: its "Level N" (Threat Level), coloured by how it compares with the
// player's (`tone`: 'low' green, 'even' orange, 'high' red; combat-formulas.js threatTone), then short
// notes such as "Boss". The owner calls show() and place() as the pointer moves (at most ten times a
// second); each part writes the DOM only when it changes. Must be built inside a view scope (mount).
export function hoverTip() {
  const visible = signal(false), verb = signal(''), title = signal(''), level = signal(null), tone = signal(null), notes = signal('');
  const x = signal(0), y = signal(0);
  const node = h('div', {
    class: 'q-hover-tip',
    role: 'status',
    hidden: () => !visible.value,
    style: {transform: () => `translate(${x.value}px, ${y.value}px)`},
  },
  h('span', {class: 'q-hover-tip__title'},
    h('span', {class: 'q-hover-tip__verb', hidden: () => !verb.value}, () => (verb.value ? `${verb.value} ` : '')),
    title),
  h('span', {class: 'q-hover-tip__detail', hidden: () => level.value == null && !notes.value},
    h('span', {class: 'q-hover-tip__level', 'data-tone': tone, hidden: () => level.value == null}, () => `Level ${level.value}`),
    h('span', {class: 'q-hover-tip__notes', hidden: () => !notes.value}, notes)));
  return {
    node,
    // text: the first line (with `verb` before it, lighter); level/tone/notes: an opponent's second line.
    show({text, verb: vb = '', level: lv = null, tone: tn = null, notes: nt = ''}) {
      batch(() => { verb.value = vb; title.value = text; level.value = lv; tone.value = lv == null ? null : tn; notes.value = nt; visible.value = true; });
    },
    hide() { visible.value = false; },
    // Screen position of its top-left corner.
    place(left, top) { batch(() => { x.value = Math.round(left); y.value = Math.round(top); }); },
    get state() { return {visible: visible.peek(), text: verb.peek() ? `${verb.peek()} ${title.peek()}` : title.peek(), level: level.peek(), tone: tone.peek(), notes: notes.peek()}; },
  };
}
