import test from 'node:test';
import assert from 'node:assert/strict';
import {installDom} from './test-dom.js';
import {signal} from '../reactive.js';
import {h, mount} from './dom.js';
import {keyedList} from './list.js';

installDom();

function setup(initial) {
  const items = signal(initial);
  let built = 0, disposed = 0;
  const view = mount(() => keyedList(h('ul'), items, item => item.id, item => {
    built++;
    return h('li', {'data-id': () => item.value.id}, () => item.value.label);
  }));
  return {items, view, built: () => built, labels: () => [...view.node.children].map(li => li.textContent)};
}

test('builds rows once and updates them in place', () => {
  const list = setup([{id: 'a', label: 'A'}, {id: 'b', label: 'B'}]);
  const first = list.view.node.firstChild;
  list.items.value = [{id: 'a', label: 'A2'}, {id: 'b', label: 'B'}];
  assert.deepEqual(list.labels(), ['A2', 'B']);
  assert.equal(list.view.node.firstChild, first, 'row node is reused');
  assert.equal(list.built(), 2);
});

test('reorders, adds and removes rows by key', () => {
  const list = setup([{id: 'a', label: 'A'}, {id: 'b', label: 'B'}, {id: 'c', label: 'C'}]);
  const [a, , c] = list.view.node.children;
  list.items.value = [{id: 'c', label: 'C'}, {id: 'd', label: 'D'}, {id: 'a', label: 'A'}];
  assert.deepEqual(list.labels(), ['C', 'D', 'A']);
  assert.equal(list.view.node.children[0], c);
  assert.equal(list.view.node.children[2], a);
  assert.equal(list.built(), 4);
});

test('removed rows stop updating', () => {
  const label = signal('x');
  const items = signal([1, 2]);
  const view = mount(() => keyedList(h('ul'), items, n => n, n => h('li', null, () => `${n.value}${label.value}`)));
  const removed = view.node.lastChild;
  items.value = [1];
  label.value = 'y';
  assert.equal(removed.textContent, '2x');
  assert.equal(view.node.textContent, '1y');
});

test('duplicate keys are an error', () => {
  assert.throws(() => setup([{id: 'a', label: 1}, {id: 'a', label: 2}]), /duplicate key/);
});

test('fixed nodes after the list stay after its rows', () => {
  const items = signal([1, 2]);
  const view = mount(() => {
    const list = keyedList(h('ul'), items, n => n, n => h('li', null, () => String(n.value)));
    list.append(h('li', {class: 'q-more'}, 'more'));
    return list;
  });
  items.value = [3, 1, 2];
  assert.deepEqual([...view.node.children].map(li => li.textContent), ['3', '1', '2', 'more']);
  items.value = [2];
  assert.deepEqual([...view.node.children].map(li => li.textContent), ['2', 'more']);
});
