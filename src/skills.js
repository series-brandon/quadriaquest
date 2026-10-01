import * as THREE from 'three';

export const GATHERING_XP_PER_ITEM = 20;
export const GATHERING_XP_PER_LEVEL = 120;

export function createGatheringSkill(){return {xp:0,level:1};}
export function awardSkillXp(skill,skillName){
  const previousLevel=skill.level;
  skill.xp+=GATHERING_XP_PER_ITEM;
  skill.level=1+Math.floor(skill.xp/GATHERING_XP_PER_LEVEL);
  return {skillName,xp:GATHERING_XP_PER_ITEM,totalXp:skill.xp,level:skill.level,leveledUp:skill.level>previousLevel};
}
export function awardGatheringXp(skill){return awardSkillXp(skill,'Gathering');}
export function gatheringDuration(skill){return 1.2/(1+.08*(skill.level-1));}

const floatingXp=[];
const projected=new THREE.Vector3();

export function showSkillReward(reward,position){
  let region=document.getElementById('skill-rewards');
  if(!region){region=document.createElement('div');region.id='skill-rewards';region.setAttribute('role','status');region.setAttribute('aria-live','polite');document.body.append(region);}
  const xp=document.createElement('div');xp.className='floating-xp';xp.textContent=`+${reward.xp} ${reward.skillName||'Gathering'} Exp.!`;xp.setAttribute('role','status');document.body.append(xp);
  floatingXp.push({element:xp,origin:position.clone().add(new THREE.Vector3(0,1.05,0)),age:0});
  if(reward.leveledUp){
    const level=document.createElement('div');level.className='skill-reward level-up';
    const title=document.createElement('strong');title.textContent=`✦ ${reward.skillName||'Gathering'} level has increased!`;
    const detail=document.createElement('span');detail.textContent=reward.skillName==='Gathering'||!reward.skillName?`Level ${reward.level} · Gathering is now faster`:`Level ${reward.level}`;
    level.append(title,detail);region.append(level);setTimeout(()=>level.remove(),5000);
  }
}

export function updateSkillRewards(dt,camera,width,height){
  for(let i=floatingXp.length-1;i>=0;i--){
    const reward=floatingXp[i];reward.age+=dt;
    const progress=Math.min(1,reward.age/2.2);
    projected.copy(reward.origin).project(camera);
    reward.element.style.left=((projected.x+1)*width/2)+'px';
    reward.element.style.top=((1-projected.y)*height/2-18-progress*32)+'px';
    reward.element.style.opacity=String(Math.min(1,reward.age/.1)*(1-progress*progress));
    reward.element.style.visibility=projected.z<-1||projected.z>1?'hidden':'visible';
    if(progress===1){reward.element.remove();floatingXp.splice(i,1);}
  }
}
