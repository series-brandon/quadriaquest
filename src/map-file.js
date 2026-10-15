import {REGION} from './world-grid.js';

// Compact map files (docs/TOWN.md, The map file). In memory a map is as world-map.js describes it; saved, the
// parts that are mostly untouched are packed:
//  - each region's layer (heights, offsets, surfaces) as {fill, rows}: only the rows that aren't all
//    `fill`, by their index, so untouched ground costs nothing;
//  - the land's painted biome and terrain cells as {legend, rows}: per row of cells (cz), [the first cx, one
//    letter per cell ('.' unpainted)], the letters indexing `legend`.
// Unpacking is in place and safe to repeat; world-map.js unpacks a region the first time it's read.
export function packMap(data){
 const out={...data,regions:{}};
 for(const [id,r] of Object.entries(data.regions||{}))out.regions[id]=Object.fromEntries(Object.entries(r).map(([layer,rows])=>[layer,packRows(rows)]));
 if(data.land)out.land={...data.land,...data.land.cells?{cells:packCells(data.land.cells)}:{},...data.land.terrain?{terrain:packCells(data.land.terrain)}:{}};
 return out;
}
export function unpackMap(data){for(const r of Object.values(data.regions||{}))unpackRegion(r);if(data.land)unpackLand(data.land);return data;}
export function unpackRegion(r){for(const [layer,rows] of Object.entries(r))if(!Array.isArray(rows))r[layer]=Array.from({length:REGION},(_,z)=>rows.rows[z]??rows.fill.repeat(REGION));return r;}
export function unpackLand(land){for(const k of ['cells','terrain'])if(Array.isArray(land[k]?.legend))land[k]=unpackCells(land[k]);return land;}
function packRows(rows){
 if(!Array.isArray(rows))return rows;const count=new Map();
 for(const row of rows)if(row===row[0].repeat(row.length))count.set(row[0],(count.get(row[0])||0)+1);
 const fill=[...count].sort((a,b)=>b[1]-a[1])[0]?.[0]??rows[0][0],plain=fill.repeat(REGION),out={};
 rows.forEach((row,z)=>{if(row!==plain)out[z]=row;});return {fill,rows:out};
}
const letter=i=>String.fromCharCode(i<26?97+i:65+i-26),index=c=>{const n=c.charCodeAt(0);return n>=97?n-97:n-65+26;};
function packCells(cells){
 if(Array.isArray(cells?.legend))return cells;const legend=[],byRow=new Map();
 for(const [k,v] of Object.entries(cells)){const [cx,cz]=k.split(',').map(Number);let i=legend.indexOf(v);if(i<0){i=legend.length;legend.push(v);}if(!byRow.has(cz))byRow.set(cz,[]);byRow.get(cz).push([cx,i]);}
 if(legend.length>52)return cells;
 const rows={};for(const [cz,list] of [...byRow].sort((a,b)=>a[0]-b[0])){const x0=Math.min(...list.map(c=>c[0])),x1=Math.max(...list.map(c=>c[0])),line=Array(x1-x0+1).fill('.');for(const [cx,i] of list)line[cx-x0]=letter(i);rows[cz]=[x0,line.join('')];}
 return {legend,rows};
}
function unpackCells({legend,rows}){const out={};for(const [cz,[x0,line]] of Object.entries(rows))for(let i=0;i<line.length;i++)if(line[i]!=='.')out[`${x0+i},${cz}`]=legend[index(line[i])];return out;}
