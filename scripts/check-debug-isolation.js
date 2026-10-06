import {readdir,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
async function assets(dir){return (await Promise.all((await readdir(dir,{withFileTypes:true})).map(async e=>e.isDirectory()?assets(`${dir}/${e.name}`):await readFile(`${dir}/${e.name}`,'utf8')))).join('\n');}
const normal=await assets('dist'),debug=await assets('dist-playground');
for(const marker of ['Training systems','dev-training','dev-landmark','Spawn portable fixtures','Visit landmark','Travel practice','dev-travel','cancel-travel','Combat practice','dev-combat','Spawn passive enemies','Spawn aggressive enemies (3 tiles)','Fishing practice','The clearing pond has a Pondfish spot','dev-companion-action','Loop companion animation','dev-model-preview','Shared model preview','quadriaquest-dev-playground','DEV PLAYGROUND','show-debug-menu','Show debug menu','dev-checkpoint','Load step','dev-interface','Preview stopped. Normal play enabled.']){
  assert.ok(!normal.includes(marker),`Debug content leaked into normal build: ${marker}`);
  assert.ok(debug.includes(marker),`Debug build missing: ${marker}`);
}
assert.ok(!normal.includes('window.quadriaquest'),'Debug inspection API leaked into normal build');
// Perf probe/scenarios are playground-only; the Playwright harness must never reach either build.
for(const marker of ['quadriaquest-perf-hud','Toggle perf HUD','clearing-idle','EXT_disjoint_timer_query_webgl2']){
  assert.ok(!normal.includes(marker),`Perf tooling leaked into normal build: ${marker}`);
  assert.ok(debug.includes(marker),`Debug build missing perf tooling: ${marker}`);
}
for(const [name,bundle] of [['normal',normal],['debug',debug]])for(const marker of ['playwright','__perf','addInitScript'])assert.ok(!bundle.includes(marker),`Perf harness code leaked into ${name} build: ${marker}`);
const pkg=JSON.parse(await readFile('package.json','utf8'));
assert.ok(!pkg.dependencies?.playwright&&pkg.devDependencies?.playwright,'playwright must be a devDependency only');
console.log('Verified: debug panel, styles, controls, inspection API and perf probe excluded from normal build; playground and perf probe included in debug build; Playwright harness in neither.');
