import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {planBuilding,normalizeBuilding,createBuilding,roofGeometry,BUILDING_PRESETS,ROOF_TYPES,perimeter,toShaped,shiftShaped,shapeRuns,shapeRects,connectedCells,shapeRoofGeometry} from './building-kit.js';
import {createEdgeFeatures} from './doors.js';
import {STYLE_NAMES} from './edge-models.js';
import {findPath,key,edgeBetween} from './world.js';

const shop=BUILDING_PRESETS.shop;
test('the same description always plans the same building; the seed varies only decoration',()=>{
 assert.deepEqual(planBuilding(shop,[4,4]),planBuilding(shop,[4,4]));
 const a=planBuilding(shop,[4,4]),b=planBuilding({...shop,seed:99},[4,4]);
 assert.deepEqual(a.tiles,b.tiles);assert.deepEqual(a.doors,b.doors,'collision does not depend on the seed');
});
test('a plan has its tiles, one edge per outline tile, doors with doorsteps, and anchors',()=>{
 const plan=planBuilding(shop,[10,20]);
 assert.equal(plan.tiles.length,30);assert.equal(plan.edges.length,perimeter(6,5).length);
 assert.equal(plan.doors.length,1);const door=plan.doors[0];
 assert.deepEqual(door.inside,[13,24]);assert.deepEqual(door.doorstep,[13,25],'the south door at 2 counts east to west');
 assert.deepEqual(plan.anchors.keeper,[13,22],'the shopkeeper stands two tiles in');
 assert.ok(plan.anchors.sign&&plan.anchors.awning,'a shop has its sign and awning');
 assert.ok(plan.edges.some(e=>e.kind==='window'),'auto windows');
 assert.ok(plan.edges.filter(e=>e.kind==='window').every(e=>e.at>0),'corners stay solid');
});
test('rotation turns the footprint, doors and ridge, and keeps each door’s place along its edge',()=>{
 const turned=normalizeBuilding({...shop,rotation:90});
 assert.deepEqual(turned.footprint,[5,6]);assert.deepEqual(turned.doors,[{edge:'west',at:2}]);assert.equal(turned.ridge,'z');
 assert.equal(normalizeBuilding({...shop,rotation:360}).doors[0].edge,'south');
 const plan=planBuilding({...shop,rotation:180},[0,0]);assert.equal(plan.doors[0].edge,'north');assert.deepEqual(plan.doors[0].inside,[2,0]);
});
test('a door that would break the door rule is refused',()=>{
 assert.throws(()=>planBuilding({footprint:[3,3],doors:[{edge:'south',at:0}]}),/door rule/);
 assert.throws(()=>planBuilding({footprint:[3,3],doors:[{edge:'east',at:2}]}),/door rule/);
});
test('every roof type and style builds finite geometry, ridge either way',()=>{
 for(const roof of ROOF_TYPES)for(const style of STYLE_NAMES)for(const ridge of ['x','z']){
  const g=roofGeometry({roof,w:5,d:4,ridge,style,chimney:{along:.2,side:1}});
  assert.ok(g.attributes.position.count>0&&g.attributes.color&&[...g.attributes.position.array].every(Number.isFinite),`${roof}/${style}/${ridge}`);
 }
});
function smallMap(){
 const scene=new THREE.Scene(),tiles=new Map();for(let x=0;x<20;x++)for(let z=0;z<20;z++)tiles.set(key(x,z),{x,z,h:1,blocked:false});
 const t=(x,z)=>tiles.get(key(x,z));return {scene,tiles,t,edges:createEdgeFeatures({parent:scene,tileAt:t})};
}
test('a placed building: walls on its outline, its door opens a route in, its roof hides with it',()=>{
 const {scene,tiles,t,edges}=smallMap();
 const built=createBuilding(shop,{origin:[4,4],id:2,edges,tileAt:t,parent:scene});
 assert.ok(t(5,5).indoor&&t(5,5).building===2);
 assert.equal(edges.doorProblems().length,0);
 const inside=t(6,6),outside=t(1,1);assert.equal(findPath(tiles,outside,inside),null,'closed: sealed');
 built.doors[0].setOpen(true);assert.ok(findPath(tiles,outside,inside),'open: a route in');
 assert.equal(edgeBetween(t(4,4),t(3,4)).kind,'wall','corners stay solid');
 assert.ok(edges.buildingBoxes.get(2).top>built.top,'the roof counts towards the building’s box');
 assert.equal(built.roof.position.y,built.top,'the roof sits on the walls');
 built.dispose();assert.equal(edges.count,0);assert.equal(t(5,5).indoor,false);
});
test('buildings side by side share one wall, owned by both, as tall as the taller',()=>{
 const {scene,t,edges}=smallMap();
 createBuilding({footprint:[3,3],storeys:1,doors:[{edge:'south',at:1}]},{origin:[2,2],id:0,edges,tileAt:t,parent:scene});
 createBuilding({footprint:[3,3],storeys:2,doors:[{edge:'south',at:1}]},{origin:[5,2],id:1,edges,tileAt:t,parent:scene});
 const shared=edges.info(t(4,3),t(5,3));assert.equal(shared.kind,'wall');assert.deepEqual(shared.owners,[0,1]);assert.equal(shared.storeys,2);
});
test('a building without an interior is solid with locked doors',()=>{
 const {scene,t,edges}=smallMap(),built=createBuilding(BUILDING_PRESETS.hall,{origin:[2,2],id:4,edges,tileAt:t,parent:scene});
 assert.ok(t(4,4).blocked);assert.ok(built.doors.every(d=>d.locked));
});
test('the model viewer’s Building entry builds every preset, style, roof and rotation through the real builder',async()=>{
 const {buildingPreview}=await import('./dev/model-catalog.js');const preview=buildingPreview();
 for(const preset of Object.keys(BUILDING_PRESETS))for(const [style,roof,rotation] of [['','',''],['brick','hip','90'],['stone','flat','180'],['graybox','cone','270']])for(const motion of ['Doors closed','Doors open','Cut (cutaway)']){
  preview.update(.5,motion,.016,null,null,{worn:{preset,style,roof,rotation}});preview.group.updateMatrixWorld(true);
  let meshes=0;preview.group.traverse(o=>{if(o.isMesh)meshes++;assert.ok(o.matrixWorld.elements.every(Number.isFinite));});assert.ok(meshes>0,preset);
 }
});
test('multi-storey buildings have a floor at every storey line inside, part of the roof that hides when cut',()=>{
 const one=roofGeometry({roof:'gable',w:4,d:4,storeys:1}).attributes.position.count,three=roofGeometry({roof:'gable',w:4,d:4,storeys:3});
 assert.equal(three.attributes.position.count-one,2*36,'two floor slabs');
 const ys=[...three.attributes.position.array].filter((_,i)=>i%3===1);assert.ok(ys.some(y=>Math.abs(y+1.5)<1e-6)&&ys.some(y=>Math.abs(y+3)<1e-6),'at one and two storeys below the top');
});
test('the sign goes on the side of the door away from a corner with a neighbour',()=>{
 const {scene,t,edges}=smallMap();
 // A 4 × 3 shop at x 6..9, z 4..6 with its door on the south side at x 8 (south counts east to west).
 const shopDesc={footprint:[4,3],doors:[{edge:'south',at:1}],sign:{icon:'hammers',edge:'south'},seed:1};
 assert.deepEqual(planBuilding(shopDesc,[6,4]).anchors.sign.tile,[7,6],'unconstrained: the side farther from its own corner');
 // A neighbour south-west (x 4..6, z 7..8) makes a corner just west of the door: the sign goes east.
 createBuilding({footprint:[3,2],doors:[]},{origin:[4,7],id:1,edges,tileAt:t,parent:scene});
 const built=createBuilding(shopDesc,{origin:[6,4],id:2,edges,tileAt:t,parent:scene});
 assert.deepEqual(built.anchors.sign.tile,[9,6],'east of the door, not into the corner');
});
test('roof shades stay close to their district colour (no dark roof turns black)',()=>{
 const g=roofGeometry({roof:'hip',w:5,d:6,ridge:'z',style:'brick',color:'rgb(65,74,69)'}),c=g.attributes.color.array;
 let darkest=1;for(let i=0;i<c.length;i+=3)darkest=Math.min(darkest,Math.max(c[i],c[i+1],c[i+2]));
 assert.ok(darkest>.02,`darkest roof channel ${darkest}`);
});

