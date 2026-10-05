export const ENEMIES={target:{name:'Practice Target',health:4,interval:99,min:0,max:0,protected:true,inert:true},scrapper:{aggressive:false,aggroRange:3,name:'Goblin Scrapper',health:8,interval:2.5,min:1,max:1,protected:true},bruiser:{aggressive:true,aggroRange:4,name:'Goblin Bruiser',health:24,interval:2,min:3,max:5}};
export function damageRoll(min,max,random=Math.random){return min+Math.floor(Math.min(.999999,random())*(max-min+1));}
export function incomingHealth(health,damage,shield,protectedFight=false){return Math.max(protectedFight?1:0,health-Math.max(1,damage-(Number(shield)||0)));}
