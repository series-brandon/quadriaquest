import {trainingTarget} from './training-models.js';
import {goblin} from './enemy-model.js';
import {ENEMIES} from './combat-rules.js';
import {highlightResource} from './resource-highlight.js';
import './combat.css';
import {signal} from './reactive.js';
import {mount} from './ui/dom.js';
import {healthPlate} from './ui/hud/health-plate.js';

// xp: optional placement-specific XP modifiers {multiplier, levelCap, afterCapMultiplier} (e.g. a tutorial boost).
// attacksPacifists: rare opt-in (the most aggressive creatures, some bosses) to engage players whose
// attacks are prevented; placements may override the enemy type's setting.
export function createEnemyEntity({kind,tile,parent,pickables,patrol,respawn=null,id,aggressive,aggroRange,attacksPacifists,xp=null}){
 const rules=xp?{...ENEMIES[kind],xpMultiplier:xp.multiplier??1,xpLevelCap:xp.levelCap??null,xpAfterCapMultiplier:xp.afterCapMultiplier??0}:ENEMIES[kind],group=kind==='target'?trainingTarget():goblin(kind==='bruiser'),scale=kind==='bruiser'?1.18:1;
 group.scale.setScalar(scale);group.position.set(tile.x-6,tile.h,tile.z-6);parent.add(group);
 // Signal-backed HP: combat keeps assigning a.hp; the health plate (target frame) follows it.
 const hp=signal(rules.health);let plate;
 const plateView=mount(()=>{plate=healthPlate({value:hp,max:rules.health});return plate.node;});document.body.append(plateView.node);
 const a={kind,id,respawn,aggressive:aggressive??rules.aggressive??false,aggroRange:aggroRange??rules.aggroRange??3,attacksPacifists:attacksPacifists??rules.attacksPacifists??false,tile,home:tile,x:tile.x,z:tile.z,group,scale,rules,patrol:patrol||{minX:tile.x-2,maxX:tile.x+2,minZ:tile.z-2,maxZ:tile.z+2},enemy:true,ready:true,opened:false,duration:0,plate};
 Object.defineProperty(a,'hp',{get(){return hp.value;},set(next){hp.value=next;},enumerable:true});
 // The hover label carries the name and exact health (the plate is only a bar).
 Object.defineProperty(a,'label',{get(){return `Fight ${rules.name} · ${Math.ceil(hp.value)}/${rules.health} HP${a.attacksPacifists?' · ⚠ Hunts pacifists':''}`;},enumerable:true});
 const meshes=[];group.traverse(m=>{if(m.isMesh){m.userData.actor=a;m.userData.tile=tile;pickables.push(m);meshes.push(m);}});
 a.highlight=highlightResource(group,{height:1.7});
 a.dispose=()=>{plateView.dispose();group.removeFromParent();for(const m of meshes){const index=pickables.indexOf(m);if(index>=0)pickables.splice(index,1);}group.traverse(m=>{m.geometry?.dispose();});};
 return a;
}
