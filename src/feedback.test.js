import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createFeedback} from './feedback.js';
import {createCookingSystem} from './cooking.js';

test('arrival cannot complete cooking; successful cooking alone finishes its marker',t=>{
 const previous=globalThis.document;
 globalThis.document={createElement(){
  const canvas={};
  const context=new Proxy({fillText(text){canvas.label=text;}},{get:(object,key)=>object[key]??(()=>{})});
  canvas.getContext=()=>context;return canvas;
 }};
 t.after(()=>{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;});
 const scene=new THREE.Scene(),feedback=createFeedback(scene),tile={x:6,z:6,h:1};
 const destination=scene.children.find(child=>child.isGroup);
 const pin=destination.children.find(child=>child.isSprite);
 const label=()=>pin.material.map.image.label;
 const inventory={rawFish:3,cookedFish:0};
 let cooking;
 cooking=createCookingSystem({inventory,stop(){cooking.cancel();feedback.clearDestination();},
  started(){feedback.destination(tile);feedback.interacting('Cooking');},
  completed(){feedback.complete();},cancelled(){feedback.clearDestination();}});
 const station={available:()=>true};
 // Mirror frame order: the action updates before the stationary movement branch.
 const frame=dt=>{cooking.update(dt);feedback.arrived();};
 for(let n=1;n<=2;n++){
  cooking.start('cookedFish',station);
  for(let i=0;i<20;i++){frame(.1);assert.equal(label(),'Cooking');assert.equal(destination.visible,true);}
  assert.equal(inventory.cookedFish,n-1);
  frame(1);assert.equal(label(),'Done!');assert.equal(inventory.cookedFish,n);
  frame(1);assert.equal(inventory.cookedFish,n);
 }
 cooking.start('cookedFish',station);frame(.1);cooking.cancel();feedback.clearDestination();frame(5);
 assert.equal(destination.visible,false);assert.equal(inventory.rawFish,1);
 feedback.destination(tile);feedback.arrived();assert.equal(label(),'Arrived!');
 for(const kind of ['Eating','Crafting','Fishing','Repairing','Fighting','Smelting','Smithing']){
  feedback.destination(tile);feedback.interacting(kind);feedback.arrived();assert.equal(label(),kind);
  feedback.complete();assert.equal(label(),'Done!');
 }
});
