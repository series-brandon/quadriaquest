import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3,Euler} from 'three';
import {attackAnimation,blockAnimation,attackWindow,equipmentIdleHands} from './combat-animation.js';
import {PUNCH_GUARD} from './combat-motion.js';
import {trainingTool,animateBow} from './training-models.js';
test('weapon attacks use distinct blade orientation, windup and impact at the damage boundary',()=>{
 const dagger={item:'copperDagger',style:'melee',interval:1.5},sword={...dagger,item:'swords'};
 const aim=attackAnimation(dagger,1.32).hands[0],stab=attackAnimation(dagger,1.5).hands[0];assert.ok(aim[3]>1.4);assert.ok(stab[2]>aim[2]+.4);
 const direction=new Vector3(0,1,0).applyEuler(new Euler(stab[3],stab[5],stab[4]));assert.ok(direction.z>.97);assert.ok(direction.x>.2);
 const rear=attackAnimation(sword,1.32).hands[0],slash=attackAnimation(sword,1.5).hands[0];assert.ok(rear[2]<0);assert.ok(rear[1]>slash[1]);assert.ok(slash[2]>.6);
 assert.equal(attackWindow(dagger,.7),false);assert.equal(attackWindow(dagger,1.3),true);assert.equal(attackWindow(dagger,1.5),true);
});
test('bow hand follows deforming string and release coincides with the projectile clock',()=>{
 const profile={style:'ranged',interval:1.7},draw=attackAnimation(profile,1.69),release=attackAnimation(profile,1.7),bow=trainingTool('bows');
 assert.ok(draw.bowDraw>.99);assert.ok(draw.hands[0][2]<draw.hands[1][2]-.37);assert.equal(release.bowDraw,0);assert.equal(release.nocked,false);
 animateBow(bow,draw.bowDraw,draw.nocked);assert.ok(bow.getObjectByName('bow-string').geometry.attributes.position.getZ(1)<-.37);assert.ok(bow.getObjectByName('nocked-arrow').visible);animateBow(bow);assert.equal(bow.getObjectByName('nocked-arrow').visible,false);
});
test('casting gathers energy between converging hands, pulls back, then tosses it forward',()=>{
 const interval=2.94,at=t=>attackAnimation({style:'magic',interval},t),spread=p=>p.hands[1][0]-p.hands[0][0];
 const start=at(.05),gathering=at(1.6),pulled=at(interval-.16),thrown=at(interval);
 assert.ok(spread(start)>.7,'hands start wide apart');assert.ok(spread(gathering)<spread(start),'and converge');
 // Circling: the hands move around the orb (vertical offset changes) while gathering.
 const heights=[1.2,1.3,1.4,1.5].map(t=>at(t).hands[0][1]);assert.ok(Math.max(...heights)-Math.min(...heights)>.01,'they move around the energy');
 assert.ok(pulled.hands[0][2]<gathering.hands[0][2],'pull back toward the body');assert.ok(pulled.pose.lean<0,'leaning back to wind up');
 assert.ok(thrown.hands[0][2]>.9,'toss forward');
 // Hands stay clear of the body (front face .36 + hand radius .105) for the whole cast.
 for(let t=0;t<2*interval;t+=.05)assert.ok(at(t).hands.every(h=>h[2]>=.45||Math.abs(h[0])>=.47),`clear of the body at ${t.toFixed(2)}`);assert.ok(thrown.pose.lean>.08,'leaning into the throw');
 // The energy orb grows while gathering and is gone once thrown.
 assert.ok(at(.05).charge<at(1.6).charge&&at(interval-.2).charge>.9);assert.equal(at(interval+.01).charge,0);
 // Mirrored, finite and continuous through the whole cycle (including the follow-through).
 let prev=at(0).hands;for(let t=.01;t<2*interval;t+=.01){const h=at(t).hands;assert.ok(h.every(x=>x.every(Number.isFinite)));assert.ok(Math.abs(h[0][0]+h[1][0])<1e-9,'symmetric left/right');
  const step=Math.max(...h.map((x,i)=>Math.hypot(x[0]-prev[i][0],x[1]-prev[i][1],x[2]-prev[i][2])));assert.ok(step<.12,`no jump at ${t.toFixed(2)} (${step.toFixed(3)})`);prev=h;}
});
test('block poses cover bare hands, blades, bows, magic and every legal shield combination',()=>{
 for(const item of [null,'swords','copperDagger','bows'])for(const offHand of [null,'shields','copperShield']){if(item==='bows'&&offHand)continue;const pose=blockAnimation({item,offHand},.1);for(const h of pose.hands)assert.ok(h.every(Number.isFinite));if(offHand){assert.ok(pose.hands[1][2]>.5);assert.equal(pose.hands[0][0],-.47);}else if(!item)assert.ok(pose.hands.every(h=>h[1]>.55));else if(item!=='bows')assert.ok(pose.hands[0][4]<-.7);}
 // Bare hands settle back into the boxing guard the punches resume from, not down to the sides.
 const end=blockAnimation({},.42);assert.deepEqual(end.hands,PUNCH_GUARD);
});


