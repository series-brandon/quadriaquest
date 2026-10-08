import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {objectives,resetObjectives} from './quests.js';
import {createOpening} from './opening.js';

// Minimal DOM for exercising lesson transitions without timing browser animations.
class Element {
  constructor(){this.nodeType=1;this.children=[];this.dataset={};this.handlers={};this.style={};this.classList={add(){},remove(){},toggle(){}};this.hidden=false;this.textContent='';}
  append(...nodes){nodes=nodes.map(node=>typeof node==='string'?Object.assign(new Element(),{textContent:node}):node);for(const node of nodes)node.parentElement=this;this.children.push(...nodes);}
  removeAttribute(){}
  remove(){}
  find(test){for(const child of this.children){if(test(child))return child;const found=child.find?.(test);if(found)return found;}return null;}
  replaceWith(node){const parent=this.parentElement;parent.children.splice(parent.children.indexOf(this),1,node);node.parentElement=parent;}
  replaceChildren(){this.children=[];}
  setAttribute(){}
  addEventListener(name,fn){this.handlers[name]=fn;}
  querySelector(){return this.track??=new Element();}
  focus(){}
  click(){this.handlers.click?.({stopPropagation(){},target:{closest(){return null;}}});}
}
test('XP and level explanations return to gathering and final success only after confirmation',()=>{
  const previous=globalThis.document,nodes=new Map();
  globalThis.document={body:new Element(),getElementById(id){if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);},createElement(){return new Element();},createTextNode(data){return Object.assign(new Element(),{data});},querySelector(){return new Element();}};
  try{
    const get=id=>document.getElementById(id);
    let finishSkills,finishQuests;
    const modes=[];
    const opening=createOpening({onModeChosen:mode=>modes.push(mode),onFirstQuest:done=>{finishQuests=done;},onFirstLevel:done=>{finishSkills=done;},player:new THREE.Group(),visual:new THREE.Group(),face:{set(){}},setColor(){},showClearing(){},spawn:new THREE.Vector3(),introSpawn:new THREE.Vector3()});
    const dialogue=()=>get('dialogue').click();
    const button=label=>{const b=get('dialogue-controls').children.find(n=>n.textContent===label);assert.ok(b,label);b.click();};
    opening.update(1);opening.update(1.4);
    for(let i=0;i<4;i++)dialogue();
    assert.equal(get('dialogue').dataset.presentation,'customize');button('This is me');assert.equal(get('dialogue').dataset.presentation,'customize');button('Yes');assert.equal(get('dialogue').dataset.presentation,'customize');assert.equal(opening.canOrbit,true);assert.equal(opening.reaction.kind,'Happy hop');dialogue();assert.equal(opening.reaction.kind,'Happy hop');opening.update(1.2);dialogue();button('That’s my name');button('Yes');assert.equal(opening.reaction.kind,'Wave');
    // Then the play style: Simple is preselected; picking Pacifist and confirming applies it.
    const controls=get('dialogue-controls');controls.find(n=>n.handlers?.change&&n.value==='pacifist').handlers.change();controls.find(n=>n.handlers?.click&&/^Play as/.test(n.children?.[0]?.data??'')).click();
    assert.deepEqual(modes,['pacifist']);opening.update(2.3);dialogue();
    for(const dt of [1.3,.4,1.3,.9,1.4])opening.update(dt);
    for(let i=0;i<4;i++)dialogue();
    assert.equal(typeof finishQuests,'function');assert.equal(opening.playable,false);finishQuests();assert.equal(opening.playable,true);
    const continueLesson=()=>get('gather-tutorial').children.find(n=>n.id==='tutorial-continue').click();
    const controlButton=get('gather-tutorial').children.find(n=>n.id==='tutorial-continue');
    assert.equal(controlButton.disabled,true);continueLesson();assert.equal(get('gather-tutorial').hidden,false);
    opening.rotated(.2);assert.equal(controlButton.disabled,false);continueLesson();
    assert.equal(controlButton.disabled,true);opening.zoomed(.2);assert.equal(controlButton.disabled,false);continueLesson();
    assert.equal(opening.canMove,true);assert.equal(controlButton.disabled,true);
    opening.moving({x:0,z:0},{x:0,z:0});opening.arrived({x:0,z:0});assert.equal(controlButton.disabled,true);
    opening.moving({x:0,z:0},{x:1,z:0});assert.equal(controlButton.disabled,true);opening.arrived({x:1,z:0});assert.equal(controlButton.disabled,false);continueLesson();
    assert.equal(get('gather-tutorial').hidden,false);assert.equal(controlButton.textContent,'Dismiss');
    assert.equal(opening.canMove,true);assert.equal(opening.canGather,true);
    opening.collected(1,{xp:20,leveledUp:false});
    assert.match(get('tutorial-copy').textContent,/first experience points/);
    assert.equal(opening.canMove,false);opening.update(30);
    assert.match(get('tutorial-copy').textContent,/first experience points/);
    continueLesson();assert.match(get('tutorial-copy').textContent,/Higher skill levels/);
    assert.equal(opening.canGather,false);assert.equal(opening.canMove,false);assert.equal(get('gather-tutorial').hidden,false);
    assert.equal(objectives.get('gather').current,1);assert.equal(controlButton.textContent,'Dismiss');
    continueLesson();assert.equal(opening.canGather,true);
    assert.equal(get('gather-tutorial').hidden,true);assert.equal(objectives.get('gather').current,1);
    assert.equal(get('tutorial-copy').textContent,'Finish collecting the items off the ground.');
    for(let count=2;count<=5;count++)opening.collected(count,{xp:20,leveledUp:false});
    assert.equal(opening.canGather,true);
    opening.collected(6,{xp:20,leveledUp:true});assert.equal(objectives.get('gather').current,6);
    assert.match(get('tutorial-copy').textContent,/first level/);assert.equal(opening.canMove,false);
    continueLesson();assert.match(get('tutorial-copy').textContent,/master of many skills/);assert.equal(finishSkills,undefined);assert.equal(opening.canMove,false);
    continueLesson();assert.equal(typeof finishSkills,'function');assert.equal(opening.canMove,false);assert.equal(opening.canGather,false);
    // The Skills controller hides the shared tutorial panel before returning.
    get('gather-tutorial').hidden=true;
    get('tutorial-count').textContent='';get('tutorial-progress').style.width='0%';
    finishSkills();assert.equal(get('tutorial-title').textContent,'All six collected!');
    assert.equal(get('tutorial-count').textContent,'6 / 6 collected');assert.equal(get('tutorial-progress').style.width,'100%');
    assert.equal(get('gather-tutorial').hidden,false);assert.equal(opening.canMove,false);
    continueLesson();assert.equal(get('gather-tutorial').hidden,true);assert.equal(opening.canMove,true);
  }finally{resetObjectives();globalThis.document=previous;}
});
