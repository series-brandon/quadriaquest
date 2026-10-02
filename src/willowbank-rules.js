export const RECIPES={
 swords:{name:'Stone Sword',cost:{stone:2,sticks:1},duration:3},
 shields:{name:'Wooden Shield',cost:{logs:2,sticks:1},duration:3},
 hammers:{name:'Crude Hammer',cost:{sticks:1,stones:1},duration:2},
 rods:{name:'Crude Fishing Rod',cost:{sticks:2},duration:2},
 firestarters:{name:'Flint and Stone',cost:{flint:1,stone:1},duration:2},
 campfires:{name:'Campfire',cost:{logs:2},tools:{firestarters:1},duration:3},
 cookedFish:{name:'Cooked Pondfish',cost:{rawFish:1},duration:3,station:'fire'}
};
export const NEW_SKILLS=['Combat','Carpentry','Fishing','Culinary'];
export const ENEMIES={scrapper:{name:'Goblin Scrapper',health:8,interval:2.5,min:1,max:1,protected:true},bruiser:{name:'Goblin Bruiser',health:24,interval:2,min:3,max:5}};
export function canMake(inventory,recipe){return Object.entries({...recipe.cost,...recipe.tools}).every(([id,n])=>(inventory[id]||0)>=n);}
export function finishRecipe(inventory,output){const r=RECIPES[output];if(!r||!canMake(inventory,r))return null;const changes={[output]:1};for(const [id,n] of Object.entries(r.cost)){inventory[id]-=n;changes[id]=-n;}inventory[output]=(inventory[output]||0)+1;return changes;}
export function durationFor(seconds,level){return seconds/(1+.04*Math.max(0,level-1));}
export function damageRoll(min,max,random=Math.random){return min+Math.floor(Math.min(.999999,random())*(max-min+1));}
export function incomingHealth(health,damage,shield,protectedFight=false){return Math.max(protectedFight?1:0,health-Math.max(1,damage-(shield?1:0)));}
export function validCampTile(tile,{occupied=false,reachable=true}={}){return !!tile&&!tile.blocked&&!tile.water&&tile.buildable&&!occupied&&reachable;}
export const WILLOWBANK={crystal:[3,3],reed:[5,4],scrapper:[11,7],bruiser:[15,9],bridgeStart:17,bridgeEnd:19,bridgeZ:9,pet:[21,9]};
export function makeWillowbankTiles(){
 const tiles=[];
 for(let z=1;z<=18;z++)for(let x=1;x<=24;x++){
  if((x<=2||x>=23)&&(z<=2||z>=17))continue;
  const island=x>=20&&x<=23&&z>=7&&z<=11;
  const water=x>=17&&!island||x>=14&&z>=14;
  const h=!water&&x>=8&&x<=13&&z<=12?(x>=9&&x<=12&&z<=5?2:1.5):1;
  tiles.push({x,z,h,water,blocked:water,buildable:!water&&x>=4&&x<=7&&z>=7&&z<=12||!water&&x>=12&&x<=15&&z>=11&&z<=13});
 }
 return tiles;
}
