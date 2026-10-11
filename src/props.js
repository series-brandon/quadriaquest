import * as THREE from 'three';
import {cachedMergedMesh} from './merged-model.js';
import {makeTree} from './world-models.js';
import {key} from './world.js';
import {SEAT,lowerTo} from './prop-parts.js';
import {FURNITURE} from './prop-sets/furniture.js';
import {TRADE} from './prop-sets/trade.js';
import {STREET} from './prop-sets/street.js';
import {NATURE} from './prop-sets/nature.js';

// Shared prop prefabs (docs/CITY.md, Props and decoration; city Phase 5). A prop is placed from its
// kind, an origin tile and a rotation, in any map; it carries
//  - a footprint (w × d tiles, before rotation; the origin is the north-west tile),
//  - a policy: 'solid' (blocks walking), 'low' (blocks walking, not sight) or 'walk' (walk-over), and
//    `sight: false` for tall props that also block sight,
//  - spots: where townsfolk and the player use it ({kind: sit | gaze | drink | read | browse | vend |
//    work, at: [dx, dz] from the origin before rotation, facing: the way the user faces}),
//  - an optional interaction (label, verb), handled by the game through configureProps.
// Models are merged per kind (one draw per prop, one shared geometry per look). Spots are data
// townsfolk (townsfolk.js) and the player share.
// Rotation is 0/90/180/270 clockwise from above; "front" (the side spots usually face from) is south.
const W=(color,geometry,position=[0,0,0],rotation=[0,0,0],scale)=>({geometry,color,position,rotation,scale});
const B=(w,h,d)=>new THREE.BoxGeometry(w,h,d),C=(r0,r1,h,n=10)=>new THREE.CylinderGeometry(r0,r1,h,n);
const WOOD='#8a5b3c',DARK='#5a3d28',STONE='#b6afa3',PALE='#cfc8bb',IRON='#4b4651',WATER='#7fb4cf',LEAF='#6f9a55',CLOTH='#c8463d',CANVAS='#efe6d2';
export const PROPS={
 bench:{name:'Bench',footprint:[2,1],policy:'solid',interaction:{verb:'sit',label:'Sit on bench'},
  spots:[{kind:'sit',at:[0,1],facing:'s',seat:true},{kind:'sit',at:[1,1],facing:'s',seat:true}],
  // A deep seat reaching well forward and a back (a slime sits back against it: seatPosition), each
  // two boards with a small gap between them.
  parts:()=>lowerTo([W(WOOD,B(1.7,.07,.29),[0,.38,0]),W(WOOD,B(1.7,.07,.29),[0,.38,.31]),W(WOOD,B(1.7,.17,.06),[0,.58,-.17],[-.12,0,0]),W(WOOD,B(1.7,.17,.06),[0,.8,-.2],[-.12,0,0]),
   ...[-.75,.75].flatMap(x=>[W(IRON,B(.06,.38,.06),[x,.19,.4]),W(IRON,B(.06,.38,.06),[x,.19,-.12]),W(IRON,B(.06,.04,.6),[x,.33,.15]),W(IRON,B(.06,.54,.05),[x,.65,-.18],[-.12,0,0])])],.38,SEAT-.035)},
 fountain:{name:'Fountain',footprint:[3,3],policy:'solid',interaction:{verb:'gaze',label:'Look at fountain'},
  spots:[{kind:'gaze',at:[1,3],facing:'n'},{kind:'drink',at:[-1,1],facing:'e'},{kind:'gaze',at:[3,1],facing:'w'},{kind:'drink',at:[1,-1],facing:'s'}],
  parts:()=>[W(STONE,C(1.45,1.5,.5,24),[0,.25,0]),W(PALE,C(1.5,1.5,.08,24),[0,.54,0]),W(WATER,C(1.32,1.32,.06,24),[0,.46,0]),W(STONE,C(.28,.36,.9,12),[0,.9,0]),W(PALE,C(.62,.5,.16,16),[0,1.38,0]),W(WATER,C(.56,.56,.04,16),[0,1.45,0]),W(STONE,C(.1,.14,.42,8),[0,1.62,0]),W('#a9d3e3',new THREE.SphereGeometry(.12,10,8),[0,1.86,0])]},
 statue:{name:'Statue',footprint:[1,1],policy:'solid',sight:false,interaction:{verb:'gaze',label:'Look at statue'},spots:[{kind:'gaze',at:[0,1],facing:'n'}],
  parts:()=>[W(PALE,B(.8,.5,.8),[0,.25,0]),W(STONE,B(.7,.1,.7),[0,.55,0]),W('#9fb3a5',new THREE.SphereGeometry(.34,14,10),[0,.92,0],[0,0,0],[1,.92,1]),W('#9fb3a5',C(.24,.3,.12,12),[0,.66,0]),W('#8a9f91',B(.36,.08,.1),[0,1.28,.02])]},
 noticeboard:{name:'Noticeboard',footprint:[1,1],policy:'solid',interaction:{verb:'read',label:'Read noticeboard'},spots:[{kind:'read',at:[0,1],facing:'n'}],
  parts:()=>[W(WOOD,B(.08,1.5,.08),[-.42,.75,0]),W(WOOD,B(.08,1.5,.08),[.42,.75,0]),W(DARK,B(.92,.66,.06),[0,1.05,.02]),W('#5f4630',B(1.02,.1,.2),[0,1.45,.04],[.2,0,0]),
   W(CANVAS,B(.24,.3,.01),[-.22,1.08,.06],[0,0,.06]),W('#f2d35b',B(.22,.2,.01),[.08,1.16,.06],[0,0,-.08]),W(CANVAS,B(.2,.26,.01),[.28,.98,.06])]},
 flowerBed:{name:'Flower bed',footprint:[2,1],policy:'low',spots:[],
  parts:()=>[W(STONE,B(1.9,.2,.9),[0,.1,0]),W('#6b5236',B(1.78,.06,.78),[0,.2,0]),...[-.7,-.35,0,.35,.7].flatMap((x,i)=>[W(LEAF,B(.18,.16,.5),[x,.3,0]),W(['#e46f8e','#f2d35b','#f6f2e8','#b58ad6','#e46f8e'][i],B(.14,.08,.14),[x,.42,(i%2?.12:-.12)])])]},
 planter:{name:'Planter',footprint:[1,1],policy:'solid',spots:[],
  parts:()=>[W(WOOD,B(.7,.42,.7),[0,.21,0]),W(DARK,B(.76,.06,.76),[0,.43,0]),W(LEAF,new THREE.IcosahedronGeometry(.36,1),[0,.72,0],[0,0,0],[1,.8,1]),W('#e46f8e',B(.1,.08,.1),[.16,.92,.08]),W('#f2d35b',B(.1,.08,.1),[-.14,.88,-.1])]},
 treeGrate:{name:'Tree in a grate',footprint:[1,1],policy:'solid',spots:[],tree:true,parts:()=>[W(IRON,B(.9,.04,.9),[0,.02,0]),W('#7d6a52',B(.6,.05,.6),[0,.03,0])]},
 hedge:{name:'Hedge',footprint:[1,1],policy:'solid',sight:false,spots:[],parts:()=>[W('#5f8a48',B(.96,.9,.7),[0,.45,0]),W('#6f9a55',B(.9,.14,.62),[0,.95,0])]},
 stall:{name:'Market stall',footprint:[2,1],policy:'solid',interaction:{verb:'trade',label:'Browse stall'},shop:'market',
  spots:[{kind:'browse',at:[0,1],facing:'n'},{kind:'browse',at:[1,1],facing:'n'},{kind:'vend',at:[0,-1],facing:'s'}],
  parts:()=>[W(WOOD,B(1.8,.49,.6),[0,.245,.1]),W(DARK,B(1.86,.06,.66),[0,.52,.1]),...[-.86,.86].flatMap(x=>[W(WOOD,B(.07,1.7,.07),[x,.85,-.18]),W(WOOD,B(.07,1.45,.07),[x,.72,.38])]),
   ...[0,1,2,3,4,5].map(i=>W(i%2?CANVAS:CLOTH,B(.32,.04,.86),[-.8+i*.32,1.62,.12],[.28,0,0])),W('#d0913a',B(.3,.16,.22),[-.5,.63,.12]),W('#7aa04f',new THREE.IcosahedronGeometry(.1,0),[-.1,.63,.16]),W('#c8463d',new THREE.IcosahedronGeometry(.09,0),[.06,.62,.1]),W('#e8c46a',B(.34,.12,.24),[.5,.61,.1])]},
 crates:{name:'Crates',footprint:[1,1],policy:'solid',spots:[],parts:()=>[W('#a07850',B(.56,.5,.56),[-.1,.25,.08]),W('#8f6a46',B(.4,.36,.4),[.12,.68,0],[0,.4,0]),W(DARK,B(.58,.05,.05),[-.1,.4,.37])]},
 barrel:{name:'Barrel',footprint:[1,1],policy:'solid',spots:[],parts:()=>[W('#8f6a46',C(.3,.3,.74,12),[0,.37,0]),W('#9b754f',C(.34,.34,.4,12),[0,.37,0]),W(IRON,C(.315,.315,.04,12),[0,.12,0]),W(IRON,C(.315,.315,.04,12),[0,.62,0])]},
 sacks:{name:'Sacks',footprint:[1,1],policy:'solid',spots:[],parts:()=>[W('#cdb88f',new THREE.SphereGeometry(.26,10,8),[-.14,.22,.06],[0,0,0],[1,.9,.85]),W('#c3ad84',new THREE.SphereGeometry(.24,10,8),[.18,.2,-.08],[0,0,0],[1,.85,.9]),W('#d2bf96',new THREE.SphereGeometry(.2,10,8),[.02,.5,0],[0,0,0],[1,.9,1])]},
 lampPost:{name:'Lamp post',footprint:[1,1],policy:'solid',spots:[],glow:[[0,2.14,0,.09]],parts:()=>[W(IRON,C(.12,.16,.16,8),[0,.08,0]),W(IRON,C(.045,.06,1.9,8),[0,1.05,0]),W(IRON,B(.3,.04,.3),[0,1.98,0]),W('#ffe3a1',B(.22,.26,.22),[0,2.14,0]),W(IRON,new THREE.ConeGeometry(.22,.16,4),[0,2.35,0],[0,Math.PI/4,0])]},
 signpost:{name:'Signpost',footprint:[1,1],policy:'solid',spots:[],parts:()=>[W(WOOD,B(.1,1.6,.1),[0,.8,0]),W('#c9a46c',B(.66,.16,.04),[.2,1.36,0]),W('#c9a46c',B(.04,.16,.6),[0,1.12,.18]),W('#c9a46c',B(.58,.16,.04),[-.16,.9,0])]},
 well:{name:'Well',footprint:[1,1],policy:'solid',interaction:{verb:'drink',label:'Drink from well'},spots:[{kind:'drink',at:[0,1],facing:'n'}],
  parts:()=>[W(STONE,C(.44,.46,.56,14),[0,.28,0]),W('#3d5966',C(.34,.34,.04,14),[0,.5,0]),...[-.38,.38].map(x=>W(WOOD,B(.07,.9,.07),[x,.95,0])),W(DARK,B(.94,.06,.08),[0,1.4,0]),W('#b5553c',new THREE.ConeGeometry(.66,.36,4),[0,1.6,0],[0,Math.PI/4,0]),W(WOOD,C(.06,.06,.6,8),[0,1.18,0],[0,0,Math.PI/2])]},
 banner:{name:'Banner',footprint:[1,1],policy:'solid',spots:[],parts:()=>[W(IRON,C(.04,.05,2.2,6),[0,1.1,0]),W(IRON,B(.6,.04,.04),[.28,2.08,0]),W('#3d63a8',B(.5,.9,.02),[.3,1.6,0]),W('#f2d35b',B(.18,.18,.025),[.3,1.66,0],[0,0,Math.PI/4])]},
 dungeonEntrance:{name:'Dungeon entrance',footprint:[2,2],policy:'solid',sight:false,interaction:{verb:'enter',label:'Go down'},spots:[{kind:'enter',at:[0,2],facing:'n'},{kind:'enter',at:[1,2],facing:'n'}],
  parts:()=>[W('#8f8a84',B(1.9,.3,1.9),[0,.15,0]),W('#1d1915',B(1.3,.02,1.3),[0,.31,.05]),...[0,1,2].map(i=>W('#6e6860',B(1.2,.04,.3),[0,.3-i*.002,.45-i*.3])),
   ...[-.85,.85].map(x=>W('#a49e94',B(.24,1.5,.24),[x,1.05,.7])),W('#a49e94',B(1.94,.28,.3),[0,1.9,.7]),W('#7d776f',B(1.6,.12,.2),[0,1.72,.7]),W('#3d3833',B(1.4,1.2,.06),[0,.9,-.88])]},
 cart:{name:'Cart',footprint:[2,1],policy:'solid',spots:[],parts:()=>[W('#9b754f',B(1.3,.38,.78),[-.15,.6,0]),W(DARK,B(1.36,.06,.84),[-.15,.42,0]),...[-1,1].map(s=>W(DARK,C(.36,.36,.06,14),[-.15,.36,s*.44],[Math.PI/2,0,0])),W(WOOD,B(.9,.06,.06),[.85,.5,.24]),W(WOOD,B(.9,.06,.06),[.85,.5,-.24]),W('#cdb88f',new THREE.SphereGeometry(.22,8,6),[-.35,.86,.1]),W('#8f6a46',B(.3,.26,.3),[.08,.88,-.12])]},
};
const STARTER=Object.keys(PROPS);
// The Phase 10 sets (src/prop-sets/): interior furniture, shop and trade fixtures, street and civic
// pieces, nature and dungeon dressing.
Object.assign(PROPS,FURNITURE,TRADE,STREET,NATURE);
export const PROP_CATEGORIES={'Starter set':STARTER,'Interior furniture':Object.keys(FURNITURE),'Shop and trade':Object.keys(TRADE),'Street and civic':Object.keys(STREET),'Nature and dungeon':Object.keys(NATURE)};
export const PROP_KINDS=Object.keys(PROPS);
const SIDES=['n','e','s','w'],ANGLE={n:Math.PI,e:Math.PI/2,s:0,w:-Math.PI/2};
// The game supplies what interactions do (main.js): sit, sleep, cook, smith, open, read, examine,
// drink, gaze, browse, enter.
let services={act(){}};
export function configureProps(next){services={...services,...next};}

