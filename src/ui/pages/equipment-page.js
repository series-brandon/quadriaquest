import {computed, signal} from '../../reactive.js';
import {h} from '../dom.js';
import {iconNode} from '../icon.js';
import {keyedList} from '../list.js';
import {row} from '../controls.js';
import {GEAR, ARMOR_SLOTS} from '../../equipment.js';
import {ITEMS} from '../../items.js';
import {ICON_NAMES} from '../../icons.js';

const title = s => s[0].toUpperCase() + s.slice(1);
const SLOT_LABEL = {main: 'Main hand', off: 'Off hand', head: 'Head'};
const icon = id => iconNode(ICON_NAMES.includes(id) ? id : 'shields');

// The few numbers that tell gear apart, from the shared item definitions.
export function gearFacts(item) {
  const facts = [];
  if (item.power) facts.push(`+${item.power} Power`);
  if (item.accuracy) facts.push(`+${item.accuracy} Accuracy`);
  if (item.resistance) facts.push(`+${item.resistance} Resistance`);
  if (item.baseInterval) facts.push(`${item.baseInterval}s attacks`);
  if (item.range > 1) facts.push(`Range ${item.range}`);
  if (item.twoHanded) facts.push('Two-handed');
  if (item.offHand) facts.push('Either hand');
  return facts.join(' · ');
}

// Equipment page: what you wear (slot tiles) and the gear you own (rows with their equip
// actions). Equip rules, copies and busy checks belong to the shared equipment system; the page
// only calls its actions and follows its revision and the reactive inventory. With `assistance`, an
// Optimize button equips the best gear for the current class (the same optimize that switching
// class on the Combat page runs) and shows what it changed.
export function equipmentPage({equipment, inventory, assistance = null}) {
  const status = signal('');
  const slots = computed(() => (equipment.revision.value, equipment.slots));
  const owned = computed(() => Object.keys(GEAR).filter(id => inventory[id] > 0));
  // Armor slots appear once something could fill them.
  const shownSlots = computed(() => ['main', 'off', 'head', ...(owned.value.some(id => GEAR[id].armor) ? ARMOR_SLOTS : [])]);
  const name = id => GEAR[id]?.name || ITEMS[id]?.name || id;

  const run = action => {
    status.value = action.run() === false ? 'Finish what you’re doing before changing equipment.' : '';
  };

  const worn = keyedList(h('div', {class: 'q-slots'}), shownSlots, slot => slot, item => {
    const slot = item.peek(), id = computed(() => slots.value[slot]);
    return h('div', {class: 'q-slot', 'data-empty': () => !id.value},
      h('span', {class: 'q-slot__label'}, SLOT_LABEL[slot] ?? title(slot)),
      h('span', {class: 'q-slot__item'},
        keyedList(h('span', {class: 'q-slot__icon', 'aria-hidden': 'true'}), () => (id.value ? [id.value] : []), x => x, x => icon(x.peek())),
        h('span', null, () => (id.value ? name(id.value) : 'Empty'))));
  });

  const gear = keyedList(h('div', {class: 'q-list'}), owned, id => id, item => {
    const id = item.peek();
    const actions = computed(() => (equipment.revision.value, inventory[id], equipment.inventoryActions(id)));
    const equipped = computed(() => Object.values(slots.value).includes(id));
    return h('div', {class: 'q-gear', 'data-equipped': equipped},
      h('span', {class: 'q-gear__icon', 'aria-hidden': 'true'}, icon(id)),
      row({
        name: () => `${name(id)}${inventory[id] > 1 ? ` ×${inventory[id]}` : ''}`,
        detail: () => (equipped.value ? `Equipped · ${gearFacts(GEAR[id])}` : gearFacts(GEAR[id]) || ITEMS[id]?.description || ''),
        actions: [keyedList(h('span', {class: 'q-row__buttons'}), actions, action => action.label.replace(/^Unequip|^Equip/, ''), action => h('button', {
          type: 'button',
          class: 'q-button q-button--small',
          on: {click: () => run(action.peek())},
        }, () => action.value.label))],
      }));
  });

  const optimizer = () => {
    const tuned = computed(() => (assistance.revision.value, assistance.settings.style));
    const report = computed(() => (assistance.revision.value, assistance.optimizeReport));
    return h('div', {class: 'q-page__group'},
      h('button', {type: 'button', class: 'q-button q-button--quiet', on: {click: () => assistance.optimize()}}, () => `Optimize for ${title(tuned.value)}`),
      h('p', {class: 'q-page__status', role: 'status', hidden: () => !report.value}, report));
  };

  return h('div', {class: 'q-page q-equipment-page'},
    h('span', {class: 'q-label'}, 'Worn'),
    worn,
    h('p', {class: 'q-page__status', role: 'status', hidden: () => !status.value}, status),
    assistance ? optimizer() : null,
    h('span', {class: 'q-label'}, 'Your gear'),
    h('p', {class: 'q-page__help', hidden: () => owned.value.length > 0}, 'No gear yet. Craft or find weapons, shields and armor, then equip them here.'),
    gear);
}
