import {h} from '../dom.js';
import {segmented, slider, toggleSwitch} from '../controls.js';
import {QUALITY_TIERS} from '../../render-quality.js';

const CHANNELS = [['music', 'Music'], ['effects', 'Effects'], ['ambience', 'Ambience']];

// Settings page: sound levels and mute, and graphics quality. It reads the game audio's reactive
// settings and writes through `audio.set`, and the render quality's signals through `setMode`, so the
// journal page and the popup always agree. `quality` is optional (previews without a renderer).
export function settingsPage({audio, quality = null}) {
  const graphics = quality ? [
    h('span', {class: 'q-label'}, 'Graphics'),
    h('div', {class: 'q-card q-settings__group'},
      segmented({label: 'Graphics quality', value: () => quality.mode.value, onChange: next => quality.setMode(next),
        options: [{value: 'auto', label: 'Auto'}, ...Object.entries(QUALITY_TIERS).map(([value, tier]) => ({value, label: tier.label}))]}),
      h('p', {class: 'q-page__help'}, () => (quality.mode.value === 'auto'
        ? `Auto lowers detail if the game runs slowly. Now: ${QUALITY_TIERS[quality.tier.value].label}.`
        : 'Lower settings draw fewer pixels and simpler shadows for weaker devices.')),
      h('p', {class: 'q-page__help', hidden: () => (quality.tier.value, !quality.antialiasMismatch)}, 'Edge smoothing changes apply the next time you open the game.')),
  ] : null;
  return h('div', {class: 'q-page q-page--form q-settings-page'},
    h('span', {class: 'q-label'}, 'Sound'),
    h('div', {class: 'q-card q-settings__group'},
      CHANNELS.map(([key, label]) => slider({
        label,
        value: () => audio.settings[key],
        onInput: next => { audio.unlock(); audio.set(key, next); },
      })),
      toggleSwitch({label: 'Mute all', on: () => audio.settings.muted, onChange: on => audio.set('muted', on)})),
    graphics);
}
