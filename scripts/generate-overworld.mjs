// Writes src/maps/overworld.json from the overworld's wild starting point (src/dev/overworld-layout.js; docs/TOWN.md).
// The city editor refines it from there; rerunning this overwrites hand edits.
import {writeFileSync} from 'node:fs';
import {overworldData} from '../src/dev/overworld-layout.js';
writeFileSync(new URL('../src/maps/overworld.json',import.meta.url),JSON.stringify(overworldData(),null,1)+'\n');
console.log('Wrote src/maps/overworld.json');
