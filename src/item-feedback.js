import {ITEMS} from './items.js';

export function itemChangeMessage(changes){
  return Object.entries(changes).filter(([,delta])=>delta!==0).map(([item,delta])=>{
    const name=ITEMS[item]?.name||item;
    return `${delta>0?'+':'−'} ${name} ×${Math.abs(delta)}`;
  }).join(' · ');
}

// Independent of movement errors and other transient game messages.
export function createItemFeed(icon){
 const region=document.createElement('aside');region.id='item-feed';region.setAttribute('aria-label','Item changes');region.setAttribute('role','status');document.body.append(region);
 const entries=[];
 function clear(){for(const entry of entries)clearTimeout(entry.timer);entries.length=0;region.replaceChildren();}
 function show(changes){
  const values=Object.entries(changes).filter(([,n])=>n);if(!values.length)return;
  const crafted=values.some(([,n])=>n<0)&&values.some(([,n])=>n>0);
  const key=crafted?'craft':values.length===1?values[0][0]+Math.sign(values[0][1]):'';
  let entry=key&&key!=='craft'?entries.find(e=>e.key===key):null;
  if(entry){for(const [id,n]of values)entry.changes[id]=(entry.changes[id]||0)+n;clearTimeout(entry.timer);}
  else{entry={key,changes:{...changes},element:document.createElement('div')};entry.element.className='loot-receipt';entries.push(entry);region.append(entry.element);}
  const gains=Object.entries(entry.changes).filter(([,n])=>n>0),costs=Object.entries(entry.changes).filter(([,n])=>n<0);
  entry.element.innerHTML=[...gains,...(crafted?[]:costs)].map(([id,n])=>`<div class="loot-line ${n>0?'gain':'cost'}">${icon(id)}<strong>${crafted?'Crafted ':n>0?'+':'−'}${ITEMS[id]?.name||id} ×${Math.abs(n)}</strong></div>`).join('')+(crafted?`<small>Used ${costs.map(([id,n])=>`${ITEMS[id]?.name||id} ×${-n}`).join(' · ')}</small>`:'');
  entry.element.classList.remove('leaving');
  entry.timer=setTimeout(()=>{entry.element.classList.add('leaving');entry.timer=setTimeout(()=>{entry.element.remove();const i=entries.indexOf(entry);if(i>=0)entries.splice(i,1);},350);},3800);
  while(entries.length>4){const old=entries.shift();clearTimeout(old.timer);old.element.remove();}
 }
 return {show,clear};
}
