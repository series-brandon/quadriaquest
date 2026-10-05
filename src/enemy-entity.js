import * as THREE from 'three';
import {goblin} from './enemy-model.js';
import {ENEMIES} from './combat-rules.js';
import {highlightResource} from './resource-highlight.js';
import './combat.css';

export function createEnemyEntity({kind,tile,parent,pickables,patrol}){
 const rules=ENEMIES[kind],group=goblin(kind==='bruiser'),scale=kind==='bruiser'?1.18:1;
 group.scale.setScalar(scale);group.position.set(tile.x-6,tile.h,tile.z-6);parent.add(group);
 const healthLabel=document.createElement('div');healthLabel.className='enemy-health';healthLabel.hidden=true;document.body.append(healthLabel);
 const a={kind,tile,home:tile,x:tile.x,z:tile.z,group,scale,rules,patrol:patrol||{minX:tile.x-2,maxX:tile.x+2,minZ:tile.z-2,maxZ:tile.z+2},enemy:true,ready:true,opened:false,duration:0,label:'Fight '+rules.name,healthLabel};
 const meshes=[];group.traverse(m=>{if(m.isMesh){m.userData.actor=a;m.userData.tile=tile;pickables.push(m);meshes.push(m);}});
 a.highlight=highlightResource(group,{height:1.7});
 a.dispose=()=>{healthLabel.remove();group.removeFromParent();for(const m of meshes){const index=pickables.indexOf(m);if(index>=0)pickables.splice(index,1);}group.traverse(m=>{m.geometry?.dispose();});};
 return a;
}
