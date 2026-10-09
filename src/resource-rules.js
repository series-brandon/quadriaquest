// Shared base roll; callers apply skill speed without changing the loot roll.
export function rollToolWork(random=Math.random){return {duration:3+random()*3,quantity:1+Math.floor(Math.min(.999999,random())*3)};}
