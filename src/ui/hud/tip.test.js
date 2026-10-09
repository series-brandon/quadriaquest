import test from 'node:test';
import assert from 'node:assert/strict';
import {installDom} from '../test-dom.js';
import {createTip} from './tip.js';

installDom();

const press = el => el.dispatchEvent(new window.Event('click'));

test('show fills the card; the action runs the owner’s callback; hide closes it', () => {
  const tip = createTip(), box = tip.node, pressed = [];
  assert.equal(box.hidden, true);
  tip.show({title: 'Chop a tree', text: 'Click a tree with your Crude Axe.', emphasis: ['Crude Axe'], action: {label: 'Dismiss', onPress: () => pressed.push('dismiss')}});
  assert.equal(box.hidden, false);
  assert.equal(box.id, 'gather-tutorial');
  assert.equal(box.querySelector('#tutorial-title').textContent, 'Chop a tree');
  const copy = box.querySelector('#tutorial-copy');
  assert.equal(copy.textContent, 'Click a tree with your Crude Axe.');
  assert.equal(copy.querySelector('strong').textContent, 'Crude Axe', 'item names are emphasised');
  const action = box.querySelector('#tutorial-continue');
  assert.equal(action.textContent, 'Dismiss');
  assert.equal(box.querySelector('#tutorial-help').hidden, true);
  assert.equal(box.querySelector('.q-tip__track').hidden, true, 'no progress: no bar');
  press(action);
  assert.deepEqual(pressed, ['dismiss']);
  tip.hide();
  assert.equal(box.hidden, true);
});

test('updates patch the current tip: counts, progress, labels, disabled and help', () => {
  const tip = createTip(), box = tip.node, pressed = [];
  tip.show({title: 'Rotate your view', text: 'Drag to look around.', action: {label: 'Continue', disabled: true, onPress: () => pressed.push('continue')}});
  const action = box.querySelector('#tutorial-continue');
  assert.equal(action.disabled, true);
  press(action);
  assert.deepEqual(pressed, [], 'a disabled action does nothing');
  tip.updateAction({disabled: false, label: 'Got it!'});
  assert.equal(action.disabled, false);
  assert.equal(action.textContent, 'Got it!');
  tip.update({count: '3 / 6 collected', progress: 0.5, complete: true});
  assert.equal(box.querySelector('#tutorial-count').textContent, '3 / 6 collected');
  assert.equal(box.querySelector('.q-tip__track').hidden, false);
  assert.match(box.querySelector('#tutorial-progress').style.getPropertyValue('transform'), /scaleX\(0.5\)/);
  assert.equal(box.hasAttribute('data-complete'), true);
  let helped = 0;
  tip.update({help: {onPress: () => helped++}});
  const help = box.querySelector('#tutorial-help');
  assert.equal(help.hidden, false);
  assert.equal(help.textContent, 'Show me how');
  press(help);
  assert.equal(helped, 1);
  tip.update({action: null});
  assert.equal(action.hidden, true);
  tip.show({title: 'New', text: 'Fresh tip'});
  assert.equal(box.querySelector('#tutorial-count').textContent, '', 'show replaces everything');
  assert.equal(help.hidden, true);
});

test('the tutorial skip link belongs to the chapter, so a new tip keeps it', () => {
  const tip = createTip(), box = tip.node, skips = [];
  const link = () => box.querySelector('#tutorial-skip');
  tip.show({title: 'One', text: 'First tip.'});
  assert.equal(link().hidden, true, 'no chapter, no link');
  tip.setSkip({label: 'Skip this part', onPress: () => skips.push(1)});
  assert.equal(link().hidden, false);assert.equal(link().textContent, 'Skip this part');
  tip.show({title: 'Two', text: 'Another tip.'});
  assert.equal(link().hidden, false, 'replacing the tip keeps the link');
  link().dispatchEvent(new window.Event('click'));
  assert.deepEqual(skips, [1]);
  tip.setSkip(null);assert.equal(link().hidden, true);
});
