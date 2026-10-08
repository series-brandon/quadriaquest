import test from 'node:test';
import assert from 'node:assert/strict';
import {bristleIntroduction} from './cinderhold-dialogue.js';
import {createTrainingProgress} from './cinderhold-rules.js';
function story(refused=false,options={}){const lines=[];let choices,trained=0,left=0,declined=0,pacified=0;const api={refused,say(batch,next){lines.push(...batch);next?.();},choose(line,options){lines.push(line);choices=options;},train(){trained++;},leave(){left++;},refuse(){declined++;},makePacifist(){pacified++;},...options};bristleIntroduction(api);return {lines,pick(text){const option=choices.find(c=>c[0]===text);assert.ok(option,text);option[1]();return option[2];},get trained(){return trained;},get left(){return left;},get declined(){return declined;},get pacified(){return pacified;},get choices(){return choices.map(c=>c[0]);}};}
test('both opening responses converge and accepting starts training once',()=>{for(const answer of ['Why are you so angry?','Sir, yes, sir!']){const s=story();assert.equal(s.lines.filter(l=>l.text.includes('PUDDLE')).length,1);assert.deepEqual(s.lines.filter(l=>l.speaker==='player').map(l=>l.expression),['shocked','shocked']);s.pick(answer);assert.equal(s.pick('Yes! Teach me!'),'happy');assert.equal(s.trained,1);assert.equal(s.declined,0);}});
// Declining: Bristle breaks, the narrator speaks, then answers by combat mode.
const refuse=options=>{const s=story(false,options);s.pick('Sir, yes, sir!');assert.equal(s.pick("Actually, no. I don't want to fight."),'frown');assert.equal(s.declined,1);assert.equal(s.trained,0);return s;};
const narration=s=>s.lines.filter(l=>l.speaker==='unknown').map(l=>l.text);
test('an already-Pacifist refusal warns about the creatures that hunt pacifists',()=>{
 const s=refuse({pacifist:()=>true});
 assert.equal(s.left,1);assert.equal(s.pacified,0,'no offer: already Pacifist');
 assert.match(narration(s).join(' '),/already chosen a peaceful path.*Hunts pacifists.*mentors here/);
 assert.doesNotMatch(narration(s).join(' '),/Threat Level/);
});
test('any other mode is offered Pacifist; accepting switches the shared mode and gives the warning',()=>{
 const s=refuse({pacifist:()=>false});
 assert.equal(s.left,0,'waits for the answer');assert.match(s.lines.at(-1).text,/Shall I switch you to it\?/);assert.equal(s.lines.at(-1).speaker,'unknown');
 assert.deepEqual(s.choices,['Yes, make me a pacifist.',"No, I'll keep my current mode."]);
 assert.equal(s.pick('Yes, make me a pacifist.'),'happy');
 assert.equal(s.pacified,1);assert.equal(s.left,1);
 assert.match(narration(s).join(' '),/now in Pacifist mode.*Hunts pacifists/);assert.doesNotMatch(narration(s).join(' '),/Threat Level/);
});
test('declining Pacifist keeps the mode and explains Threat Levels',()=>{
 const s=refuse({pacifist:()=>false});
 s.pick("No, I'll keep my current mode.");
 assert.equal(s.pacified,0);assert.equal(s.left,1);
 assert.match(narration(s).join(' '),/Every living creature in Quadria has a Threat Level.*mentors here/);assert.doesNotMatch(narration(s).join(' '),/Hunts pacifists/);
});
test('returning after a refusal can leave or change their mind',()=>{const returning=story(true);assert.equal(returning.pick("I'm just gonna go"),'concerned');assert.equal(returning.left,1);assert.equal(returning.trained,0);const retry=story(true);assert.equal(retry.pick('I changed my mind, teach me!'),'happy');assert.equal(retry.trained,1);});
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