test('weapon hands stay outside the body through windup and recovery',()=>{
 const distance=([x,y,z])=>{const q=[Math.abs(x)-.20,Math.abs(y-.43)-.20,Math.abs(z)-.20];return Math.hypot(...q.map(v=>Math.max(v,0)))+Math.min(Math.max(...q),0)-.16;};
 for(const item of ['copperDagger','swords','bows']){
  const profile={item,style:item==='bows'?'ranged':'melee',interval:1.5};assert.deepEqual(attackAnimation(profile,0).hands[0].slice(0,3),[-.46,.33,.08]);
  for(let time=0;time<=3;time+=.002)for(const hand of attackAnimation(profile,time).hands)assert.ok(distance(hand)>=.095,`${item} hand clips at ${time}`);
 }
});
test('slash preserves original rotation keys despite the curved translation',()=>{
 const profile={item:'swords',style:'melee',interval:1.5};
 attackAnimation(profile,1.32).hands[0].slice(3).forEach((v,i)=>assert.ok(Math.abs(v-[-.65,-.12,-.12][i])<1e-12));
 assert.deepEqual(attackAnimation(profile,1.5).hands[0].slice(3),[.95,Math.PI/4,Math.PI/3]);
});
test('off hand grips the wooden bow center and main hand follows the string while the torso turns',async()=>{
 const {makeSlime}=await import('./slime-model.js'),{heldTool,heldToolHand}=await import('./tool-models.js');
 const rig=makeSlime(),bow=heldTool('bows');assert.equal(heldToolHand('bows'),1);rig.hands[1].add(bow);
 let setMatrix;
 for(const time of [.8,.85,.9,1,1.3,1.5,1.69]){
  const motion=attackAnimation({style:'ranged',interval:1.7},time);rig.group.rotation.y=motion.pose.twist;
  motion.hands.forEach(([x,y,z,pitch,roll,yaw],i)=>{rig.hands[i].position.set(x,y,z);rig.hands[i].rotation.set(pitch,yaw,roll);});animateBow(bow,motion.bowDraw,motion.nocked);rig.group.updateMatrixWorld(true);
  if(!setMatrix)setMatrix=bow.matrixWorld.toArray();else assert.deepEqual(bow.matrixWorld.toArray(),setMatrix);
  const grip=bow.localToWorld(new Vector3(0,0,.22)),holding=rig.hands[1].getWorldPosition(new Vector3());assert.ok(grip.distanceTo(holding)<1e-9);
  const string=bow.localToWorld(new Vector3(0,0,-.38*motion.bowDraw)),pulling=rig.hands[0].getWorldPosition(new Vector3());assert.ok(string.distanceTo(pulling)<1e-9);
  const aim=new Vector3(0,0,1).transformDirection(bow.matrixWorld);assert.ok(aim.z>.999);
 }
 assert.ok(attackAnimation({style:'ranged',interval:1.7},1.69).pose.twist<-.6);
});

