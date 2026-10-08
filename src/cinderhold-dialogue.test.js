import test from 'node:test';
import assert from 'node:assert/strict';
import {bristleIntroduction} from './cinderhold-dialogue.js';
import {createTrainingProgress} from './cinderhold-rules.js';
function story(refused=false){const lines=[];let choices,trained=0,left=0,declined=0;const api={refused,say(batch,next){lines.push(...batch);next?.();},choose(line,options){lines.push(line);choices=options;},train(){trained++;},leave(){left++;},refuse(){declined++;}};bristleIntroduction(api);return {lines,pick(text){const option=choices.find(c=>c[0]===text);assert.ok(option,text);option[1]();return option[2];},get trained(){return trained;},get left(){return left;},get declined(){return declined;}};}
test('both opening responses converge and accepting starts training once',()=>{for(const answer of ['Why are you so angry?','Sir, yes, sir!']){const s=story();assert.equal(s.lines.filter(l=>l.text.includes('PUDDLE')).length,1);assert.deepEqual(s.lines.filter(l=>l.speaker==='player').map(l=>l.expression),['shocked','shocked']);s.pick(answer);assert.equal(s.pick('Yes! Teach me!'),'happy');assert.equal(s.trained,1);assert.equal(s.declined,0);}});
test('refusal explains threats without starting training and permits returning later',()=>{const s=story();s.pick('Sir, yes, sir!');assert.equal(s.pick("Actually, no. I don't want to fight."),'frown');assert.equal(s.declined,1);assert.equal(s.trained,0);assert.equal(s.left,1);assert.equal(s.lines.filter(l=>l.speaker==='unknown').length,11);const returning=story(true);assert.equal(returning.pick("I'm just gonna go"),'concerned');assert.equal(returning.left,1);assert.equal(returning.trained,0);const retry=story(true);assert.equal(retry.pick('I changed my mind, teach me!'),'happy');assert.equal(retry.trained,1);});
test('reset clears refusal and shared progression cannot advance a declined introduction',()=>{const p=createTrainingProgress();p.state.refused=true;p.state.unarmed=true;assert.equal(p.advance(true),false);assert.equal(p.state.phase,'meet');p.reset();assert.equal(p.state.refused,false);});

test('a Pacifist "Teach me!" gets turned away, and Bristle skips to his offer next time',()=>{
 const run=(options)=>{const lines=[];let choices,trained=0,away=0;const api={say(batch,next){lines.push(...batch);next?.();},choose(line,options){lines.push(line);choices=options;},train(){trained++;},leave(){},refuse(){},turnedAway(){away++;},...options};bristleIntroduction(api);const pick=label=>{const c=choices.find(([text])=>text===label);c[1]();};return {lines,pick,get trained(){return trained;},get away(){return away;},get choices(){return choices;}};};
 const first=run({pacifist:()=>true});first.pick('Sir, yes, sir!');first.pick('Yes! Teach me!');
 assert.equal(first.trained,0);assert.equal(first.away,1);
 assert.deepEqual(first.lines.slice(-3).map(l=>l.text),["Wait a second! I can't teach a woo-woo do-gooder how to FIGHT.",'Go talk to the other tree huggers around here! They might talk nonsense with you!','Come back if you ever grow a SPINE, SLIME! DISMISSED!']);
 const again=run({pacifist:()=>false,returning:true});
 assert.equal(again.lines.length,1,'straight to the offer');assert.match(again.lines[0].text,/make a soldier out of you/);
 again.pick('Yes! Teach me!');assert.equal(again.trained,1,'after switching modes, training starts');
 const changedMind=run({pacifist:()=>true,refused:true});changedMind.pick('I changed my mind, teach me!');assert.equal(changedMind.away,1);
});