// A footprint offset [dx, dz] (before rotation) turned by `rotation` within a w × d footprint whose
// origin stays the north-west tile of the rotated footprint.
export function rotateOffset([dx,dz],[w,d],rotation=0){
 const steps=((Math.round(rotation/90)%4)+4)%4;let x=dx,z=dz,W=w,D=d;
 for(let i=0;i<steps;i++){[x,z]=[D-1-z,x];[W,D]=[D,W];}
 return [x,z];
}
export const rotateSide=(side,rotation=0)=>SIDES[(SIDES.indexOf(side)+(((Math.round(rotation/90)%4)+4)%4))%4];
export function propFootprint(kind,rotation=0){const [w,d]=PROPS[kind].footprint;return ((Math.round(rotation/90)%2)+2)%2?[d,w]:[w,d];}
// Which footprint tiles block: all (solid, low), none (walk over, wall-mounted), or a walk-under
// structure's posts (`block`, offsets before rotation).
export function blockedOffsets(kind,rotation=0){const def=PROPS[kind],[w,d]=def.footprint;
 if(def.block)return def.block.map(o=>rotateOffset(o,def.footprint,rotation));
 if(def.policy==='walk')return [];const out=[];for(let z=0;z<d;z++)for(let x=0;x<w;x++)out.push(rotateOffset([x,z],def.footprint,rotation));return out;}
