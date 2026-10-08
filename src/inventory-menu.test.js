import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {createInventoryMenu} from './inventory-menu.js';

test('item details show the game-supplied per-item settings and write them back', () => {
  const {window, document} = parseHTML('<!doctype html><html><body><div id="host"></div></body></html>');
  const previous = globalThis.document;
  globalThis.document = document;
  try {
    const inventory = {cookedFish: 2, sticks: 1}, excluded = new Set();
    const settingsFor = id => (id === 'cookedFish' ? [{label: 'Allow auto eating', checked: !excluded.has(id), onChange: on => (on ? excluded.delete(id) : excluded.add(id))}] : []);
    const menu = createInventoryMenu(document.getElementById('host'), () => inventory, () => {}, () => {}, {}, settingsFor);
    menu.open();
    const select = id => menu.panel.querySelector(`[data-item="${id}"]`).dispatchEvent(new window.Event('click'));
    select('cookedFish');
    const box = menu.panel.querySelector('.inventory-setting input');
    assert.equal(menu.panel.querySelector('.inventory-setting').textContent, 'Allow auto eating');
    assert.equal(box.checked, true);
    box.checked = false;
    box.dispatchEvent(new window.Event('change'));
    assert.equal(excluded.has('cookedFish'), true);
    assert.equal(menu.panel.querySelector('.inventory-setting input').checked, false);
    select('sticks');
    assert.equal(menu.panel.querySelector('.inventory-setting'), null, 'only items with settings show them');
  } finally {
    globalThis.document = previous;
  }
});
