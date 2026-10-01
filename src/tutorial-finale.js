import * as THREE from 'three';
import {makeCrystal,makeChest,makeTopHat} from './finale-models.js';
import {highlightResource} from './resource-highlight.js';
import {spawnMotion} from './slime-motion.js';
import {practiceCleared} from './practice-goal.js';
import {findPath,key} from './world.js';

export function createTutorialFinale(api){
  const $=id=>document.getElementById(id),actors=[],drops=[];
  let stage='inactive',next=null,portal=null,chest=null,practice=false,rewardTriggered=false,celebration=null,transition=null,inPlaceholder=false,equipped=false;
  const hat=makeTopHat(),heldHat=makeTopHat();api.visual.add(hat,heldHat);hat.position.y=.79;hat.visible=false;heldHat.visible=false;
  const equipment=document.createElement('button');equipment.id='hat-equipment';equipment.hidden=true;document.body.append(equipment);
  equipment.onclick=()=>{if(!busy())equipped=!equipped;};
  const location=document.createElement('div');location.id='area-name';location.hidden=true;location.textContent='Beyond the clearing · Next area preview';document.body.append(location);
  const placeholder=new THREE.Group();placeholder.visible=false;api.scene.add(placeholder);
  const tiles=[];
  for(let z=4;z<=8;z++)for(let x=4;x<=8;x++){
    const t={x,z,h:1,blocked:false,water:false};tiles.push(t);
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(.985,1,.985),new THREE.MeshStandardMaterial({color:(x+z)%2?'#a6b9b7':'#b9cbc1',roughness:.9}));
    mesh.position.set(x-6,.5,z-6);mesh.receiveShadow=true;mesh.userData.tile=t;placeholder.add(mesh);api.pickables.push(mesh);
  }
  const returnTile=tiles.find(t=>t.x===6&&t.z===4);returnTile.blocked=true;
  const returnPortal=createActor(makeCrystal(),returnTile,'return','Return to the clearing',0,placeholder);
  returnPortal.ready=true;returnPortal.group.position.y=returnTile.h;
  function busy(){return !!next||drops.length>0||!!celebration||!!transition;}
  function hideDialogue(){next=null;$('dialogue').hidden=true;}
  function say(text,advance){
    api.stop();$('gather-tutorial').hidden=true;$('dialogue').hidden=false;$('dialogue-line').textContent=text;
    $('dialogue').setAttribute('aria-label',text);$('dialogue').tabIndex=0;$('dialogue-controls').replaceChildren();$('dialogue-prompt').hidden=false;next=advance;
  }
  function advance(e){if(e.target.closest('button,input,label'))return;if(next){const action=next;next=null;action();}}
  $('dialogue').addEventListener('click',advance);
  $('dialogue').addEventListener('keydown',e=>{if(e.target===$('dialogue')&&['Enter',' '].includes(e.key)){e.preventDefault();advance(e);}});
  function createActor(group,tile,kind,label,duration,parent=api.scene){
    const actor={group,tile,x:tile.x,z:tile.z,kind,label,duration,ready:false,opened:false};
    group.position.set(tile.x-6,tile.h,tile.z-6);parent.add(group);tile.blocked=true;
    group.traverse(object=>{if(object.isMesh){object.userData.actor=actor;object.userData.tile=tile;api.pickables.push(object);}});
    actor.highlight=highlightResource(group,{height:kind==='chest'?1:2.75});actors.push(actor);return actor;
  }
  function drop(group,y,delay=0,complete=()=>{}){
    group.visible=true;group.position.y=y+14;group.scale.setScalar(1);drops.push({group,y,delay,age:0,complete});
  }
  function chooseTile(near){
    return [...api.world.values()].filter(t=>!t.blocked&&!api.trees.some(tree=>tree.x===t.x&&tree.z===t.z)&&!api.resources.some(r=>r.x===t.x&&r.z===t.z)&&!(t.x===api.getTile().x&&t.z===api.getTile().z)&&findPath(api.world,api.getTile(),t)!==null)
      .sort((a,b)=>(a.x-near.x)**2+(a.z-near.z)**2-((b.x-near.x)**2+(b.z-near.z)**2))[0];
  }
  function removeActor(actor){
    if(!actor)return;actor.tile.blocked=false;actor.group.removeFromParent();
    for(let i=api.pickables.length-1;i>=0;i--)if(api.pickables[i].userData.actor===actor)api.pickables.splice(i,1);
    const geometries=new Set(),materials=new Set();actor.group.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material&&!o.userData.actor)return;if(o.material)materials.add(o.material);});
    for(const g of geometries)g.dispose();for(const m of materials)m.dispose();actors.splice(actors.indexOf(actor),1);
  }
  function dropPortal(after=()=>{}){
    api.stop();removeActor(portal);const t=chooseTile({x:8,z:8});if(!t)return;
    portal=createActor(makeCrystal(),t,'portal','Enter Iter Portal',0);stage='portal-drop';
    drop(portal.group,t.h,0,()=>{portal.ready=true;stage='practice';after();});
  }
  function resetPractice(){
    hideDialogue();api.stop();api.clearFalling();practice=false;rewardTriggered=false;removeActor(chest);chest=null;
    api.ensureClearSpawn();
    api.trees.forEach((tree,i)=>{tree.felled=false;tree.tile.blocked=true;tree.group.rotation.set(0,0,0);drop(tree.group,tree.tile.h,i*.06);});
    api.resources.forEach((resource,i)=>{resource.collected=false;drop(resource.group,api.world.get(key(resource.x,resource.z)).h,i*.045);});
    stage='resetting';
  }
  function begin(){
    say('Well done! This is just the start of what you will do here in Quadra!',()=>
      say("I've taught you all I can here in this area, when you're ready to move on, move over to the Iter Portal and we'll move on to the next area.",()=>{
        hideDialogue();dropPortal(()=>say("Here, I'll reset this area so you can practice some more if you want!",resetPractice));
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
  function travel(destination){if(busy()||((destination==='placeholder')===inPlaceholder))return;api.stop();hideDialogue();transition={age:0,destination,switched:false};$('scene-fade').hidden=false;}
  function refresh(){if(!(api.inventory.hats>0))equipped=false;equipment.hidden=!(api.inventory.hats>0)||!!celebration;equipment.textContent=equipped?'Remove Top Hat':'Wear Top Hat';hat.visible=equipped&&!celebration;}
  return {
    begin,dropPortal,resetPractice,dropChest,revealReward,celebrate,travel,
    get busy(){return busy();},get celebration(){return celebration;},get inPlaceholder(){return inPlaceholder;},get stage(){return stage;},
    get state(){return {stage,practice,rewardTriggered,inPlaceholder,equipped};},
    refresh,
    usePortal(){const actor=inPlaceholder?returnPortal:portal;if(actor)api.approach(actor);},
    openChest(){if(chest)api.approach(chest);},
    stopPreview(){if(celebration?.preview){celebration=null;heldHat.visible=false;refresh();}},
    equip(){if(api.inventory.hats>0)equipped=!equipped;},
    interact(actor){
      if(!actor.ready||actor.opened||busy())return;
      if(actor.kind==='chest'){actor.opened=true;actor.lid.rotation.x=-1;actor.lid.position.set(0,.64,-.18);api.inventory.hats=(api.inventory.hats||0)+1;api.showItemChanges({hats:1});celebrate();}
      else travel(actor.kind==='return'?'clearing':'placeholder');
    },
    reset(){
      hideDialogue();for(const d of drops){d.group.position.y=d.y;d.group.scale.setScalar(1);}drops.length=0;
      celebration=null;transition=null;heldHat.visible=false;equipped=false;practice=false;rewardTriggered=false;stage='inactive';
      if(inPlaceholder){api.switchArea(false,placeholder,tiles);inPlaceholder=false;}
      removeActor(portal);removeActor(chest);portal=chest=null;location.hidden=true;$('scene-fade').style.opacity='0';refresh();
    },
    update(dt,time,hover){
      for(let i=drops.length-1;i>=0;i--){const d=drops[i];d.age+=dt;if(d.age<d.delay)continue;const motion=spawnMotion(d.age-d.delay);d.group.position.y=d.y+motion.lift;d.group.scale.set(1/Math.sqrt(motion.squash),motion.squash,1/Math.sqrt(motion.squash));if(d.age-d.delay>=1.2){d.group.position.y=d.y;d.group.scale.setScalar(1);drops.splice(i,1);d.complete();}}
      if(stage==='resetting'&&!drops.length){practice=true;stage='practice';}
      for(const a of actors){const here=a.kind==='return'?inPlaceholder:!inPlaceholder;a.highlight.update(here&&a.ready&&!a.opened,time,here&&hover===a&&a.ready&&!a.opened);if(a.kind!=='chest'&&a.ready)a.group.position.y=a.tile.h+.12+Math.sin(time*1.8)*.10;}
      if(practice&&!inPlaceholder&&!busy()&&practiceCleared(api.resources,api.trees))revealReward();
      if(celebration){celebration.age+=dt*(celebration.rate?.()??1);const t=celebration.age;heldHat.visible=t>.55&&t<3.5;heldHat.position.set(0,.72+Math.min(1,Math.max(0,(t-.55)/.6))*.20,.56);if(t>4.3){celebration=null;heldHat.visible=false;stage='reward-complete';}}
      if(transition){transition.age+=dt;const t=transition.age;$('scene-fade').style.opacity=String(t<.8?t/.8:Math.max(0,1-(t-1)/.8));if(t>=.8&&!transition.switched){transition.switched=true;inPlaceholder=transition.destination==='placeholder';api.switchArea(inPlaceholder,placeholder,tiles);if(portal)portal.group.visible=!inPlaceholder;if(chest)chest.group.visible=!inPlaceholder;location.hidden=!inPlaceholder;}if(t>=1.8){transition=null;$('scene-fade').style.opacity='0';}}
      refresh();$('game-menus').inert=busy();
    }
  };
}
