import test from 'node:test';
import assert from 'node:assert/strict';
import {installDom} from '../test-dom.js';
import {signal, reactiveRecord} from '../../reactive.js';
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

test('the Outfit list shows owned companion gear and uses the system’s put on / take off action', () => {
  const inventory = reactiveRecord({companionHats: 0});
  let worn = null;
  const system = {
    revision: signal(0),
    setFollowing() {},
    gear: {companionHats: {slot: 'head'}},
    owns: id => inventory[id] > 0,
    get state() { return {owned: true, following: true, name: 'Biscuit', outfit: {head: worn}}; },
    inventoryActions: id => [{label: worn === id ? 'Remove from Biscuit' : 'Put on Biscuit', run: () => { worn = worn === id ? null : id; system.revision.value++; }}],
  };
  const {node} = mount(() => companionsPage({system}));
  const outfit = node.querySelector('.q-companion__outfit');
  assert.equal(outfit.hidden, true, 'nothing to wear yet');
  inventory.companionHats = 1;
  assert.equal(outfit.hidden, false);
  const row = outfit.querySelector('li'), button = () => outfit.querySelector('button');
  assert.match(row.textContent, /Companion Top Hat/);
  assert.equal(button().textContent, 'Put on Biscuit');
  press(button());
  assert.equal(worn, 'companionHats');
  assert.match(row.textContent, /Wearing/);
  assert.equal(button().textContent, 'Remove from Biscuit');
  assert.equal(outfit.querySelector('li'), row, 'the row is kept across updates');
  inventory.companionHats = 0;
  assert.equal(outfit.hidden, true);
});
