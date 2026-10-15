import test from 'node:test';
import assert from 'node:assert/strict';
import {Group} from 'three';
import {key,chebyshev,setEdge} from './world.js';
import {followRoute,landingSpot,createCompanionFollower,FOLLOW,FOLLOW_DEFAULTS} from './companion-follow.js';
import {SLIDE_DURATION,STEP_DURATION} from './slime-motion.js';
import {popScale,POP_DURATION} from './pop-in.js';
const world=(w=5,h=5)=>new Map(Array.from({length:w*h},(_,i)=>{const t={x:i%w,z:Math.floor(i/w),h:1};return [key(t.x,t.z),t];}));
const at=(m,x,z)=>m.get(key(x,z));
const run=(f,map,player,context={},frames=600,dt=1/60)=>{for(let i=0;i<frames;i++)f.update(dt,map,player,context);};
// Frames until the follower first stands on a new tile.
function stepTime(f,map,player,context={},dt=1/240){const start=f.tile;let t=0;while(f.tile===start&&t<5){f.update(dt,map,player,context);t+=dt;}return t;}

test('it stays beside the player, starts at two tiles away and stops on any of the eight neighbours',()=>{
 const map=world(9,9),player=at(map,4,4),f=createCompanionFollower(new Group());
 f.reset(at(map,5,5));run(f,map,player,{},60);
 assert.equal(f.tile,at(map,5,5),'a diagonal neighbour is beside the player');assert.equal(f.moving,false);
 const far=at(map,7,4);f.reset(far);f.update(1/60,map,player);assert.equal(f.moving,true,'two tiles away (or more) it walks');
 run(f,map,player);assert.equal(chebyshev(f.tile,player),1);assert.equal(f.state,'resting');
 // A tuned start distance holds it until then.
 FOLLOW.start=3;f.reset(at(map,6,4));f.update(1/60,map,player);assert.equal(f.moving,false);Object.assign(FOLLOW,FOLLOW_DEFAULTS);
});
test('its route ignores other characters: it walks straight through a crowd and the player',()=>{
 const map=world(9,3),player=at(map,0,1),start=at(map,8,1);
 const crowd=new Set([2,3,4,5,6].map(x=>at(map,x,1)));
 const route=followRoute(map,start,player,{free:t=>!crowd.has(t)});
 assert.deepEqual(route.map(t=>t.z),route.map(()=>1),'the crowd does not bend it');
 // Behind the player, it may pass through them to reach the free side.
 const line=new Map(Array.from({length:5},(_,x)=>{const t={x,z:0,h:1};return [key(x,0),t];}));
 const through=followRoute(line,at(line,0,0),at(line,1,0),{stopOk:t=>t!==at(line,0,0)});
 assert.deepEqual(through.map(t=>t.x),[1,2]);
});
test('it never stops on the player or their next tile, and prefers a tile nobody stands on',()=>{
 const map=world(),player=at(map,2,2),next=at(map,3,2),taken=at(map,1,2);
 const route=followRoute(map,at(map,0,2),player,{stopOk:t=>t!==player&&t!==next,free:t=>t!==taken});
 assert.notEqual(route.at(-1),player);assert.notEqual(route.at(-1),next);assert.notEqual(route.at(-1),taken);assert.equal(chebyshev(route.at(-1),player),1);
 // With every neighbour taken it still stops beside them.
 const all=followRoute(map,at(map,0,0),player,{free:t=>chebyshev(t,player)>1});assert.equal(chebyshev(all.at(-1),player),1);
 // A tile the player routes onto is given up.
 const f=createCompanionFollower(new Group());f.reset(at(map,1,2));run(f,map,player,{reserved:t=>t===at(map,1,2)},120);
 assert.notEqual(f.tile,at(map,1,2));assert.equal(chebyshev(f.tile,player),1);
});
test('its pace is a share of the player’s walk, doubled while the player sprints, and slower either way',()=>{
 const map=world(9,3),player=at(map,0,1);
 const walk=createCompanionFollower(new Group());walk.reset(at(map,7,1));
 const t=stepTime(walk,map,player);assert.ok(Math.abs(t-SLIDE_DURATION/FOLLOW.pace)<.02,`walk step ${t}`);
 assert.ok(t>SLIDE_DURATION,'slower than the walking player');
 const bonus=createCompanionFollower(new Group());bonus.reset(at(map,7,1));
 assert.ok(Math.abs(stepTime(bonus,map,player,{pace:1.2})-SLIDE_DURATION/(FOLLOW.pace*1.2))<.02,'walking bonuses carry over');
 const sprint=createCompanionFollower(new Group());sprint.reset(at(map,7,1));
 const s=stepTime(sprint,map,player,{sprinting:true});assert.ok(Math.abs(s-SLIDE_DURATION/(FOLLOW.pace*FOLLOW.sprint))<.02,`sprint step ${s}`);
 assert.ok(s>SLIDE_DURATION/2,'slower than the sprinting player');assert.ok(s<t,'faster than walking');
 // A diagonal step takes as long as a straight one.
 const open=world(9,9),diag=createCompanionFollower(new Group());diag.reset(at(open,8,8));
 assert.ok(Math.abs(stepTime(diag,open,at(open,0,0))-SLIDE_DURATION/FOLLOW.pace)<.02);
 assert.equal(diag.tile,at(open,7,7),'it went diagonally');
});
test('it hops ledges at the shared hop timing and settles precisely on landing',()=>{
 const map=world(),start=at(map,0,2),player=at(map,4,2);
 for(const tile of map.values())tile.blocked=tile.z!==2;
 at(map,1,2).h=1.5;at(map,2,2).h=1;
 const model=new Group();model.position.set(-6,1,-4);const f=createCompanionFollower(model);f.reset(start);
 let up=false,down=false,airborne=false;
 for(let i=0;i<300;i++){f.update(.016,map,player);if(f.jump){up||=f.jump.height>0;down||=f.jump.height<0;airborne||=model.position.y>1.5;}}
 assert.ok(up&&down&&airborne);assert.equal(model.position.y,1);assert.equal(f.jump,null);
 const g=createCompanionFollower(new Group());g.reset(start);const hop=stepTime(g,map,player);
 assert.ok(Math.abs(hop-STEP_DURATION/FOLLOW.pace)<.02,`hop ${hop}`);
});
test('it teleports beside the player when far, round a long detour, with no route, on a new map or a sudden move',()=>{
 const reasons=[];
 const map=world(20,20),player=at(map,2,2),f=createCompanionFollower(new Group());
 f.reset(at(map,15,15));f.update(1/60,map,player);reasons.push(f.lastTeleport);assert.equal(chebyshev(f.tile,player),1);
 // A wall with one gap far away: the walk round is longer than FOLLOW.route.
 const walled=world(20,20);for(let z=0;z<19;z++)setEdge(at(walled,3,z),at(walled,4,z),{kind:'wall'});
 f.reset(at(walled,6,2));f.update(1/60,walled,at(walled,2,2));reasons.push(f.lastTeleport);assert.ok(f.tile.x<=3,'on the player’s side');
 // Shut in completely.
 const shut=world();for(let z=0;z<5;z++)setEdge(at(shut,1,z),at(shut,2,z),{kind:'wall'});
 f.reset(at(shut,4,2));f.update(1/60,shut,at(shut,0,2));reasons.push(f.lastTeleport);
 // Another map.
 const other=world();f.update(1/60,other,at(other,2,2));reasons.push(f.lastTeleport);
 // The player moved at once (respawn, a jump).
 const big=world(20,20);f.reset(at(big,3,2));f.update(1/60,big,at(big,2,2));f.update(1/60,big,at(big,15,15));reasons.push(f.lastTeleport);assert.equal(chebyshev(f.tile,at(big,15,15)),1);
 assert.deepEqual(reasons,['far','detour','no route','map','moved']);
});
test('it lands behind the player, never across a wall, and pops in to its normal size',()=>{
 const map=world(),player=at(map,2,2);
 assert.equal(landingSpot(map,player,{facing:0}),at(map,2,1),'facing +z: behind is -z');
 assert.equal(landingSpot(map,player,{facing:Math.PI/2}),at(map,1,2),'facing +x: behind is -x');
 for(let x=0;x<5;x++)setEdge(at(map,x,1),at(map,x,2),{kind:'wall'});
 assert.ok(landingSpot(map,player,{facing:0}).z>=2,'the wall behind is never crossed');
 const model=new Group();model.scale.setScalar(.78);const f=createCompanionFollower(model);f.reset(at(map,0,0));
 const fresh=world(),p=at(fresh,2,2);f.teleport(fresh,p);assert.ok(model.scale.x<.1,'it starts tiny');
 run(f,fresh,p,{},Math.ceil(POP_DURATION*60)+2);assert.equal(model.scale.x,.78);
 assert.ok(popScale(0)<1e-9);assert.ok(popScale(POP_DURATION*.7)>1,'a slight overshoot');assert.equal(popScale(POP_DURATION),1);
});
test('landing looks only around the player, not over the whole map',()=>{
 const tiles=new Map();for(let x=1000;x<1005;x++)for(let z=1000;z<1005;z++)tiles.set(key(x,z),{x,z,h:0});
 const sparse={get:k=>tiles.get(k),values(){throw Error('scanned the whole map');}};
 const spot=landingSpot(sparse,tiles.get(key(1002,1002)));assert.equal(chebyshev(spot,tiles.get(key(1002,1002))),1);
});
test('an unreachable player is met by teleport, never by snapping onto them',()=>{
 const map=world(),player=at(map,4,4),start=at(map,0,0);at(map,1,0).blocked=true;at(map,0,1).water=true;at(map,1,1).blocked=true;
 assert.equal(followRoute(map,start,player),null);
 const f=createCompanionFollower(new Group());f.reset(start);f.update(1/60,map,player);
 assert.notEqual(f.tile,player);assert.equal(chebyshev(f.tile,player),1);
});

// The actual map must leave a safe greeting position beside the bridge landing.
test('rescue steps aside without occupying the dog landing or crossing lane',async()=>{
 const {rescueStandAsideRoute}=await import('./companion-follow.js');
 const {makeWillowbankTiles,WILLOWBANK}=await import('./willowbank-rules.js');
 const map=new Map(makeWillowbankTiles().map(t=>[key(t.x,t.z),t]));
 const landing=map.get(key(WILLOWBANK.bridgeStart-1,WILLOWBANK.bridgeZ));
 const aside=rescueStandAsideRoute(map,landing,landing);
 assert.ok(aside);assert.notEqual(aside.tile,landing);assert.ok(aside.route.length);
 assert.ok(aside.route.every(t=>!t.water&&!t.blocked&&t!==landing));
 assert.equal(Math.abs(aside.tile.x-landing.x)+Math.abs(aside.tile.z-landing.z),1);
 aside.tile.blocked=true;assert.ok(rescueStandAsideRoute(map,landing,landing));
});
