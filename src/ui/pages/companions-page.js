import {computed} from '../../reactive.js';
import {h} from '../dom.js';

// Companions page: your companion's portrait, name and what it's doing, with Rename and
// Follow / Rest. State belongs to the shared companion system (its revision); the host supplies
// the live 3D portrait canvas and the naming flow.
export function companionsPage({system, portrait = null, onRename = () => {}}) {
  const state = computed(() => (system.revision.value, system.state));
  return h('div', {class: 'q-page q-companions-page'},
    h('p', {class: 'q-page__help', hidden: () => state.value.owned}, 'No companions yet.'),
    h('article', {class: 'q-card q-companion', hidden: () => !state.value.owned, 'aria-label': () => state.value.name},
      portrait ? h('div', {class: 'q-companion__portrait'}, portrait) : null,
      h('div', {class: 'q-companion__text'},
        h('h3', null, () => state.value.name),
        h('small', null, 'Corgi'),
        h('p', null, 'Your little companion. Safe from harm and always happy to see you.'),
        h('small', {class: 'q-companion__status', role: 'status'}, () => (state.value.following ? 'Following you' : 'Resting where you left them'))),
      h('div', {class: 'q-companion__actions'},
        h('button', {type: 'button', class: 'q-button q-button--quiet', on: {click: () => onRename()}}, 'Rename'),
        h('button', {type: 'button', class: 'q-button', on: {click: () => system.setFollowing(!system.state.following)}}, () => (state.value.following ? 'Rest here' : 'Follow me')))));
}
