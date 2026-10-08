// Dev-only startup smoke check for the built playground (dist-playground): loads it in installed
// Chrome (hardware GPU, like the perf harness's dev-gpu environment), exercises the kit HUD
// surfaces and area hooks, then starts the normal build (dist) when present. Fails on any page
// error. One bounded browser, always closed.
//   npm run build && npm run build:debug && node scripts/smoke-playground.mjs
import {existsSync} from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
import {serve} from '../perf/lib/serve.mjs';

const root = path.resolve('dist-playground');
const server = await serve(root);
const browser = await chromium.launch({headless: true, channel: process.env.PERF_BUNDLED_CHROMIUM === '1' ? undefined : 'chrome'});
const errors = [];
let failed = false;
try {
  const page = await browser.newPage({viewport: {width: 1280, height: 800}});
  page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
  await page.goto(server.url, {waitUntil: 'load'});
  await page.waitForFunction(() => !!window.quadriaquest, null, {timeout: 15000});
  await page.waitForTimeout(1500);

  const results = await page.evaluate(async () => {
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    const press = selector => { const el = document.querySelector(selector); if (!el) throw new Error(`missing ${selector}`); el.click(); };
    // Grouped playground buttons become a select plus Run (playground-layout.js `dropdown`).
    const command = (key, label) => {
      const select = document.getElementById(`dev-command-${key}`), option = select && [...select.options].find(o => o.textContent === label);
      if (!option) throw new Error(`missing ${key} command "${label}"`);
      select.value = option.value;
      press(`[data-command="${key}"]`);
    };
    const pick = (selector, value) => { const s = document.querySelector(selector); s.value = value; s.dispatchEvent(new Event('change')); };
    const out = {};
    // Model viewer: models, motions, the slime loadout, playback, close and reopen.
    const openViewer = async () => {
      pick('#dev-interface', 'models');
      document.querySelector('[data-dev="interface"]').click();
      await wait(600);
      return document.querySelector('dialog.q-modal[open] .q-viewer');
    };
    const field = (root, label) => [...root.querySelectorAll('.q-viewer__field')].find(f => f.firstChild.textContent === label);
    const choose = async (root, label, value) => { const select = field(root, label).querySelector('select'); select.value = value; select.dispatchEvent(new Event('change')); await wait(150); };
    let viewer = await openViewer();
    out.viewer = !!viewer?.querySelector('canvas');
    if (viewer) {
      await choose(viewer, 'Model', 'Corgi');
      out.corgiMotions = [...field(viewer, 'Animation').querySelectorAll('option')].map(o => o.value).join(',');
      await choose(viewer, 'Model', 'Slime');
      out.loadoutShown = !viewer.querySelector('.q-viewer__loadout').hidden;
      await choose(viewer, 'Animation', 'Attack');
      out.attackFields = !field(viewer, 'Combat style').hidden && !field(viewer, 'Attack motion').hidden;
      await choose(viewer, 'Main hand', 'copperDagger');
      out.daggerDamage = field(viewer, 'Main hand damage').hidden ? null : [...field(viewer, 'Main hand damage').querySelectorAll('option')].map(o => o.value).join(',');
      out.note = viewer.querySelector('.q-viewer__loadout .q-page__help').textContent;
      const pause = [...viewer.querySelectorAll('button')].find(b => b.textContent === 'Pause');
      pause?.click();
      await wait(50);
      out.paused = pause?.textContent;
    }
    document.querySelector('dialog.q-modal[open] .q-modal__close')?.click();
    await wait(200);
    out.viewerClosed = !document.querySelector('dialog.q-modal[open]');
    viewer = await openViewer();
    out.reopened = !!viewer?.querySelector('canvas') && field(viewer, 'Model').querySelector('select').value === 'Slime';
    document.querySelector('dialog.q-modal[open] .q-modal__close')?.click();
    await wait(200);
    // Notices: a quest objective and item receipts.
    pick('#dev-checkpoint', 'clearing:gather');
    document.querySelector('[data-dev="checkpoint"]').click();
    await wait(1500);
    out.tip = document.getElementById('tutorial-title')?.textContent;
    out.objective = document.querySelector('#objective-update strong')?.textContent;
    pick('#dev-item', 'sticks');
    document.querySelector('[data-dev="add"]').click();
    await wait(300);
    out.receipt = document.querySelector('#item-feed .q-receipt')?.textContent;
    // A level-up receipt through the real skill path.
    pick('#dev-skill', 'Fishing');
    const amount = document.querySelector('#dev-skill-amount'); amount.value = '1'; amount.dispatchEvent(new Event('input'));
    document.querySelector('[data-dev="levels"]').click();
    await wait(300);
    out.levelUp = document.querySelector('#skill-rewards .q-level')?.textContent;
    // Willowbank's playground hooks: a checkpoint stage, the shared splats, and the full reset.
    pick('#dev-checkpoint', 'willowbank:fish');
    press('[data-dev="checkpoint"]');
    await wait(2500);
    for (const kind of ['Damage splat', 'Blocked splat', 'Miss splat']) command('feedback', kind);
    await wait(100);
    out.splats = document.querySelectorAll('.combat-hit').length;
    command('reset', 'Full test area');
    await wait(500);
    out.reset = true;
    return out;
  });
  console.log(JSON.stringify(results, null, 1));
  if (!results.viewer || !results.viewerClosed || !results.reopened || !results.daggerDamage || !results.objective || !results.receipt || !results.levelUp || !results.splats) failed = true;
  await page.close();

  // The normal build (dist), when present: starts from the splash without errors.
  if (existsSync(path.resolve('dist', 'index.html'))) {
    const game = await serve(path.resolve('dist'));
    try {
      const normal = await browser.newPage({viewport: {width: 1280, height: 800}});
      normal.on('pageerror', error => errors.push(`dist pageerror: ${error.message}`));
      normal.on('console', message => { if (message.type() === 'error') errors.push(`dist console: ${message.text()}`); });
      await normal.goto(game.url, {waitUntil: 'load'});
      await normal.click('#splash-play', {timeout: 15000});
      await normal.waitForTimeout(3000);
      const debugFree = await normal.evaluate(() => !window.quadriaquest);
      console.log(JSON.stringify({normalBuildStarted: true, debugFree}));
      if (!debugFree) failed = true;
    } finally { await game.close(); }
  }
} catch (error) {
  failed = true;
  console.error(error);
} finally {
  await browser.close();
  await server.close();
}
if (errors.length) { console.error(errors.join('\n')); failed = true; }
console.log(failed ? 'Smoke check FAILED.' : 'Smoke check passed: no page errors.');
process.exit(failed ? 1 : 0);
