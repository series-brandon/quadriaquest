import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createSlimeBend,bendOffset,bendPoint} from './slime-bend.js';
import {makeSlime} from './slime-model.js';
test('the bend anchors the base and shifts the crown sideways (the shader’s JS reference)',()=>{
 assert.equal(bendOffset(.07,.15),0);assert.equal(bendOffset(.79,.15),.15);
 const toVisual=new THREE.Matrix4().makeTranslation(0,.43,0);
 const base=bendPoint(new THREE.Vector3(.2,-.36,0),.15,toVisual),crown=bendPoint(new THREE.Vector3(.2,.36,0),.15,toVisual);
 assert.ok(Math.abs(base.x-.2)<1e-6&&Math.abs(base.y+.36)<1e-6);assert.ok(crown.x>.2+.14&&Math.abs(crown.y-.36)<1e-6);
});
test('bending happens in the shader: geometry is untouched, each bent mesh has its own uniforms, shadows bend too',()=>{
 const visual=new THREE.Group(),mesh=new THREE.Mesh(new THREE.BoxGeometry(.72,.72,.72),new THREE.MeshStandardMaterial());mesh.position.y=.43;mesh.castShadow=true;visual.add(mesh);
 const original=mesh.geometry.attributes.position.array.slice(),bend=createSlimeBend(visual,[mesh]);
 bend(.15);assert.deepEqual(mesh.geometry.attributes.position.array,original,'no vertex rewrite');
 const u=mesh.material.userData.bendUniforms;assert.equal(u.uBend.value,.15);assert.ok(Math.abs(u.uToVisual.value.elements[13]-.43)<1e-9);
 assert.equal(mesh.customDepthMaterial.userData.bendUniforms,u,'the shadow uses the same bend');
 const shader={uniforms:{},vertexShader:'#include <beginnormal_vertex>\n#include <begin_vertex>'};mesh.material.onBeforeCompile(shader);
 assert.ok(shader.uniforms.uBend===u.uBend&&/uFromVisual\*bp/.test(shader.vertexShader));
});
test('slimes share body, hand and face geometry; hands keep the body’s colour without bending',()=>{
 const a=makeSlime('#a4ce77'),b=makeSlime('#c85745');
 // Identity checks (assert.equal on three objects would print a huge diff on failure).
 assert.ok(a.body.geometry===b.body.geometry,'body');assert.ok(a.hands[0].geometry===b.hands[1].geometry,'hands');const c=makeSlime('#9db8e3');assert.ok(a.face.group.children[0].geometry===c.face.group.children[0].geometry,'face (same ink)');
 assert.ok(a.hands[0].material!==a.body.material,'hands have their own material');a.body.material.color.set('#123456');assert.equal(a.hands[0].material.color.getHexString(),'123456');
});
