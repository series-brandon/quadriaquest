import {h} from '../dom.js';
import {slider, toggleSwitch} from '../controls.js';

const CHANNELS = [['music', 'Music'], ['effects', 'Effects'], ['ambience', 'Ambience']];

// Settings page: sound levels and mute. It reads the game audio's reactive settings and writes
// through `audio.set`, so the journal page and the popup always agree.
export function settingsPage({audio}) {
  return h('div', {class: 'q-page q-page--form q-settings-page'},
    h('span', {class: 'q-label'}, 'Sound'),
    h('div', {class: 'q-card q-settings__group'},
      CHANNELS.map(([key, label]) => slider({
        label,
        value: () => audio.settings[key],
        onInput: next => { audio.unlock(); audio.set(key, next); },
      })),
      toggleSwitch({label: 'Mute all', on: () => audio.settings.muted, onChange: on => audio.set('muted', on)})));
}
