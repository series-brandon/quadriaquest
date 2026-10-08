import {computed, signal} from '../../reactive.js';
import {h} from '../dom.js';
import {progressBar, subTabs} from '../controls.js';
import {levelProgress} from '../../combat-formulas.js';
import {ATTRIBUTES, ATTRIBUTE_INFO} from '../../character.js';

const whole = n => Math.floor(n).toLocaleString();
const title = s => s[0].toUpperCase() + s.slice(1);

// Character page: core level (all skill and proficiency XP feeds it) above three sub-tabs,
// Attributes, Skills and Proficiencies. The host supplies the two progression lists; `section`
// is the selected sub-tab, owned by the host so it can open a given one (and remembers it).
// `guide` (a function giving a sub-tab id) highlights that sub-tab for a lesson until it is chosen.
export function characterPage({character = null, onAllocate = () => {}, section = signal('attributes'), guide = () => null, skills, proficiencies}) {
  const guided = id => () => guide() === id && section.value !== id;
  const lists = [{id: 'skills', label: 'Skills', guide: guided('skills'), build: skills}, {id: 'proficiencies', label: 'Proficiencies', guide: guided('proficiencies'), build: proficiencies}];
  // Without a character (isolated tests and previews) only the progression lists show.
  if (!character) {
    if (section.peek() === 'attributes') section.value = 'skills';
    return h('div', {class: 'q-page q-character-page'}, subTabs({label: 'Character', value: section, tabs: lists}));
  }
  const state = computed(() => (character.revision.value, {
    core: levelProgress(character.core.xp),
    xp: character.core.xp,
    unspent: character.unspent,
    attributes: ATTRIBUTES.map(id => ({value: character.attribute(id), can: character.canAllocate(id)})),
  }));
  const unspent = computed(() => state.value.unspent > 0);
  const points = () => `${state.value.unspent} unspent point${state.value.unspent === 1 ? '' : 's'}`;
  const spend = id => {
    if (character.allocate(id)) onAllocate(id);
  };

  const attributes = () => h('div', {class: 'q-page__group'},
    h('div', {class: 'q-core__points'},
      h('span', {class: 'q-label'}, 'Attribute points'),
      h('b', {'data-unspent': unspent}, points)),
    h('div', {class: 'q-list'}, ATTRIBUTES.map((id, index) => h('div', {class: 'q-row q-attribute'},
      h('span', {class: 'q-row__text'}, h('span', {class: 'q-row__name'}, title(id)), h('small', {class: 'q-row__detail'}, ATTRIBUTE_INFO[id])),
      h('b', {class: 'q-attribute__value'}, () => state.value.attributes[index].value),
      h('button', {
        type: 'button',
        class: 'q-button q-button--square',
        'aria-label': `Spend a point on ${id}`,
        disabled: () => !state.value.attributes[index].can,
        on: {click: () => spend(id)},
      }, '+')))));

  return h('div', {class: 'q-page q-character-page'},
    h('div', {class: 'q-core', role: 'group', 'aria-label': 'Core level'},
      h('div', {class: 'q-core__head'},
        h('strong', null, () => `Core level ${state.value.core.level}`),
        h('small', null, () => `${whole(Math.ceil(state.value.core.remaining))} XP to level ${state.value.core.level + 1}`)),
      progressBar({label: 'Core level progress', value: () => state.value.core.fraction})),
    subTabs({label: 'Character', value: section, tabs: [
      {id: 'attributes', label: 'Attributes', badge: unspent, badgeLabel: 'Points to spend', guide: guided('attributes'), build: attributes},
      ...lists,
    ]}));
}
