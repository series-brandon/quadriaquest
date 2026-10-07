import {COMBAT_SKILLS,STYLES,cappedAward,convertCoreXp,levelForXp,totalXpForLevel,resourceMaxima,MAX_LEVEL} from './combat-formulas.js';

// Shared player character: attributes, combat skills, proficiencies and core progression.
// Every track uses the adopted XP curve; derived combat values are computed from levels at runtime.
export const CAPACITY_ATTRIBUTES=['constitution','mentis','endurance','tenacity','aura'];
export const ATTRIBUTES=[...CAPACITY_ATTRIBUTES,'strength','precision','intelligence','toughness','dexterity','celerity','charisma','luck','regeneration','fortitude','recovery','recuperation','meditation'];
export const ATTRIBUTE_BASE=Object.fromEntries(ATTRIBUTES.map(a=>[a,CAPACITY_ATTRIBUTES.includes(a)?10:1]));
export const ATTRIBUTE_INFO={constitution:'Maximum Health',mentis:'Maximum Mana',endurance:'Maximum Stamina',tenacity:'Maximum Energy',aura:'Maximum Ki',strength:'Melee Power',precision:'Ranged Power',intelligence:'Magic Power',toughness:'Resistance',dexterity:'Dodge',celerity:'Attack and movement speed',charisma:'Social',luck:'Critical hits',regeneration:'Health recovery',fortitude:'Mana recovery',recovery:'Stamina recovery',recuperation:'Energy recovery',meditation:'Ki recovery'};
export const CREATION_POINTS=3;
export const POINTS_PER_CORE_LEVEL=3;
export const WEAPON_PROFICIENCIES=['unarmed','sword','dagger','axe','hammer','spear','bow','crossbow','staff','wand','shield'];
export const ARMOR_PROFICIENCIES=['helm','chest','hands','legs','feet','back','ward'];
export const ELEMENTS=['energy','wind','earth','water','fire','explosive','dust','mist','mud','lava','steam','smoke','blood','shadow','death','light','life','soul','time','gravity','space','mind'];
const title=s=>s[0].toUpperCase()+s.slice(1);
const STYLE_ICON={melee:'Combat',ranged:'bows',magic:'quickRestore'};
const PROFICIENCY_ICON={unarmed:'Combat',sword:'swords',dagger:'copperDagger',bow:'bows',shield:'shields',axe:'axes',hammer:'hammers'};

function trackDefinitions(){
 const defs=[];
 for(const style of STYLES)for(const skill of COMBAT_SKILLS)defs.push({id:`${style}.${skill}`,name:`${title(style)} ${title(skill)}`,group:'combat',icon:STYLE_ICON[style]});
 for(const armor of ['light','medium','heavy'])defs.push({id:`armor.${armor}`,name:`${title(armor)} Armor`,group:'armor',icon:'shields'});
 for(const p of WEAPON_PROFICIENCIES)defs.push({id:`prof.${p}`,name:`${title(p)} Proficiency`,group:'weapon',icon:PROFICIENCY_ICON[p]||'Combat'});
 for(const p of ARMOR_PROFICIENCIES)defs.push({id:`prof.${p}`,name:`${title(p)} Proficiency`,group:'armorSlot',icon:'shields'});
 for(const e of ELEMENTS)defs.push({id:`prof.${e}`,name:`${title(e)} Proficiency`,group:'element',icon:'quickRestore'});
 return defs;
}
export const TRACKS=trackDefinitions();

