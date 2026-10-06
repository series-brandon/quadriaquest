export const CINDERHOLD={crystal:[7,27],sarge:[12,25],smith:[12,14],ranger:[31,26],mage:[30,6],furnace:[14,12],anvil:[16,14],shelf:[11,16],scrapper:[18,25],bruiser:[30,15],rangedTarget:[35,25],rangedEnemy:[35,21],magicTarget:[34,6],magicEnemy:[34,10]};
export function makeCinderholdTiles(){
 const tiles=[];
 for(let z=1;z<=32;z++)for(let x=1;x<=40;x++){
  const wall=x===1||x===40||z===1||z===32||x===22&&![7,8,9,16,17,18,25,26,27].includes(z)||z===19&&x<22&&![7,8,9,15,16,17].includes(x);
  const terrace=(x<=8&&z<=15||z<=4&&x>=24)?1.5:1;
  tiles.push({x,z,h:wall?terrace+3:terrace,blocked:wall,blocksSight:wall,water:false,buildable:!wall,safe:!wall&&(x<15&&z>20||x<20&&z<18)});
 }return tiles;
}
export const TRAINING_STEPS=['meet','unarmed','report','smith','mine','smelt','dagger','shield','equip','return','bruiser','graduate','finished'];
// Story state only: facts come from shared gameplay completion events, never inventory mutation.
export function createTrainingProgress(){
 const state={phase:'meet',refused:false,entered:false,ore:0,ingots:0,dagger:0,shield:0,unarmed:false,bruiser:false,ranged:'offer',magic:'offer'};
 return {state,reset(){Object.assign(state,{phase:'meet',refused:false,entered:false,ore:0,ingots:0,dagger:0,shield:0,unarmed:false,bruiser:false,ranged:'offer',magic:'offer'});},
  event(type,data){if(!state.entered)return;
   if(type==='resource'&&data.copperOre)state.ore+=data.copperOre;
   if(type==='crafted'){if(data==='copperIngots')state.ingots++;if(data==='copperDagger')state.dagger++;if(data==='copperShield')state.shield++;}
   if(type==='victory'){const {id,style}=data;if(id==='recruit'&&style==='unarmed')state.unarmed=true;if(id==='proving')state.bruiser=true;
    for(const [lesson,styleName] of [['ranged','ranged'],['magic','magic']])if(style===styleName){if(id===lesson+'-target'&&state[lesson]==='target')state[lesson]='fight';if(id===lesson+'-enemy'&&state[lesson]==='fight')state[lesson]='done';}
   }
  },
  advance(equipped){const before=state.phase;if(state.phase==='unarmed'&&state.unarmed)state.phase='report';if(state.phase==='mine'&&state.ore>=4)state.phase='smelt';if(state.phase==='smelt'&&state.ingots>=4)state.phase='dagger';if(state.phase==='dagger'&&state.dagger)state.phase='shield';if(state.phase==='shield'&&state.shield)state.phase='equip';if(state.phase==='equip'&&equipped)state.phase='return';if(state.phase==='bruiser'&&state.bruiser)state.phase='graduate';return before!==state.phase;}
 };
}
