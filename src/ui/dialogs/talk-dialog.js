import {h} from '../dom.js';

// Talking to a townsfolk with something to offer (a shop, a job, a delivery for them): their line and a
// few choices, compact and centered on every screen. options: [{label, run}]; choosing one closes the
// dialog first, then runs it. Goodbye just closes.
export function talkDialog({line, options, close}) {
  return [
    h('p', {class: 'q-modal__message'}, line),
    h('div', {class: 'q-modal__actions q-talk__options'},
      ...options.map((option, i) => h('button', {type: 'button', class: 'q-button', autofocus: i === 0, on: {click: () => { close('chosen'); option.run(); }}}, option.label)),
      h('button', {type: 'button', class: 'q-button q-button--quiet', on: {click: () => close('goodbye')}}, 'Goodbye')),
  ];
}
