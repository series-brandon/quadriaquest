import test from 'node:test';
import assert from 'node:assert/strict';
import {createAuras,AURAS} from './auras.js';
import {createPlayerResources} from './player-resources.js';
import {createCharacter} from './character.js';
const close=(a,b,eps=1e-6)=>assert.ok(Math.abs(a-b)<eps,`${a} ≈ ${b}`);

test('activation charges one second of upkeep; upkeep stacks and drains in real time',()=>{
 const r=createPlayerResources(),auras=createAuras({ki:r.ki});
 assert.equal(auras.toggle('rush'),'Not learned');auras.learn('rush');auras.learn('harden');
 assert.equal(auras.toggle('rush'),true);close(r.ki.value,99.5);assert.equal(auras.toggle('harden'),true);close(r.ki.value,99);
 close(auras.upkeep,1);auras.update(10);close(r.ki.value,89);
 auras.toggle('rush');auras.toggle('rush');close(r.ki.value,88.5,1e-9);assert.ok(auras.isActive('rush'),'every reactivation pays its fee');
 close(auras.movementBonus,AURAS.rush.movementBonus);assert.equal(auras.resistancePct,10);
});

test('Rush alone lasts 199 seconds from 100 Ki; exhaustion turns every aura off',()=>{
 const r=createPlayerResources();let exhausted=0;const auras=createAuras({ki:r.ki,exhausted:()=>exhausted++});auras.learn('rush');auras.learn('harden');
 auras.toggle('rush');auras.update(198.9);assert.ok(auras.isActive('rush'));auras.update(.2);assert.equal(auras.anyActive,false);assert.equal(exhausted,1);assert.equal(r.ki.value,0);
 assert.match(auras.toggle('harden'),/Not enough Ki/);
});

test('Ki regenerates only while every aura is off; other pools always recover',()=>{
 const r=createPlayerResources(),c=createCharacter(),auras=createAuras({ki:r.ki});auras.learn('harden');r.ki.value=50;r.energy.value=0;
 auras.toggle('harden');const after=r.ki.value;r.regenerate(4,{attribute:c.attribute,inCombat:false,aurasActive:auras.anyActive});assert.equal(r.ki.value,after);close(r.energy.value,4);
 auras.toggle('harden');r.regenerate(4,{attribute:c.attribute,inCombat:true,aurasActive:auras.anyActive});close(r.ki.value,after+2);close(r.energy.value,6);
});

test('Rush and sprint add against base speed rather than multiplying',()=>{
 const r=createPlayerResources();close(r.advance(1,true,.1),1.1);r.toggle();close(r.advance(.25,true,.1),.25*2.1);
});

test('respec returns every invested point and keeps fixed bases',()=>{
 const c=createCharacter();c.allocate('constitution');c.allocate('luck');c.grantPoints(3);c.allocate('strength');
 assert.equal(c.invested,3);const unspentBefore=c.unspent;assert.equal(c.redistribute(),3);assert.equal(c.unspent,unspentBefore+3);
 assert.equal(c.attribute('constitution'),10);assert.equal(c.attribute('luck'),1);assert.equal(c.maxima.health,100);assert.equal(c.redistribute(),0);
});

test('quick auras switch together: all on (paying fees), any on → all off, short Ki reported',()=>{
 const r=createPlayerResources(),auras=createAuras({ki:r.ki});
 assert.equal(auras.quickState,'none');assert.equal(auras.toggleQuick(),'No quick auras set');
 assert.equal(auras.setQuick('rush',true),false,'only learned auras');
 auras.learn('rush');auras.learn('harden');auras.setQuick('rush',true);auras.setQuick('harden',true);
 assert.equal(auras.quickState,'off');assert.equal(auras.toggleQuick(),true);
 assert.equal(auras.quickState,'on');close(r.ki.value,99);
 auras.toggle('harden');assert.equal(auras.quickState,'partial');
 assert.equal(auras.toggleQuick(),true);assert.equal(auras.quickState,'off',"any quick aura on turns the set off");
 r.ki.value=.6;assert.match(auras.toggleQuick(),/Harden: Not enough Ki/);
 assert.ok(auras.isActive('rush'));assert.equal(auras.isActive('harden'),false);assert.equal(auras.quickState,'partial');
 const manual=[];auras.toggleQuick(id=>{manual.push(id);return auras.toggle(id);});assert.deepEqual(manual,['rush'],'assistance can record each change as manual');
 auras.forget('rush');assert.deepEqual(auras.quick,['harden']);auras.reset();assert.deepEqual(auras.quick,[]);
});
