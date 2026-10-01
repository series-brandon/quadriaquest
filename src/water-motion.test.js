import test from 'node:test';
import assert from 'node:assert/strict';
import {pondEdges,shoreWeight,waterWave} from './water-motion.js';
test('pond banks remain fixed while shared tile seams can move',()=>{
 const edges=pondEdges([{x:0,z:0},{x:1,z:0}]);
 assert.equal(edges.length,6);
 assert.equal(shoreWeight(-.5,0,edges),0);
 assert.equal(shoreWeight(.5,.5,edges),0);
 assert.equal(shoreWeight(.5,0,edges),1);
 assert.ok(Math.abs(shoreWeight(.5-1e-6,0,edges)-shoreWeight(.5+1e-6,0,edges))<1e-6);
 for(let t=0;t<20;t+=.1)assert.ok(Math.abs(waterWave(.5,0,t))<=.018);
});
test('concave pond corners stay pinned',()=>{
 const edges=pondEdges([{x:0,z:0},{x:1,z:0},{x:0,z:1}]);
 assert.equal(shoreWeight(.5,.5,edges),0);
 assert.ok(shoreWeight(.4,.4,edges)>0);
});
