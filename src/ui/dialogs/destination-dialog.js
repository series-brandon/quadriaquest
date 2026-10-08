import {signal} from '../../reactive.js';
import {h} from '../dom.js';

// Iter Crystal dialog for the modal host: pick a destination and travel, or use the crystal's
// services. Travel and services belong to the shared systems; `source` is the crystal (null in
// previews). `travelTo(id)` returns a status message when travel could not start.
export function destinationDialog({areas, visited, source, initial, travelTo, services, close}) {
  const selected = signal(initial);
  const travelStatus = signal(source ? '' : 'Preview only — approach an Iter Crystal to travel.');
  const serviceStatus = signal('');
  const here = areas.id;

  const travel = () => {
    const problem = travelTo(selected.peek());
    if (problem) travelStatus.value = problem;
    else close('travelled');
  };
  const service = run => {
    serviceStatus.value = source?.available() ? services?.[run]() || '' : 'Preview only — approach an Iter Crystal to use its services.';
  };

  return [
    h('p', {class: 'q-page__help'}, 'Choose your next adventure.'),
    h('div', {class: 'q-list', role: 'group', 'aria-label': 'Destinations'}, areas.list().map(area => h('button', {
      type: 'button',
      class: 'q-tile',
      disabled: area.id === here,
      'aria-pressed': () => selected.value === area.id,
      on: {click: () => { selected.value = area.id; }},
    },
    h('strong', null, `${area.name || area.id}${area.id === here ? ' · You are here' : !visited.has(area.id) ? ' · New' : ''}`),
    area.description ? h('small', null, area.description) : null))),
    h('p', {class: 'q-page__status', role: 'status', hidden: () => !travelStatus.value}, travelStatus),
    h('button', {type: 'button', class: 'q-button', disabled: () => !source || !selected.value || selected.value === here, on: {click: travel}}, 'Travel'),
    h('h3', {class: 'q-modal__subtitle'}, 'Crystal services'),
    h('p', {class: 'q-page__help'}, 'Available outside combat. Both fully restore Health, Mana, Stamina, Energy and Ki.'),
    h('div', {class: 'q-list'},
      h('button', {type: 'button', class: 'q-button q-button--quiet', on: {click: () => service('restore')}}, 'Restore'),
      h('button', {type: 'button', class: 'q-button q-button--quiet', on: {click: () => service('respec')}}, 'Redistribute attribute points')),
    h('p', {class: 'q-page__status', role: 'status', hidden: () => !serviceStatus.value}, serviceStatus),
  ];
}
