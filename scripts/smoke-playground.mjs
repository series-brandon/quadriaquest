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
  // Offscreen passes (the shadow map) are counted so moving shadow casters can be checked.
  await page.addInitScript(() => { const bind = WebGL2RenderingContext.prototype.bindFramebuffer; window.__offscreenPasses = 0; WebGL2RenderingContext.prototype.bindFramebuffer = function (target, framebuffer) { if (framebuffer) window.__offscreenPasses++; return bind.call(this, target, framebuffer); }; });
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
      await choose(viewer, 'Right hand', 'copperDagger');
      out.daggerDamage = field(viewer, 'Right hand damage').hidden ? null : [...field(viewer, 'Right hand damage').querySelectorAll('option')].map(o => o.value).join(',');
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
    // Guided tab lessons: each checkpoint follows the real steps through its tab click and throws
    // (a page error) if it cannot reach its step.
    out.lessons = [];
    for (const step of ['quests-detail', 'skills-detail', 'inventory-stacks', 'recipe']) {
      pick('#dev-checkpoint', `clearing:${step}`);
      press('[data-dev="checkpoint"]');
      await wait(1200);
      out.lessons.push(document.getElementById('tutorial-copy')?.textContent.slice(0, 32));
    }
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

  // Willowbank: catching the first Pondfish (real clicks) must lead Reed into the flint step, with
  // the desktop journal docked beside the world.
  await page.evaluate(() => { const s = document.querySelector('#dev-checkpoint'); s.value = 'willowbank:fish'; s.dispatchEvent(new Event('change')); document.querySelector('[data-dev="checkpoint"]').click(); });
  await page.waitForTimeout(2500);
  // Walking moves a shadow caster, so the shadow map must be redrawn along the way.
  const passesBefore = await page.evaluate(() => window.__offscreenPasses);
  await walkAndClick(page, 16, 14);
  await page.waitForTimeout(800);
  const shadowsFollow = await page.evaluate(before => window.__offscreenPasses - before > 3, passesBefore);
  const followUp = await waitFor(page, () => /A fine catch/.test(document.getElementById('character-dialogue')?.textContent || ''), 45000);
  // Repair the bridge with a hammer in hand: Show me how brings the (off-screen) bridge into view.
  await page.evaluate(() => { const s = document.querySelector('#dev-checkpoint'); s.value = 'willowbank:bridge'; s.dispatchEvent(new Event('change')); document.querySelector('[data-dev="checkpoint"]').click(); });
  await page.waitForTimeout(2500);
  const inView = () => page.evaluate(() => { const p = window.quadriaquest.screenFor(18, 9); return p.x > 0 && p.y > 0 && p.x < innerWidth && p.y < innerHeight; });
  const bridgeHidden = !(await inView());
  await page.click('#tutorial-help').catch(() => {});
  await page.waitForTimeout(1500);
  const bridgeShown = await inView();
  console.log(JSON.stringify({willowbankCatchFollowUp: followUp, bridgeHelpBringsBridgeIntoView: bridgeHidden && bridgeShown, shadowsFollowThePlayer: shadowsFollow}));
  if (!followUp || !bridgeShown || !shadowsFollow) failed = true;

  // Streaming test (playground): enter the generated world, teleport far, and expect a loaded
  // neighborhood around the player with its resources.
  await page.evaluate(() => document.querySelector('[data-dev="stream-enter"]').click());
  await waitFor(page, () => window.quadriaquest.getState().area === 'stream-test', 10000);
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.querySelector('[data-dev="stream-far"]').click());
  await page.waitForTimeout(2500);
  const stream = await page.evaluate(() => { document.querySelector('[data-dev="stream-stats"]').click(); try { return JSON.parse(document.querySelector('#dev-status')?.textContent || 'null'); } catch { return null; } });
  const streamed = !!stream && stream.chunks >= 25 && stream.entities > 100 && !!stream.player;
  console.log(JSON.stringify({streamingTest: streamed, chunks: stream?.chunks, entities: stream?.entities}));
  if (!streamed) failed = true;
  await page.close();

  // The normal build (dist), when present: a new game from the splash, played as a player would,
  // through the opening to the first Quests lesson (checkpoints skip this real ordering), on
  // desktop and a phone.
  if (existsSync(path.resolve('dist', 'index.html'))) {
    const game = await serve(path.resolve('dist'));
    try {
      for (const [label, viewport, tab] of [['desktop', {width: 1280, height: 800}, '#open-quests'], ['phone', {width: 390, height: 844}, '#player-mobile-nav [data-tab="open-quests"]']]) {
        const phone = label === 'phone';
        const normal = await browser.newPage({viewport, isMobile: phone, hasTouch: phone});
        normal.on('pageerror', error => errors.push(`dist ${label} pageerror: ${error.message}`));
        normal.on('console', message => { if (message.type() === 'error') errors.push(`dist ${label} console: ${message.text()}`); });
        await normal.goto(game.url, {waitUntil: 'load'});
        await normal.click('#splash-play', {timeout: 15000});
        await normal.waitForTimeout(2500);
        const debugFree = await normal.evaluate(() => !window.quadriaquest);
        const reached = await playToFirstQuest(normal);
        const guided = reached && await normal.evaluate(selector => {
          const node = document.querySelector(selector), box = node?.getBoundingClientRect();
          return !!node && node.classList.contains('gold-guide') && !node.closest('[hidden]') && box.width > 0 && box.height > 0;
        }, tab);
        if (guided) { await normal.click(tab, {timeout: 5000}); await normal.waitForTimeout(400); }
        const opened = guided && await normal.evaluate(() => !document.getElementById('quests-panel').hidden && /Here are your quests/.test(document.getElementById('tutorial-copy')?.textContent));
        console.log(JSON.stringify({normalBuild: label, debugFree, reachedFirstQuest: reached, questsTabGuided: guided, questsOpened: opened}));
        if (!debugFree || !opened) failed = true;
        await normal.close();
      }
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

async function waitFor(page, test, ms) {
  return page.waitForFunction(test, null, {timeout: ms, polling: 250}).then(() => true, () => false);
}

// Clicks a world tile like a player (via the dev API's screenFor). An off-screen target is reached by
// clicking the farthest visible tile on the way, clear of the tip and sidebar, until it is in view.
async function walkAndClick(page, x, z) {
  for (let hop = 0; hop < 20; hop++) {
    const plan = await page.evaluate(([x, z]) => {
      const q = window.quadriaquest, me = q.getState().tile;
      const clear = p => p.x > 40 && p.y > 60 && p.y < innerHeight - 60 && document.elementFromPoint(p.x, p.y)?.tagName === 'CANVAS';
      const target = q.screenFor(x, z);
      if (clear(target)) return {click: target};
      for (let f = 0.9; f > 0.05; f -= 0.1) {
        try { const p = q.screenFor(Math.round(me.x + (x - me.x) * f), Math.round(me.z + (z - me.z) * f)); if (clear(p)) return {walk: p}; } catch {}
      }
      return null;
    }, [x, z]);
    if (!plan) return false;
    if (plan.click) { await page.mouse.click(plan.click.x, plan.click.y); return true; }
    await page.mouse.click(plan.walk.x, plan.walk.y);
    await page.waitForTimeout(2500);
  }
  return false;
}

// Plays the opening like a player: advances dialogue, accepts the first choice of each prompt, and
// does the camera/move lessons, until the tip asks for the Quests tab. False if it stalls.
async function playToFirstQuest(page) {
  let last = '', same = 0;
  for (let i = 0; i < 120; i++) {
    const s = await page.evaluate(() => {
      const shown = el => !!el && !el.closest('[hidden]') && el.getBoundingClientRect().width > 0;
      const dialogue = document.getElementById('dialogue'), tip = document.getElementById('gather-tutorial'), next = document.getElementById('tutorial-continue');
      return {dialogue: shown(dialogue) ? dialogue.textContent.slice(0, 60) : null,
        buttons: shown(dialogue) ? [...dialogue.querySelectorAll('button')].filter(shown).map(b => b.textContent.trim()) : [],
        tip: shown(tip) ? `${tip.querySelector('#tutorial-title')?.textContent}|${tip.querySelector('#tutorial-copy')?.textContent}` : null,
        next: shown(next) && !next.disabled};
    });
    if (s.tip?.includes('Open the Quests tab')) return true;
    const key = JSON.stringify(s);
    same = key === last ? same + 1 : 0; last = key;
    if (same > 20) return false;
    if (s.dialogue) {
      const choice = s.buttons.find(b => b && !/^No\b|another|change/i.test(b));
      if (choice) await page.locator('#dialogue button', {hasText: choice}).first().click().catch(() => {});
      else if (!s.buttons.length) await page.click('#dialogue', {position: {x: 20, y: 20}}).catch(() => {});
    } else if (s.tip?.startsWith('Rotate')) { await page.keyboard.down('ArrowRight'); await page.waitForTimeout(1200); await page.keyboard.up('ArrowRight'); }
    else if (s.tip?.startsWith('Zoom')) { const {width, height} = page.viewportSize(); await page.mouse.move(width / 3, height / 2); for (let k = 0; k < 6; k++) { await page.mouse.wheel(0, -200); await page.waitForTimeout(80); } }
    else if (s.tip?.startsWith('Find your footing')) { const {width, height} = page.viewportSize(); await page.mouse.click(width * 0.3, height * 0.6); await page.waitForTimeout(1500); }
    else if (s.next) await page.click('#tutorial-continue');
    await page.waitForTimeout(500);
  }
  return false;
}
console.log(failed ? 'Smoke check FAILED.' : 'Smoke check passed: no page errors.');
process.exit(failed ? 1 : 0);
