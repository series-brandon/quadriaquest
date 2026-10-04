import test from 'node:test';
import assert from 'node:assert/strict';
import {castMotion,CAST_DURATION,catchMotion,catchSequence,holdUpMotion,HOOK_DURATION,CATCH_DURATION} from './catch-motion.js';
import {MODEL_CATALOG} from './dev/model-catalog.js';
test('catch hooks to the side then chains into the generic celebration and ends',()=>{
 const hook=catchMotion(.3);assert.ok(hook.hands[0][0]<-.12);assert.ok(hook.hands[0][2]>.45);assert.equal(hook.rod,true);assert.equal(hook.expression,'struggle');assert.equal(hook.hands[0][3],0);
 assert.equal(catchSequence(.2).kind,'Fishing catch');
 const step=catchSequence(HOOK_DURATION+.8);assert.equal(step.kind,'Celebration');
 assert.equal(holdUpMotion(step.time).prop.visible,true);
 assert.equal(catchSequence(CATCH_DURATION),null);
});
test('shared preview exposes catch, trophy celebration, both ledge jumps and the fish model',()=>{
 const slime=MODEL_CATALOG.find(m=>m.name==='Slime');
 for(const motion of ['Fishing cast','Fishing catch','Celebration','Jump up','Jump down'])assert.ok(slime.motions.includes(motion));
 assert.ok(MODEL_CATALOG.some(m=>m.name==='Raw Pondfish'));
});

test('celebration keeps the prop at a fixed height above both rising hands',()=>{
 for(const t of [.55,.7,.9,1.15,2]){const motion=holdUpMotion(t);assert.ok(Math.abs(motion.prop.y-motion.hands[0][1]-.21)<1e-10);assert.equal(motion.hands[0][1],motion.hands[1][1]);}
});

test('celebration prop stays visible for both fish and longer hat sequences',()=>{
 for(const t of [0,.2,.55,3.5,4.3])assert.equal(holdUpMotion(t).prop.visible,true);
});
test('hook pull keeps the bottom of the shaft nearly stationary',()=>{
 const base=catchMotion(0).hands[0];
 const bottom=h=>[h[0]+.2*Math.sin(h[4]),h[1]-.2*Math.cos(h[4])*Math.cos(h[3]),h[2]-.2*Math.cos(h[4])*Math.sin(h[3])];
 const start=bottom(base);
 for(let t=0;t<=HOOK_DURATION;t+=.025){const point=bottom(catchMotion(t).hands[0]);assert.ok(Math.hypot(...point.map((n,i)=>n-start[i]))<.17);}
});

test('celebration uses the model base to keep fish and hat close to the hands',()=>{
 const generic=holdUpMotion(1,'generic'),fish=holdUpMotion(1,'fish'),hat=holdUpMotion(1,'hat');
 assert.ok(hat.prop.y<fish.prop.y&&fish.prop.y<generic.prop.y);
 assert.ok(Math.abs(hat.prop.y-hat.hands[0][1]-.105)<1e-10);
});

test('cast winds back, throws forward and settles into the fishing grip',()=>{
 assert.ok(castMotion(.4).hands[0][3]<0);
 assert.ok(castMotion(.72).hands[0][3]>.8);
 for(const [i,v] of [0,.35,.48,.9,0].entries())assert.ok(Math.abs(castMotion(CAST_DURATION).hands[0][i]-v)<1e-9);
 assert.equal(castMotion(0).expression,catchMotion(0).expression);
});
test('catch holds its pull with a damped settling wobble',()=>{
 assert.ok(HOOK_DURATION>1);
 assert.notEqual(catchMotion(.46).hands[0][3],catchMotion(.57).hands[0][3]);
 assert.equal(catchMotion(HOOK_DURATION).hands[0][3],0);
});
