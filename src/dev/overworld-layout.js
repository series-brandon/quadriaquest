import {createCityData} from '../city-map.js';

// The Quadria overworld: the start of the world map, where Mistrom, the starting village, will be built
// (docs/TOWN.md). Its wild starting point. Dev only: it writes src/maps/overworld.json once
// (scripts/generate-overworld.mjs), and from then on the city editor is where it is built by hand;
// regenerating overwrites those edits.
//  - 96 × 96 tiles at the world origin (3 × 3 chunks), on the land (docs/TOWN.md, The town on the land);
//  - nothing built yet: no buildings, props, paths, townsfolk or offsets, only the Iter Crystal and the
//    arrival spot in the middle chunk;
//  - the land painted in biomes (docs/BIOMES.md): meadow under the village, woods, pines and hills to the
//    north and a quarry up the river, the river down the east side into an estuary, coast along the
//    south, then the sea.
export const OVERWORLD={size:96,crystal:[48,48],spawn:[48,51]};

export function overworldData(){
 const M=OVERWORLD,data=createCityData({id:'overworld',name:'Quadria overworld',size:[M.size,M.size],style:'timber',land:{seed:3,ring:96,default:'meadow',cells:{}}});
 data.crystal=[...M.crystal];data.spawn=[...M.spawn];
 // The land around the village (docs/BIOMES.md): one biome per 8 × 8 cell; unpainted cells are meadow.
 const cells=data.land.cells,paint=(cx0,cz0,cx1,cz1,biome)=>{for(let cz=cz0;cz<=cz1;cz++)for(let cx=cx0;cx<=cx1;cx++)cells[`${cx},${cz}`]=biome;};
 paint(-12,-12,23,-9,'hills');paint(-10,-8,15,-5,'pines');paint(-8,-4,11,-1,'forest');
 paint(13,-10,20,-3,'hills');                 // the quarry hills up the river
 paint(-12,-4,-7,11,'forest');                // the western woods (goblins)
 paint(-12,12,23,13,'coast');paint(-12,14,23,23,'sea');paint(20,-2,23,11,'coast');
 paint(14,8,17,13,'wetland');paint(10,12,11,13,'wetland');   // the estuary marsh
 paint(12,-12,12,12,'river');paint(12,12,13,13,'river');     // the river down the east side to the sea
 return data;
}
