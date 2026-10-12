import {computed} from '../../reactive.js';
import {ITEMS} from '../../items.js';
import {h} from '../dom.js';
import {keyedList} from '../list.js';

// Companions page: your companion's portrait, name and what it's doing, with Rename, Follow / Rest
// and an Outfit list of owned companion gear to put on or take off. State belongs to the shared
// companion system (its revision); the host supplies the live 3D portrait canvas and the naming flow.
export function companionsPage({system, portrait = null, onRename = () => {}}) {
  const state = computed(() => (system.revision.value, system.state));
  // Owned companion gear (the inventory is reactive) with the system's own put on / take off action.
  const outfit = computed(() => (system.revision.value, Object.keys(system.gear || {}).filter(id => system.owns(id)).map(id => {
    const [action] = system.inventoryActions(id);
    return {id, name: ITEMS[id]?.name || id, worn: Object.values(system.state.outfit).includes(id), label: action.label, run: action.run};
  })));
  return h('div', {class: 'q-page q-companions-page'},
    h('p', {class: 'q-page__help', hidden: () => state.value.owned}, 'No companions yet.'),
    h('article', {class: 'q-card q-companion', hidden: () => !state.value.owned, 'aria-label': () => state.value.name},
      portrait ? h('div', {class: 'q-companion__portrait'}, portrait) : null,
      h('div', {class: 'q-companion__text'},
        h('h3', null, () => state.value.name),
        h('small', null, 'Corgi'),
        h('p', null, 'Your little companion. Safe from harm and always happy to see you.'),
        h('small', {class: 'q-companion__status', role: 'status'}, () => (state.value.following ? 'Following you' : 'Resting where you left them'))),
      h('div', {class: 'q-companion__outfit', hidden: () => !outfit.value.length},
        h('h4', {class: 'q-label'}, 'Outfit'),
        keyedList(h('ul', {class: 'q-companion__outfit-list'}), outfit, item => item.id, item => h('li', {class: 'q-companion__outfit-item'},
          h('span', null, () => item.value.name, h('small', null, () => (item.value.worn ? ' · Wearing' : ''))),
          h('button', {type: 'button', class: 'q-button q-button--small', on: {click: () => item.value.run()}}, () => item.value.label)))),
      h('div', {class: 'q-companion__actions'},
        h('button', {type: 'button', class: 'q-button q-button--quiet', on: {click: () => onRename()}}, 'Rename'),
        h('button', {type: 'button', class: 'q-button', on: {click: () => system.setFollowing(!system.state.following)}}, () => (state.value.following ? 'Rest here' : 'Follow me')))));
}
