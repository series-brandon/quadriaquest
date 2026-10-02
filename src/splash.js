import {createGrassColors} from './grass-palette.js';
import {icon} from './icons.js';
import {createWaterEffects} from './water-effects.js';
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {createSlimeFace} from './slime-face.js';
import {createSleepFeedback} from './sleep-feedback.js';
import {socialMotion} from './slime-social.js';
import {createSlimeBend} from './slime-bend.js';

export function createSplash(renderer,enabled,settings){
  const overlay=document.createElement('section');overlay.id='splash';overlay.hidden=!enabled;
  overlay.innerHTML='<div class="splash-heading"><p>A LITTLE SLIME. A BIG ADVENTURE.</p><h1>Quadra <span>Quest</span></h1><p class="splash-subtitle">A world of small wonders awaits.</p></div><div class="splash-start"><div class="splash-actions"><button id="splash-play" type="button">Play</button></div><small>AN EARLY PLAYABLE PROTOTYPE</small></div>';
  const settingsButton=document.createElement('button');settingsButton.id='splash-settings';settingsButton.setAttribute('aria-label','Open settings');settingsButton.innerHTML=icon('settings');settingsButton.onclick=()=>settings.open();overlay.querySelector('.splash-actions').append(settingsButton);
  document.body.append(overlay);
  const scene=new THREE.Scene();scene.background=new THREE.Color('#dce5dc');
  scene.add(new THREE.HemisphereLight('#fff9df','#719584',3));
  const light=new THREE.DirectionalLight('#fff0d1',3);light.position.set(-3,8,5);light.castShadow=true;scene.add(light);
  const camera=new THREE.PerspectiveCamera(38,1,.1,50);
  function mesh(geometry,color,parent=scene){const m=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color,roughness:.85}));m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
  // A separate pocket garden: a low pond shelf and raised rear corners.
  const waterEffects=createWaterEffects(scene,renderer);
  const grassMaterials=createGrassColors().map(color=>new THREE.MeshStandardMaterial({color,roughness:.85}));
  let grassIndex=0;
  const heights=new Map(),pond=new Set(['-2,0','-1,0','-2,1','-1,1']);
  for(let x=-3;x<=3;x++)for(let z=-2;z<=2;z++){
    if(Math.abs(x)===3&&Math.abs(z)===2)continue;
    const water=pond.has(`${x},${z}`),h=z===-2&&Math.abs(x)>=2?1.5:1;
    heights.set(`${x},${z}`,h-1+.06);
    mesh(new THREE.BoxGeometry(.985,water?.7:h,.985),'#a29979').position.set(x,(water?.7:h)/2-1,z);
    if(water){
      const surface=mesh(new THREE.BoxGeometry(.998,.15,.998),'#8dbdb3');surface.position.set(x,-.225,z);surface.material.roughness=.3;surface.material.metalness=.08;
      const side=surface.material,hiddenFace=new THREE.MeshBasicMaterial({visible:false});surface.material=[[1,0],[-1,0],null,null,[0,1],[0,-1]].map((offset,i)=>i===2||(offset&&pond.has(`${x+offset[0]},${z+offset[1]}`))?hiddenFace:side);
      waterEffects.add(x,-.15,z,side);
    }else {
      const top=new THREE.Mesh(new RoundedBoxGeometry(.985,.12,.985,3,.045),grassMaterials[grassIndex++%grassMaterials.length]);
      top.castShadow=top.receiveShadow=true;top.position.set(x,h-1,z);scene.add(top);
    }
  }
  for(const [x,z] of [[-2,-2],[2,-2],[3,0]]){
    const tree=new THREE.Group();scene.add(tree);tree.position.set(x,heights.get(`${x},${z}`),z);
    mesh(new THREE.CylinderGeometry(.09,.15,1.3,7),'#a68c6b',tree).position.y=.65;
    for(let j=0;j<3;j++){
      const crown=mesh(new THREE.IcosahedronGeometry(.72-j*.13,1),['#799b62','#95b575','#a9c589'][j],tree);
      crown.position.set(Math.sin(j*3)*.19,1.25+j*.38,Math.cos(j*3)*.12);crown.scale.y=.95;
    }
  }
  for(const [x,z] of [[-3,0],[-1,2],[1,1],[2,1],[0,-1]]){
    const ground=heights.get(`${x},${z}`);
    for(let j=0;j<4;j++){
      const fx=x-.25+j*.15,fz=z+.15+Math.sin(j*2)*.14;
      mesh(new THREE.CylinderGeometry(.012,.012,.17,4),'#799b62').position.set(fx,ground+.085,fz);
      mesh(new THREE.IcosahedronGeometry(.065,1),j%2?'#f6e8ae':'#f2c5cf').position.set(fx,ground+.18,fz);
    }
  }
  const slime=new THREE.Group();scene.add(slime);slime.rotation.y=.35;
  const body=mesh(new RoundedBoxGeometry(.72,.72,.72,4,.16),'#a4ce77',slime);body.position.y=.43;
  const face=createSlimeFace();slime.add(face.group);face.set('sleeping');
  for(const x of [-.46,.46]){
    const hand=new THREE.Mesh(new THREE.SphereGeometry(.105,12,10),body.material);
    hand.castShadow=hand.receiveShadow=true;hand.position.set(x,.2,.08);slime.add(hand);
  }
  // Splash appearance is independent of the player's chosen character.
  // Future cosmetic randomization belongs in this same entry point.
  function randomizeAppearance(){
    const color=new THREE.Color().setHSL(Math.random(),.45+Math.random()*.35,.35+Math.random()*.3,THREE.SRGBColorSpace);
    body.material.color.copy(color);face.setBodyColor(color);
  }
  randomizeAppearance();
  const bend=createSlimeBend(slime,[body,face.group]);
  const zs=createSleepFeedback(scene);let age=2;
  let blocked=[];
  function show(){overlay.hidden=false;blocked=[...document.body.children].filter(el=>el!==overlay&&el.id!=='game-settings'&&!el.inert);for(const el of blocked)el.inert=true;}
  const close=()=>{overlay.hidden=true;for(const el of blocked)el.inert=false;blocked=[];};overlay.querySelector('#splash-play').onclick=close;
  if(enabled)show();
  return {grassMaterials,randomizeAppearance,restartWater(){waterEffects.restart();},get active(){return !overlay.hidden;},show,render(dt){
    waterEffects.update(dt);age+=dt;const {pose}=socialMotion('Sleeping',age);bend(pose.bend);const width=1/Math.sqrt(pose.squash);slime.scale.set(width,pose.squash,width);slime.position.y=.065-.07*pose.squash;
    camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();const distance=camera.aspect<.8?17:14;
    camera.position.set(distance*.4, distance*.5,distance*.85);camera.lookAt(0,1.4,0);camera.updateMatrixWorld();
    zs.update(dt,true,slime.position,camera);renderer.render(scene,camera);
  }};
}
