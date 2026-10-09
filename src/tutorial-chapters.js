// The tutorial's chapters, for "Skip this part" on the tip. Each skip finishes its chapter and starts
// the next one with what it needs; skipping Cinderhold goes straight to waking (waking.js).
export const TUTORIAL_CHAPTERS={
 start:'Getting started',
 journal:'Gathering and your journal',
 tools:'Tools',
 finale:'Clearing finale',
 willowbank:'Willowbank',
 cinderhold:'Cinderhold',
};
const TOOL_STAGES=new Set(['intro','craft-menu','recipe','crafting','retry','craft-success','chop-dialogue','chop','chop-success','mining-intro','pickaxe','mining-craft','mining-crafted','mine','mining-success']);

// The current chapter from a snapshot of the tutorial's state, or null outside the tutorial (character
// creation, free play, a finished area, waking).
//   {area, woken, waking, inClearing, lesson, openingFinished, craftingStage, finaleStage, portalUsed,
//    willowPhase, cinderComplete}
export function tutorialChapter(s){
 if(s.woken||s.waking)return null;
 if(s.area==='clearing'){
  if(!s.inClearing)return null;
  const stage=s.craftingStage||'';
  if(stage.startsWith('quests-')||!s.openingFinished&&s.lesson<3)return 'start';
  if(!s.openingFinished||/^(skills|inventory)-/.test(stage))return 'journal';
  if(TOOL_STAGES.has(stage))return 'tools';
  if(!s.portalUsed&&s.finaleStage&&s.finaleStage!=='inactive')return 'finale';
  return null;
 }
 if(s.area==='willowbank')return s.willowPhase&&s.willowPhase!=='finished'?'willowbank':null;
 if(s.area==='cinderhold')return s.cinderComplete?null:'cinderhold';
 return null;
}