test('equipped attacks and blocks start in the shared relaxed carry pose',()=>{
 for(const item of ['swords','copperDagger','bows']){
  const profile={item,style:item==='bows'?'ranged':'melee',interval:1.7};
  assert.deepEqual(attackAnimation(profile,0).hands,equipmentIdleHands(profile));
  assert.deepEqual(blockAnimation(profile,0).hands,equipmentIdleHands(profile));
 }
 const bow=attackAnimation({item:'bows',style:'ranged',interval:1.7},.9);
 new Vector3(...bow.hands[1].slice(0,3)).applyAxisAngle(new Vector3(0,1,0),bow.pose.twist).toArray().forEach((v,i)=>assert.ok(Math.abs(v-[-.365,.55,.908][i])<1e-12));
 assert.ok(bow.bowDraw<1e-12);
});

test('relaxed bow has its string above the wood and drawing hand carries the arrow into alignment',async()=>{
 const {makeSlime}=await import('./slime-model.js'),{heldTool}=await import('./tool-models.js'),{createBowPresentation}=await import('./bow-presentation.js');
 const rig=makeSlime(),bow=heldTool('bows');rig.hands[1].add(bow);
 const presentation=createBowPresentation(bow,rig.hands),profile={item:'bows',style:'ranged',interval:1.7};
 const apply=time=>{const motion=attackAnimation(profile,time);rig.group.rotation.y=motion.pose.twist;motion.hands.forEach(([x,y,z,pitch,roll,yaw],i)=>{rig.hands[i].position.set(x,y,z);rig.hands[i].rotation.set(pitch,yaw,roll);});presentation.update(motion);rig.group.updateMatrixWorld(true);return motion;};
 apply(0);assert.equal(presentation.arrow.visible,false);
 const grip=bow.localToWorld(new Vector3(0,0,.22)),string=bow.localToWorld(new Vector3());assert.ok(string.y>grip.y+.21);
 const limb=bow.localToWorld(new Vector3(0,.48,0));assert.ok(Math.abs(limb.y-string.y)<1e-9);
 apply(.56);assert.equal(presentation.arrow.parent,rig.hands[0]);assert.equal(presentation.arrow.visible,true);assert.ok(presentation.arrow.rotation.x<.1);
 for(const time of [.9,1.3,1.69]){const motion=apply(time),nock=presentation.arrow.localToWorld(new Vector3(0,-.26,0)),string=bow.localToWorld(new Vector3(0,0,-.38*motion.bowDraw));assert.ok(nock.distanceTo(string)<1e-9);assert.ok(new Vector3(0,1,0).transformDirection(presentation.arrow.matrixWorld).z>.999);assert.equal(bow.getObjectByName('nocked-arrow').visible,false);}
 apply(1.7);assert.equal(presentation.arrow.visible,false);presentation.update(null);assert.equal(presentation.arrow.visible,false);
});

