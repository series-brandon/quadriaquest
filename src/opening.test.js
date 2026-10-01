import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createOpening} from './opening.js';

// Minimal DOM for exercising lesson transitions without timing browser animations.
class Element {
  constructor(){this.children=[];this.handlers={};this.style={};this.classList={add(){},remove(){}};this.hidden=false;this.textContent='';}
  append(...nodes){this.children.push(...nodes);}
  replaceChildren(){this.children=[];}
  setAttribute(){}
  addEventListener(name,fn){this.handlers[name]=fn;}
  querySelector(){return this.track??=new Element();}
  focus(){}
  click(){this.handlers.click?.({stopPropagation(){},target:{closest(){return null;}}});}
}
test('XP and level explanations return to gathering and final success only after confirmation',()=>{
  const previous=globalThis.document,nodes=new Map();
  globalThis.document={getElementById(id){if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);},createElement(){return new Element();},querySelector(){return new Element();}};
  try{
    const get=id=>document.getElementById(id);
    const opening=createOpening({player:new THREE.Group(),visual:new THREE.Group(),face:{set(){}},setColor(){},showClearing(){},spawn:new THREE.Vector3(),introSpawn:new THREE.Vector3()});
    const dialogue=()=>get('dialogue').click();
    const button=label=>{const b=get('dialogue-controls').children.find(n=>n.textContent===label);assert.ok(b,label);b.click();};
    opening.update(1);opening.update(1.4);
    for(let i=0;i<4;i++)dialogue();
    button('This is me');button('Yes');assert.equal(opening.reaction.kind,'Happy hop');dialogue();assert.equal(opening.reaction.kind,'Happy hop');opening.update(1.2);dialogue();button('That’s my name');button('Yes');assert.equal(opening.reaction.kind,'Wave');opening.update(2.3);dialogue();
    for(const dt of [1.3,.4,1.3,.9,1.4])opening.update(dt);
    for(let i=0;i<4;i++)dialogue();
    const continueLesson=()=>get('gather-tutorial').children.find(n=>n.id==='tutorial-continue').click();
    opening.rotated(.2);continueLesson();opening.zoomed(.2);continueLesson();
    opening.moving({x:0,z:0},{x:1,z:0});opening.arrived({x:1,z:0});continueLesson();
    assert.equal(opening.canGather,true);
    opening.collected(1,{xp:20,leveledUp:false});
    assert.match(get('tutorial-copy').textContent,/first experience points/);
    assert.equal(opening.canMove,false);opening.update(30);
    assert.match(get('tutorial-copy').textContent,/first experience points/);
    continueLesson();assert.equal(opening.canGather,true);
    assert.equal(get('tutorial-count').textContent,'1 / 6 collected');
    for(let count=2;count<=5;count++)opening.collected(count,{xp:20,leveledUp:false});
    assert.equal(opening.canGather,true);
    opening.collected(6,{xp:20,leveledUp:true});
    assert.match(get('tutorial-copy').textContent,/first level/);assert.equal(opening.canMove,false);
    continueLesson();assert.equal(get('tutorial-title').textContent,'All six collected!');
    assert.equal(get('gather-tutorial').hidden,false);assert.equal(opening.canMove,false);
    continueLesson();assert.equal(get('gather-tutorial').hidden,true);assert.equal(opening.canMove,true);
  }finally{globalThis.document=previous;}
});
