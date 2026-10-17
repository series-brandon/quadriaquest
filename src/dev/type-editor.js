import {h} from '../ui/dom.js';
import {computed, signal} from '../reactive.js';
import {keyedList} from '../ui/list.js';
import {subTabs} from '../ui/controls.js';
import {TREES, treesData} from '../lumberjack.js';
import {RESOURCE_RULES, resourcesData} from '../resource-rules.js';
import {ENEMIES, deriveEnemy, enemyData, enemiesData, refreshEnemy} from '../combat-rules.js';
import {STRATEGIES, STYLES, COMBAT_SKILLS} from '../combat-formulas.js';
import {ITEMS, dataItems, itemsData} from '../items.js';
import {SELL_RATE, sellPrice} from '../economy.js';
import {ARMOR_SLOTS, refreshGear} from '../equipment.js';
import {RESTORE_RESOURCES, refreshFood} from '../player-health.js';
import {ATTRIBUTES, TRACKS, WEAPON_PROFICIENCIES} from '../character.js';
import {actionXp} from '../skill-pacing.js';
import {formatData} from '../data-file.js';

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
const options = list => list.map(v => [v, titleCase(v)]);
const round = (n, places = 2) => +n.toFixed(places);
// Every editable type (or a tool's): which file holds it, its data row, and its fields. An enemy's row is its
// data (combat-rules.js derives ENEMIES from it).
export function typeEntries(tool = null) {
  const all = [
    ...Object.entries(TREES).map(([id, t]) => ({key: `tree:${id}`, file: 'trees', group: 'Trees', name: t.name, row: t, kind: 'tree'})),
    ...Object.entries(RESOURCE_RULES).filter(([k]) => k !== 'tree').map(([k, r]) => ({key: `resource:${k}`, file: 'resources', group: 'Rocks and ground items', name: titleCase(k), row: r, kind: 'resource'})),
    ...Object.keys(ENEMIES).map(id => ({key: `enemy:${id}`, id, file: 'enemies', group: 'Enemies', name: enemyData(id).name, row: enemyData(id), kind: 'enemy'})),
    ...dataItems().map(([id, item]) => ({key: `item:${id}`, id, file: 'items', group: 'Items', name: item.name, row: item, kind: 'item'})),
  ];
  return tool ? all.filter(e => TYPE_TOOLS[tool].kinds.includes(e.kind)) : all;
}

// A count in a drop table is a number or [min, max]; the editor shows two boxes and writes the shorter form.
const countRange = count => (Array.isArray(count) ? count : [count ?? 1, count ?? 1]);
const countValue = (min, max) => (min === max ? min : [min, max]);
const smallButton = (label, run) => h('button', {type: 'button', class: 'q-button q-button--small', on: {click: run}}, label);

