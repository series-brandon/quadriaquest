import {icon} from './icons.js';
import {ITEMS} from './items.js';
import {signal} from './reactive.js';
export function createInventoryMenu(host,getInventory,onSelect,onClose,equipment={}){
 const panel=document.createElement('section');panel.id='inventory-panel';panel.hidden=true;panel.setAttribute('aria-label','Inventory');
 panel.innerHTML='<div class="crafting-heading"><h2>Inventory</h2><button aria-label="Close inventory menu">×</button></div><input class="journal-search" type="search" placeholder="Search supplies…" aria-label="Search inventory"><div class="inventory-grid"></div><p class="inventory-empty">Your inventory is empty.</p><section class="inventory-detail" aria-live="polite"></section>';
 host.append(panel);const locked=signal(false);let selected=null,last='',guided=false,detailOpen=false,guideFrame;
 const guideOverlay=document.createElement('div');guideOverlay.id='inventory-guide';guideOverlay.className='gold-guide';guideOverlay.hidden=true;guideOverlay.setAttribute('aria-hidden','true');document.body.append(guideOverlay);
 function positionGuide(){
  if(!guided){guideOverlay.hidden=true;return;}
  const target=grid.querySelector('[data-item="sticks"]');
  const box=target?.getBoundingClientRect(),bounds=grid.getBoundingClientRect();
  const visible=box&&box.width>0&&box.height>0&&box.top>=bounds.top-1&&box.top<bounds.bottom-16;
  guideOverlay.hidden=!visible;
  if(visible)Object.assign(guideOverlay.style,{left:box.left+'px',top:box.top+'px',width:box.width+'px',height:Math.min(box.height,bounds.bottom-box.top)+'px'});
  guideFrame=requestAnimationFrame(positionGuide);
 }

 panel.querySelector('button').addEventListener('click',onClose);
 const grid=panel.querySelector('.inventory-grid'),detail=panel.querySelector('.inventory-detail'),search=panel.querySelector('.journal-search');
 search.oninput=()=>{detailOpen=false;refresh(true);};
 function refresh(force=false){
  const inventory=getInventory(),signature=JSON.stringify(inventory)+guided+selected+JSON.stringify(equipment.state?.())+JSON.stringify((equipment.actions?.(selected)||[]).map(a=>[a.label,!!a.disabled]));
  if(!force&&signature===last)return;last=signature;
  const visible=Object.entries(ITEMS).filter(([id,item])=>inventory[id]>0&&item.name.toLowerCase().includes((search.value||'').toLowerCase()));
  if(!visible.some(([id])=>id===selected)&&(!selected||search.value))selected=visible[0]?.[0]||null;
  const scrollTop=grid.scrollTop;
  grid.replaceChildren();
  for(const [id,item]of visible){
   const b=document.createElement('button');b.type='button';b.dataset.item=id;b.className='inventory-stack';b.setAttribute('aria-label',`${item.name}, quantity ${inventory[id]}`);b.setAttribute('aria-pressed',String(selected===id));
   b.innerHTML=`<span aria-hidden="true">${icon(id)}</span><strong>${item.name}</strong><b>×${inventory[id]}</b>`;
   if((id==='hats'&&equipment.state?.().equipped)||equipment.isEquipped?.(id)){
    const badge=document.createElement('small');badge.className='inventory-equipped';badge.textContent='Equipped';b.append(badge);
    b.setAttribute('aria-label',`${item.name}, equipped, quantity ${inventory[id]}`);
   }
   b.onclick=()=>{selected=id;detailOpen=true;refresh(true);onSelect(id);};grid.append(b);
  }
  grid.scrollTop=scrollTop;
  panel.querySelector('.inventory-empty').hidden=grid.children.length>0;
  detail.replaceChildren();panel.classList.toggle('viewing-item',detailOpen&&!!selected);detail.hidden=!selected;panel.querySelector('.inventory-empty').textContent=search.value?'No matching items.':'Your inventory is empty.';
  if(selected){const back=document.createElement('button');back.type='button';back.className='inventory-back';back.textContent='Back to items';back.onclick=()=>{detailOpen=false;refresh(true);};detail.append(back);const item=ITEMS[selected];const title=document.createElement('h3'),copy=document.createElement('p'),quantity=document.createElement('small');title.textContent=item.name;copy.textContent=item.description;quantity.textContent=`Quantity: ${inventory[selected]}`;detail.append(title,copy,quantity);
   for(const action of equipment.actions?.(selected)||[]){const button=document.createElement('button');button.type='button';button.className='inventory-equip';button.textContent=action.label;button.disabled=!!action.disabled;button.onclick=()=>{action.run();refresh(true);};detail.append(button);}
  }

 }
 // Visibility belongs to the panel host; `locked` blocks closing during guided steps.
 return {panel,refresh,locked,open(){refresh(true);},guide(value){guided=value;if(guideFrame!==undefined)cancelAnimationFrame(guideFrame);guideOverlay.hidden=true;if(value){search.value='';selected=null;detailOpen=false;}refresh(true);if(value){grid.scrollTop=0;guideFrame=requestAnimationFrame(positionGuide);}},lock(value){panel.querySelector('button').disabled=value;locked.value=!!value;}};
}
