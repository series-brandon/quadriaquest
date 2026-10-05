import {holdUpMotion} from './catch-motion.js';
import {updateObjective,finishObjective} from './quests.js';
import * as THREE from 'three';
import {makeChest,makeTopHat} from './finale-models.js';
import {highlightResource} from './resource-highlight.js';
import {spawnMotion} from './slime-motion.js';
import {practiceCleared} from './practice-goal.js';
import {findPath,key} from './world.js';

const portalInstruction="I've taught you all I can here in this area, when you're ready to move on, move over to the Iter Portal and we'll move on to the next area.";

export function createTutorialFinale(api){
  const $=id=>document.getElementById(id),actors=[],drops=[];
  let stage='inactive',next=null,portal=null,chest=null,practice=false,rewardTriggered=false,celebration=null,crystalFocus=null;
  const heldHat=makeTopHat();api.visual.add(heldHat);heldHat.visible=false;
  function busy(){return !!next||drops.length>0||!!celebration||!!crystalFocus;}
  function hideDialogue(){next=null;$('dialogue').hidden=true;}
  function say(text,advance){
    api.stop();$('gather-tutorial').hidden=true;$('dialogue').hidden=false;$('dialogue-line').textContent=text;
    $('dialogue').setAttribute('aria-label',text);$('dialogue').tabIndex=0;$('dialogue-controls').replaceChildren();$('dialogue-prompt').hidden=false;next=advance;
  }
  function advance(e){if(e.target.closest('button,input,label'))return;if(next){const action=next;next=null;action();}}
  $('dialogue').addEventListener('click',advance);
  $('dialogue').addEventListener('keydown',e=>{if(e.target===$('dialogue')&&['Enter',' '].includes(e.key)){e.preventDefault();advance(e);}});
  function createActor(group,tile,kind,label,duration,parent=api.parent){
    const actor={group,tile,x:tile.x,z:tile.z,kind,label,duration,ready:false,opened:false};
    group.position.set(tile.x-6,tile.h,tile.z-6);parent.add(group);tile.blocked=true;
    group.traverse(object=>{if(object.isMesh){object.userData.actor=actor;object.userData.tile=tile;api.pickables.push(object);}});
    actor.highlight=highlightResource(group,{height:kind==='chest'?1:2.75});actors.push(actor);return actor;
  }
  function drop(group,y,delay=0,complete=()=>{}){
    group.visible=true;group.position.y=y+14;group.scale.setScalar(1);drops.push({group,y,delay,age:0,complete});
  }
  function chooseTile(near){
    return [...api.tiles.values()].filter(t=>!t.blocked&&!api.trees.some(tree=>tree.x===t.x&&tree.z===t.z)&&!api.resources.some(r=>r.x===t.x&&r.z===t.z)&&!(t.x===api.getTile().x&&t.z===api.getTile().z)&&findPath(api.tiles,api.active()?api.getTile():api.spawn,t)!==null)
      .sort((a,b)=>(a.x-near.x)**2+(a.z-near.z)**2-((b.x-near.x)**2+(b.z-near.z)**2))[0];
  }
  function removeActor(actor){
    if(!actor)return;if(actor.crystal){api.crystals.remove(actor);return;}actor.tile.blocked=false;actor.group.removeFromParent();
    for(let i=api.pickables.length-1;i>=0;i--)if(api.pickables[i].userData.actor===actor)api.pickables.splice(i,1);
    const geometries=new Set(),materials=new Set();actor.group.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material&&!o.userData.actor)return;if(o.material)materials.add(o.material);});
    for(const g of geometries)g.dispose();for(const m of materials)m.dispose();actors.splice(actors.indexOf(actor),1);
  }
  function dropPortal(after=()=>{}){
    api.stop();removeActor(portal);const t=chooseTile({x:8,z:8});if(!t)return;
    portal=makePortal(t,false);stage='portal-drop';
    updateObjective('portal','Find the Iter Crystal','Use the floating Iter Crystal in the clearing when you are ready to travel. You can practice here before leaving.');say(portalInstruction,null);$('dialogue-prompt').hidden=true;
    drop(portal.group,t.h,0,()=>{portal.ready=true;stage='portal-focus';crystalFocus={age:0,phase:'in',position:new THREE.Vector3(t.x-6,t.h+1,t.z-6),after};});
  }
  function resetPractice(){
    hideDialogue();api.stop();api.clearFalling();practice=false;rewardTriggered=false;removeActor(chest);chest=null;
    api.ensureClearSpawn();
    api.trees.forEach((tree,i)=>{drop(tree.group,tree.tile.h,i*.06);});
    api.resources.forEach((resource,i)=>{drop(resource.group,api.tiles.get(key(resource.x,resource.z)).h,i*.045);});
    stage='resetting';
  }
  function begin(){
    say('Well done! This is just the start of what you will do here in Quadria!',()=>
      say(portalInstruction,()=>{
        dropPortal(()=>say("Here, I'll reset this area so you can practice some more if you want!",resetPractice));
      }));stage='closing';
  }
  function dropChest(){
    hideDialogue();api.stop();removeActor(chest);const t=chooseTile(api.getTile());if(!t)return;
    const model=makeChest();chest=createActor(model.group,t,'chest','Open wooden chest',1.4);chest.lid=model.lid;stage='chest-drop';
    drop(chest.group,t.h,0,()=>{chest.ready=true;stage='reward';});
  }
  function revealReward(){
    rewardTriggered=true;practice=false;
    say('Wow! Well practiced! I feel like you deserve a reward!',()=>say('Hmmm... let me think. Here, what do you think about this?',dropChest));
  }
  function celebrate(options={}){
    api.stop();hideDialogue();const p=api.player.position;
    const cameraAngle=chest?Math.atan2(p.x-chest.group.position.x,p.z-chest.group.position.z):api.getAngle();
    celebration={age:0,angle:cameraAngle,...options};stage='celebration';
  }
  function makePortal(tile,ready=true){return api.crystals.add({tile,parent:api.parent,destination:api.destination,label:'Enter Iter Portal',ready,onArrive:()=>finishObjective('portal')});}
  function ensurePortal(){if(!portal){const t=chooseTile({x:8,z:8});if(t)portal=makePortal(t);}return portal;}
  return {
    begin,dropPortal,resetPractice,dropChest,revealReward,celebrate,ensurePortal,
    debugCancel:__PLAYGROUND__?function(){hideDialogue();for(const d of drops){d.group.position.y=d.y;d.group.scale.setScalar(1);}drops.length=0;celebration=crystalFocus=null;practice=false;heldHat.visible=false;stage='inactive';$('scene-fade').style.opacity='0';$('scene-fade').hidden=true;}:undefined,
    get busy(){return busy();},get celebration(){return celebration;},get cameraFocus(){if(!crystalFocus)return null;const blend=crystalFocus.phase==='out'?1-THREE.MathUtils.smoothstep(crystalFocus.age,0,1):THREE.MathUtils.smoothstep(crystalFocus.age,0,1);return {position:crystalFocus.position,blend,zoom:7,elevation:.45};},get stage(){return stage;},
    get state(){return {stage,practice,rewardTriggered};},
    openChest(){if(chest)api.approach(chest);},
    stopPreview(){if(celebration?.preview){celebration=null;heldHat.visible=false;}},
    interact(actor){
      if(!actor.ready||actor.opened||busy())return;
      if(actor.kind==='chest'){actor.opened=true;actor.lid.rotation.x=-1;actor.lid.position.set(0,.64,-.18);api.inventory.hats=(api.inventory.hats||0)+1;api.showItemChanges({hats:1});celebrate();}
    },
    reset(){
      hideDialogue();for(const d of drops){d.group.position.y=d.y;d.group.scale.setScalar(1);}drops.length=0;
      celebration=null;crystalFocus=null;heldHat.visible=false;practice=false;rewardTriggered=false;stage='inactive';
      removeActor(portal);removeActor(chest);portal=chest=null;$('scene-fade').style.opacity='0';
    },
    update(dt,time,hover){
      for(let i=drops.length-1;i>=0;i--){const d=drops[i];d.age+=dt;if(d.age<d.delay)continue;const motion=spawnMotion(d.age-d.delay);d.group.position.y=d.y+motion.lift;d.group.scale.set(1/Math.sqrt(motion.squash),motion.squash,1/Math.sqrt(motion.squash));if(d.age-d.delay>=1.2){d.group.position.y=d.y;d.group.scale.setScalar(1);drops.splice(i,1);d.complete();}}
      if(crystalFocus){
        crystalFocus.age+=dt;
        if(crystalFocus.phase==='in'&&crystalFocus.age>=1){
          crystalFocus.phase='hold';stage='portal-wait';$('dialogue-prompt').hidden=false;
          next=()=>{crystalFocus.phase='out';crystalFocus.age=0;stage='portal-return';$('dialogue-prompt').hidden=true;};
        }else if(crystalFocus.phase==='out'&&crystalFocus.age>=1){
          const after=crystalFocus.after;crystalFocus=null;stage='practice';hideDialogue();after();
        }
      }
      if(stage==='resetting'&&!drops.length){practice=true;stage='practice';}
      for(const a of actors)a.highlight.update(a.ready&&!a.opened,time,hover===a&&a.ready&&!a.opened);
      if(practice&&!busy()&&practiceCleared(api.resources,api.trees))revealReward();
      if(celebration){celebration.age+=dt*(celebration.rate?.()??1);const t=celebration.age;const prop=holdUpMotion(t,'hat').prop;heldHat.visible=prop.visible;heldHat.position.set(0,prop.y,prop.z);if(t>4.3){celebration=null;heldHat.visible=false;stage='reward-complete';}}

    }
  };
}
