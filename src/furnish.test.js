import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {USES,USE_NAMES,furnishRoom,furnishingUse} from './furnish.js';
import {PROPS,createProp,blockedOffsets,seatPosition,takeLoot,resetLoot,lootTaken,PROP_KINDS,PROP_CATEGORIES} from './props.js';
import {buildCity} from './city-map.js';
import {propGalleryData} from './dev/prop-gallery.js';

// A rectangular room with a south door in the middle.
function room(w,d){const tiles=[];for(let z=0;z<d;z++)for(let x=0;x<w;x++)tiles.push([x,z]);return {tiles,doors:[{inside:[Math.floor(w/2),d-1],out:[0,1]}],keep:[]};}
function reachable(r,layout){const blocked=new Set();
 for(const f of layout)for(const [x,z] of blockedOffsets(f.kind,f.rotation))blocked.add(`${f.x+x},${f.z+z}`);
 const inRoom=new Set(r.tiles.map(t=>t.join())),start=r.doors[0].inside.join(),seen=new Set([start]),q=[start];
 while(q.length){const [x,z]=q.pop().split(',').map(Number);for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const k=`${x+dx},${z+dz}`;if(inRoom.has(k)&&!blocked.has(k)&&!seen.has(k)){seen.add(k);q.push(k);}}}
 return {blocked,free:r.tiles.map(t=>t.join()).filter(k=>!blocked.has(k)),seen};}

test('every use furnishes a room with known props, keeps the doorway clear and the room connected',()=>{
 for(const use of USE_NAMES)for(const seed of [1,2,3]){const r=room(6,5),layout=furnishRoom(r,use,seed);
  assert.ok(layout.length>0,`${use} has furniture`);
  for(const f of layout)assert.ok(PROPS[f.kind],`${use}: ${f.kind}`);
  const {blocked,free,seen}=reachable(r,layout),[dx,dz]=r.doors[0].inside;
  assert.ok(!blocked.has(`${dx},${dz}`)&&!blocked.has(`${dx},${dz-1}`),`${use}: doorway clear`);
  assert.deepEqual(free.filter(k=>!seen.has(k)),[],`${use} seed ${seed}: every free tile reachable`);}
});
test('the same seed gives the same room; shops get a counter with the keeper behind it',()=>{
 assert.deepEqual(furnishRoom(room(6,5),'bakery',7),furnishRoom(room(6,5),'bakery',7));
 const r=room(6,5),layout=furnishRoom(r,'store',3);
 assert.ok(layout.keeper,'a keeper spot');
 assert.ok(layout.some(f=>PROPS[f.kind].spots?.some(s=>s.kind==='vend')),'a counter');
 const {blocked}=reachable(r,layout);assert.ok(!blocked.has(layout.keeper.join()),'the keeper stands on a free tile');
});
test('furnishing uses: explicit, none, signed shops and homes',()=>{
 assert.equal(furnishingUse({use:'smithy'}),'smithy');
 assert.equal(furnishingUse({use:'none'}),null);
 assert.equal(furnishingUse({interior:'none'}),null);
 assert.equal(furnishingUse({sign:{icon:'star'}}),'store');
 assert.equal(furnishingUse({}),'home');
 assert.ok(USES.home&&USES.crypt);
});

// A flat strip of tiles for placing props directly.
function tilesOf(w,d){const map=new Map();for(let z=0;z<d;z++)for(let x=0;x<w;x++)map.set(`${x},${z}`,{x,z,h:0});return {map,at:(x,z)=>map.get(`${x},${z}`)};}
test('props: walk-under posts block only their corners, wall pieces block nothing, moving parts open',()=>{
 const {at}=tilesOf(8,8),parent=new THREE.Group();
 const gazebo=createProp('gazebo',{origin:[1,1],tileAt:at,parent});
 assert.equal(gazebo.blocked.length,4);assert.ok(!at(2,2).blocked&&at(1,1).blocked&&at(3,3).blocked);
 const torch=createProp('wallTorch',{origin:[5,1],tileAt:at,parent});assert.equal(torch.blocked.length,0);
 const chest=createProp('chest',{origin:[5,5],tileAt:at,parent});
 assert.ok(chest.group.userData.moving.length>0);assert.equal(chest.toggle(),true);assert.equal(chest.toggle(),false);
 gazebo.dispose();assert.ok(!at(1,1).blocked);
});
test('chest loot is given once, by id, and resets',()=>{
 resetLoot();const {at}=tilesOf(4,4),parent=new THREE.Group();
 const chest=createProp('chest',{origin:[1,1],tileAt:at,parent,loot:{id:'t:1,1',items:{logs:2}}});
 const plain=createProp('chest',{origin:[2,2],tileAt:at,parent});
 assert.deepEqual(takeLoot(chest),{logs:2});assert.equal(takeLoot(chest),null);assert.ok(lootTaken('t:1,1'));
 assert.equal(takeLoot(plain),null,'city chests: nothing interesting');
 resetLoot();assert.deepEqual(takeLoot(chest),{logs:2});resetLoot();
});
test('the prop gallery builds with every prop',()=>{
 const data=propGalleryData(),city=buildCity(data,{scene:new THREE.Group()});
 const placed=new Set(data.props.map(p=>p.kind));
 for(const kinds of Object.values(PROP_CATEGORIES))for(const k of kinds)assert.ok(placed.has(k),k);
 assert.equal(placed.size,PROP_KINDS.length);
 assert.ok(city.props.length>=PROP_KINDS.length);
});
test('sitting and sleeping put you on the piece, not beside it, whichever way it turns',()=>{
 for(const kind of Object.keys(PROPS).filter(k=>PROPS[k].spots?.some(s=>s.seat)))for(const rotation of [0,90,180,270]){
  const {at}=tilesOf(8,8),prop=createProp(kind,{origin:[3,3],rotation,tileAt:at,parent:new THREE.Group()});
  for(const spot of prop.spots.filter(s=>s.seat)){const p=seatPosition(spot),onto=at(Math.round(p.x+6),Math.round(p.z+6));
   assert.ok(prop.tiles.includes(onto),`${kind} at ${rotation}: seated on the piece`);}}
});
