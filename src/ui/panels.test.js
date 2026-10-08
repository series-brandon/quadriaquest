import test from 'node:test';
import assert from 'node:assert/strict';
import {installDom} from './test-dom.js';
import {createPanelHost} from './panels.js';
import {h, mount} from './dom.js';
import {panelTabs, anyAvailable} from './panel-tabs.js';
import {signal} from '../reactive.js';

const document = installDom();

function setup() {
  const host = createPanelHost();
  const pages = {};
  for (const [id, order, extra] of [['quests', 10, {returnTo: true}], ['skills', 20, {primary: true}], ['inventory', 30, {primary: true}], ['settings', 60, {}]]) {
    pages[id] = document.createElement('section');
    host.register({id, label: id[0].toUpperCase() + id.slice(1), icon: 'skills', element: pages[id], order, ...extra});
  }
  return {host, pages};
}

test('opening a page shows only that page and hides the tab bar', () => {
  const {host, pages} = setup();
  assert.ok(Object.values(pages).every(page => page.hidden));
  host.showNav();
  host.open('skills');
  assert.equal(pages.skills.hidden, false);
  assert.equal(pages.inventory.hidden, true);
  assert.equal(host.navOpen.value, false);
  host.open('inventory');
  assert.equal(pages.skills.hidden, true);
  assert.equal(pages.inventory.hidden, false);
  host.close();
  assert.ok(Object.values(pages).every(page => page.hidden));
  assert.equal(host.active.value, null);
});

test('returnTo pages restore the page and tab bar they replaced', () => {
  const {host, pages} = setup();
  host.open('skills');
  host.open('quests');
  assert.equal(pages.quests.hidden, false);
  host.dismiss();
  assert.equal(host.active.value, 'skills');
  assert.equal(pages.skills.hidden, false);
  host.close();
  host.showNav();
  host.open('quests');
  host.dismiss();
  assert.equal(host.active.value, null);
  assert.equal(host.navOpen.value, false, 'with no page to return to, the journal closes');
});

test('locked pages cannot be dismissed and custom dismiss/select hooks run', () => {
  const host = createPanelHost();
  const locked = signal(true);
  let dismissed = 0, selected = 0, launched = 0;
  host.register({id: 'skills', label: 'Skills', icon: 'skills', element: document.createElement('section'), closeLocked: locked, dismiss: () => dismissed++});
  host.register({id: 'crafting', label: 'Crafting', icon: 'skills', element: document.createElement('section'), select: () => selected++});
  host.register({id: 'debug', label: 'Debug', icon: 'skills', order: 1000, action: () => launched++});
  host.open('skills');
  assert.equal(host.closeLocked.value, true);
  assert.equal(host.dismiss(), false);
  locked.value = false;
  assert.equal(host.dismiss(), true);
  assert.equal(dismissed, 1);
  host.select('crafting');
  host.select('debug');
  assert.deepEqual([selected, launched], [1, 1]);
  assert.throws(() => host.open('missing'), /Unknown panel/);
  assert.throws(() => host.register({id: 'skills'}), /already registered/);
});

test('tabs render in order with stable ids, availability, current state and clicks', () => {
  const {host} = setup();
  const view = mount(() => panelTabs(h('nav'), host));
  const tabs = () => [...view.node.children];
  assert.deepEqual(tabs().map(tab => tab.id), ['open-quests', 'open-skills', 'open-inventory', 'open-settings']);
  const skills = tabs()[1];
  assert.equal(skills.textContent, 'Skills');
  assert.equal(skills.getAttribute('aria-current'), 'false');
  skills.dispatchEvent(new window.Event('click'));
  assert.equal(host.active.value, 'skills');
  assert.equal(skills.getAttribute('aria-current'), 'true');
  host.setAvailable('inventory', false);
  assert.equal(tabs()[2].hidden, true);
  assert.equal(tabs()[1], skills, 'tabs are not rebuilt');
});

test('phone tabs split primary from More and report availability', () => {
  const {host} = setup();
  const primary = mount(() => panelTabs(h('nav'), host, {filter: entry => entry.primary, ids: false})).node;
  const more = anyAvailable(host, entry => !entry.primary);
  assert.equal(primary.children.length, 2);
  assert.equal(primary.children[0].id, '');
  assert.equal(more.value, true);
  host.setAvailable('quests', false);
  host.setAvailable('settings', false);
  assert.equal(more.value, false);
});
