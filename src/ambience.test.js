import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {AMBIENCE_PROFILES, AMBIENT_SOUNDS} from './ambience.js';

test('profiles only schedule known sounds with sane intervals', () => {
  for (const [id, profile] of Object.entries(AMBIENCE_PROFILES)) {
    assert.ok(profile.label, id);
    for (const [sound, [min, max]] of Object.entries(profile.sounds || {})) {
      assert.ok(AMBIENT_SOUNDS[sound], `${id}: ${sound}`);
      assert.ok(min > 0 && max >= min, `${id}.${sound}: ${min}–${max}`);
    }
  }
  assert.deepEqual(AMBIENCE_PROFILES.none.sounds, undefined, 'silence has nothing scheduled');
});

test('every area names an existing ambience profile', () => {
  const sources = ['main.js', 'cinderhold.js', 'world-start.js'].map(file => readFileSync(new URL(file, import.meta.url), 'utf8')).join('\n');
  const named = [...sources.matchAll(/ambience:'([a-z]+)'/g)].map(m => m[1]);
  assert.ok(named.length >= 4, `found ${named}`);
  for (const id of named) assert.ok(AMBIENCE_PROFILES[id], id);
});
