import test from 'node:test';
import assert from 'node:assert/strict';
import {arrangement,chordTone,degreeMidi,parseChord,parseTokens,renderSection,seededRandom,stepsToNotes,voiceChord} from './music-theory.js';
import {COZY_SONGS,SONGS} from './music-songs.js';
import {DRUM_KIT,INSTRUMENTS} from './music-voices.js';

test('degrees map through the mode and wrap octaves', () => {
  assert.equal(degreeMidi(62, 'ionian', 1), 62);
  assert.equal(degreeMidi(62, 'ionian', 3), 66);
  assert.equal(degreeMidi(62, 'ionian', 8), 74);
  assert.equal(degreeMidi(62, 'ionian', 0), 61);
  assert.equal(degreeMidi(69, 'aeolian', 3), 72);
  assert.equal(degreeMidi(62, 'dorian', 3), 65);
});

test('patterns parse holds, rests and octave marks', () => {
  const notes = stepsToNotes(parseTokens("1 - 3' . 5, -"));
  assert.deepEqual(notes, [{step: 0, len: 2, degree: 1}, {step: 2, len: 1, degree: 10}, {step: 4, len: 2, degree: -2}]);
  assert.deepEqual(stepsToNotes(parseTokens('r f, o', 'chord')).map(n => chordTone(parseChord(1), n)), [1, -2, 8]);
  assert.deepEqual(parseTokens('c . l -', 'comp'), [{light: false}, 'rest', {light: true}, 'hold']);
  assert.throws(() => parseTokens('d', 'comp'), /Unknown comp/);
  assert.throws(() => parseTokens('8'), /Unknown/);
  assert.throws(() => parseTokens('r', 'melody'), /needs degrees/);
});

test('chords are voiced inside one octave', () => {
  for (const degree of [1, 4, 5, 6]) {
    const midis = voiceChord(SONGS.clearing, parseChord(degree), 50);
    assert.ok(midis.every(m => m >= 50 && m < 62), `${degree}: ${midis}`);
  }
});

test('chord colours are diatonic and chord-tone tokens follow them', () => {
  const song = {root: 67, mode: 'ionian'};
  // G major: '4:7' is Cmaj7, '2:7' is Am7, '5:sus4' is D G A.
  assert.deepEqual(voiceChord(song, parseChord('4:7'), 60), [60, 64, 67, 71]);
  assert.deepEqual(parseChord('2:7').tones, [0, 2, 4, 6]);
  assert.equal(degreeMidi(67, 'ionian', chordTone(parseChord('5:sus4'), {tone: 't', shift: 0})), 79);
  assert.equal(chordTone(parseChord('1:add9'), {tone: 'e', shift: 0}), 9);
  assert.equal(chordTone(parseChord(1), {tone: 'e', shift: 0}), 8);
  assert.throws(() => parseChord('4:maj7'), /Unknown chord/);
});

test('every song section renders full bars of playable notes', () => {
  for (const song of [...Object.values(SONGS), ...Object.values(COZY_SONGS)]) {
    const meter = song.meter || 8;
    for (const [name, section] of Object.entries(song.sections)) {
      for (const bar of section.melody || []) assert.equal(parseTokens(bar).length, meter, `${song.id}.${name}: "${bar}"`);
      for (const key of ['bass', 'arp']) if (section[key]) assert.equal(parseTokens(section[key], 'chord').length, meter, `${song.id}.${name}.${key}`);
      if (section.comp) assert.equal(parseTokens(section.comp, 'comp').length, meter, `${song.id}.${name}.comp`);
      if (section.perc) assert.equal(parseTokens(section.perc, 'drum').length, meter, `${song.id}.${name}.perc`);
      const rendered = renderSection(song, name, {rng: seededRandom(1), varied: true});
      assert.equal(rendered.steps % meter, 0);
      for (const event of rendered.events) {
        assert.ok(event.step >= 0 && event.step < rendered.steps, `${song.id}.${name} step ${event.step}`);
        for (const midi of event.midis || [event.midi ?? 60]) assert.ok(midi >= 28 && midi <= 96, `${song.id}.${name} midi ${midi}`);
      }
      if (section.kind !== 'rest') assert.ok(rendered.events.length, `${song.id}.${name} is silent`);
    }
    for (const entry of song.form) assert.ok(song.sections[entry.replace(/~$/, '')], `${song.id} form: ${entry}`);
  }
});

test('a seed reproduces drift and variations; repeats differ from the written theme', () => {
  const song = SONGS.clearing;
  const a = renderSection(song, 'drift', {rng: seededRandom(7)}), b = renderSection(song, 'drift', {rng: seededRandom(7)});
  assert.deepEqual(a, b);
  const plain = renderSection(song, 'a').events.filter(e => e.layer === 'melody');
  const varied = [1, 2, 3, 4, 5].map(seed => renderSection(song, 'a', {rng: seededRandom(seed), varied: true}).events.filter(e => e.layer === 'melody'));
  assert.ok(varied.some(events => JSON.stringify(events) !== JSON.stringify(plain)));
});

test('cozy songs replace originals by id (or are cozy-only) and use the new layers', () => {
  for (const [id, song] of Object.entries(COZY_SONGS)) assert.equal(song.id, id);
  for (const id of Object.keys(SONGS)) assert.ok(COZY_SONGS[id], `${id} has a cozy version`);
  const layers = new Set(renderSection(COZY_SONGS.clearing, 'a', {rng: seededRandom(3)}).events.map(e => e.layer));
  for (const layer of ['arp', 'bass', 'perc', 'melody']) assert.ok(layers.has(layer), layer);
  // Comp hits become one note per chord tone, so any melodic voice can play them.
  const comp = renderSection(COZY_SONGS.clearing, 'b', {rng: seededRandom(3)}).events.filter(e => e.layer === 'comp' && e.step === 0);
  assert.equal(comp.length, 5);
  assert.ok(comp.every(e => e.voice === 'keys' && Number.isFinite(e.midi) && e.vel < 1));
  assert.ok(!layers.has('pad'));
});

test('songs only use instruments and drums that exist', () => {
  for (const song of [...Object.values(SONGS), ...Object.values(COZY_SONGS)]) {
    for (const name of Object.keys(song.sections)) {
      for (const event of renderSection(song, name, {rng: seededRandom(2), varied: true}).events) {
        if (event.voice === 'drum') assert.ok(DRUM_KIT[event.drum], `${song.id}.${name}: drum ${event.drum}`);
        else if (event.voice !== 'pad') assert.ok(INSTRUMENTS[event.voice], `${song.id}.${name}: ${event.voice}`);
      }
    }
  }
});

test('areas get distinct bands: no two cozy songs share a lead and key', () => {
  const seen = new Set();
  for (const song of Object.values(COZY_SONGS)) {
    const id = `${song.voices.melody}@${song.root}`;
    assert.ok(!seen.has(id), `${song.id} repeats ${id}`);
    seen.add(id);
  }
});

test('styles narrow the form but keep rests, falling back when nothing would play', () => {
  const names = style => arrangement(SONGS.clearing, style).map(e => e.name);
  assert.deepEqual(names('theme'), ['a', 'a', 'b', 'a', 'rest']);
  assert.deepEqual(names('drift'), ['open', 'drift', 'rest']);
  assert.deepEqual(arrangement(SONGS.intro, 'theme'), arrangement(SONGS.intro, 'mix'));
});
