export {RECIPES,canMake,finishRecipe,durationFor} from './recipes.js';
export const NEW_SKILLS=['Combat','Culinary'];
export const ENEMIES={scrapper:{name:'Goblin Scrapper',health:8,interval:2.5,min:1,max:1,protected:true},bruiser:{name:'Goblin Bruiser',health:24,interval:2,min:3,max:5}};
export function damageRoll(min,max,random=Math.random){return min+Math.floor(Math.min(.999999,random())*(max-min+1));}
export function incomingHealth(health,damage,shield,protectedFight=false){return Math.max(protectedFight?1:0,health-Math.max(1,damage-(shield?1:0)));}
export {validCampTile} from './placement-rules.js';
export const WILLOWBANK={crystal:[3,3],reed:[5,4],scrapper:[11,7],bruiser:[15,9],bridgeStart:17,bridgeEnd:19,bridgeZ:9,pet:[21,9]};
export function makeWillowbankTiles(){
 const tiles=[];
 for(let z=1;z<=18;z++)for(let x=1;x<=24;x++){
  if((x<=2||x>=23)&&(z<=2||z>=17))continue;
  const island=x>=20&&x<=23&&z>=7&&z<=11;
  const water=x>=17&&!island||x>=14&&z>=14;
  const h=!water&&x>=8&&x<=13&&z<=12?(x>=9&&x<=12&&z<=5?2:1.5):1;
  tiles.push({x,z,h,water,blocked:water,buildable:!water});
 }
 return tiles;
}
