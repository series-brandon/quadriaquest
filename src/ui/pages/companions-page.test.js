import test from 'node:test';
import assert from 'node:assert/strict';
import {installDom} from '../test-dom.js';
import {signal} from '../../reactive.js';
import {h, mount} from '../dom.js';
import {companionsPage} from './companions-page.js';

installDom();

const press = el => el.dispatchEvent(new window.Event('click'));

function fakeSystem() {
  const revision = signal(0), state = {owned: false, following: true, name: 'Pebble'};
  const set = patch => { Object.assign(state, patch); revision.value++; };
  return {revision, get state() { return {...state}; }, set, setFollowing(on) { set({following: !!on}); }};
}

test('shows nothing until a companion is owned, then follows its name and follow state', () => {
  const system = fakeSystem(), renames = [];
  const portrait = h('canvas');
  const {node} = mount(() => companionsPage({system, portrait, onRename: () => renames.push(1)}));
  const card = node.querySelector('.q-companion');
  assert.equal(card.hidden, true);
  assert.match(node.textContent, /No companions yet/);
  system.set({owned: true, name: 'Goober'});
  assert.equal(card.hidden, false);
  assert.equal(card.querySelector('h3').textContent, 'Goober');
  assert.ok(card.contains(portrait), 'the host’s live portrait is shown');
  assert.match(card.querySelector('[role=status]').textContent, /Following you/);
  const [rename, follow] = card.querySelectorAll('.q-companion__actions button');
  assert.equal(follow.textContent, 'Rest here');
  press(follow);
  assert.equal(system.state.following, false);
  assert.equal(follow.textContent, 'Follow me');
  assert.match(card.querySelector('[role=status]').textContent, /Resting/);
  press(rename);
  assert.deepEqual(renames, [1]);
  system.set({name: 'Biscuit'});
  assert.equal(card.querySelector('h3').textContent, 'Biscuit');
});
