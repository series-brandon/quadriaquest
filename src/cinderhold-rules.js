export const CINDERHOLD={crystal:[7,27],sarge:[12,25],smith:[12,14],ranger:[31,26],mage:[30,6],furnace:[14,12],anvil:[16,14],shelf:[11,16],scrapper:[18,25],bruiser:[30,15],rangedTarget:[35,25],rangedEnemy:[35,21],magicTarget:[34,6],magicEnemy:[34,10],ki:[3,4],crevice:[33,32],golem:[35,43]};
// The smashed south wall near Fletch: a winding crevice down to the Cinder Golem's arena. The golem's
// territory is the arena floor; the crevice is outside it, so stepping back in ends its pursuit.
export const CREVICE_TILES=[[33,32],[33,33],[33,34],[34,34],[34,35],[34,36],[35,36],[35,37]];
export const GOLEM_TERRITORY={minX:27,maxX:43,minZ:38,maxZ:48};
const inArena=(x,z)=>((x-35)/7.5)**2+((z-42.5)/5.2)**2<=1;
export function makeCinderholdTiles(){
 const tiles=[];
 for(let z=1;z<=32;z++)for(let x=1;x<=40;x++){
  const wall=x===1||x===40||z===1||z===32||x===22&&![7,8,9,16,17,18,25,26,27].includes(z)||z===19&&x<22&&![7,8,9,15,16,17].includes(x);
  const terrace=(x<=8&&z<=15||z<=4&&x>=24)?1.5:1;
  const crevice=CREVICE_TILES.some(([cx,cz])=>cx===x&&cz===z),solid=wall&&!crevice;
  tiles.push({x,z,h:solid?terrace+3:terrace,blocked:solid,blocksSight:solid,water:false,buildable:!solid,safe:!solid&&(x<15&&z>20||x<20&&z<18)});
 }
 // Below the south wall: the crevice and arena, ringed by one tile of tall rock (8-neighbour, so no
 // corner gaps); beyond that ring there is no ground, just the cave's darkness.
 const open=(x,z)=>z>32&&(CREVICE_TILES.some(([cx,cz])=>cx===x&&cz===z)||inArena(x,z));
 for(let z=33;z<=50;z++)for(let x=25;x<=45;x++){
  const ring=!open(x,z)&&[-1,0,1].some(dx=>[-1,0,1].some(dz=>open(x+dx,z+dz)));
  if(open(x,z)||ring)tiles.push({x,z,h:ring?4:1,blocked:ring,blocksSight:ring,water:false,buildable:!ring,safe:false});
 }
 return tiles;
}
export const TRAINING_STEPS=['meet','unarmed','report','smith','mine','smelt','dagger','shield','equip','return','bruiser','graduate','finished'];
// Story state only: facts come from shared gameplay completion events, never inventory mutation.
export function createTrainingProgress(){
 // crevice: 'closed' (Fletch stops you) → 'warned' (ask Bristle or Borin) → 'cleared'.
 // golem: 'unmet' → 'met' (it came for you) → 'done' (you were flattened or got away).
 const initial=()=>({phase:'meet',refused:false,spurned:false,entered:false,ore:0,ingots:0,dagger:0,shield:0,unarmed:false,bruiser:false,ranged:'offer',magic:'offer',ki:'offer',crevice:'closed',golem:'unmet'});
 const state=initial();
 return {state,reset(){Object.assign(state,initial());},
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
