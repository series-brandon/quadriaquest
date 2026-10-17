import {trainingTarget} from './training-models.js';
import {goblin,animateGoblin} from './enemy-model.js';
import {makeCinderGolem,animateGolem} from './golem-model.js';
import {ENEMIES} from './combat-rules.js';
import {highlightResource} from './resource-highlight.js';
import './combat.css';
import {signal} from './reactive.js';
import {markCharacter} from './world-occupancy.js';
import {mount} from './ui/dom.js';
import {healthPlate} from './ui/hud/health-plate.js';

// Model, rig animation, scale, highlight height, body size (tiles per side), health-plate height and the
// height shots aim at, per enemy kind. Practice targets animate in combat.js. `character`: a living
// creature, walk-through like every character; a practice target is a solid object.
const MODELS={
 target:{create:trainingTarget,height:1.7},
 scrapper:{create:()=>goblin(),animate:animateGoblin,height:1.7,character:true},
 bruiser:{create:()=>goblin(true),animate:animateGoblin,scale:1.18,height:1.7,character:true},
 // A 2×2 body: its placement tile is the anchor corner (footprint.js).
 golem:{create:makeCinderGolem,animate:animateGolem,height:3.3,size:2,plateLift:3.1,aimHeight:1.4,scale:1.25,character:true},
};
// Tiles per side an enemy kind's body covers (its placement tile is the north-west corner).
export const enemySize=kind=>MODELS[kind]?.size||1;
// xp: optional placement-specific XP modifiers {multiplier, levelCap, afterCapMultiplier} (e.g. a tutorial boost).
// territory: optional {minX,maxX,minZ,maxZ}; the enemy never walks out of it and stops pursuing a player
// who leaves it (a boss arena). Without it, pursuit uses the leash distance from home.
// aggressiveUntil, attacksPacifists: this spawn's own setting, overriding its type's (combat-rules.js): it attacks
// players below that Threat on sight; attacksPacifists is the rare opt-in (the most aggressive creatures, some
// bosses) to engage players whose attacks are prevented. Unset follows the type, including later edits to it.
// drops: this spawn's own drop table, overriding its type's (drops.js format).
export function createEnemyEntity({kind,tile,parent,pickables,patrol,respawn=null,id,aggressiveUntil,aggroRange,attacksPacifists,territory=null,xp=null,drops=null}){
 const rules=xp?{...ENEMIES[kind],xpMultiplier:xp.multiplier??1,xpLevelCap:xp.levelCap??null,xpAfterCapMultiplier:xp.afterCapMultiplier??0}:ENEMIES[kind],model=MODELS[kind],group=model.create(),scale=model.scale??1;
 if(model.character)markCharacter(group);
 group.scale.setScalar(scale);group.position.set(tile.x-6,tile.h,tile.z-6);parent.add(group);
 // Signal-backed HP: combat keeps assigning a.hp; the health plate (target frame) follows it.
 const hp=signal(rules.health);let plate;
 const plateView=mount(()=>{plate=healthPlate({value:hp,max:rules.health});return plate.node;});document.body.append(plateView.node);
 const a={kind,id,respawn,drops,aggressiveUntil,aggroRange,attacksPacifists,tile,home:tile,x:tile.x,z:tile.z,group,scale,rules,animate:model.animate,territory,size:model.size??1,plateLift:model.plateLift,aimHeight:model.aimHeight,patrol:patrol||{minX:tile.x-2,maxX:tile.x+2,minZ:tile.z-2,maxZ:tile.z+2},enemy:true,ready:true,opened:false,duration:0,plate};
 Object.defineProperty(a,'hp',{get(){return hp.value;},set(next){hp.value=next;},enumerable:true});
 // The hover label carries the name and exact health (the plate is only a bar).
 Object.defineProperty(a,'label',{get(){return `Fight ${rules.name} · ${Math.ceil(hp.value)}/${rules.health} HP${rules.boss?' · Boss':''}${a.attacksPacifists??rules.attacksPacifists?' · ⚠ Hunts pacifists':''}`;},enumerable:true});
 const meshes=[];group.traverse(m=>{if(m.isMesh){m.userData.actor=a;m.userData.tile=tile;pickables.push(m);meshes.push(m);}});
 a.highlight=highlightResource(group,{height:model.height});
 a.dispose=()=>{plateView.dispose();group.removeFromParent();for(const m of meshes){const index=pickables.indexOf(m);if(index>=0)pickables.splice(index,1);}group.traverse(m=>{if(!m.geometry?.userData.shared)m.geometry?.dispose();});};
 return a;
}
