import test from 'node:test';
import assert from 'node:assert/strict';
import {Group} from 'three';
import {key,findPath,edgeBetween,setEdge,edgePasses,canStep} from './world.js';
import {lineOfSight,withinAttackRange} from './combat-range.js';
import {interactionRoute} from './interaction-route.js';
import {canStand,bodyStep,reachesBody} from './footprint.js';
import {wanderRoute} from './wander.js';
import {companionRoute} from './companion-follow.js';
import {occupancy} from './world-occupancy.js';
import {createEdgeFeatures,updateDoors,configureDoors} from './doors.js';

const grid=(w=5,h=5)=>new Map(Array.from({length:w*h},(_,i)=>{const t={x:i%w,z:Math.floor(i/w),h:1,blocked:false,water:false};return [key(t.x,t.z),t];}));
const at=(m,x,z)=>m.get(key(x,z));

test('an edge is stored once and found from either side',()=>{
 const m=grid(),a=at(m,2,2);
 for(const [x,z] of [[2,1],[2,3],[1,2],[3,2]]){const b=at(m,x,z),wall={kind:'wall'};setEdge(a,b,wall);assert.equal(edgeBetween(a,b),wall);assert.equal(edgeBetween(b,a),wall);setEdge(b,a,null);assert.equal(edgeBetween(a,b),null);}
 assert.equal(a.edges,undefined,'clearing the last edge leaves the tile as it was');
 assert.throws(()=>setEdge(a,at(m,4,4),{kind:'wall'}));
});
test('each edge kind follows its movement, sight and reach rules; doors depend on state',()=>{
 const rules={wall:[0,0,0],window:[0,1,0],fence:[0,1,0],railing:[0,1,0],low:[0,1,1]};
 for(const [kind,[move,sight,reach]] of Object.entries(rules)){const e={kind};assert.deepEqual([edgePasses(e,'move'),edgePasses(e,'sight'),edgePasses(e,'reach')],[!!move,!!sight,!!reach],kind);}
 assert.deepEqual(['move','sight','reach'].map(w=>edgePasses({kind:'door',open:false,locked:false},w)),[false,false,false],'a closed door is a wall');
 assert.deepEqual(['move','sight','reach'].map(w=>edgePasses({kind:'door',open:true},w)),[true,true,true],'an open door is no edge at all');
 assert.equal(edgePasses({kind:'door',open:true,locked:true},'move'),false,'locked');
 const m=grid();setEdge(at(m,1,1),at(m,2,1),{kind:'wall'});assert.equal(canStep(at(m,1,1),at(m,2,1)),false);assert.equal(canStep(at(m,1,1),at(m,1,2)),true);
});
test('routes go around walls, through open doors only, and never through closed or locked ones',()=>{
 const m=grid(5,3),wall=z=>setEdge(at(m,1,z),at(m,2,z),{kind:'wall'});
 wall(0);wall(2);setEdge(at(m,1,1),at(m,2,1),{kind:'door',open:false,locked:false});
 assert.equal(findPath(m,at(m,0,1),at(m,4,1)),null,'a closed door has to be opened first');
 edgeBetween(at(m,1,1),at(m,2,1)).open=true;
 assert.deepEqual(findPath(m,at(m,0,1),at(m,4,1)).map(t=>t.x),[1,2,3,4],'straight through the open door');
 edgeBetween(at(m,1,1),at(m,2,1)).locked=true;assert.equal(findPath(m,at(m,0,1),at(m,4,1)),null,'locked');
 assert.equal(findPath(m,at(m,0,1),at(m,4,1),()=>0),null,'cheapest search agrees');
});
test('sight stops at walls and closed doors, passes windows, fences, counters and open doors, and cannot squeeze past a wall corner',()=>{
 const m=grid(),from=at(m,0,2),to=at(m,4,2),edge={kind:'wall'};setEdge(at(m,1,2),at(m,2,2),edge);
 assert.equal(lineOfSight(m,from,to),false);
 for(const kind of ['window','fence','low']){edge.kind=kind;assert.equal(lineOfSight(m,from,to),true,kind);}
 Object.assign(edge,{kind:'door',open:false});assert.equal(lineOfSight(m,from,to),false);edge.open=true;assert.equal(lineOfSight(m,from,to),true);
 const c=grid();setEdge(at(c,1,1),at(c,2,1),{kind:'wall'});assert.equal(lineOfSight(c,at(c,1,1),at(c,2,2)),false,'a diagonal past a wall end is blocked');
});
test('melee and interaction need a reachable edge; ranged attacks only need sight',()=>{
 const m=grid(),p=at(m,1,2),e=at(m,2,2),target={x:2,z:2,tile:e},edge={kind:'window'};setEdge(p,e,edge);
 assert.equal(withinAttackRange(m,p,target,1),false,'no melee through a window');assert.equal(withinAttackRange(m,p,target,4),true,'a bow shoots through it');
 edge.kind='low';assert.equal(withinAttackRange(m,p,target,1),true,'across a counter');
 edge.kind='wall';const r=interactionRoute(m,p,target);assert.notEqual(r.at,p,'talks from a side without a wall');
 edge.kind='low';assert.equal(interactionRoute(m,p,target).at,p,'a shopkeeper behind a counter is reachable');
});
test('large bodies cannot straddle a wall, cross one as they move, or strike through one',()=>{
 const m=grid();setEdge(at(m,1,1),at(m,2,1),{kind:'wall'});
 assert.equal(canStand(m,at(m,1,1),2),false,'a wall inside the 2×2 body');assert.equal(canStand(m,at(m,2,2),2),true);
 assert.equal(bodyStep(m,at(m,0,0),at(m,1,0),2),false,'stepping right drags the body across the wall');
 const w=grid();setEdge(at(w,1,3),at(w,1,4),{kind:'wall'});
 assert.equal(reachesBody(w,at(w,0,2),2,at(w,1,4)),false,'beside it but through a wall');assert.equal(reachesBody(w,at(w,0,2),2,at(w,0,4)),true);
});
test('wanderers and the companion respect walls',()=>{
 const m=grid();for(let z=0;z<5;z++)setEdge(at(m,1,z),at(m,2,z),{kind:'wall'});
 for(const r of [0,.4,.8,.999])assert.ok(wanderRoute(m,at(m,0,2),{minX:0,maxX:4,minZ:0,maxZ:4},()=>false,()=>r).every(t=>t.x<=1),'stays on its side');
 const route=companionRoute(m,at(m,4,2),at(m,0,2));assert.ok(route.length&&route.every(t=>t.x>=2),'no way across: it comes as close as its side allows');assert.equal(route.at(-1).x,2);
});
test('a door opens and closes only when used, is approached from either side, and a locked one never opens',async()=>{
 const {doorApproach}=await import('./doors.js');
 occupancy.clear();const m=grid(),sounds=[],toasts=[];
 configureDoors({sound:n=>sounds.push(n),toast:t=>toasts.push(t)});
 const edges=createEdgeFeatures({parent:new Group(),tileAt:(x,z)=>m.get(key(x,z))}),a=at(m,1,1),b=at(m,2,1),door=edges.add(a,b,'door');
 assert.equal(edgeBetween(a,b),door);assert.equal(door.open,false);assert.equal(canStep(a,b),false,'closed: no way through');
 occupancy.place({kind:'npc'},[a]);updateDoors(.5);assert.equal(door.open,false,'standing beside it does not open it');occupancy.clear();
 door.interact();assert.equal(door.open,true);assert.ok(sounds.includes('doorOpen'));assert.equal(canStep(a,b),true);assert.equal(lineOfSight(m,at(m,0,1),at(m,4,1)),true,'open: seen through');
 updateDoors(5);assert.equal(door.open,true,'stays open');door.interact();assert.equal(door.open,false);assert.ok(sounds.includes('doorClose'));
 const route=t=>findPath(m,at(m,4,1),t);assert.equal(doorApproach(door,at(m,4,1),route).at,b,'walks to the nearer side');assert.equal(doorApproach(door,a,route).route.length,0);
 door.setLocked(true);door.interact();assert.equal(door.open,false,'locked');assert.deepEqual(toasts,["It's locked."]);
 edges.dispose();assert.equal(edgeBetween(a,b),null,'removing the yard clears its edges');
});
test('walls share one corner post per grid corner, and a door is faced at its edge midpoint',()=>{
 const m=grid(),edges=createEdgeFeatures({parent:new Group(),tileAt:(x,z)=>m.get(key(x,z))});
 // A 2×2 room: 8 outline edges meet at 8 distinct corners; one wall across the middle adds no new corner.
 for(const [ax,az,bx,bz] of [[1,1,1,0],[2,1,2,0],[1,2,1,3],[2,2,2,3],[1,1,0,1],[1,2,0,2],[2,1,3,1],[2,2,3,2]])edges.add(at(m,ax,az),at(m,bx,bz),'wall');
 assert.equal(edges.postCount,8);
 edges.add(at(m,1,1),at(m,2,1),'door');assert.equal(edges.postCount,9,'the door adds one post at the room centre');
 edges.add(at(m,1,2),at(m,1,3),'fence');assert.equal(edges.postCount,9,'a fence replacing a wall keeps the posts other walls still use');
 const door=edgeBetween(at(m,1,1),at(m,2,1));assert.deepEqual([door.x,door.z],[1.5,1],'faced at the edge, from either side');
 edges.clear();assert.equal(edges.postCount,0);
});
test('an open door swings into its own building, lies on the side edge at its hinge as a wall, and closing clears it',async()=>{
 const {Vector3}=await import('three');
 for(const [ax,az,bx,bz] of [[2,2,2,1],[2,2,2,3],[2,2,1,2],[2,2,3,2]]){
  const m=grid(),tileAt=(x,z)=>m.get(key(x,z)),edges=createEdgeFeatures({parent:new Group(),tileAt}),a=at(m,ax,az),b=at(m,bx,bz),door=edges.add(a,b,'door');
  door.setOpen(true);updateDoors(1);
  const sides=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dz])=>at(m,a.x+dx,a.z+dz)).filter(t=>t!==b),blocked=sides.filter(t=>edgeBetween(a,t)?.door===door);
  assert.equal(blocked.length,1,`${ax},${az}→${bx},${bz}: the open door is a wall on one side edge of its own tile`);
  assert.equal(canStep(a,blocked[0]),false,'nobody walks through the open door');assert.equal(canStep(a,b),true,'the doorway is open');
  // The panel's middle ends up over the building's side of the doorway.
  door.group.updateMatrixWorld(true);const p=door.model.panel.getWorldPosition(new Vector3());
  const toA=Math.hypot(p.x-(a.x-6),p.z-(a.z-6)),toB=Math.hypot(p.x-(b.x-6),p.z-(b.z-6));assert.ok(toA<toB,`${ax},${az}→${bx},${bz}: swings inwards`);
  door.setOpen(false);assert.equal(edgeBetween(a,blocked[0]),null,'closing clears the side edge');
 }
});
test('the open door takes the free hinge side',()=>{
 const m=grid(),tileAt=(x,z)=>m.get(key(x,z)),edges=createEdgeFeatures({parent:new Group(),tileAt}),a=at(m,2,2),b=at(m,2,1);
 const door=edges.add(a,b,'door');door.setOpen(true);const first=[at(m,1,2),at(m,3,2)].find(t=>edgeBetween(a,t)?.door===door);door.setOpen(false);
 edges.add(a,first,'fence');door.setOpen(true);const other=[at(m,1,2),at(m,3,2)].find(t=>edgeBetween(a,t)?.door===door);
 assert.ok(other&&other!==first,'the other side when the first is taken');assert.equal(edgeBetween(a,first).kind,'fence','the fence is untouched');
});
test('the door rule: a wall on each side of a door before any perpendicular wall',async()=>{
 const {doorProblems}=await import('./doors.js');
 const m=grid(7,5),tileAt=(x,z)=>m.get(key(x,z)),edges=createEdgeFeatures({parent:new Group(),tileAt});
 // A wall line along z=1|2 from x=1 to x=5, door in the middle: fine.
 for(let x=1;x<=5;x++)edges.add(at(m,x,2),at(m,x,1),x===3?'door':'wall');
 const door=edgeBetween(at(m,3,2),at(m,3,1));assert.deepEqual(doorProblems(door,tileAt),[]);
 edges.add(at(m,2,2),at(m,3,2),'wall');assert.ok(doorProblems(door,tileAt).some(p=>p.includes('corner')),'a wall meeting its corner');edges.remove(at(m,2,2),at(m,3,2));
 edges.remove(at(m,4,2),at(m,4,1));assert.ok(doorProblems(door,tileAt).some(p=>p.includes('no wall beside')),'nothing beside it');
 assert.equal(edges.doorProblems().length,1);
});
