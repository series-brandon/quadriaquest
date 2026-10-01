import {ITEMS} from './items.js';
export function createInventoryMenu(host,getInventory,onSelect,onClose){
 const panel=document.createElement('section');panel.id='inventory-panel';panel.hidden=true;panel.setAttribute('aria-label','Inventory');
 panel.innerHTML='<div class="crafting-heading"><h2>Inventory</h2><button aria-label="Close inventory menu">×</button></div><div class="inventory-grid"></div><p class="inventory-empty">Your inventory is empty.</p><section class="inventory-detail" aria-live="polite"></section>';
 host.append(panel);let selected=null,last='',guided=false;
 panel.querySelector('button').onclick=onClose;
 const grid=panel.querySelector('.inventory-grid'),detail=panel.querySelector('.inventory-detail');
 function refresh(force=false){
  const inventory=getInventory(),signature=JSON.stringify(inventory)+guided+selected;
  if(!force&&signature===last)return;last=signature;
  if(!inventory[selected])selected=null;
  grid.replaceChildren();
  for(const [id,item]of Object.entries(ITEMS))if(inventory[id]>0){
   const b=document.createElement('button');b.type='button';b.dataset.item=id;b.className='inventory-stack';b.setAttribute('aria-label',`${item.name}, quantity ${inventory[id]}`);b.setAttribute('aria-pressed',String(selected===id));
   b.innerHTML=`<span aria-hidden="true">${item.icon}</span><strong>${item.name}</strong><b>×${inventory[id]}</b>`;
   if(guided&&id==='sticks')b.classList.add('gold-guide');
   b.onclick=()=>{selected=id;refresh(true);onSelect(id);};grid.append(b);
  }
  panel.querySelector('.inventory-empty').hidden=grid.children.length>0;
  detail.replaceChildren();
  if(selected){const item=ITEMS[selected];const title=document.createElement('h3'),copy=document.createElement('p'),quantity=document.createElement('small');title.textContent=item.name;copy.textContent=item.description;quantity.textContent=`Quantity: ${inventory[selected]}`;detail.append(title,copy,quantity);}
  else detail.textContent='Select an item to take a closer look.';
 }
 return {panel,refresh,open(){selected=null;last='';panel.hidden=false;refresh();},close(){panel.hidden=true;},guide(value){guided=value;refresh(true);},lock(value){panel.querySelector('button').disabled=value;}};
}
