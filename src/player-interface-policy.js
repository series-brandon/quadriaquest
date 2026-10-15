import {biomeRule} from './biome-rules.js';
// Shared responsive behavior: only explicit dismissal hides a desktop page.
export function menuReaction(mobile,event){
 if(event==='dismiss'||event==='switch')return 'close';
 return mobile?'close':'compact';
}
// A tile's minimap colour: water, indoors and what blocks keep their own; open ground on biome land takes
// its biome's minimap colour (docs/BIOMES.md), its shore or rock their own ground; paths and paving laid by hand
// their own colour (user, 2026-10-15); anywhere else the plain ground colour.
const BLEND=new Map(),PATH_COLORS={dirt:'#c4a678',cobble:'#a8a198',flagstone:'#bfb5a4',plaza:'#d0c4ad',planks:'#a07a52',stone:'#aaa49a'};
const muted=hex=>{if(!BLEND.has(hex)){const c=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)),base=[0xb2,0xa3,0x9d];BLEND.set(hex,'#'+c.map((v,i)=>Math.round(v*.8+base[i]*.2).toString(16).padStart(2,'0')).join(''));}return BLEND.get(hex);};
export function minimapTileColor(t){
 if(t.water)return '#7a9caf';if(t.indoor)return '#d9c9a6';if(t.blocksSight)return '#706679';if(t.blocked)return '#97869a';
 // Paths and paving laid by hand (or a city's own roads) show as paths.
 const path=PATH_COLORS[t.surface];if(path&&(t.made||!t.biome))return muted(path);
 if(t.biome){const g=biomeRule(t.biome).ground;return muted(t.rocky?g.rock.palette[0]:t.shore?(g.shore||g).palette[0]:g.minimap);}
 return t.safe?'#b4b59b':'#b2a39d';
}
// The tiles within `radius` of the centre, looked up by key (world.js key), row by row: a large map (the
// overworld has over 100,000 tiles) is never walked whole.
export function minimapTiles(world,center,radius=8){
 const out=[];for(let z=center.z-radius;z<=center.z+radius;z++)for(let x=center.x-radius;x<=center.x+radius;x++){const t=world.get(`${x},${z}`);if(t)out.push(t);}
 return out;
}

// Fit whole device-pixel cells so CSS scaling cannot alternate gutter widths.
export function minimapGrid(width,dpr=1,radius=8){
 const cells=radius*2+1,size=Math.max(2,Math.floor(width*dpr/cells));
 return {cells,size,pixels:cells*size,width:cells*size/dpr,gap:Math.max(1,Math.round(dpr))};
}
export function minimapGroundItems(world,nodes,center,radius=8){
 return nodes.filter(n=>!n.depleted&&n.group.visible&&world.get(`${n.x},${n.z}`)===n.tile&&Math.abs(n.x-center.x)<=radius&&Math.abs(n.z-center.z)<=radius);
}
