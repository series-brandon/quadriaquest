import {signal} from '../../reactive.js';
import {h} from '../dom.js';
import {iconNode} from '../icon.js';
import {randomName} from '../../random-names.js';

// Naming dialog on the modal host: a name field with a random-name die and a confirm button.
// Enter submits. `onSubmit(name)` runs after the dialog closes.
export function nameDialog(host, {id, title, label = 'Name', value = '', names, required = false, maxLength = 20, onSubmit}) {
  return host.open({
    id,
    title,
    required,
    build: ({close}) => {
      const status = signal('');
      let input;
      const submit = event => {
        event.preventDefault();
        const name = input.value.trim();
        if (!name) {
          status.value = 'Please enter a name.';
          return;
        }
        close('submitted');
        onSubmit(name);
      };
      return h('form', {class: 'q-name', on: {submit}},
        h('label', {class: 'q-field'},
          h('span', {class: 'q-label'}, label),
          h('span', {class: 'q-name__entry'},
            h('input', {class: 'q-input', maxlength: maxLength, autocomplete: 'off', autofocus: true, value, ref: element => { input = element; }, on: {input: () => { status.value = ''; }}}),
            h('button', {
              type: 'button',
              class: 'q-name__dice',
              title: 'Generate a random name',
              'aria-label': 'Generate a random name',
              on: {click: () => { input.value = randomName(input.value, Math.random, names); status.value = ''; }},
            }, iconNode('dice')))),
        h('p', {class: 'q-page__status', role: 'status', hidden: () => !status.value}, status),
        h('button', {type: 'submit', class: 'q-button'}, 'Confirm name'));
    },
  });
}
