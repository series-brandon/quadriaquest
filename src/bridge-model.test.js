import test from 'node:test';
import assert from 'node:assert/strict';
import {makeBridge} from './bridge-model.js';
test('bridge repair preserves mirrored supports, evenly spaced decking and usable invisible hit surfaces',()=>{
 const bridge=makeBridge();assert.equal(bridge.posts.length,6);
 for(const post of bridge.posts)assert.ok(bridge.posts.some(other=>other.position.x===post.position.x&&other.position.z===-post.position.z));
 for(const progress of [0,1/3,2/3,1,0]){bridge.setProgress(progress);assert.ok(bridge.posts.every(p=>p.visible));assert.ok(bridge.railings.every(p=>p.visible===(progress===1)));assert.ok(bridge.surfaces.every(p=>p.visible===(progress===1)));}
 bridge.setProgress(2/3);assert.ok(bridge.planks.every(p=>p.visible));
 for(let i=1;i<bridge.planks.length;i++){const gap=bridge.planks[i].position.x-bridge.planks[i-1].position.x-bridge.planks[i].geometry.parameters.width;assert.ok(Math.abs(gap-.015)<1e-10);}
 bridge.setProgress(1);assert.ok(bridge.surfaces.every(p=>p.material.opacity===0&&!p.material.depthWrite&&!p.castShadow));
});
