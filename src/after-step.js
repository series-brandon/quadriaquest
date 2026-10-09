// One pending stationary action. Movement owns the current step; actions start
// only after it lands, and revalidate through their normal start function.
export function createAfterStep({moving,prepare}){
 let pending=null;
 return {
  defer(run,label){if(!moving())return false;prepare(label);pending={run,label};return true;},
  flush(){if(!pending||moving())return false;const {run}=pending;pending=null;run();return true;},
  cancel(){pending=null;},
  get pending(){return pending?.label??null;}
 };
}
