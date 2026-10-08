import test, {mock} from 'node:test';
import assert from 'node:assert/strict';
import {installDom} from '../test-dom.js';
import {signal} from '../../reactive.js';
import {mount} from '../dom.js';
import {messageToast, objectiveToast, itemFeed, levelUps} from './notices.js';

installDom();

test('the message toast shows, replaces, fades and takes no space', () => {
  mock.timers.enable({apis: ['setTimeout']});
  try {
    let toast;
    const view = mount(() => (toast = messageToast()).node);
    const node = view.node;
    assert.equal(node.hidden, true);
    toast.show('Pack up your existing Campfire first.');
    assert.equal(node.textContent, 'Pack up your existing Campfire first.');
    assert.equal(node.hasAttribute('data-shown'), true);
    mock.timers.tick(2000);
    toast.show('Attacks are prevented in this mode.');
    mock.timers.tick(2000);
    assert.equal(node.hasAttribute('data-shown'), true, 'a new message restarts the clock');
    mock.timers.tick(700);
    assert.equal(node.hasAttribute('data-shown'), false);
    mock.timers.tick(300);
    assert.equal(node.hidden, true);
    view.dispose();
  } finally { mock.timers.reset(); }
});

test('the quest-progress pop-up follows notices and marks completion', () => {
  mock.timers.enable({apis: ['setTimeout']});
  try {
    const notice = signal(null);
    const view = mount(() => objectiveToast({notice}));
    const node = view.node;
    assert.equal(node.hidden, true);
    notice.value = {seq: 1, title: 'Collect ground items', current: 3, total: 6};
    assert.equal(node.querySelector('strong').textContent, 'Collect ground items · 3/6');
    assert.match(node.querySelector('.q-objective__fill').style.getPropertyValue('transform'), /scaleX\(0.5\)/);
    notice.value = {seq: 2, title: 'Collect ground items', current: 6, total: 6};
    assert.equal(node.querySelector('strong').textContent, '✓ Collect ground items · 6/6');
    assert.equal(node.hasAttribute('data-complete'), true);
    mock.timers.tick(4500);
    mock.timers.tick(650);
    assert.equal(node.hidden, true);
    notice.value = {seq: 3, title: 'Chop a tree', current: 0, total: 1};
    notice.value = null;
    assert.equal(node.hidden, true, 'null dismisses');
    view.dispose();
  } finally { mock.timers.reset(); }
});

test('the item feed merges repeated pickups, shows crafts with their costs, and caps receipts', () => {
  mock.timers.enable({apis: ['setTimeout']});
  try {
    let feed;
    const view = mount(() => (feed = itemFeed()).node);
    const node = view.node;
    const receipts = () => [...node.querySelectorAll('.q-receipt')];
    feed.show({sticks: 1});
    feed.show({sticks: 2});
    assert.equal(receipts().length, 1, 'same item, same direction: one receipt');
    assert.equal(receipts()[0].textContent, '+Sticks ×3');
    feed.show({sticks: -1, stones: -1, axes: 1});
    const craft = receipts()[1];
    assert.match(craft.textContent, /Crafted Crude Axe ×1/);
    assert.match(craft.querySelector('small').textContent, /Used Sticks ×1 · Rocks ×1/);
    for (let i = 0; i < 5; i++) feed.show({[['logs', 'stone', 'flint', 'rawFish', 'rods'][i]]: 1});
    assert.equal(receipts().length, 4, 'at most four');
    mock.timers.tick(3800);
    assert.ok(receipts().every(r => r.hasAttribute('data-leaving')));
    mock.timers.tick(350);
    assert.equal(receipts().length, 0);
    feed.show({sticks: 1});
    feed.clear();
    assert.equal(receipts().length, 0);
    view.dispose();
  } finally { mock.timers.reset(); }
});

test('level-up receipts stack, expire and clear', () => {
  mock.timers.enable({apis: ['setTimeout']});
  try {
    const notice = signal(null);
    const view = mount(() => levelUps({notice}));
    const node = view.node;
    notice.value = {seq: 1, title: '✦ Gathering level has increased!', detail: 'Level 2 · Gathering is now faster'};
    notice.value = {seq: 2, title: '✦ Mining level has increased!', detail: 'Level 2'};
    assert.equal(node.querySelectorAll('.q-level').length, 2);
    assert.match(node.textContent, /Gathering is now faster/);
    mock.timers.tick(5000);
    assert.equal(node.querySelectorAll('.q-level').length, 0);
    notice.value = {seq: 3, title: 'x', detail: 'y'};
    notice.value = {seq: 4, clear: true};
    assert.equal(node.querySelectorAll('.q-level').length, 0);
    view.dispose();
  } finally { mock.timers.reset(); }
});