// The shared drop-table editor (drops.js format: sure drops and chance drops; Gold Pieces are just an item),
// for a type's table or a placement's override.
//   get() → the table or undefined; set(table or undefined); rev: a signal bumped on every change.
export function dropTableEditor({get, set, rev}) {
  const edit = change => { const table = structuredClone(get() || {}); change(table); for (const k of ['always', 'rolls']) if (table[k] && !table[k].length) delete table[k]; set(Object.keys(table).length ? table : undefined); rev.value++; };
  const num = (value, onValue, attrs = {}) => h('input', {type: 'number', class: 'q-input q-types__num', min: 0, value: () => { rev.value; return value(); }, on: {change: e => onValue(e.target.value === '' ? null : Number(e.target.value))}, ...attrs});
  const itemSelect = (value, onValue) => h('select', {class: 'q-select q-types__pick-item', 'aria-label': 'Item', on: {change: e => onValue(e.target.value)}},
    ITEM_CHOICES.map(([id, name]) => h('option', {value: id, selected: () => { rev.value; return value() === id; }}, name)));
  const rowsOf = list => computed(() => { rev.value; return (get()?.[list] || []).map((entry, i) => ({entry, i, key: `${list}:${i}:${rev.value}`})); });
  const entryRow = list => item => {
    const {i} = item.peek(), at = () => get()?.[list]?.[i] || {}, change = apply => edit(t => apply(t[list][i]));
    return h('li', {class: 'q-types__row'},
      itemSelect(() => at().item, v => change(e => { e.item = v; })),
      list === 'rolls' ? h('span', {class: 'q-types__inline'}, num(() => Math.round((at().chance ?? 1) * 1000) / 10, v => change(e => { e.chance = Math.min(100, v ?? 0) / 100; }), {max: 100, step: .1, 'aria-label': 'Chance %'}), '%') : null,
      h('span', {class: 'q-types__inline'}, '×', num(() => countRange(at().count)[0], v => change(e => { const [, max] = countRange(e.count); e.count = countValue(v ?? 1, Math.max(v ?? 1, max)); }), {'aria-label': 'Count from'}),
        '–', num(() => countRange(at().count)[1], v => change(e => { const [min] = countRange(e.count); e.count = countValue(Math.min(min, v ?? min), v ?? min); }), {'aria-label': 'Count to'})),
      smallButton('Remove', () => edit(t => { t[list].splice(i, 1); })));
  };
  const add = (list, entry) => smallButton(list === 'always' ? 'Add a sure drop' : 'Add a chance drop', () => edit(t => { (t[list] ||= []).push(entry); }));
  return h('div', {class: 'q-types__drops'},
    h('h5', {class: 'q-types__subheading'}, 'Always'),
    keyedList(h('ul', {class: 'q-types__list'}), rowsOf('always'), r => r.key, entryRow('always')), add('always', {item: 'gold', count: 1}),
    h('h5', {class: 'q-types__subheading'}, 'By chance'),
    keyedList(h('ul', {class: 'q-types__list'}), rowsOf('rolls'), r => r.key, entryRow('rolls')), add('rolls', {item: 'sticks', chance: .25, count: 1}));
}

