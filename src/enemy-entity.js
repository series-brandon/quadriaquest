import {trainingTarget} from './training-models.js';
import * as THREE from 'three';
import {goblin} from './enemy-model.js';
import {ENEMIES} from './combat-rules.js';
import {highlightResource} from './resource-highlight.js';
import './combat.css';

// xp: optional placement-specific XP modifiers {multiplier, levelCap, afterCapMultiplier} (e.g. a tutorial boost).
export function createEnemyEntity({kind,tile,parent,pickables,patrol,respawn=null,id,aggressive,aggroRange,xp=null}){
 const rules=xp?{...ENEMIES[kind],xpMultiplier:xp.multiplier??1,xpLevelCap:xp.levelCap??null,xpAfterCapMultiplier:xp.afterCapMultiplier??0}:ENEMIES[kind],group=kind==='target'?trainingTarget():goblin(kind==='bruiser'),scale=kind==='bruiser'?1.18:1;
 group.scale.setScalar(scale);group.position.set(tile.x-6,tile.h,tile.z-6);parent.add(group);
 const healthLabel=document.createElement('div');healthLabel.className='enemy-health';healthLabel.hidden=true;document.body.append(healthLabel);
 const a={kind,id,respawn,aggressive:aggressive??rules.aggressive??false,aggroRange:aggroRange??rules.aggroRange??3,tile,home:tile,x:tile.x,z:tile.z,group,scale,rules,patrol:patrol||{minX:tile.x-2,maxX:tile.x+2,minZ:tile.z-2,maxZ:tile.z+2},enemy:true,ready:true,opened:false,duration:0,label:'Fight '+rules.name,healthLabel};
 const meshes=[];group.traverse(m=>{if(m.isMesh){m.userData.actor=a;m.userData.tile=tile;pickables.push(m);meshes.push(m);}});
 a.highlight=highlightResource(group,{height:1.7});
 a.dispose=()=>{healthLabel.remove();group.removeFromParent();for(const m of meshes){const index=pickables.indexOf(m);if(index>=0)pickables.splice(index,1);}group.traverse(m=>{m.geometry?.dispose();});};
 return a;
}
