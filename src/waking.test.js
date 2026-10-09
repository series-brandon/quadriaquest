import test from 'node:test';
import assert from 'node:assert/strict';
import {createEquipment} from './equipment.js';
import {createCombatStyles} from './combat-styles.js';
import {createCharacter} from './character.js';
import {createAuras} from './auras.js';
import {createPlayerResources,createResource} from './player-resources.js';
import {createWaking,STARTER_KIT,WAKING_LINES,SKIP_LINES} from './waking.js';

// Real shared systems; only presentation (narrator, fade, travel) is faked.
function fixture({ownsCompanion=false}={}){
 const items={sticks:{},stones:{},logs:{},copperDagger:{},copperShield:{},bows:{},arrows:{},hats:{},axes:{},pickaxes:{},hammers:{},rods:{},firestarters:{},cookedFish:{},copperOre:{}};
 const inventory={logs:7,copperOre:4,sticks:12,axes:1},equipment=createEquipment({inventory}),styles=createCombatStyles({equipment});
 const character=createCharacter(),resources=createPlayerResources(),auras=createAuras({ki:resources.ki}),health=createResource(100);health.value=40;
 const gathering={xp:500,level:4};
 const companion={owned:ownsCompanion},log=[],lines=[];let fade=0,narrated=null;
 const companions={get state(){return {...companion};},acquire({at}){companion.owned=true;log.push(['acquire',at]);},resetRoute(at){log.push(['route',at]);},name(options){log.push(['name',options]);}};
 const narrator={show({text,next}){lines.push(text);narrated=next;},hide(){narrated=null;}};
 const waking=createWaking({narrator,inventory,items,skills:()=>({Gathering:gathering}),character,styles,auras,equipment,health,resources,companions,
  resetObjectives:()=>log.push(['objectives']),endTutorial:()=>log.push(['end']),arrive:id=>{log.push(['arrive',id]);return 'landing';},
  fade:v=>{fade=v;},toast:m=>log.push(['toast',m])});
 const talk=()=>{while(narrated)narrated();};
 const run=()=>{for(let i=0;i<40;i++)waking.update(.1);};
 return {waking,inventory,equipment,styles,auras,character,health,gathering,log,lines,talk,run,get fade(){return fade;}};
}

test('waking resets the dream to the starter kit, keeping the dominant hand',()=>{
 const f=fixture();f.equipment.setHandedness('left');f.character.setLevel('prof.unarmed',20);
 assert.equal(f.waking.start(),true);assert.equal(f.waking.start(),false,'one ceremony at a time');
 f.talk();assert.deepEqual(f.lines,WAKING_LINES);assert.equal(f.waking.isWoken,false,'the farewell comes first');
 f.run();
 assert.equal(f.waking.isWoken,true);assert.equal(f.fade,0,'faded back in');
 for(const [id,count] of Object.entries(STARTER_KIT.items))assert.equal(f.inventory[id],count,id);
 assert.equal(f.inventory.logs,0,'dream items are gone');assert.equal(f.inventory.copperOre,0);
 assert.deepEqual([f.equipment.slots.main,f.equipment.slots.off],['copperDagger','copperShield']);
 assert.equal(f.equipment.handedness,'left','the dominant hand carries over');assert.equal(f.equipment.slots.left,'copperDagger');
 assert.ok(f.styles.knowsSpell('energyStrike'));assert.ok(f.styles.knowsAbility('strongStrike'));
 assert.deepEqual(f.auras.state.learned.sort(),[...STARTER_KIT.auras].sort(),'every tutorial aura learned');
 assert.deepEqual([f.gathering.xp,f.gathering.level],[0,1],'skills reset');assert.equal(f.character.level('prof.unarmed'),1);
 assert.equal(f.health.value,f.health.max,'fully restored');
 assert.deepEqual(f.log.filter(e=>['end','objectives','arrive','acquire','name'].includes(e[0])).map(e=>e[0]),['end','objectives','arrive','acquire','name'],'never-met companion is acquired and named');
});

test('skipping uses the short farewell; a companion you already have just follows',()=>{
 const f=fixture({ownsCompanion:true});
 f.waking.start({skip:true});f.talk();assert.deepEqual(f.lines,SKIP_LINES);f.run();
 assert.equal(f.waking.skipped,true);
 assert.ok(f.log.some(e=>e[0]==='route'));assert.ok(!f.log.some(e=>e[0]==='acquire'||e[0]==='name'));
 f.waking.reset();assert.equal(f.waking.isWoken,false);
});