// A type tool's window content (for the modal host): the type list (tabbed for items), the chosen type's sections,
// and a footer with Save, which writes the files this window changed.
//   tool: a TYPE_TOOLS id; start: a type key to open on ('tree:oak'); post(id, json) saves a file through the dev server.
export function typeEditor({tool = 'nodes', start = null, post}) {
  // Without a start, items open on the first tab's first item.
  const entries = typeEntries(tool), first = tool === 'items' ? entries.find(e => itemTab(e.row) === ITEM_TABS[0].id) : entries[0];
  const chosen = signal(start && entries.some(e => e.key === start) ? start : first.key);
  const rev = signal(0), dirty = signal(new Set()), status = signal('');
  const entry = () => entries.find(e => e.key === chosen.value);
  const tab = signal(tool === 'items' ? itemTab(entry().row) : null);
  // Live views are rebuilt from the data (an item's GEAR and FOODS, an enemy's ENEMIES row), so the game follows at
  // once; a new category takes an item to its tab.
  const changed = e => {
    if (e.kind === 'item') { refreshGear(e.id); refreshFood(e.id); tab.value = itemTab(e.row); }
    if (e.kind === 'enemy') refreshEnemy(e.id);
    dirty.value = new Set([...dirty.peek(), e.file]); rev.value++;
  };

  // Layout: sections with a heading, a wrapping row of fields (sized by what they hold), a row of switches.
  const section = (title, ...children) => h('section', {class: 'q-types__section'}, h('h4', {class: 'q-types__heading'}, title), ...children);
  const subheading = text => h('h5', {class: 'q-types__subheading'}, text);
  const fields = (...items) => h('div', {class: 'q-types__fields'}, ...items);
  const switches = (...items) => h('div', {class: 'q-types__switches'}, ...items);
  // size: 'num' (narrow), 'pick' (a choice), 'text' or 'wide' (the whole row); hint: a short line under the input.
  const field = (label, input, {size = 'num', hint = null} = {}) => h('label', {class: `q-types__field q-types__field--${size}`},
    h('span', {class: 'q-types__label'}, label), input, hint ? h('span', {class: 'q-types__hint'}, hint) : null);

  // Controls over a value: get() reads it, set(v) writes it (null or '' removes the field) and marks the entry changed.
  const num = ({get, set, step = 1, min = 0, blank = null, label = null}) => h('input', {type: 'number', class: 'q-input', min, step, 'aria-label': label, placeholder: blank ? () => { rev.value; return blank(); } : '',
    value: () => { rev.value; return get() ?? ''; },
    on: {change: ev => { const v = ev.target.value; if (v === '' && blank) set(null); else if (v !== '') set(Number(v)); }}});
  const choice = ({get, set, list}) => h('select', {class: 'q-select', on: {change: ev => set(ev.target.value)}},
    list.map(([v, label]) => h('option', {value: v, selected: () => { rev.value; return String(get() ?? '') === v; }}, label)));
  const check = (label, {get, set}) => h('label', {class: 'q-types__check'},
    h('input', {type: 'checkbox', checked: () => { rev.value; return !!get(); }, on: {change: ev => set(ev.target.checked)}}), h('span', null, label));
  // A field of an object (a type's row, or a block inside it); `make` creates the block on first write.
  const at = (e, read, key, make = read) => ({get: () => read()?.[key], set: v => { const o = make(); if (v === null || v === '' || v === false) delete o[key]; else o[key] = v; changed(e); }});
  const number = (e, key, {blank = null, step} = {}) => num({...at(e, () => e.row, key), step, blank});
  const text = (e, key, tag = 'input') => h(tag, {class: 'q-input q-types__text', ...(tag === 'textarea' ? {rows: 3} : {type: 'text'}),
    value: () => { rev.value; return e.row[key] ?? ''; },
    on: {change: ev => { e.row[key] = ev.target.value.trim(); changed(e); }}});
  // A type's name (item and enemy names can change, so the list and heading read them live).
  const nameOf = e => () => { rev.value; return e.kind === 'item' || e.kind === 'enemy' ? e.row.name : e.name; };
  // A list of rows inside a block (requirements, effects), re-keyed on every change like the drop table.
  const rowList = (rows, render) => keyedList(h('ul', {class: 'q-types__list'}), computed(() => { rev.value; return rows().map((row, i) => ({row, i, key: `${i}:${rev.value}`})); }), r => r.key, item => h('li', {class: 'q-types__row'}, render(item.peek())));
  const drops = e => section('Drops', dropTableEditor({get: () => e.row.drops, set: t => { if (t) e.row.drops = t; else delete e.row.drops; changed(e); }, rev}));

  // Resource nodes: a level, effort and XP (blank: from effort), then what one node gives.
  const nodeSections = e => [
    section('Gathering', fields(
      field('Level', number(e, 'level')), field('Effort (s)', number(e, 'effort', {step: .5})),
      field('Respawn (s)', number(e, 'respawn')), field('XP', number(e, 'xp', {blank: () => `${actionXp(e.row.effort, e.row.level)}`}), {hint: 'Blank: from effort'}))),
    drops(e)];

  // Items: what the inventory and shops show. Icons stay in code (icons.js).
  const itemSections = e => [
    section('General', fields(
      field('Name', text(e, 'name'), {size: 'text'}),
      field('Value', number(e, 'value'), {hint: () => { rev.value; return e.row.sellable === false ? 'Not sold to shops' : `Sells for ${sellPrice(e.id)} (${SELL_RATE * 100}%)`; }}),
      field('Category', choice({...at(e, () => e.row, 'category'), list: options(CATEGORIES)}), {size: 'pick'})),
    switches(check('Shops buy it', {get: () => e.row.sellable !== false, set: on => { if (on) delete e.row.sellable; else e.row.sellable = false; changed(e); }})),
    fields(field('Description', text(e, 'description', 'textarea'), {size: 'wide'}))),
    e.row.equipment ? equipmentSection(e) : null,
    e.row.consume ? consumeSection(e) : null];
  // Equipment (docs/COMBAT.md): where it's worn, how many hands, its bonuses and requirements. The formulas,
  // motions and models stay in code; GEAR (equipment.js) is the live view.
  const equipmentSection = e => {
    const eq = () => e.row.equipment, of = key => at(e, eq, key), focus = key => at(e, () => eq().focus, key, () => (eq().focus ??= {}));
    const focusField = key => num({...focus(key), set: v => { focus(key).set(v); if (eq().focus && !Object.keys(eq().focus).length) delete eq().focus; }, blank: () => '–'});
    const requirements = () => Object.entries(eq().requirements || {});
    const setRequirements = list => { if (list.length) eq().requirements = Object.fromEntries(list); else delete eq().requirements; changed(e); };
    const damage = type => check(titleCase(type), {get: () => eq().damageTypes?.includes(type), set: on => {
      // The first type is the hand's default, so existing order is kept and a new type goes last.
      const list = (eq().damageTypes || []).filter(t => t !== type); if (on) list.push(type); of('damageTypes').set(list.length ? list : null); }});
    return section('Equipment',
      fields(
        field('Slot', choice({...of('slot'), list: options(SLOTS)}), {size: 'pick'}),
        field('Hands', choice({get: () => eq().hands ?? 1, set: v => of('hands').set(v === '2' ? 2 : null), list: [['1', 'One'], ['2', 'Two']]}), {size: 'pick'}),
        field('Attack style', choice({...of('style'), list: [['', 'None'], ['melee', 'Melee'], ['ranged', 'Ranged']]}), {size: 'pick'}),
        field('Proficiency', choice({...of('proficiency'), list: [['', 'None'], ...options(WEAPON_PROFICIENCIES)]}), {size: 'pick'}),
        field('Ammo', choice({...of('ammo'), list: [['', 'None'], ...ITEM_CHOICES]}), {size: 'pick'})),
      switches(check('Shield', of('shield')), check('Cosmetic (a held tool)', of('cosmetic'))),
      subheading('Bonuses'),
      fields(
        field('Power', num({...of('power'), blank: () => '0'})), field('Accuracy', num({...of('accuracy'), blank: () => '0'})),
        field('Resistance', num({...of('resistance'), blank: () => '0'})),
        field('Interval (s)', num({...of('attackInterval'), step: .05, blank: () => '–'})), field('Range (tiles)', num({...of('range'), blank: () => '–'})),
        field('Focus power', focusField('power')), field('Focus accuracy', focusField('accuracy'))),
      subheading('Damage types'), switches(...DAMAGE_TYPES.map(damage)),
      subheading('Requirements'),
      rowList(requirements, ({row: [track, level], i}) => [
        choice({get: () => track, set: v => setRequirements(requirements().map((r, j) => (j === i ? [v, r[1]] : r))), list: TRACKS.map(t => [t.id, t.name])}),
        h('span', {class: 'q-types__inline'}, 'Level', num({get: () => level, set: v => setRequirements(requirements().map((r, j) => (j === i ? [r[0], Math.max(1, v ?? 1)] : r))), min: 1, label: 'Level'})),
        smallButton('Remove', () => setRequirements(requirements().filter((_, j) => j !== i)))]),
      smallButton('Add a requirement', () => setRequirements([...requirements(), [TRACKS.find(t => !eq().requirements?.[t.id]).id, 1]])));
  };
  // Consumables: what using one does. Restoring a resource is built; buffs are planned (docs/DESIGN.md).
  const consumeSection = e => {
    const effects = () => e.row.consume.effects, edit = run => { run(effects()); changed(e); };
    return section('When eaten',
      rowList(effects, ({i}) => [h('span', null, 'Restore'),
        choice({get: () => effects()[i].resource, set: v => edit(list => { list[i].resource = v; }), list: options(RESTORE_RESOURCES)}),
        h('span', {class: 'q-types__inline'}, 'by', num({get: () => effects()[i].amount, set: v => edit(list => { list[i].amount = v ?? 0; }), label: 'Amount'})),
        smallButton('Remove', () => edit(list => { list.splice(i, 1); }))]),
      smallButton('Add an effect', () => edit(list => { list.push({type: 'restore', resource: 'health', amount: 10}); })));
  };

  // NPCs (docs/COMBAT.md): the authored sheet and setup; health, damage, interval, resistance and Threat are derived
  // with the shared formulas (shown live in Results) unless an override sets them. Special attacks stay in code.
  const derivedOf = e => { const {sheet, overrides, ...config} = e.row; return sheet ? deriveEnemy(sheet, config) : null; };
  const npcSections = e => {
    const sheet = () => e.row.sheet, attr = key => at(e, () => sheet().attributes, key, () => sheet().attributes);
    const skill = (style, key) => at(e, () => sheet().skills[style], key, () => sheet().skills[style]);
    const override = key => at(e, () => e.row.overrides, key, () => (e.row.overrides ??= {}));
    const tidy = () => { if (e.row.overrides && !Object.keys(e.row.overrides).length) delete e.row.overrides; };
    const overrideField = (label, key, show = d => d?.[key]) => field(label, num({...override(key), set: v => { override(key).set(v); tidy(); }, step: key === 'interval' ? .05 : 1,
      blank: () => { const d = derivedOf(e), v = show(d); return v == null ? 'none' : String(round(v)); }}));
    const resistance = style => field(`${titleCase(style)} resist %`, num({get: () => e.row.overrides?.resistancePct?.[style], step: .1,
      set: v => { const r = {...(e.row.overrides?.resistancePct || {})}; if (v === null) delete r[style]; else r[style] = v; override('resistancePct').set(Object.keys(r).length ? r : null); tidy(); },
      blank: () => { const d = derivedOf(e); return d ? String(round(d.resistancePct[style])) : 'none'; }}));
    return [
      section('General', fields(field('Name', text(e, 'name'), {size: 'text'}), field('Respawn (s)', number(e, 'respawn')))),
      section('Behaviour',
        fields(field('Aggro range (tiles)', number(e, 'aggroRange')), field('Move speed (×)', number(e, 'moveSpeed', {step: .05, blank: () => '1'})),
          field('XP multiplier', number(e, 'xpMultiplier', {step: .1, blank: () => '1'})), field('XP level cap', number(e, 'xpLevelCap', {blank: () => 'none'}))),
        switches(check('Aggressive by default', at(e, () => e.row, 'aggressive')), check('Telegraphed', at(e, () => e.row, 'telegraphed')),
          check('Attacks pacifists', at(e, () => e.row, 'attacksPacifists')), check("Can't defeat the player", at(e, () => e.row, 'protected')), check('Boss', at(e, () => e.row, 'boss')))),
      sheet() ? section('Attack',
        fields(
          field('Style', choice({...at(e, () => e.row, 'style'), list: options(STYLES)}), {size: 'pick'}),
          field('Strategy', choice({...at(e, () => e.row, 'strategy'), list: options(Object.keys(STRATEGIES))}), {size: 'pick'}),
          field('Base interval (s)', number(e, 'baseInterval', {step: .05})), field('Miss %', number(e, 'missPercent'))),
        subheading('Damage types'), switches(...DAMAGE_TYPES.map(type => check(titleCase(type), {get: () => e.row.damageTypes?.includes(type), set: on => {
          const list = (e.row.damageTypes || []).filter(t => t !== type); if (on) list.push(type); at(e, () => e.row, 'damageTypes').set(list.length ? list : null); }}))),
        subheading('Can'), switches(check('Critical hit', at(e, () => e.row, 'canCritical')), check('Dodge', at(e, () => e.row, 'canDodge')), check('Block', at(e, () => e.row, 'canBlock')))) : null,
      sheet() ? section('Stat sheet',
        subheading('Attributes'), fields(...ATTRIBUTES.map(a => field(titleCase(a), num({...attr(a), min: -100})))),
        subheading('Skills'),
        h('table', {class: 'q-types__table'},
          h('thead', null, h('tr', null, h('th', null, ''), COMBAT_SKILLS.map(k => h('th', {scope: 'col'}, titleCase(k))))),
          h('tbody', null, STYLES.map(style => h('tr', null, h('th', {scope: 'row'}, titleCase(style)),
            COMBAT_SKILLS.map(k => h('td', null, num({...skill(style, k), min: -100, label: `${titleCase(style)} ${k}`}))))))),
        fields(field('Unarmed proficiency', num(at(e, () => sheet().proficiencies, 'unarmed')), {size: 'pick'}))) : null,
      section('Overrides', h('p', {class: 'q-types__note'}, sheet() ? 'Blank uses the value from the sheet.' : 'No sheet: these set its numbers.'),
        fields(overrideField('Health', 'health'), overrideField('Min damage', 'min'), overrideField('Max damage', 'max'), overrideField('Interval (s)', 'interval'),
          ...STYLES.map(resistance))),
      drops(e)];
  };
  // NPC Results: what the game uses now (derived, or the override), beside the inputs.
  const npcResults = e => {
    const live = () => { rev.value; return ENEMIES[e.id]; };
    const stat = (label, value) => h('div', {class: 'q-types__stat'}, h('dt', null, label), h('dd', null, value));
    return h('aside', {class: 'q-types__results', 'aria-label': 'Results'}, h('h4', {class: 'q-types__heading'}, 'Results'),
      h('dl', null,
        stat('Health', () => String(live().health)),
        stat('Damage', () => `${live().min}–${live().max}`),
        stat('Interval', () => `${round(live().interval)} s`),
        ...STYLES.map(style => stat(`${titleCase(style)} resist`, () => `${round(live().resistancePct?.[style] ?? 0)}%`)),
        stat('Threat Level', () => (live().threat ? String(live().threat.level) : '–'))));
  };

  const sectionsFor = e => (e.kind === 'item' ? itemSections(e) : e.kind === 'enemy' ? npcSections(e) : nodeSections(e));
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
    const body = h('div', {class: 'q-types__body'},
      h('header', {class: 'q-types__title'}, h('h3', null, nameOf(e)), h('p', {class: 'q-types__file'}, () => `src/data/${e.file}.json · shared by every ${nameOf(e)()}`)),
      sectionsFor(e));
    return e.kind === 'enemy' ? h('div', {class: 'q-types__split'}, body, npcResults(e)) : body;
  });
  const footer = h('footer', {class: 'q-types__bar'},
    h('p', {class: 'q-page__status', role: 'status'}, () => status.value || (dirty.value.size ? 'Unsaved changes.' : 'Edits apply in the world at once.')),
    h('button', {type: 'button', class: 'q-button', disabled: () => !dirty.value.size, on: {click: save}}, () => (dirty.value.size ? `Save ${dirty.value.size} file${dirty.value.size > 1 ? 's' : ''}` : 'Saved')));
  if (tool !== 'items') {
    const groups = [...new Set(entries.map(e => e.group))];
    return h('div', {class: 'q-types-window'},
      h('div', {class: 'q-types'},
        h('nav', {class: 'q-types__nav', 'aria-label': TYPE_TOOLS[tool].title}, groups.map(g => h('section', null, h('h4', {class: 'q-types__group'}, g), entries.filter(e => e.group === g).map(pick)))),
        detail(() => true)),
      footer);
  }
  // Items: one tab per kind, each with its own list; switching tabs opens that tab's first item.
  const inTab = id => computed(() => { rev.value; return entries.filter(e => itemTab(e.row) === id); });
  const showTab = id => { tab.value = id; if (itemTab(entry().row) !== id) chosen.value = inTab(id).peek()[0]?.key ?? chosen.peek(); };
  return h('div', {class: 'q-types-window'},
    subTabs({label: 'Item kinds', value: tab, onChange: showTab, tabs: ITEM_TABS.map(t => ({id: t.id, label: t.label, build: () => h('div', {class: 'q-types'},
      keyedList(h('nav', {class: 'q-types__nav', 'aria-label': t.label}), inTab(t.id), e => e.key, item => pick(item.peek())),
      detail(e => itemTab(e.row) === t.id))}))}),
    footer);
}
