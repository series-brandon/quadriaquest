import test from 'node:test';
import assert from 'node:assert/strict';
import {ITEMS} from '../items.js';
import {TYPE_TOOLS, ITEM_TABS, itemTab, toolForType, typeEntries} from './type-editor.js';

// The World group's type tools (docs/DESIGN.md, Resource and enemy configuration): every type belongs to one tool,
// and every item to one Items tab by its category.
test('every type belongs to exactly one type tool, and Edit-type keys open the matching tool', () => {
  const all = typeEntries(), split = Object.keys(TYPE_TOOLS).flatMap(tool => typeEntries(tool));
  assert.equal(split.length, all.length);
  assert.equal(toolForType('tree:oak'), 'nodes'); assert.equal(toolForType('resource:boulder'), 'nodes');
  assert.equal(toolForType('enemy:scrapper'), 'npcs'); assert.equal(toolForType('item:swords'), 'items');
});
test('items sort into tabs by category; only currency and quest items fall to Other', () => {
  const tabs = new Set(ITEM_TABS.map(t => t.id));
  for (const [id, item] of Object.entries(ITEMS)) {
    assert.ok(tabs.has(itemTab(item)), id);
    if (itemTab(item) === 'other') assert.ok(['currency', 'quest'].includes(item.category), `${id} (${item.category}) needs a tab`);
  }
  assert.equal(itemTab(ITEMS.bows), 'weapons'); assert.equal(itemTab(ITEMS.hats), 'armor'); assert.equal(itemTab(ITEMS.cookedFish), 'consumables');
});