test('one-handed attacks counterbalance with the off hand and settle their torso momentum',()=>{
 for(const item of [null,'copperDagger','swords'])for(const offHand of [null,'copperShield']){
  const profile={item,offHand,interval:1.5},ready=attackAnimation(profile,0),impact=attackAnimation(profile,1.5),rest=attackAnimation(profile,1.9);
  assert.ok(impact.hands[1][2]<ready.hands[1][2]-.13);assert.ok(impact.pose.twist>.1&&impact.pose.twist<.15);
  assert.ok(Math.abs(rest.pose.twist)<1e-9);assert.ok(Math.abs(rest.hands[1][2]-ready.hands[1][2])<1e-9);
 }
});
test('bow sweep and body turn finish during setup before the stationary bow is drawn',()=>{
 const profile={item:'bows',style:'ranged',interval:1.7},ready=attackAnimation(profile,.9),drawn=attackAnimation(profile,1.69);
 const worldHand=(pose,index)=>new Vector3(...pose.hands[index].slice(0,3)).applyAxisAngle(new Vector3(0,1,0),pose.pose.twist);
 assert.ok(attackAnimation(profile,.7).pose.twist<0);
 for(const time of [.8,.85,.9,1.1,1.3,1.5,1.69]){const pose=attackAnimation(profile,time);assert.equal(pose.pose.twist,-.65);assert.deepEqual(pose.hands[1],ready.hands[1]);assert.ok(Math.abs(worldHand(pose,0).x-worldHand(ready,0).x)<1e-12);}
 assert.ok(worldHand(attackAnimation(profile,.55),1).x>worldHand(ready,1).x+.5);
 assert.ok(drawn.pose.twist<-.6);
 assert.ok(worldHand(drawn,0).z<worldHand(ready,0).z-.37);
 assert.ok(worldHand(drawn,0).z<worldHand(ready,0).z-.25);
 assert.ok(drawn.hands[1][0]>.18&&drawn.hands[1][0]<.3); // Bow remains on the torso's left.
 const hand=drawn.hands[0];assert.ok(Math.abs(hand[0])<.2);assert.equal(hand[1],.55);assert.ok(hand[2]>.455&&hand[2]<.47);
});
test('shield blocks preserve the main-hand carry orientation through the whole block',()=>{
 for(const item of [null,'swords','copperDagger'])for(const offHand of ['shields','copperShield']){
  const profile={item,offHand},rest=equipmentIdleHands(profile);
  for(const age of [0,.035,.1,.25,.35,.42])assert.deepEqual(blockAnimation(profile,age).hands[0].slice(3),rest[0].slice(3));
  assert.equal(blockAnimation(profile,.1).hands[1][5],-Math.PI/2);
 }
});

test('every attack motion from either hand yields finite hand transforms (off-hand mirror regression)',()=>{
 for(const attackMotion of ['punch','stab','slash','bow','cast'])for(const hand of ['main','off'])for(const time of [0,.5,1.2,2.4,2.6,3.9]){
  const {hands}=attackAnimation({attackMotion,hand,interval:2.5,style:attackMotion==='bow'?'ranged':attackMotion==='cast'?'magic':'melee'},time);
  for(const h of hands)assert.ok(h.every(Number.isFinite),`${attackMotion}/${hand}@${time}: ${h}`);
 }
});

test('bare-hand block brings the fists together into a boxing high guard',()=>{
 const pose=blockAnimation({},.1),[r,l]=pose.hands;
 const gap=Math.hypot(r[0]-l[0],r[1]-l[1],r[2]-l[2])-2*.105;
 assert.ok(gap>=0&&gap<.05,`fists nearly touch (gap ${gap.toFixed(3)})`);
 assert.ok(r[2]>=.47&&l[2]>=.47,'in front of the body');assert.ok(r[1]>.55&&l[1]>.55,'up at the face');
 assert.ok(Math.abs(r[0]+l[0])<1e-12&&Math.abs(r[5]+l[5])<1e-12,'symmetrical');
});

test('the gathered energy orb sits between the hands, grows with charge and disappears when thrown',async()=>{
 const {Group}=await import('three');const {createCastPresentation}=await import('./cast-presentation.js');
 const body=new Group(),hands=[new Group(),new Group()];body.add(...hands);hands[0].position.set(-.2,.4,.5);hands[1].position.set(.2,.5,.5);
 const cast=createCastPresentation(hands);
 cast.update({charge:.3},0);assert.ok(cast.orb.visible);const small=cast.orb.scale.x;assert.ok(Math.abs(cast.orb.position.x)<1e-9&&Math.abs(cast.orb.position.y-.45)<1e-9);
 cast.update({charge:1},0);assert.ok(cast.orb.scale.x>small);
 cast.update({charge:0},0);assert.equal(cast.orb.visible,false);cast.update(null);assert.equal(cast.orb.visible,false);
});

