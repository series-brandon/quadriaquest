import {h} from '../ui/dom.js';
import {computed, signal} from '../reactive.js';
import {keyedList} from '../ui/list.js';
import {TREES, treesData} from '../lumberjack.js';
import {RESOURCE_RULES, resourcesData} from '../resource-rules.js';
import {ENEMIES, enemiesData} from '../combat-rules.js';
import {ITEMS} from '../items.js';
import {actionXp} from '../skill-pacing.js';
import {formatData} from '../data-file.js';

// Types screen (docs/DESIGN.md, Resource and enemy configuration): the shared configuration every instance of a
// type uses (every Poplar, every boulder, every Goblin Scrapper), edited live and saved to src/data/*.json
// through the dev server. Edits change the live tables, so the world uses them at once; a map placement only
// rarely overrides them (the editor's Resource and Spawn panels).
const FILES = {
  trees: {save: () => treesData()},
  resources: {save: () => resourcesData()},
  enemies: {save: () => enemiesData()},
};
const ITEM_CHOICES = Object.entries(ITEMS).map(([id, item]) => [id, item.name]);
const titleCase = id => id[0].toUpperCase() + id.slice(1);
// Every editable type: which file holds it, its live table row, and its fields.
export function typeEntries() {
  return [
    ...Object.entries(TREES).map(([id, t]) => ({key: `tree:${id}`, file: 'trees', group: 'Trees', name: t.name, row: t, kind: 'tree'})),
    ...Object.entries(RESOURCE_RULES).filter(([k]) => k !== 'tree').map(([k, r]) => ({key: `resource:${k}`, file: 'resources', group: 'Rocks and ground items', name: titleCase(k), row: r, kind: 'resource'})),
    ...Object.entries(ENEMIES).map(([id, e]) => ({key: `enemy:${id}`, file: 'enemies', group: 'Enemies', name: e.name, row: e, kind: 'enemy'})),
  ];
}

// A count in a drop table is a number or [min, max]; the editor shows two boxes and writes the shorter form.
const countRange = count => (Array.isArray(count) ? count : [count ?? 1, count ?? 1]);
const countValue = (min, max) => (min === max ? min : [min, max]);

// The shared drop-table editor (drops.js format: sure drops and chance drops; Gold Pieces are just an item),
// for a type's table or a placement's override.
//   get() → the table or undefined; set(table or undefined); rev: a signal bumped on every change.
export function dropTableEditor({get, set, rev}) {
  const edit = change => { const table = structuredClone(get() || {}); change(table); for (const k of ['always', 'rolls']) if (table[k] && !table[k].length) delete table[k]; set(Object.keys(table).length ? table : undefined); rev.value++; };
  const num = (value, onValue, attrs = {}) => h('input', {type: 'number', class: 'q-input q-types__num', min: 0, value: () => { rev.value; return value(); }, on: {change: e => onValue(e.target.value === '' ? null : Number(e.target.value))}, ...attrs});
  const itemSelect = (value, onValue) => h('select', {class: 'q-select', on: {change: e => onValue(e.target.value)}},
    ITEM_CHOICES.map(([id, name]) => h('option', {value: id, selected: () => { rev.value; return value() === id; }}, name)));
  const rowsOf = list => computed(() => { rev.value; return (get()?.[list] || []).map((entry, i) => ({entry, i, key: `${list}:${i}:${rev.value}`})); });
  const entryRow = list => item => {
    const {i} = item.peek(), at = () => get()?.[list]?.[i] || {}, change = apply => edit(t => apply(t[list][i]));
    return h('li', {class: 'q-types__drop'},
      itemSelect(() => at().item, v => change(e => { e.item = v; })),
      list === 'rolls' ? h('label', {class: 'q-types__inline'}, num(() => Math.round((at().chance ?? 1) * 1000) / 10, v => change(e => { e.chance = Math.min(100, v ?? 0) / 100; }), {max: 100, step: .1, 'aria-label': 'Chance %'}), '%') : null,
      h('label', {class: 'q-types__inline'}, '×', num(() => countRange(at().count)[0], v => change(e => { const [, max] = countRange(e.count); e.count = countValue(v ?? 1, Math.max(v ?? 1, max)); }), {'aria-label': 'Count from'}),
        '–', num(() => countRange(at().count)[1], v => change(e => { const [min] = countRange(e.count); e.count = countValue(Math.min(min, v ?? min), v ?? min); }), {'aria-label': 'Count to'})),
      h('button', {type: 'button', class: 'q-button q-button--small', on: {click: () => edit(t => { t[list].splice(i, 1); })}}, 'Remove'));
  };
  const add = (list, entry) => h('button', {type: 'button', class: 'q-button q-button--small', on: {click: () => edit(t => { (t[list] ||= []).push(entry); })}}, list === 'always' ? 'Add a sure drop' : 'Add a chance drop');
  return h('div', {class: 'q-types__drops'},
    h('h5', {class: 'q-label'}, 'Always drops'),
    keyedList(h('ul', {class: 'q-types__list'}), rowsOf('always'), r => r.key, entryRow('always')), add('always', {item: 'gold', count: 1}),
    h('h5', {class: 'q-label'}, 'Chance drops'),
    keyedList(h('ul', {class: 'q-types__list'}), rowsOf('rolls'), r => r.key, entryRow('rolls')), add('rolls', {item: 'sticks', chance: .25, count: 1}));
}

