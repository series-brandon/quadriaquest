// Drop tables, one format for enemies (docs/ECONOMY.md, Enemy drops: rolled once on the shared victory event)
// and resources (a tree's wood, a rock's stone; resource-actions.js): {always:[{item,count}], rolls:[{item,chance,count}]};
// a count is a number or a [min,max] range. Gold Pieces are an item like any other (`gold`). Inert targets,
// story fights and creatures with no table drop nothing. `boost(n)` scales each sure (`always`) count: a
// resource's level yield bonus (skill-pacing.js).
const amount=(count=1,random)=>Array.isArray(count)?count[0]+Math.floor(random()*(count[1]-count[0]+1)):count;
export function rollDrops(table,random=Math.random,{boost=null}={}){
 if(!table)return {};
 const out={},add=(id,n)=>{if(n>0)out[id]=(out[id]||0)+n;};
 for(const e of table.always||[]){const n=amount(e.count,random);add(e.item,boost?boost(n):n);}
 for(const e of table.rolls||[])if(random()<e.chance)add(e.item,amount(e.count,random));
 return out;
}
// The odds, for the playground: each possible item with its chance and count range.
export function dropOdds(table){
 if(!table)return [];
 const range=c=>Array.isArray(c)?c:[c??1,c??1];
 return [...(table.always||[]).map(e=>({item:e.item,chance:1,count:range(e.count)})),...(table.rolls||[]).map(e=>({item:e.item,chance:e.chance,count:range(e.count)}))];
}
// A repeatable random source (mulberry32) for fixed-seed playground rolls and tests.
export function seededRandom(seed){let a=seed>>>0;return ()=>{a=a+0x6D2B79F5>>>0;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
