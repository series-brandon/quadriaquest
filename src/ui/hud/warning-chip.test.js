import test, {mock} from 'node:test';
import assert from 'node:assert/strict';
import {installDom} from '../test-dom.js';
import {signal} from '../../reactive.js';
import {mount} from '../dom.js';
import {warningChip} from './warning-chip.js';

installDom();

test('the chip announces new advice and events, then fades and takes no space', () => {
  mock.timers.enable({apis: ['setTimeout']});
  try {
    const advice = signal('');
    let chip;
    const view = mount(() => (chip = warningChip({id: 'status', advice, duration: 3000})).node);
    const node = view.node;
    assert.equal(node.hidden, true, 'idle: hidden, no space');
    assert.equal(node.getAttribute('role'), 'status');

    advice.value = 'Use caution.';
    assert.equal(node.hidden, false);
    assert.equal(node.textContent, 'Use caution.');
    assert.equal(node.hasAttribute('data-shown'), true);
    mock.timers.tick(3000);
    assert.equal(node.hasAttribute('data-shown'), false, 'fading');
    mock.timers.tick(300);
    assert.equal(node.hidden, true, 'gone after the fade');

    advice.value = 'Use caution.';
    assert.equal(node.hidden, true, 'continuing advice does not reappear');
    chip.announce('Under attack!');
    assert.equal(node.textContent, 'Under attack!');
    mock.timers.tick(2000);
    advice.value = 'Fleeing is highly recommended!';
    assert.equal(node.textContent, 'Fleeing is highly recommended!', 'a new message replaces the old one');
    mock.timers.tick(2000);
    assert.equal(node.hasAttribute('data-shown'), true, 'and restarts its display time');

    view.dispose();
    mock.timers.tick(10000);
  } finally {
    mock.timers.reset();
  }
});