// The model alone (catalogue, previews): one merged mesh per kind, a tree for tree grates, glows for
// lit props (a separate material, for day and night later), and moving parts (lids, doors, drawers).
const glowMaterial=new THREE.MeshBasicMaterial({color:'#fff1c4'});glowMaterial.userData.shared=true;
const glowGeometry=new THREE.SphereGeometry(1,8,6);glowGeometry.userData.shared=true;
export function propModel(kind){
 const def=PROPS[kind],group=new THREE.Group();group.name='prop-'+kind;
 group.add(cachedMergedMesh('prop:'+kind,def.parts));
 if(def.tree){const tree=makeTree();tree.scale.setScalar(.8);group.add(tree);}
 for(const [x,y,z,r] of def.glow||[]){const glow=new THREE.Mesh(glowGeometry,glowMaterial);glow.scale.setScalar(r);glow.position.set(x,y,z);glow.name='prop-glow';group.add(glow);}
 group.userData.moving=(def.moving||[]).map((m,i)=>{const pivot=new THREE.Group();pivot.name='prop-moving';pivot.position.set(...m.pivot);pivot.add(cachedMergedMesh(`prop:${kind}:moving${i}`,m.parts));group.add(pivot);return {pivot,spec:m,rest:pivot.position.clone()};});
 return group;
}
// Open (0 shut … 1 open): lids and doors turn by `open`, drawers slide by `offset`.
export function setPropOpen(group,amount){for(const {pivot,spec,rest} of group.userData.moving||[]){pivot.rotation.set(...spec.open.map(a=>a*amount));pivot.position.copy(rest);if(spec.offset)pivot.position.add(new THREE.Vector3(...spec.offset).multiplyScalar(amount));}}
// Props with moving parts animate towards their open state each frame (updateProps, main.js).
// Only props on their way open or shut are visited; a settled one drops out. A prop in a frozen group
// (furniture, which never moves) refreshes its own matrices while it moves.
const animated=new Set();
export function updateProps(dt){for(const p of animated){const target=p.open?1:0;p.amount+=Math.sign(target-p.amount)*Math.min(Math.abs(target-p.amount),dt*3);setPropOpen(p.group,p.amount);if(p.frozen)p.group.updateMatrixWorld(true);if(p.amount===target)animated.delete(p);}}
// Loot taken from world chests, by stable id (survives rebuilding a map within a session).
const takenLoot=new Set();
export const lootTaken=id=>takenLoot.has(id);
export function resetLoot(){takenLoot.clear();}