// Shaped footprints (docs/TOWN.md, hand-shaped buildings).
const rect=(x0,z0,w,d)=>{const out=[];for(let z=z0;z<z0+d;z++)for(let x=x0;x<x0+w;x++)out.push([x,z]);return out;};
const L={name:'L house',cells:[...rect(0,0,6,3),...rect(0,3,3,3)],doors:[{tile:[1,5],side:'south'}],chimney:true,seed:4};
test('a rectangle written as a shape plans exactly the same building',()=>{
 for(const desc of [...Object.values(BUILDING_PRESETS),{...shop,rotation:90},{...BUILDING_PRESETS.townhouse,rotation:270,doors:[{edge:'east',at:1}]}]){
  const a=planBuilding(desc,[4,4]),b=planBuilding(toShaped(desc),[4,4]),edges=p=>p.edges.map(e=>`${e.a}>${e.b}:${e.kind}`).sort();
  assert.deepEqual(edges(b),edges(a),desc.name);assert.deepEqual(b.doors.map(d=>`${d.inside}>${d.doorstep}`),a.doors.map(d=>`${d.inside}>${d.doorstep}`));
  assert.deepEqual(new Set(b.flowerBoxes),new Set(a.flowerBoxes));assert.deepEqual(b.tiles.map(String).sort(),a.tiles.map(String).sort());}
});
test('an L-shaped building: walls follow the outline, straight runs, two roof blocks, the door rule per run',()=>{
 const plan=planBuilding(L,[10,10]);
 assert.equal(plan.tiles.length,27);assert.equal(plan.edges.length,24,'one wall per outside tile edge, none inside');
 assert.deepEqual(shapeRuns(L.cells).map(r=>`${r.side}${r.cells.length}`),['north6','east3','east3','south3','south3','west6']);
 assert.deepEqual(plan.rects.length,2);assert.equal(plan.doors.length,1);assert.deepEqual(plan.doors[0].doorstep,[11,16]);
 assert.ok(plan.edges.every(e=>!plan.tiles.some(t=>t[0]===e.b[0]&&t[1]===e.b[1])),'every wall faces outside');
 assert.throws(()=>planBuilding({...L,doors:[{tile:[0,5],side:'south'}]}),/door rule/,'a door at a corner');
 assert.throws(()=>planBuilding({...L,doors:[{tile:[3,1],side:'south'}]}),/outside wall/,'a door on an inside edge');
 assert.throws(()=>planBuilding({...L,cells:[[0,0],[2,0]],doors:[]}),/connected/);
 assert.ok(!connectedCells([[0,0],[1,1]]));assert.ok(connectedCells(rect(0,0,2,2)));
});
test('a shaped building turns as a whole, door and all',()=>{
 const base=planBuilding(L,[0,0]);
 for(const rotation of [90,180,270]){const p=planBuilding({...L,rotation},[0,0]);assert.equal(p.tiles.length,base.tiles.length);assert.equal(p.edges.length,base.edges.length);
  const door=p.doors[0];assert.ok(p.tiles.some(t=>t[0]===door.inside[0]&&t[1]===door.inside[1]));assert.ok(!p.tiles.some(t=>t[0]===door.doorstep[0]&&t[1]===door.doorstep[1]),'the door still opens outwards');}
});
test('shaped roofs: every roof type builds; a zig-zag still gets a roof, in more pieces',()=>{
 const plan=planBuilding(L,[0,0]);
 for(const roof of ROOF_TYPES){const g=shapeRoofGeometry({plan,roof,chimney:plan.chimney,storeys:2});assert.ok(g.attributes.position.count>0,roof);g.computeBoundingBox();assert.ok(g.boundingBox.max.y>0,roof);}
 const zig=[[0,0],[1,0],[1,1],[2,1],[2,2],[3,2],[3,3]],zplan=planBuilding({cells:zig,doors:[]},[0,0]);
 assert.ok(shapeRects(zig).length>=4);assert.ok(shapeRoofGeometry({plan:zplan,roof:'gable'}).attributes.position.count>0);
});
test('a shaped building in a map: tiles marked, sealed until its door opens, no walls inside, cleared on dispose',()=>{
 const world=new Map();for(let z=0;z<20;z++)for(let x=0;x<20;x++)world.set(key(x,z),{x,z,h:1});
 const edges=createEdgeFeatures({parent:new THREE.Group(),tileAt:(x,z)=>world.get(key(x,z))}),parent=new THREE.Group();
 const built=createBuilding(L,{origin:[2,2],id:0,edges,tileAt:(x,z)=>world.get(key(x,z)),parent});
 assert.equal([...world.values()].filter(t=>t.building===0).length,27);
 assert.equal(findPath(world,world.get(key(15,15)),world.get(key(4,6))),null,'closed: sealed');built.doors[0].setOpen(true);
 const route=findPath(world,world.get(key(15,15)),world.get(key(4,6)));assert.ok(route,'open: walk in through the door');
 assert.ok(route.some(t=>t.x===3&&t.z===7),'through the door tile');
 const t=(x,z)=>world.get(key(x,z));assert.ok(!edgeBetween(t(4,4),t(4,5))&&!edgeBetween(t(3,4),t(3,5))&&!edgeBetween(t(4,4),t(5,4)),'no wall where the wing joins the main block');
 assert.ok(edgeBetween(t(4,5),t(5,5)),'a wall along the inside corner');
 assert.ok(built.roof.geometry.attributes.position.count>0);built.dispose();assert.equal([...world.values()].filter(t=>t.building===0).length,0);
});
test('hand-set walls: a window or a plain wall where you choose, over the automatic rhythm, turned with the building',()=>{
 const base=planBuilding(L,[0,0]),kindAt=(p,x,z,side)=>p.edges.find(e=>e.a[0]===x&&e.a[1]===z&&e.side===side)?.kind;
 const auto=kindAt(base,2,0,'north'),flip=auto==='window'?'wall':'window';
 const set={...L,walls:{'2,0,north':flip}};assert.equal(kindAt(planBuilding(set,[0,0]),2,0,'north'),flip);
 assert.equal(kindAt(planBuilding({...L,walls:{'1,5,south':'window'}},[0,0]),1,5,'south'),'door','a door wins over a hand-set wall');
 for(const rotation of [90,180,270]){const turned=planBuilding({...set,rotation},[0,0]),plain=planBuilding({...L,rotation},[0,0]);
  const changed=turned.edges.filter((e,i)=>e.kind!==plain.edges[i].kind);assert.equal(changed.length,1,`exactly the one wall changes at ${rotation}°`);assert.equal(changed[0].kind,flip);}
});
test('a sign hangs on the wall it is set on, and moves with the building',()=>{
 const desc={...L,sign:{icon:'hammers',tile:[5,1],side:'east'}},plan=planBuilding(desc,[10,10]);
 assert.deepEqual(plan.anchors.sign.tile,[15,11]);assert.equal(plan.anchors.sign.edge,'east');
 const shifted=shiftShaped({...desc,walls:{'2,0,north':'wall'}},1,2);assert.deepEqual(shifted.sign.tile,[6,3]);assert.deepEqual(shifted.doors[0].tile,[2,7]);assert.deepEqual(Object.keys(shifted.walls),['3,2,north']);
 const onDoor=planBuilding({...L,sign:{icon:'hammers',tile:[1,5],side:'south'}},[0,0]).anchors.sign;
 assert.ok(onDoor&&onDoor.edge==='south'&&onDoor.tile.join()!=='1,5','set on a door: it hangs beside the door instead');
 assert.equal(planBuilding({...desc,rotation:90},[0,0]).anchors.sign.edge,'south','turned with the building');
});
test('folding a shaped building\'s rotation into it plans the same building',()=>{
 for(const rotation of [90,180,270]){const desc={...L,rotation,walls:{'2,0,north':'wall'},sign:{icon:'hammers',tile:[5,1],side:'east'}};
  const a=planBuilding(desc,[3,3]),b=planBuilding(toShaped(desc),[3,3]),edges=p=>p.edges.map(e=>`${e.a}>${e.b}:${e.kind}`).sort();
  assert.equal(toShaped(desc).rotation,0);assert.deepEqual(edges(b),edges(a));assert.deepEqual(b.anchors.sign,a.anchors.sign);assert.deepEqual(b.doors.map(d=>d.inside),a.doors.map(d=>d.inside));}
});
test('hand colours and trim: walls, roof, chimney, flower boxes and awning as chosen, the seeded rest untouched',()=>{
 const base=planBuilding(shop,[0,0]);
 const chosen={...shop,chimney:{along:1,side:-1},flowerBoxes:[],awningColors:['#123456','#abcdef']},plan=planBuilding(chosen,[0,0]);
 assert.deepEqual(plan.chimney,{along:.3,side:-1});assert.deepEqual(plan.flowerBoxes,[]);assert.deepEqual(plan.awningColors,['#123456','#abcdef']);
 assert.equal(plan.roofShade,base.roofShade,'the seeded shade is unchanged by hand choices');assert.deepEqual(plan.edges.map(e=>e.kind),base.edges.map(e=>e.kind));
 const window=base.edges.find(e=>e.kind==='window'),key=`${window.a[0]},${window.a[1]},${window.side}`;
 assert.deepEqual(planBuilding({...shop,flowerBoxes:[key]},[0,0]).flowerBoxes,[key],'exactly the boxes listed');
 // Colours reach the built walls and roof.
 const world=new Map();for(let z=0;z<12;z++)for(let x=0;x<12;x++)world.set(key2(x,z),{x,z,h:1});
 const walls=new THREE.Group(),edges=createEdgeFeatures({parent:walls,tileAt:(x,z)=>world.get(key2(x,z))}),parent=new THREE.Group();
 const built=createBuilding({...shop,colors:{wall:'#336699',trim:'#112233',roof:'#aa2200'}},{origin:[2,2],id:0,edges,tileAt:(x,z)=>world.get(key2(x,z)),parent});
 const colours=new Set();walls.traverse(o=>{if(o.isMesh&&o.material?.color)colours.add('#'+o.material.color.getHexString());});
 assert.ok(colours.has('#336699')&&colours.has('#112233'),'wall and trim in the chosen colours');
 const roofColours=built.roof.geometry.attributes.color.array;const want=new THREE.Color('#aa2200');let found=false;for(let i=0;i<roofColours.length;i+=3)if(Math.abs(roofColours[i]-want.r)<1e-3&&Math.abs(roofColours[i+1]-want.g)<1e-3&&Math.abs(roofColours[i+2]-want.b)<1e-3)found=true;
 assert.ok(found,'the roof in exactly the chosen colour');
});
const key2=(x,z)=>`${x},${z}`;
