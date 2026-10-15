// Writes src/maps/capital.json from the capital's generated first layout (src/dev/capital-layout.js).
// The world editor refines it from there; rerunning this overwrites hand edits.
import {writeFileSync} from 'node:fs';
import {packMap} from '../src/map-file.js';
import {capitalData} from '../src/dev/capital-layout.js';
writeFileSync(new URL('../src/maps/capital.json',import.meta.url),JSON.stringify(packMap(capitalData()),null,1)+'\n');
console.log('Wrote src/maps/capital.json');