test('spell looks are data-driven: the cast orb and projectile follow the spell, defaulting to energy',async()=>{
 const THREE=await import('three');const {SPELL_VISUALS,spellVisualKey}=await import('./spell-visuals.js');const {createCastPresentation}=await import('./cast-presentation.js');const {projectileModel}=await import('./projectile-effects.js');const {SPELLS}=await import('./combat-styles.js');
 assert.equal(spellVisualKey(SPELLS.energyStrike),'energy','by element');assert.equal(spellVisualKey({visual:'energy',elements:{fire:1}}),'energy','explicit visual wins');assert.equal(spellVisualKey({elements:{fire:1}}),'energy','unknown looks fall back to the default');assert.equal(spellVisualKey(null),'energy');
 // A new look is one registry entry; the orb swaps to it and the projectile uses it.
 const red=()=>{const g=new THREE.Group();g.add(new THREE.Mesh(new THREE.SphereGeometry(.1),new THREE.MeshBasicMaterial({color:'#ff5a1f'})));g.name='test-fire';return g;};
 SPELL_VISUALS.testFire={name:'Test fire',charge:red,projectile:red};
 try{
  const body=new THREE.Group(),hands=[new THREE.Group(),new THREE.Group()];body.add(...hands);const cast=createCastPresentation(hands);
  cast.update({charge:.5},0,SPELLS.energyStrike);assert.equal(cast.look,'energy');
  cast.update({charge:.5},0,{visual:'testFire'});assert.equal(cast.look,'testFire');assert.equal(cast.orb.children.filter(c=>c.visible).length,1,'only the active look shows');
  assert.equal(projectileModel('magic',{visual:'testFire'}).name,'test-fire');
 }finally{delete SPELL_VISUALS.testFire;}
});

test('Energy Strike is light yellow and is the default spell look',async()=>{
 const {spellVisual,SPELL_VISUALS,DEFAULT_SPELL_VISUAL}=await import('./spell-visuals.js');const {SPELLS}=await import('./combat-styles.js');
 const color=look=>look.charge().children[0].material.color.getHexString();
 assert.equal(DEFAULT_SPELL_VISUAL,'energy');assert.equal(color(spellVisual(SPELLS.energyStrike)),'fff1a0');assert.equal(color(spellVisual(null)),'fff1a0');
 assert.equal(SPELL_VISUALS.energy.projectile().children[0].material.color.getHexString(),'fff1a0','the thrown projectile matches');
});

test('cast orb surges wildly while gathering, then settles small; hands arrive level before the pull back',async()=>{
 const {castMotion,CAST_TIMING}=await import('./combat-motion.js');const interval=2.94,gatherEnd=interval-CAST_TIMING.pull;
 const sizes=[];for(let t=.4;t<1.4;t+=.02)sizes.push(castMotion(t,interval).orbScale);
 const swing=Math.max(...sizes)-Math.min(...sizes);assert.ok(swing>.4,`wild size swings mid-gather (${swing.toFixed(2)})`);
 const settled=[];for(let t=gatherEnd-.05;t<interval-.01;t+=.02)settled.push(castMotion(t,interval));
 assert.ok(Math.max(...settled.map(m=>m.orbScale))<Math.max(...sizes),'settles smaller than its surges');
 assert.ok(Math.max(...settled.map(m=>m.orbScale))-Math.min(...settled.map(m=>m.orbScale))<.05,'and steady');
 assert.ok(settled.every(m=>m.instability<.05),'stable energy');
 // Level hands from the end of the gather through pull back and toss.
 for(const t of [gatherEnd,gatherEnd+.1,interval-.1,interval-.01]){const h=castMotion(t,interval).hands;assert.ok(Math.abs(h[0][1]-h[1][1])<1e-9,`level at ${t.toFixed(2)}`);}
 assert.ok(Math.abs(castMotion(1.0,interval).hands[0][1]-castMotion(1.0,interval).hands[1][1])>.01,'but they do circle mid-gather');
 assert.equal(castMotion(interval,interval).orbScale,0,'gone once thrown');
});