// Places a prop: marks its tiles, adds the model, and returns its spots as live tiles.
// tileAt(x, z) → tile. Throws if a footprint tile is missing (the editor checks before placing).
// loot: items a chest gives once ({id, items}); without it, opening says there is nothing inside.
// shop: the shop a trading prop opens (shops.js; a counter's comes from its building, a stall's is the
// market unless the map says otherwise).
export function createProp(kind,{origin,rotation=0,tileAt,parent,pickables=[],id=null,loot=null,shop=null}){
 const def=PROPS[kind];if(!def)throw Error('Unknown prop: '+kind);
 const [ox,oz]=origin,[w,d]=propFootprint(kind,rotation),tiles=[];
 for(let z=0;z<d;z++)for(let x=0;x<w;x++){const t=tileAt(ox+x,oz+z);if(!t)throw Error(`${def.name}: no tile at ${ox+x},${oz+z}`);tiles.push(t);}
 const base=Math.max(...tiles.map(t=>t.h)),blocked=blockedOffsets(kind,rotation).map(([x,z])=>tileAt(ox+x,oz+z)).filter(Boolean);
 for(const t of blocked){t.blocked=true;if(def.sight===false)t.blocksSight=true;}
 for(const t of tiles)t.prop=id??kind;
 const group=propModel(kind);group.rotation.y=-((Math.round(rotation/90)%4)+4)%4*Math.PI/2;
 group.position.set(ox+(w-1)/2-6,base,oz+(d-1)/2-6);parent.add(group);
 const spots=(def.spots||[]).map(s=>{const [x,z]=rotateOffset(s.at,def.footprint,rotation),tile=tileAt(ox+x,oz+z),facing=rotateSide(s.facing,rotation);
  const seat=s.seat===true?{back:SEAT_BACK,height:SEAT,motion:'Sit'}:s.seat||null;
  return {kind:s.kind,tile,facing,angle:ANGLE[facing],seat,prop:null};}).filter(s=>s.tile);
 // The interaction anchor: the tile in front of the prop's middle that you walk up to.
 const anchor=blocked[Math.floor(blocked.length/2)]||tiles[0];
 const prop={kind,id,def,group,tiles,blocked,spots,tile:anchor,x:anchor.x,z:anchor.z,label:def.interaction?.label??def.name,ready:true,opened:false,duration:0,
  station:def.station||null,loot,shop:shop??def.shop??null,open:false,amount:0,
  available:()=>true,interact(){if(def.interaction)services.act(def.interaction.verb,prop);},
  toggle(){prop.open=!prop.open;animated.add(prop);return prop.open;},
  dispose(){group.removeFromParent();animated.delete(prop);for(const t of blocked){t.blocked=false;if(def.sight===false)t.blocksSight=false;}for(const t of tiles)delete t.prop;for(const m of meshes){const i=pickables.indexOf(m);if(i>=0)pickables.splice(i,1);}}};
 for(const s of spots)s.prop=prop;
 // Interactive props are picked like other actors (the game walks up and calls interact()).
 const meshes=[];if(def.interaction)group.traverse(m=>{if(m.isMesh){m.userData.actor=prop;m.userData.tile=prop.tile;pickables.push(m);meshes.push(m);}});
 return prop;
}
// Taking a chest's loot (once, by its id): the items, or null when there is nothing (city furniture) or
// it was taken already.
export function takeLoot(prop){if(!prop.loot||takenLoot.has(prop.loot.id))return null;takenLoot.add(prop.loot.id);return {...prop.loot.items};}
// Where a sitter's (or sleeper's) body rests: `back` tiles behind the spot, on the seat.
export const SEAT_BACK=.72;
export function seatPosition(spot){const back=-(spot.seat?.back??SEAT_BACK);return {x:spot.tile.x-6+Math.sin(spot.angle)*back,z:spot.tile.z-6+Math.cos(spot.angle)*back};}
