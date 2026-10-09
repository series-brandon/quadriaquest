// Combat interrupts skilling and utility work, but preserves combat and food.
// Movement, travel, defeat, and resets use the default full cancellation.
export function cancelPlayerActions(actions,{keepCombat=false,keepFood=false}={}){
 for(const [name,action] of Object.entries(actions)){
  if(name==='combat'&&keepCombat||name==='food'&&keepFood)continue;
  action?.cancel();
 }
}
