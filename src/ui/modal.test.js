import test from 'node:test';
import assert from 'node:assert/strict';
import {installDom} from './test-dom.js';
import {signal} from '../reactive.js';
import {h} from './dom.js';
import {createModalHost, confirmModal} from './modal.js';

installDom();

const press = el => el.dispatchEvent(new window.Event('click'));
const escape = dialog => dialog.dispatchEvent(new window.Event('cancel', {cancelable: true}));

test('open builds the content in the shared frame; closing disposes its bindings and removes it', () => {
  const host = createModalHost();
  const count = signal(1), closed = [];
  let writes = 0;
  const handle = host.open({id: 'demo', title: 'Demo', onClose: reason => closed.push(reason), build: ({close}) => [
    h('p', null, () => { writes++; return `Count ${count.value}`; }),
    h('button', {type: 'button', on: {click: () => close('done')}}, 'Done'),
  ]});
  const dialog = document.body.querySelector('dialog.q-modal');
  assert.equal(dialog.open, true);
  assert.equal(dialog.getAttribute('aria-label'), 'Demo');
  assert.equal(dialog.querySelector('.q-modal__title').textContent, 'Demo');
  assert.equal(host.isOpen('demo'), true);
  assert.equal(host.anyOpen.value, true);
  count.value = 2;
  assert.match(dialog.textContent, /Count 2/);
  press(dialog.querySelector('.q-modal__body button'));
  assert.deepEqual(closed, ['done']);
  assert.equal(dialog.isConnected, false);
  assert.equal(handle.isOpen, false);
  assert.equal(host.anyOpen.value, false);
  const before = writes;
  count.value = 3;
  assert.equal(writes, before, 'no bindings survive the close');
});

test('the close button and Escape dismiss; required dialogs have neither and survive closeAll', () => {
  const host = createModalHost();
  const reasons = [];
  host.open({id: 'a', title: 'A', onClose: r => reasons.push(r), build: () => 'a'});
  press(document.body.querySelector('.q-modal__close'));
  assert.deepEqual(reasons, ['dismiss']);

  host.open({id: 'b', title: 'B', onClose: r => reasons.push(r), build: () => 'b'});
  escape(document.body.querySelector('dialog.q-modal'));
  assert.deepEqual(reasons, ['dismiss', 'dismiss']);

  host.open({id: 'name', title: 'Name', required: true, build: () => 'name'});
  host.open({id: 'other', title: 'Other', onClose: r => reasons.push(r), build: () => 'other'});
  const required = [...document.body.querySelectorAll('dialog.q-modal')].find(d => d.textContent.includes('Name'));
  assert.equal(required.querySelector('.q-modal__close'), null);
  escape(required);
  assert.equal(host.isOpen('name'), true, 'Escape leaves a required dialog open');
  host.closeAll('attacked');
  assert.equal(host.isOpen('name'), true);
  assert.equal(host.isOpen('other'), false);
  assert.equal(reasons.at(-1), 'attacked');
  // A browser-made close (outside the host) reopens a required dialog.
  required.close();
  assert.equal(required.open, true);
  assert.equal(host.close('name'), true, 'the owner can still close it');
  assert.equal(host.anyOpen.value, false);
});

test('opening an open id replaces it', () => {
  const host = createModalHost();
  const reasons = [];
  host.open({id: 'x', title: 'First', onClose: r => reasons.push(r), build: () => 'first'});
  host.open({id: 'x', title: 'Second', build: () => 'second'});
  const dialogs = document.body.querySelectorAll('dialog.q-modal');
  assert.equal(dialogs.length, 1);
  assert.match(dialogs[0].textContent, /second/);
  assert.deepEqual(reasons, ['replaced']);
  host.close('x');
});

test('confirmModal is compact; confirm runs the action, anything else cancels', () => {
  const host = createModalHost();
  const log = [];
  confirmModal(host, {id: 'eat', title: 'Eat at full health?', message: 'Your health is already full.', confirm: 'Eat anyway', onConfirm: () => log.push('eat'), onCancel: () => log.push('cancel')});
  let dialog = document.body.querySelector('dialog.q-modal');
  assert.equal(dialog.classList.contains('q-modal--compact'), true);
  const [yes, no] = dialog.querySelectorAll('.q-modal__actions button');
  assert.equal(yes.textContent, 'Eat anyway');
  press(yes);
  assert.deepEqual(log, ['eat']);
  const handle = confirmModal(host, {id: 'eat', title: 'Eat?', message: '…', onConfirm: () => log.push('eat'), onCancel: () => log.push('cancel')});
  dialog = document.body.querySelector('dialog.q-modal');
  press(dialog.querySelectorAll('.q-modal__actions button')[1]);
  handle.close();
  assert.deepEqual(log, ['eat', 'cancel'], 'cancelled once');
});