test('an unarmed block hands back to the punch guard without the fists dropping',()=>{
 const profile={style:'unarmed',interval:2.5};
 // Throughout the block the fists never sink below the guard height.
 for(let age=0;age<=.42;age+=.01)for(const h of blockAnimation(profile,age).hands)assert.ok(h[1]>=PUNCH_GUARD[0][1]-1e-9,`fists dipped at ${age.toFixed(2)}s`);
 // The next windup (between strikes) holds the same guard, so there is nothing to slide back from.
 const after=attackAnimation(profile,1.2).hands,end=blockAnimation(profile,.42).hands;
 for(let i=0;i<2;i++)for(let j=0;j<3;j++)assert.ok(Math.abs(after[i][j]-end[i][j])<1e-6,`hand ${i} axis ${j}`);
});

test('blades rest tilted in either hand, and keep that grip through hand-placing poses like sleep', async () => {
  const {withGrip} = await import('./combat-animation.js');
  const both = equipmentIdleHands({mainHand: 'copperDagger', offHand: 'copperDagger'});
  assert.equal(both[0][3], 1.85);
  assert.equal(both[1][3], 1.85, 'an off-hand dagger rests like a main-hand one');
  assert.equal(equipmentIdleHands({mainHand: 'copperDagger'})[1][3], 0, 'an empty off hand stays relaxed');
  const sleeping = [[-.4, .2, .08, 0, 0], [.4, .26, .08, 0, 0]];
  const gripped = withGrip(sleeping, both);
  assert.deepEqual(gripped.map(h => h.slice(0, 3)), sleeping.map(h => h.slice(0, 3)), 'positions come from the pose');
  assert.deepEqual(gripped.map(h => h[3]), [1.85, 1.85], 'the grip comes from the carry pose');
  assert.deepEqual(withGrip(sleeping, equipmentIdleHands({})).map(h => h[3]), [0, 0], 'empty hands are unchanged');
});

test('a waving hand brings its weapon upright; the other hand keeps its grip', async () => {
  const {withGrip} = await import('./combat-animation.js');
  const {socialMotion} = await import('./slime-social.js');
  const carry = equipmentIdleHands({mainHand: 'copperDagger', offHand: 'copperDagger'});
  const wave = socialMotion('Wave', 1);
  const hands = withGrip(wave.hands, carry, wave.grip);
  assert.ok(hands[0][3] < 0.1, 'raised hand: blade upright');
  assert.equal(hands[1][3], 1.85, 'resting hand keeps its grip');
  assert.equal(withGrip(socialMotion('Wave', 0).hands, carry, socialMotion('Wave', 0).grip)[0][3], 1.85, 'before raising: resting grip');
});

test('dual wielding animates one-two: the main hand thrusts first, the off hand a beat later', async () => {
  const {FOLLOW_UP_DELAY} = await import('./combat-profile.js');
  const dagger = {item: 'copperDagger', style: 'melee', damageTypes: ['piercing'], damageType: 'piercing', interval: 1.5};
  const pair = {...dagger, hand: 'main', mainHand: 'copperDagger', offHand: 'copperDagger', followUp: {...dagger, hand: 'off'}};
  const reach = (t, i) => attackAnimation(pair, t).hands[i][2];
  const rest = equipmentIdleHands(pair);
  assert.ok(reach(1.5, 0) > rest[0][2] + 0.4, 'main hand extended at its release');
  assert.ok(Math.abs(reach(1.5, 1) - rest[1][2]) < 0.2, 'off hand still winding up');
  assert.ok(reach(1.5 + FOLLOW_UP_DELAY, 1) > rest[1][2] + 0.4, 'off hand extended a beat later');
});