export function createCharacter({changed=()=>{}}={}){
 const allocated=Object.fromEntries(ATTRIBUTES.map(a=>[a,0]));
 const tracks=Object.fromEntries(TRACKS.map(d=>[d.id,{...d,xp:0,level:1,curve:'adopted',grant:amount=>award([{track:d.id,amount}])}]));
 const core={xp:0,level:1,remainder:0};
 let unspent=CREATION_POINTS;
 const attribute=a=>ATTRIBUTE_BASE[a]+allocated[a];
 const level=id=>tracks[id]?.level??0;
 function setXp(track,xp){const before=track.level;track.xp=xp;track.level=levelForXp(xp);return track.level>before;}
 function addCore(amount){const before=core.level;core.xp+=amount;core.level=levelForXp(core.xp);const gained=core.level-before;if(gained>0)unspent+=gained*POINTS_PER_CORE_LEVEL;return gained;}

 // awards: [{track, amount}] for one action. Entity modifiers and caps apply per track;
 // only actual awards feed one shared /5 core conversion.
 function award(awards,modifiers={}){
  const results=[],actual=[];
  for(const {track:id,amount} of awards){
   const track=tracks[id];if(!track||!(amount>0))continue;
   const xp=cappedAward(amount,track.xp,modifiers);actual.push(xp);
   const leveledUp=xp>0&&setXp(track,track.xp+xp);
   results.push({id,skillName:track.name,xp,totalXp:track.xp,level:track.level,leveledUp});
  }
  const conversion=convertCoreXp(core.remainder,actual);core.remainder=conversion.remainder;
  const coreLevels=addCore(conversion.core);
  if(results.length)changed();
  return {tracks:results,core:{xp:conversion.core,level:core.level,leveledUp:coreLevels>0,points:coreLevels*POINTS_PER_CORE_LEVEL}};
 }

 function sheet(){
  const attributes=Object.fromEntries(ATTRIBUTES.map(a=>[a,attribute(a)]));
  const skills=Object.fromEntries(STYLES.map(s=>[s,Object.fromEntries(COMBAT_SKILLS.map(k=>[k,level(`${s}.${k}`)]))]));
  const proficiencies=Object.fromEntries([...WEAPON_PROFICIENCIES,...ARMOR_PROFICIENCIES,...ELEMENTS].map(p=>[p,level(`prof.${p}`)]));
  return {attributes,skills,proficiencies,armor:{light:level('armor.light'),medium:level('armor.medium'),heavy:level('armor.heavy')}};
 }

 const api={tracks,core,award,sheet,level,attribute,
  get unspent(){return unspent;},
  get maxima(){return resourceMaxima(sheet().attributes);},
  canAllocate:a=>unspent>0&&a in allocated&&attribute(a)<MAX_LEVEL,
  allocate(a){if(!api.canAllocate(a))return false;allocated[a]++;unspent--;changed();return true;},
  // Respec: every invested point (creation, core-level and item) returns to the unspent pool; bases stay.
  get invested(){return ATTRIBUTES.reduce((s,a)=>s+allocated[a],0);},
  redistribute(){const refund=api.invested;for(const a of ATTRIBUTES)allocated[a]=0;unspent+=refund;changed();return refund;},
  // Development/test helpers use the same tracks; they do not bypass core conversion when awarding.
  addXp(id,amount){return award([{track:id,amount}]);},
  setLevel(id,target){const track=tracks[id];if(!track)return false;setXp(track,Math.ceil(totalXpForLevel(Math.max(1,Math.min(MAX_LEVEL,target)))));changed();return true;},
  grantPoints(n){unspent=Math.max(0,unspent+n);changed();},
  setAttribute(a,value){if(!(a in allocated))return false;const target=Math.max(ATTRIBUTE_BASE[a],Math.min(MAX_LEVEL,Math.floor(value)));unspent=Math.max(0,unspent+allocated[a]-(target-ATTRIBUTE_BASE[a]));allocated[a]=target-ATTRIBUTE_BASE[a];changed();return true;},
  reset(){for(const a of ATTRIBUTES)allocated[a]=0;for(const t of Object.values(tracks)){t.xp=0;t.level=1;}Object.assign(core,{xp:0,level:1,remainder:0});unspent=CREATION_POINTS;changed();},
  get state(){return {attributes:sheet().attributes,unspent,core:{...core},tracks:Object.fromEntries(Object.values(tracks).filter(t=>t.xp>0).map(t=>[t.id,{xp:t.xp,level:t.level}]))};},
 };
 return api;
}
