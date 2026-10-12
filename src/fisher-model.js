import {makeSlime} from './slime-model.js';
// Reed's look is his colour; his Fisher's Hat is a Head item and his rod rests over his shoulder, both
// through the shared slime presentation (createSlimeActor with a loadout and carry:'rods').
export function fisher(){return makeSlime('#66a6ad');}
