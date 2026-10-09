import * as THREE from 'three';
import {levelProgress,totalXpForLevel} from './combat-formulas.js';
import {reactiveRecord,signal} from './reactive.js';

export const GATHERING_XP_PER_ITEM = 20;
export const GATHERING_XP_PER_LEVEL = 120;

// Reactive so menus follow XP from any source (awards, resets, dev grants) without polling.
export function createGatheringSkill(){return reactiveRecord({xp:0,level:1});}
// Every non-combat skill award passes through here so it also feeds the character's single core-XP
// conversion (5:1, shared remainder) alongside combat tracks. The app registers the listener once.
let skillXpListener=null;
export function onSkillXp(listener){skillXpListener=listener;}
export function addSkillXp(skill,amount,skillName){
  const previousLevel=skill.level;
  skill.xp+=amount;skill.level=1+Math.floor(skill.xp/GATHERING_XP_PER_LEVEL);
  const reward={skillName,xp:amount,totalXp:skill.xp,level:skill.level,leveledUp:skill.level>previousLevel};
  reward.core=skillXpListener?.(amount,reward)||null;
  return reward;
}
export function awardSkillXp(skill,skillName){return addSkillXp(skill,GATHERING_XP_PER_ITEM,skillName);}
export function awardGatheringXp(skill){return awardSkillXp(skill,'Gathering');}
export function gatheringDuration(skill){return 1.2/(1+.08*(skill.level-1));}

// Skills on the adopted curve (combat tracks) and the prototype 120-XP-per-level skills share one view.
export function skillProgress(skill){
  if(skill.curve==='adopted'){const p=levelProgress(skill.xp);return {level:p.level,xp:skill.xp,into:p.xp-p.floor,span:p.next==null?1:p.next-p.floor,remaining:p.remaining};}
  const into=skill.xp%GATHERING_XP_PER_LEVEL;return {level:skill.level,xp:skill.xp,into,span:GATHERING_XP_PER_LEVEL,remaining:GATHERING_XP_PER_LEVEL-into};
}
// Development grants route character tracks through their real award path (including core XP).
export function grantSkillXp(skill,amount){
  if(skill.curve==='adopted'&&skill.grant){const r=skill.grant(amount).tracks[0];return r||{skillName:skill.name,xp:0,level:skill.level,leveledUp:false};}
  return addSkillXp(skill,amount,skill.name);
}
export function addSkillLevels(skill,levels){
  const target=skill.level+levels;
  return grantSkillXp(skill,(skill.curve==='adopted'?Math.ceil(totalXpForLevel(target)):(target-1)*GATHERING_XP_PER_LEVEL)-skill.xp);
}

const floatingXp=[];
const projected=new THREE.Vector3();

// Level-up receipts (ui/hud/notices.js `levelUps`) follow this: {seq, title, detail} per level
// gained, or {seq, clear:true} to dismiss them all.
export const levelNotice=signal(null);
let levelSeq=0;
const XP_MERGE_WINDOW=.8;
export function showSkillReward(reward,position,{float=true}={}){
  if(float){
    // Awards close together (a dual-wield one-two) share one notice: the same skill adds to a recent
    // one with a small pop; another skill stacks above it instead of overlapping.
    const skill=reward.skillName||'Gathering',recent=floatingXp.find(r=>r.skill===skill&&r.age<XP_MERGE_WINDOW);
    if(recent){recent.xp+=reward.xp;recent.element.textContent=`+${Math.round(recent.xp)} ${skill} Exp.!`;recent.pop=0;}
    else{
      const xp=document.createElement('div');xp.className='floating-xp';xp.textContent=`+${Math.round(reward.xp)} ${skill} Exp.!`;xp.setAttribute('role','status');document.body.append(xp);
      const lane=floatingXp.filter(r=>r.age<XP_MERGE_WINDOW).length;
      floatingXp.push({element:xp,skill,xp:reward.xp,lane,pop:null,origin:position.clone().add(new THREE.Vector3(0,1.35,0)),age:0});
    }
  }
  if(reward.leveledUp){
    window.dispatchEvent(new Event('quadriaquest-level'));
    const skill=reward.skillName||'Gathering';
    levelNotice.value={seq:++levelSeq,title:`✦ ${skill} level has increased!`,detail:skill==='Gathering'?`Level ${reward.level} · Gathering is now faster`:reward.detail?`Level ${reward.level} · ${reward.detail}`:`Level ${reward.level}`};
  }
}

export function updateSkillRewards(dt,camera,width,height){
  for(let i=floatingXp.length-1;i>=0;i--){
    const reward=floatingXp[i];reward.age+=dt;
    const progress=Math.min(1,reward.age/2.2);
    projected.copy(reward.origin).project(camera);
    // One composited write per frame: transform avoids layout, cssText yields a single mutation.
    const x=(projected.x+1)*width/2,y=(1-projected.y)*height/2-18-progress*32-reward.lane*24;
    let scale=1;if(reward.pop!==null){reward.pop+=dt;scale=1+.18*Math.max(0,1-reward.pop/.18);if(reward.pop>=.18)reward.pop=null;}
    reward.element.style.cssText=`transform:translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-100%) scale(${scale.toFixed(3)});opacity:${(Math.min(1,reward.age/.1)*(1-progress*progress)).toFixed(3)};visibility:${projected.z<-1||projected.z>1?'hidden':'visible'}`;
    if(progress===1){reward.element.remove();floatingXp.splice(i,1);}
  }
}

export function clearSkillRewards(){
  for(const reward of floatingXp)reward.element.remove();
  floatingXp.length=0;
  levelNotice.value={seq:++levelSeq,clear:true};
}
