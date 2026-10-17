import {h} from '../ui/dom.js';
import {computed, signal} from '../reactive.js';
import {keyedList} from '../ui/list.js';
import {TREES, treesData} from '../lumberjack.js';
import {RESOURCE_RULES, resourcesData} from '../resource-rules.js';
import {ENEMIES, enemiesData} from '../combat-rules.js';
import {ITEMS, dataItems, itemsData} from '../items.js';
import {SELL_RATE, sellPrice} from '../economy.js';
import {ARMOR_SLOTS, refreshGear} from '../equipment.js';
import {RESTORE_RESOURCES, refreshFood} from '../player-health.js';
import {TRACKS, WEAPON_PROFICIENCIES} from '../character.js';
import {actionXp} from '../skill-pacing.js';
import {formatData} from '../data-file.js';
import {subTabs} from '../ui/controls.js';

// Type editors (docs/DESIGN.md, Resource and enemy configuration): the shared configuration every instance of a
// type uses (every Poplar, every boulder, every Goblin Scrapper, every Sticks), edited live and saved to src/data/*.json
// through the dev server. Edits change the live tables, so the world uses them at once; a map placement only
// rarely overrides them (the editor's Resource and Spawn panels). The world editor's Map group opens one window
// per tool (TYPE_TOOLS), all built from the shared pieces here.
const FILES = {
  trees: {save: () => treesData()},
  resources: {save: () => resourcesData()},
  enemies: {save: () => enemiesData()},
  items: {save: () => itemsData()},
};
const ITEM_CHOICES = Object.entries(ITEMS).map(([id, item]) => [id, item.name]);
const titleCase = id => id[0].toUpperCase() + id.slice(1);
// Shops buy by category (shops.js), so the choices are the ones items already use; a new one needs a shop that buys it.
const CATEGORIES = [...new Set(dataItems().map(([, item]) => item.category))].sort();
// The Map group's type tools: which kinds of type each window edits.
export const TYPE_TOOLS = {
  nodes: {title: 'Resource Nodes', kinds: ['tree', 'resource']},
  npcs: {title: 'NPCs', kinds: ['enemy']},
  items: {title: 'Items', kinds: ['item']},
};
// The tool that edits a type key ('tree:oak' → 'nodes').
export const toolForType = key => Object.keys(TYPE_TOOLS).find(tool => TYPE_TOOLS[tool].kinds.includes(key.split(':')[0])) ?? null;
// The Items window's tabs, by category, so changing an item's category moves it. An item's panels follow its
// data blocks (`equipment`, `consume`) instead; new equipment also needs a model in code.
export const ITEM_TABS = [
  {id: 'weapons', label: 'Weapons', categories: ['weapon', 'ammo']},
  {id: 'armor', label: 'Armor', categories: ['armour', 'hat']},
  {id: 'tools', label: 'Tools', categories: ['tool']},
  {id: 'resources', label: 'Resources', categories: ['wood', 'stone', 'metal', 'fish']},
  {id: 'consumables', label: 'Consumables', categories: ['food']},
  {id: 'other', label: 'Other', categories: []},
];
export const itemTab = item => (ITEM_TABS.find(t => t.categories.includes(item.category)) ?? ITEM_TABS.at(-1)).id;
const SLOTS = ['hand', 'head', ...ARMOR_SLOTS];
const DAMAGE_TYPES = ['slashing', 'piercing', 'bludgeoning'];
const options = list => list.map(v => [v, v]);
// Every editable type (or a tool's): which file holds it, its live table row, and its fields.
export function typeEntries(tool = null) {
  const all = [
    ...Object.entries(TREES).map(([id, t]) => ({key: `tree:${id}`, file: 'trees', group: 'Trees', name: t.name, row: t, kind: 'tree'})),
    ...Object.entries(RESOURCE_RULES).filter(([k]) => k !== 'tree').map(([k, r]) => ({key: `resource:${k}`, file: 'resources', group: 'Rocks and ground items', name: titleCase(k), row: r, kind: 'resource'})),
    ...Object.entries(ENEMIES).map(([id, e]) => ({key: `enemy:${id}`, file: 'enemies', group: 'Enemies', name: e.name, row: e, kind: 'enemy'})),
    ...dataItems().map(([id, item]) => ({key: `item:${id}`, id, file: 'items', group: 'Items', name: item.name, row: item, kind: 'item'})),
  ];
  return tool ? all.filter(e => TYPE_TOOLS[tool].kinds.includes(e.kind)) : all;
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

// A type tool's window content (for the modal host): the type list (tabbed for items), the chosen type's fields,
// and Save, which writes the files this window changed.
//   tool: a TYPE_TOOLS id; start: a type key to open on ('tree:oak'); post(id, json) saves a file through the dev server.
export function typeEditor({tool = 'nodes', start = null, post}) {
  // Without a start, items open on the first tab's first item.
  const entries = typeEntries(tool), first = tool === 'items' ? entries.find(e => itemTab(e.row) === ITEM_TABS[0].id) : entries[0];
  const chosen = signal(start && entries.some(e => e.key === start) ? start : first.key);
  const rev = signal(0), dirty = signal(new Set()), status = signal('');
  const entry = () => entries.find(e => e.key === chosen.value);
  const tab = signal(tool === 'items' ? itemTab(entry().row) : null);
  // An item's GEAR and FOODS views are rebuilt from its data, so equipment and eating follow at once; a new
  // category takes the item to its tab.
  const changed = e => {
    if (e.kind === 'item') { refreshGear(e.id); refreshFood(e.id); tab.value = itemTab(e.row); }
    dirty.value = new Set([...dirty.peek(), e.file]); rev.value++;
  };
  const field = (label, input, wide = false) => h('label', {class: `q-types__field${wide ? ' q-types__wide' : ''}`}, h('span', null, label), input);
  // Controls over a value: get() reads it, set(v) writes it (null or '' removes the field) and marks the entry changed.
  const num = ({get, set, step = 1, min = 0, blank = null}) => h('input', {type: 'number', class: 'q-input', min, step, placeholder: blank ? () => { rev.value; return blank(); } : '',
    value: () => { rev.value; return get() ?? ''; },
    on: {change: ev => { const v = ev.target.value; if (v === '' && blank) set(null); else if (v !== '') set(Number(v)); }}});
  const choice = ({get, set, list}) => h('select', {class: 'q-select', on: {change: ev => set(ev.target.value)}},
    list.map(([v, label]) => h('option', {value: v, selected: () => { rev.value; return String(get() ?? '') === v; }}, label)));
  const check = (label, {get, set}) => h('label', {class: 'q-types__field q-types__check'},
    h('input', {type: 'checkbox', checked: () => { rev.value; return !!get(); }, on: {change: ev => set(ev.target.checked)}}), h('span', null, label));
  // A field of an object (a type's row, or a block inside it); `make` creates the block on first write.
  const at = (e, read, key, make = read) => ({get: () => read()?.[key], set: v => { const o = make(); if (v === null || v === '' || v === false) delete o[key]; else o[key] = v; changed(e); }});
  const number = (e, key, {blank = null, ...rest} = {}) => num({...at(e, () => e.row, key), step: rest.step, blank});
  const text = (e, key, tag = 'input') => h(tag, {class: 'q-input q-types__text', ...(tag === 'textarea' ? {rows: 3} : {type: 'text'}),
    value: () => { rev.value; return e.row[key] ?? ''; },
    on: {change: ev => { e.row[key] = ev.target.value.trim(); changed(e); }}});
  const xpBlank = e => () => `${actionXp(e.row.effort, e.row.level)} (from effort)`;
  // An item's name (an item's name can change, so the list and heading read it live).
  const nameOf = e => () => { rev.value; return e.kind === 'item' ? e.row.name : e.name; };
  // A list of rows inside a block (requirements, effects), re-keyed on every change like the drop table.
  const rowList = (rows, render) => keyedList(h('ul', {class: 'q-types__list'}), computed(() => { rev.value; return rows().map((row, i) => ({row, i, key: `${i}:${rev.value}`})); }), r => r.key, item => h('li', {class: 'q-types__drop'}, render(item.peek())));
  const remove = run => h('button', {type: 'button', class: 'q-button q-button--small', on: {click: run}}, 'Remove');
  const addButton = (label, run) => h('button', {type: 'button', class: 'q-button q-button--small', on: {click: run}}, label);
  // Every item: what the inventory and shops show. Icons stay in code (icons.js).
  const itemFields = e => [
    field('Name', text(e, 'name')),
    field('Value (shop price)', number(e, 'value')),
    field('Category', choice({...at(e, () => e.row, 'category'), list: options(CATEGORIES)})),
    check('Shops buy it', {get: () => e.row.sellable !== false, set: on => { if (on) delete e.row.sellable; else e.row.sellable = false; changed(e); }}),
    field('Description', text(e, 'description', 'textarea'), true),
    h('p', {class: 'q-types__file q-types__wide'}, () => { rev.value; return e.row.sellable === false ? 'Not sold to shops.' : `Sells for ${sellPrice(e.id)} (${SELL_RATE * 100}%).`; })];
  // Equipment (docs/COMBAT.md): where it's worn, how many hands, its bonuses and requirements. The formulas,
  // motions and models stay in code; GEAR (equipment.js) is the live view.
  const equipmentFields = e => {
    const eq = () => e.row.equipment, of = key => at(e, eq, key), focus = key => at(e, () => eq().focus, key, () => (eq().focus ??= {}));
    const tidyFocus = () => { if (eq().focus && !Object.keys(eq().focus).length) delete eq().focus; };
    const requirements = () => Object.entries(eq().requirements || {});
    const setRequirements = list => { if (list.length) eq().requirements = Object.fromEntries(list); else delete eq().requirements; changed(e); };
    const damage = type => check(type, {get: () => eq().damageTypes?.includes(type), set: on => {
      // The first type is the hand's default, so existing order is kept and a new type goes last.
      const list = (eq().damageTypes || []).filter(t => t !== type); if (on) list.push(type); of('damageTypes').set(list.length ? list : null); }});
    return [
      h('div', {class: 'q-types__fields'},
        field('Slot', choice({...of('slot'), list: options(SLOTS)})),
        field('Hands', choice({get: () => eq().hands ?? 1, set: v => of('hands').set(v === '2' ? 2 : null), list: [['1', 'One'], ['2', 'Two']]})),
        check('Shield', of('shield')), check('Cosmetic (a held tool)', of('cosmetic')),
        field('Attack style', choice({...of('style'), list: [['', 'None'], ['melee', 'Melee'], ['ranged', 'Ranged']]})),
        field('Power', num({...of('power'), blank: () => '0'})), field('Accuracy', num({...of('accuracy'), blank: () => '0'})),
        field('Resistance', num({...of('resistance'), blank: () => '0'})),
        field('Attack interval (seconds)', num({...of('attackInterval'), step: .05, blank: () => 'none'})),
        field('Range (tiles)', num({...of('range'), blank: () => 'none'})),
        field('Proficiency', choice({...of('proficiency'), list: [['', 'None'], ...options(WEAPON_PROFICIENCIES)]})),
        field('Ammo', choice({...of('ammo'), list: [['', 'None'], ...ITEM_CHOICES]})),
        field('Spell focus power', num({...focus('power'), set: v => { focus('power').set(v); tidyFocus(); }, blank: () => 'none'})),
        field('Spell focus accuracy', num({...focus('accuracy'), set: v => { focus('accuracy').set(v); tidyFocus(); }, blank: () => 'none'}))),
      h('h5', {class: 'q-label'}, 'Damage types'), h('div', {class: 'q-types__inline'}, DAMAGE_TYPES.map(damage)),
      h('h5', {class: 'q-label'}, 'Requirements'),
      rowList(requirements, ({row: [track, level], i}) => [
        choice({get: () => track, set: v => setRequirements(requirements().map((r, j) => (j === i ? [v, r[1]] : r))), list: TRACKS.map(t => [t.id, t.name])}),
        h('label', {class: 'q-types__inline'}, 'Level', num({get: () => level, set: v => setRequirements(requirements().map((r, j) => (j === i ? [r[0], Math.max(1, v ?? 1)] : r))), min: 1})),
        remove(() => setRequirements(requirements().filter((_, j) => j !== i)))]),
      addButton('Add a requirement', () => setRequirements([...requirements(), [TRACKS.find(t => !eq().requirements?.[t.id]).id, 1]]))];
  };
  // Consumables: what using one does. Restoring a resource is built; buffs are planned (docs/DESIGN.md).
  const consumeFields = e => {
    const effects = () => e.row.consume.effects, edit = run => { run(effects()); changed(e); };
    return [
      rowList(effects, ({i}) => [h('span', null, 'Restore'),
        choice({get: () => effects()[i].resource, set: v => edit(list => { list[i].resource = v; }), list: options(RESTORE_RESOURCES)}),
        h('label', {class: 'q-types__inline'}, 'by', num({get: () => effects()[i].amount, set: v => edit(list => { list[i].amount = v ?? 0; })})),
        remove(() => edit(list => { list.splice(i, 1); }))]),
      addButton('Add an effect', () => edit(list => { list.push({type: 'restore', resource: 'health', amount: 10}); }))];
  };
  // Resources and enemies are different kinds of thing: a resource has a level, effort and XP; an enemy's
  // stats and behaviour stay in code (combat-rules.js), and only its respawn and drops are shared data here.
  const fieldsFor = e => (e.kind === 'item' ? itemFields(e) : e.kind === 'enemy' ? [field('Respawn (seconds)', number(e, 'respawn'))] : [
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
  const pick = e => h('button', {type: 'button', class: 'q-types__pick', 'aria-pressed': () => String(chosen.value === e.key), on: {click: () => { chosen.value = e.key; }}}, nameOf(e));
  const detail = shows => keyedList(h('div', {class: 'q-types__detail'}), () => { rev.value; const e = entry(); return shows(e) ? [e] : []; }, e => e.key, item => {
    const e = item.peek();
    return h('div', {class: 'q-types__body'}, h('h3', null, nameOf(e)), h('p', {class: 'q-types__file'}, () => `src/data/${e.file}.json · shared by every ${nameOf(e)()}`),
      h('div', {class: 'q-types__fields'}, fieldsFor(e)),
      e.row.equipment && e.kind === 'item' ? [h('h4', {class: 'q-label'}, 'Equipment'), equipmentFields(e)] : null,
      e.row.consume && e.kind === 'item' ? [h('h4', {class: 'q-label'}, 'When eaten'), consumeFields(e)] : null,
      e.kind === 'item' ? null : [h('h4', {class: 'q-label'}, 'Drops'),
        dropTableEditor({get: () => e.row.drops, set: t => { if (t) e.row.drops = t; else delete e.row.drops; changed(e); }, rev})]);
  });
  const bar = h('div', {class: 'q-types__bar'},
    h('button', {type: 'button', class: 'q-button', disabled: () => !dirty.value.size, on: {click: save}}, () => (dirty.value.size ? `Save ${dirty.value.size} file${dirty.value.size > 1 ? 's' : ''}` : 'Saved')),
    h('p', {class: 'q-page__status', role: 'status'}, status));
  if (tool !== 'items') {
    const groups = [...new Set(entries.map(e => e.group))];
    return h('div', {class: 'q-types-window'},
      h('div', {class: 'q-types'},
        h('nav', {class: 'q-types__nav', 'aria-label': TYPE_TOOLS[tool].title}, groups.map(g => h('section', null, h('h4', {class: 'q-label'}, g), entries.filter(e => e.group === g).map(pick)))),
        detail(() => true)),
      bar);
  }
  // Items: one tab per kind, each with its own list; switching tabs opens that tab's first item.
  const inTab = id => computed(() => { rev.value; return entries.filter(e => itemTab(e.row) === id); });
  const showTab = id => { tab.value = id; if (itemTab(entry().row) !== id) chosen.value = inTab(id).peek()[0]?.key ?? chosen.peek(); };
  return h('div', {class: 'q-types-window'},
    subTabs({label: 'Item kinds', value: tab, onChange: showTab, tabs: ITEM_TABS.map(t => ({id: t.id, label: t.label, build: () => h('div', {class: 'q-types'},
      keyedList(h('nav', {class: 'q-types__nav', 'aria-label': t.label}), inTab(t.id), e => e.key, item => pick(item.peek())),
      detail(e => itemTab(e.row) === t.id))}))}),
    bar);
}
