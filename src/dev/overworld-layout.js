import {createMapData,growMap,roundUpToRegions} from '../world-map.js';

// The Quadria overworld: the start of the world map, where Mistrom, the starting village, will be built
// (docs/TOWN.md). Its wild starting point. Dev only: it writes src/maps/overworld.json once
// (scripts/generate-overworld.mjs), and from then on the world editor is where it is built by hand;
// regenerating overwrites those edits.
//  - 288 × 288 tiles (9 × 9 chunks; docs/TOWN.md, Growing the overworld), on the land (The town on the
//    land): the village's 96 × 96 in the middle, grown by three chunks on every side so the woods, hills,
//    river, coast and sea are part of the map;
//  - nothing built yet: no buildings, props, paths, townsfolk or offsets, only the Iter Crystal and the
//    arrival spot in the middle chunk; no generated nature, enemies or fishing spots either (a
//    blank slate: place nature and fishing spots with the Nature tool; enemy spawns will get their own tool);
//  - the land painted in biomes (docs/BIOMES.md): meadow under the village, woods, pines and hills to the
//    north and a quarry up the river, the river down the east side into an estuary, coast along the
//    south, then the sea.
// size: the map once padded to whole regions; origin: where the village's 0, 0 ended up in it.
export const OVERWORLD={size:384,village:96,grow:96,origin:128,crystal:[144,144],spawn:[144,147]};

export function overworldData(){
 const M=OVERWORLD,data=createMapData({id:'overworld',name:'Quadria overworld',size:[M.village,M.village],style:'timber',land:{seed:3,default:'meadow',cells:{},terrain:{},nature:false,enemies:false,fishing:false}});
 data.crystal=M.crystal.map(v=>v-M.grow);data.spawn=M.spawn.map(v=>v-M.grow);
 // The land around the village (docs/BIOMES.md): one biome per 8 × 8 cell; unpainted cells are meadow.
 // Biomes (what grows and lives) and terrain (the land's shape and water) are painted apart.
 const cells=data.land.cells,terrain=data.land.terrain,fill=layer=>(cx0,cz0,cx1,cz1,id)=>{for(let cz=cz0;cz<=cz1;cz++)for(let cx=cx0;cx<=cx1;cx++)layer[`${cx},${cz}`]=id;},paint=fill(cells),shape=fill(terrain);
 paint(-12,-12,23,-9,'hills');paint(-10,-8,15,-5,'pines');paint(-8,-4,11,-1,'forest');
 paint(13,-10,20,-3,'hills');                 // the quarry hills up the river
 paint(-12,-4,-7,11,'forest');                // the western woods (goblins)
 paint(-12,12,23,13,'coast');paint(-12,14,23,23,'coast');shape(-12,14,23,23,'sea');paint(20,-2,23,11,'coast');
 paint(14,8,17,13,'wetland');paint(10,12,11,13,'wetland');   // the estuary marsh
 shape(12,-12,12,12,'river');shape(12,12,13,13,'river');     // the river down the east side to the sea
 // Grown around the village by 96 a side (the land stays put: its origin moves), then padded to whole regions.
 growMap(data,{north:M.grow,east:M.grow,south:M.grow,west:M.grow},{round:true});return roundUpToRegions(data);
}
