import {makeSlime} from './slime-model.js';
import {makeTree,makeFlowers,makeTerrainTile,addWaterTile} from './world-models.js';
import {key} from './world.js';
import {createGrassColors} from './grass-palette.js';
import {icon} from './icons.js';
import {createWaterEffects} from './water-effects.js';
import * as THREE from 'three';
import {createSleepFeedback} from './sleep-feedback.js';
import {socialMotion} from './slime-social.js';
import {createSlimeBend} from './slime-bend.js';

export function createSplash(renderer,enabled,settings){
  const overlay=document.createElement('section');overlay.id='splash';overlay.hidden=!enabled;
  overlay.innerHTML='<div class="splash-heading"><p>A LITTLE SLIME. A BIG ADVENTURE.</p><h1>Quadria<span>Quest</span></h1><p class="splash-subtitle">A world of small wonders awaits.</p></div><div class="splash-start"><div class="splash-actions"><button id="splash-play" type="button">Play</button></div><small>AN EARLY PLAYABLE PROTOTYPE</small></div>';
  const settingsButton=document.createElement('button');settingsButton.id='splash-settings';settingsButton.setAttribute('aria-label','Open settings');settingsButton.innerHTML=icon('settings');settingsButton.onclick=()=>settings.open();overlay.querySelector('.splash-actions').append(settingsButton);
  document.body.append(overlay);
  const scene=new THREE.Scene();scene.background=new THREE.Color('#dce5dc');
  scene.add(new THREE.HemisphereLight('#fff9df','#719584',3));
  const light=new THREE.DirectionalLight('#fff0d1',3);light.position.set(-3,8,5);light.castShadow=true;scene.add(light);
  const camera=new THREE.PerspectiveCamera(38,1,.1,50);
  function mesh(geometry,color,parent=scene){const m=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color,roughness:.9}));m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
  // A separate pocket garden: a low pond shelf and raised rear corners.
  const grassMaterials=createGrassColors().map(color=>new THREE.MeshStandardMaterial({color,roughness:.9}));
  let grassIndex=0;
  const garden=new THREE.Group();garden.position.y=-1;scene.add(garden);
  const pond=new Set(['-2,0','-1,0','-2,1','-1,1']),tiles=new Map();
  for(let x=-3;x<=3;x++)for(let z=-2;z<=2;z++)if(!(Math.abs(x)===3&&Math.abs(z)===2))tiles.set(key(x,z),{x,z,h:z===-2&&Math.abs(x)>=2?1.5:1,water:pond.has(`${x},${z}`)});
  // The title garden shares terrain, foliage and water with the playable maps.
  const gardenWater=createWaterEffects(garden,renderer);
  for(const t of tiles.values())if(t.water)addWaterTile(garden,t,tiles,gardenWater,0);else{const tile=makeTerrainTile(t,tiles,grassMaterials[grassIndex++%4]);tile.position.set(t.x,0,t.z);garden.add(tile);}
  for(const [x,z]of [[-2,-2],[2,-2],[3,0]]){const tree=makeTree();tree.position.set(x,tiles.get(key(x,z)).h,z);garden.add(tree);}
  for(const [x,z]of [[-3,0],[-1,2],[1,1],[2,1],[0,-1]]){const flowers=makeFlowers();flowers.position.set(x,tiles.get(key(x,z)).h,z);garden.add(flowers);}
  const {group:slime,body,face,hands}=makeSlime();scene.add(slime);slime.rotation.y=.35;face.set('sleeping');for(const hand of hands)hand.position.y=.2;
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
  return {grassMaterials,randomizeAppearance,restartWater(){gardenWater.restart();},get active(){return !overlay.hidden;},show,render(dt){
    gardenWater.update(dt);age+=dt;const {pose}=socialMotion('Sleeping',age);bend(pose.bend);const width=1/Math.sqrt(pose.squash);slime.scale.set(width,pose.squash,width);slime.position.y=.002-.07*pose.squash;
    camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();const distance=camera.aspect<.8?17:14;
    camera.position.set(distance*.4, distance*.5,distance*.85);camera.lookAt(0,1.4,0);camera.updateMatrixWorld();
    zs.update(dt,true,slime.position,camera);renderer.render(scene,camera);
  }};
}
