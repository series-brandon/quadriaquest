// Enforces the UI standards in docs/UI.md.
//   node scripts/check-ui-standards.js            check
//   node scripts/check-ui-standards.js --update   rewrite the legacy baseline (only after reducing debt)
//
// New UI code (src/ui) must follow the rules strictly. Legacy files are held to a ratchet:
// their counts of known anti-patterns may fall but never rise, and new files start at zero.
import {readdir, readFile, writeFile} from 'node:fs/promises';
import {join, relative} from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const BASELINE = join(ROOT, 'scripts/ui-standards-baseline.json');
const BREAKPOINTS = new Set(['700px', '701px']);
// Page layouts follow the journal's width (container queries), with one breakpoint of their own.
const PAGE_BREAKPOINTS = new Set(['640px', '641px']);
const failures = [];

async function files(dir) {
  const entries = await readdir(join(ROOT, dir), {withFileTypes: true});
  const nested = await Promise.all(entries.map(entry => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? files(path) : [path];
  }));
  return nested.flat();
}

const count = (text, pattern) => (text.match(pattern) || []).length;
const isTest = path => path.endsWith('.test.js') || path === 'src/ui/test-dom.js';

const STRICT_JS = [
  {name: 'HTML strings (innerHTML/outerHTML/insertAdjacentHTML)', pattern: /\b(innerHTML|outerHTML|insertAdjacentHTML)\b/g, allow: ['src/ui/icon.js']},
  {name: 'property event handlers (.onclick = …); use h(…, {on: {…}})', pattern: /\.on[a-z]+\s*=(?!=)/g},
  {name: 'matchMedia; use ui/viewport.js', pattern: /\bmatchMedia\b/g, allow: ['src/ui/viewport.js']},
  {name: 'DOM lookups (getElementById/querySelector); keep references from h()', pattern: /\b(getElementById|querySelector(All)?)\b/g},
  {name: 'own loops (requestAnimationFrame/setInterval); state changes drive updates', pattern: /\b(requestAnimationFrame|setInterval)\b/g},
];
const STRICT_CSS = [
  {name: '!important', pattern: /!important/g},
  {name: 'color literals outside tokens.css; add a --q-* token', pattern: /#[0-9a-f]{3,8}\b|\b(rgba?|hsla?)\(/gi, allow: ['src/ui/tokens.css']},
];
const RATCHET = {
  js: {innerHTML: /\b(innerHTML|insertAdjacentHTML)\b/g, propertyHandlers: /\.on[a-z]+\s*=(?!=)/g, matchMedia: /\bmatchMedia\b/g},
  css: {important: /!important/g},
};

const sources = (await files('src')).filter(path => !isTest(path));
const ui = sources.filter(path => path.startsWith('src/ui/'));
const legacy = sources.filter(path => !path.startsWith('src/ui/') && !path.startsWith('src/dev/'));

for (const path of sources.filter(path => path.endsWith('.js'))) {
  const text = await readFile(join(ROOT, path), 'utf8');
  if (path !== 'src/reactive.js' && text.includes('@preact/signals-core')) {
    failures.push(`${path}: import signals from src/reactive.js, not @preact/signals-core`);
  }
}

for (const path of ui) {
  const text = await readFile(join(ROOT, path), 'utf8');
  const rules = path.endsWith('.js') ? STRICT_JS : path.endsWith('.css') ? STRICT_CSS : [];
  for (const rule of rules) {
    if (rule.allow?.includes(path)) continue;
    const found = count(text, rule.pattern);
    if (found) failures.push(`${path}: ${found}× ${rule.name}`);
  }
  if (path.endsWith('.css')) {
    for (const [, at, width] of text.matchAll(/@(media|container)[^{]*?\((?:max|min)-width:\s*([^)]+)\)/g)) {
      const allowed = at === 'container' ? PAGE_BREAKPOINTS : BREAKPOINTS;
      if (!allowed.has(width.trim())) failures.push(`${path}: ${at} breakpoint ${width} (${at === 'container' ? 'pages use 640px/641px journal widths' : 'use 700px/701px from ui/viewport.js'})`);
    }
    const selectors = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/'[^']*'|"[^"]*"/g, '');
    for (const [, name] of selectors.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) {
      if (!name.startsWith('q-')) failures.push(`${path}: class .${name} must use the q- prefix`);
    }
  }
}

const entry = await readFile(join(ROOT, 'src/ui/ui.css'), 'utf8');
for (const path of ui.filter(path => path.endsWith('.css') && path !== 'src/ui/ui.css')) {
  if (!entry.includes(`'./${relative('src/ui', path)}'`)) failures.push(`${path}: not imported by src/ui/ui.css`);
}

const current = {};
for (const path of legacy) {
  const kind = path.endsWith('.js') ? 'js' : path.endsWith('.css') ? 'css' : null;
  if (!kind) continue;
  const text = await readFile(join(ROOT, path), 'utf8');
  for (const [rule, pattern] of Object.entries(RATCHET[kind])) {
    const found = count(text, pattern);
    if (found) (current[path] ??= {})[rule] = found;
  }
}

if (process.argv.includes('--update')) {
  await writeFile(BASELINE, JSON.stringify(current, null, 2) + '\n');
  console.log(`Updated ${relative(ROOT, BASELINE)}.`);
} else {
  const baseline = JSON.parse(await readFile(BASELINE, 'utf8'));
  const improved = [];
  for (const path of new Set([...Object.keys(baseline), ...Object.keys(current)])) {
    for (const rule of new Set([...Object.keys(baseline[path] ?? {}), ...Object.keys(current[path] ?? {})])) {
      const before = baseline[path]?.[rule] ?? 0, now = current[path]?.[rule] ?? 0;
      if (now > before) failures.push(`${path}: ${rule} rose from ${before} to ${now} (legacy debt may only fall; build new UI in src/ui)`);
      else if (now < before) improved.push(`${path}: ${rule} ${before} → ${now}`);
    }
  }
  if (improved.length) console.log(`Legacy debt reduced (run with --update to lock it in):\n  ${improved.join('\n  ')}`);
}

if (failures.length) {
  console.error(`UI standards failed:\n  ${failures.join('\n  ')}`);
  process.exit(1);
}
console.log(`UI standards passed: ${ui.length} kit files checked, ${legacy.length} legacy files held to the baseline.`);
