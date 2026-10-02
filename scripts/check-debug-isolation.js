import {readdir,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
async function assets(dir){return (await Promise.all((await readdir(dir,{withFileTypes:true})).map(async e=>e.isDirectory()?assets(`${dir}/${e.name}`):await readFile(`${dir}/${e.name}`,'utf8')))).join('\n');}
const normal=await assets('dist'),debug=await assets('dist-playground');
for(const marker of ['quadra-dev-playground','DEV PLAYGROUND','show-debug-menu','Show debug menu','Preview stopped. Normal play enabled.']){
  assert.ok(!normal.includes(marker),`Debug content leaked into normal build: ${marker}`);
  assert.ok(debug.includes(marker),`Debug build missing: ${marker}`);
}
assert.ok(!normal.includes('window.clime'),'Debug inspection API leaked into normal build');
console.log('Verified: debug panel, styles, controls and inspection API excluded from normal build; playground included in debug build.');
