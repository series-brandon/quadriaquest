import test from 'node:test';
import assert from 'node:assert/strict';
import {installDom} from './test-dom.js';
import {signal} from '../reactive.js';
import {h, mount, svg} from './dom.js';
import {bind} from './scope.js';

installDom();

test('static props set attributes, properties, classes and styles', () => {
  const {node} = mount(() => h('button', {
    id: 'go', class: 'q-action', disabled: true, 'aria-pressed': false, title: null,
    classes: {active: true}, style: {'--q-level': 0.5}, 'data-kind': 'ki',
  }, 'Go'));
  assert.equal(node.id, 'go');
  assert.equal(node.disabled, true);
  assert.equal(node.getAttribute('aria-pressed'), 'false');
  assert.equal(node.hasAttribute('title'), false);
  assert.equal(node.className, 'q-action active');
  assert.equal(node.style.getPropertyValue('--q-level'), '0.5');
  assert.equal(node.dataset.kind, 'ki');
  assert.equal(node.textContent, 'Go');
});

test('reactive props and text update only their own node', () => {
  const count = signal(1), pressed = signal(false);
  const {node} = mount(() => h('p', {'aria-pressed': pressed, hidden: () => count.value > 5}, 'n=', () => count.value * 2));
  assert.equal(node.textContent, 'n=2');
  count.value = 3;
  pressed.value = true;
  assert.equal(node.textContent, 'n=6');
  assert.equal(node.getAttribute('aria-pressed'), 'true');
  count.value = 9;
  assert.equal(node.hidden, true);
});

test('function bindings write only when their result changes', () => {
  const amount = signal(10.2);
  let writes = 0;
  const {node} = mount(() => h('span', null, () => {
    writes++;
    return Math.ceil(amount.value);
  }));
  const text = node.firstChild;
  let data = text.data, changes = 0;
  Object.defineProperty(text, 'data', {get: () => data, set: next => { changes++; data = next; }});
  amount.value = 10.4;
  amount.value = 10.9;
  assert.equal(changes, 0, 'same whole number: no DOM write');
  amount.value = 11.1;
  assert.equal(changes, 1);
  assert.equal(node.textContent, '12');
  assert.ok(writes >= 3, 'the computation itself still reruns');
});

test('svg builds namespaced elements with reactive attributes', () => {
  const level = signal(0.5);
  const {node} = mount(() => svg('svg', {class: 'q-x', viewBox: '0 0 52 52'}, svg('rect', {class: () => (level.value > 0.4 ? 'q-high' : 'q-low')})));
  assert.equal(node.namespaceURI, 'http://www.w3.org/2000/svg');
  assert.equal(node.getAttribute('class'), 'q-x');
  assert.equal(node.firstChild.namespaceURI, 'http://www.w3.org/2000/svg');
  level.value = 0.1;
  assert.equal(node.firstChild.getAttribute('class'), 'q-low');
});

test('events attach through on', () => {
  let clicks = 0;
  const {node} = mount(() => h('button', {on: {click: () => clicks++}}));
  node.dispatchEvent(new window.Event('click'));
  assert.equal(clicks, 1);
});

test('dispose stops bindings and removes the node', () => {
  const label = signal('a');
  const view = mount(() => h('b', null, label));
  document.body.append(view.node);
  view.dispose();
  label.value = 'b';
  assert.equal(view.node.textContent, 'a');
  assert.equal(view.node.parentNode, null);
});

test('bindings outside a view are rejected', () => {
  assert.throws(() => bind(() => {}), /inside mount/);
  assert.throws(() => h('p', null, () => 'x'), /inside mount/);
});