// The Types screen's content (for the modal host): the type list, the chosen type's fields, and Save.
//   start: a type key to open on ('tree:oak'); post(id, json) saves a file through the dev server.
export function typeEditor({start = null, post}) {
  const entries = typeEntries(), chosen = signal(start && entries.some(e => e.key === start) ? start : entries[0].key);
  const rev = signal(0), dirty = signal(new Set()), status = signal('');
  const entry = () => entries.find(e => e.key === chosen.value);
  const changed = e => { dirty.value = new Set([...dirty.peek(), e.file]); rev.value++; };
  const field = (label, input) => h('label', {class: 'q-types__field'}, h('span', null, label), input);
  const number = (e, key, {step = 1, blank = null} = {}) => h('input', {type: 'number', class: 'q-input', min: 0, step, placeholder: blank ? () => { rev.value; return blank(); } : '',
    value: () => { rev.value; return e.row[key] ?? ''; },
    on: {change: ev => { const v = ev.target.value; if (v === '' && blank) delete e.row[key]; else if (v !== '') e.row[key] = Number(v); changed(e); }}});
  const xpBlank = e => () => `${actionXp(e.row.effort, e.row.level)} (from effort)`;
  // Resources and enemies are different kinds of thing: a resource has a level, effort and XP; an enemy's
  // stats and behaviour stay in code (combat-rules.js), and only its respawn and drops are shared data here.
  const fieldsFor = e => (e.kind === 'enemy' ? [field('Respawn (seconds)', number(e, 'respawn'))] : [
    field('Level', number(e, 'level')), field('Effort (seconds)', number(e, 'effort', {step: .5})),
    field('Respawn (seconds)', number(e, 'respawn')), field('XP', number(e, 'xp', {blank: xpBlank(e)}))]);
  async function save() {
    const files = [...dirty.peek()];
    if (!files.length) { status.value = 'Nothing to save.'; return; }
    try {
      for (const id of files) await post(id, formatData(FILES[id].save()));
      dirty.value = new Set(); status.value = `Saved ${files.map(id => `src/data/${id}.json`).join(', ')}.`;
    } catch (error) { status.value = `Save failed: ${error.message}`; }
  }
  const groups = [...new Set(entries.map(e => e.group))];
  return h('div', {class: 'q-types'},
    h('nav', {class: 'q-types__nav', 'aria-label': 'Types'}, groups.map(g => h('section', null, h('h4', {class: 'q-label'}, g),
      entries.filter(e => e.group === g).map(e => h('button', {type: 'button', class: 'q-types__pick', 'aria-pressed': () => String(chosen.value === e.key), on: {click: () => { chosen.value = e.key; }}}, e.name))))),
    h('div', {class: 'q-types__detail'},
      keyedList(h('div', {class: 'q-types__body'}), () => [entry()], e => e.key, item => {
        const e = item.peek();
        return h('div', null, h('h3', null, e.name), h('p', {class: 'q-types__file'}, `src/data/${e.file}.json · shared by every ${e.name}`),
          h('div', {class: 'q-types__fields'}, fieldsFor(e)),
          h('h4', {class: 'q-label'}, 'Drops'),
          dropTableEditor({get: () => e.row.drops, set: t => { if (t) e.row.drops = t; else delete e.row.drops; changed(e); }, rev}));
      }),
      h('div', {class: 'q-types__bar'},
        h('button', {type: 'button', class: 'q-button', disabled: () => !dirty.value.size, on: {click: save}}, () => (dirty.value.size ? `Save ${dirty.value.size} file${dirty.value.size > 1 ? 's' : ''}` : 'Saved')),
        h('p', {class: 'q-page__status', role: 'status'}, status))));
}
