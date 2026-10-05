import {icon} from './icons.js';
import './cooking-menu.css';

// Station recipes are discovered from the same catalogue used to consume materials.
export function createCookingMenu({recipes,items,inventory,canMake,duration,onCook}){
 const dialog=document.createElement('dialog');dialog.id='cooking-menu';dialog.setAttribute('aria-label','Campfire cooking');
 dialog.innerHTML='<div class="cooking-header"><h2>Cooking</h2><button data-close aria-label="Close cooking">×</button></div><label class="cooking-search">Find a recipe<input type="search" placeholder="Search food…"></label><div class="cooking-browser"><nav aria-label="Cooking recipes"></nav><section class="cooking-detail" aria-label="Recipe details"></section></div><div class="cooking-footer"><button data-pack>Pack up campfire</button><span>Cook a meal, one at a time.</span></div>';
 document.body.append(dialog);
 const search=dialog.querySelector('input'),list=dialog.querySelector('nav'),detail=dialog.querySelector('.cooking-detail');let selected=null,station=null;
 const catalogue=()=>Object.entries(recipes).filter(([,recipe])=>recipe.station==='fire');
 const label=id=>items[id]?.name||id;
 function render(){
  const all=catalogue();dialog.querySelector('.cooking-search').hidden=all.length<6;const visible=all.filter(([id,r])=>`${r.name} ${Object.keys(r.cost).map(label).join(' ')}`.toLowerCase().includes(search.value.toLowerCase()));
  if(!visible.some(([id])=>id===selected))selected=visible[0]?.[0]||null;
  list.replaceChildren();detail.replaceChildren();
  for(const [id,r] of visible){const button=document.createElement('button');button.className='cooking-recipe';button.setAttribute('aria-pressed',String(id===selected));button.innerHTML=`<span class="cooking-item-icon">${icon(id)}</span>`;const text=document.createElement('span');text.className='cooking-recipe-copy';const name=document.createElement('strong'),status=document.createElement('small');name.textContent=r.name;status.textContent=canMake(inventory,r)?'Ready to cook':'Missing ingredients';text.append(name,status);button.append(text);button.onclick=()=>{selected=id;render();dialog.classList.add('viewing-recipe');};list.append(button);}
  if(!selected){const empty=document.createElement('p');empty.className='cooking-empty';empty.textContent=all.length?'No matching recipes.':'No cooking recipes yet.';list.append(empty);return;}
  const recipe=recipes[selected],back=document.createElement('button');back.className='cooking-back';back.textContent='Back to recipes';back.onclick=()=>dialog.classList.remove('viewing-recipe');
  const title=document.createElement('h3'),description=document.createElement('p'),time=document.createElement('p'),heading=document.createElement('h4'),ingredients=document.createElement('ul'),cook=document.createElement('button');
  title.textContent=recipe.name;description.textContent=items[selected]?.description||'';time.className='cooking-meta';time.textContent=`${Number(duration(recipe.duration).toFixed(1))} sec · Makes 1`;heading.textContent='Ingredients';heading.className='cooking-ingredients-heading';
  for(const [id,needed] of Object.entries(recipe.cost)){const row=document.createElement('li'),name=document.createElement('span'),count=document.createElement('strong');name.textContent=label(id);count.textContent=`${inventory[id]||0} / ${needed}`;count.setAttribute('aria-label',`${inventory[id]||0} owned, ${needed} required`);row.className=(inventory[id]||0)>=needed?'available':'missing';row.append(name,count);ingredients.append(row);}
  cook.className='cooking-submit';cook.textContent='Cook one';cook.disabled=!station?.available()||!canMake(inventory,recipe);cook.onclick=()=>{if(!station?.available()||!canMake(inventory,recipes[selected])){render();return;}const id=selected;dialog.close();onCook(id,station);};const hero=document.createElement('div'),body=document.createElement('div'),actions=document.createElement('div'),hint=document.createElement('small');hero.className='cooking-hero';hero.innerHTML=icon(selected);body.className='cooking-detail-body';actions.className='cooking-detail-actions';hint.textContent=!station?'Interact with a campfire to cook.':cook.disabled?'Gather the missing ingredients to cook this recipe.':'Uses the ingredients shown above.';body.append(back,hero,title,time,description,heading,ingredients);actions.append(cook,hint);detail.append(body,actions);
 }
 search.oninput=render;dialog.querySelector('[data-close]').onclick=()=>dialog.close();dialog.querySelector('[data-pack]').onclick=()=>{dialog.close();station?.pack?.();};
 return {open(context=null){station=context;dialog.querySelector('[data-pack]').hidden=!station?.pack;search.value='';dialog.classList.remove('viewing-recipe');render();dialog.showModal();},close(){dialog.close();},get isOpen(){return dialog.open;}};
}
