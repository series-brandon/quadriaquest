// Writes src/maps/capital.json from the capital's generated first layout (src/dev/capital-layout.js).
// The city editor refines it from there; rerunning this overwrites hand edits.
import {writeFileSync} from 'node:fs';
import {capitalData} from '../src/dev/capital-layout.js';
writeFileSync(new URL('../src/maps/capital.json',import.meta.url),JSON.stringify(capitalData(),null,1)+'\n');
console.log('Wrote src/maps/capital.json');
