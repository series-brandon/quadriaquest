import {icon} from './icons.js';
import {ITEMS} from './items.js';
import {FOODS} from './player-health.js';
import {GEAR} from './equipment.js';
import {menuReaction,minimapTiles,partitionMobileTabs} from './player-interface-policy.js';

// Shared player chrome; every map supplies the same live world and player state.
export function createPlayerInterface({menus,journal,health,food,inventory,equipment,world,tile,enemies,combat,styleMenu}){
 const $=id=>document.getElementById(id),mobile=matchMedia('(max-width:700px)');
 const sidebar=document.createElement('aside');sidebar.id='player-sidebar';sidebar.setAttribute('aria-label','Player overview and journal');
 const overview=document.createElement('section');overview.id='player-overview';overview.innerHTML=`<div class="overview-heading"><button id="hide-player-panel" aria-label="Collapse player sidebar">${icon('collapseSidebar')}</button></div><div class="overview-map"><canvas width="136" height="136" role="img" aria-label="Nearby terrain, player and enemies"></canvas><span>N</span></div><div id="overview-vitals"></div><button id="quick-food">${icon('quickEat')}<span></span></button><small id="player-combat-status" role="status"></small>`;
 const hud=document.createElement('aside');hud.id='player-mobile-hud';document.body.append(hud);
 menus.host.append(sidebar);sidebar.append(overview,$('journal'));$('overview-vitals').append($('player-health'),$('quick-food'));
 for(const [kind,label,action,glyph] of [['mana','Mana','Quick restore','quickRestore'],['stamina','Stamina','Sprint toggle','sprint']]){
  const placeholder=document.createElement('div');placeholder.className=`resource-orb resource-placeholder ${kind}`;placeholder.setAttribute('aria-label',`${label} — coming soon`);placeholder.title=`${label} — coming soon`;placeholder.innerHTML='<span class="health-orb-fill" aria-hidden="true"></span><strong class="health-orb-value" aria-hidden="true">—</strong>';
  const button=document.createElement('button');button.className=`resource-placeholder-action ${kind}`;button.disabled=true;button.setAttribute('aria-label',`${action} — coming soon`);button.title=`${action} — coming soon`;button.innerHTML=icon(glyph);
  $('overview-vitals').append(placeholder,button);
 }
 const mobileNav=document.createElement('nav');mobileNav.id='player-mobile-nav';mobileNav.setAttribute('aria-label','Player menu');menus.host.append(mobileNav);
 const more=document.createElement('section');more.id='player-mobile-more';more.hidden=true;more.setAttribute('aria-label','More player menus');more.innerHTML='<div class="more-heading"><strong>More</strong><button aria-label="Close more menus">×</button></div><div class="more-tabs"></div>';menus.host.append(more);
 const moreButton=document.createElement('button');moreButton.innerHTML='<b aria-hidden="true">•••</b><span>More</span>';moreButton.setAttribute('aria-controls',more.id);moreButton.setAttribute('aria-expanded','false');
 function closeMore(restoreFocus=false){more.hidden=true;moreButton.setAttribute('aria-expanded','false');if(restoreFocus)moreButton.focus();}
 moreButton.onclick=()=>{more.hidden=!more.hidden;moreButton.setAttribute('aria-expanded',String(!more.hidden));if(!more.hidden)more.querySelector('button').focus();};
 more.querySelector('button').onclick=()=>closeMore(true);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!more.hidden){e.preventDefault();closeMore(true);}});
 document.addEventListener('pointerdown',e=>{if(!more.hidden&&!more.contains(e.target)&&!mobileNav.contains(e.target))closeMore();});
 const mobileButtons=new Map();
 let hidden=false,visible=false,quickFood='cookedFish',clock=0,gearSignature='',navSignature='',lastMessage='',messageUntil=0;
 const gear=document.createElement('section');gear.id='equipment-panel';gear.hidden=true;gear.innerHTML='<div class="crafting-heading"><h2>Equipment</h2><button aria-label="Close equipment">×</button></div><div class="equipment-list"></div>';$('journal').append(gear);gear.querySelector('button').onclick=()=>menus.closeMenus('dismiss');
 const gearTab=document.createElement('button');gearTab.id='open-equipment';gearTab.innerHTML=icon('shields')+'<span>Equipment</span>';$('game-menu-bar').append(gearTab);gearTab.onclick=()=>{menus.closeMenus('switch');gear.hidden=false;renderGear();};
 $('journal').append($('combat-panel'));$('open-combat-styles').innerHTML=icon('Combat')+'<span>Combat</span>';
 // Journal tab identity is deliberately independent of the old menu's DOM id.
 
 function layout(){
  document.body.classList.toggle('player-ui-active',visible);document.body.classList.toggle('journal-guided',journal.locked);
  document.body.classList.toggle('player-sidebar-open',visible&&!mobile.matches&&!hidden);
  sidebar.hidden=!visible||mobile.matches||hidden;hud.hidden=!visible||(!mobile.matches&&!hidden);
  const parent=mobile.matches||hidden?hud:sidebar;if(overview.parentElement!==parent)parent.prepend(overview);
  // Mobile journal lives outside the hidden desktop sidebar.
  const journalParent=mobile.matches||hidden?menus.host:sidebar;if($('journal').parentElement!==journalParent)journalParent.append($('journal'));
  mobileNav.hidden=!visible||!mobile.matches;
  if(mobileNav.hidden||journal.locked)closeMore();
  journal.setDocked(visible&&!mobile.matches&&!hidden);
  const toggle=$('hide-player-panel');toggle.hidden=mobile.matches;const label=hidden?'Expand player sidebar':'Collapse player sidebar';if(toggle.getAttribute('aria-label')!==label){toggle.setAttribute('aria-label',label);toggle.title=label;toggle.innerHTML=icon(hidden?'expandSidebar':'collapseSidebar');}toggle.setAttribute('aria-expanded',String(!hidden));
 }
 function reaction(event='action'){
  closeMore();
  if(menuReaction(mobile.matches,event)==='close'){
   menus.closeMenus();
   if(mobile.matches&&event==='attacked')for(const d of document.querySelectorAll('dialog[open]')){d.close();d.dispatchEvent(new Event('cancel'));}
  }else journal.compact();
  layout();
 }
 menus.events.action=()=>reaction('action');
 menus.events.beforeClose=event=>{closeMore();if(event==='dismiss'&&!mobile.matches&&!hidden)return false;const result=menuReaction(mobile.matches,event);if(result==='compact')journal.compact();return result==='close';};
 $('hide-player-panel').onclick=()=>{hidden=!hidden;journal.setDocked(false);if(hidden)menus.closeMenus('dismiss');layout();};
 $('game-menu-toggle').addEventListener('click',()=>{if(hidden){hidden=false;layout();} });
 $('quick-food').onclick=()=>{if(food.start(quickFood))reaction('action');};
 function renderGear(){
  const signature=JSON.stringify(equipment.state)+Object.keys(GEAR).map(id=>`${inventory[id]}:${equipment.inventoryActions(id)[0]?.disabled}`).join();if(signature===gearSignature)return;gearSignature=signature;
  const list=gear.querySelector('.equipment-list');list.replaceChildren();
  for(const [slot,label] of [['main','Main hand'],['off','Off hand'],['head','Head']]){const p=document.createElement('p');p.textContent=label+': '+(ITEMS[equipment.slots[slot]]?.name||'Empty');list.append(p);}
  for(const id of Object.keys(GEAR).filter(id=>inventory[id]>0)){const b=document.createElement('button'),action=equipment.inventoryActions(id)[0];b.innerHTML=icon(id);b.append(document.createTextNode(`${ITEMS[id].name} · ${action.label}`));b.disabled=action.disabled;b.onclick=()=>{action.run();renderGear();menus.refresh();};list.append(b);}
 }
 function drawMap(){
  const canvas=overview.querySelector('canvas'),ctx=canvas.getContext('2d'),p=tile(),radius=8,size=8;
  ctx.fillStyle='#41394a';ctx.fillRect(0,0,136,136);
  for(const t of minimapTiles(world,p,radius)){ctx.fillStyle=t.water?'#7a9caf':t.blocksSight?'#706679':t.blocked?'#97869a':t.safe?'#b4b59b':'#b2a39d';ctx.fillRect((t.x-p.x+radius)*size,(t.z-p.z+radius)*size,size-1,size-1);}
  for(const a of enemies()){if(a.opened||Math.abs(a.x-p.x)>radius||Math.abs(a.z-p.z)>radius)continue;ctx.fillStyle=a.aggro?'#f3a16e':'#bd7669';ctx.beginPath();ctx.arc((a.x-p.x+radius)*size+4,(a.z-p.z+radius)*size+4,3,0,Math.PI*2);ctx.fill();}
  ctx.fillStyle='#eff6b9';ctx.beginPath();ctx.arc(68,68,4,0,Math.PI*2);ctx.fill();
 }
 function refreshNav(){
  const tabs=[...$('game-menu-bar').querySelectorAll('button')].filter(b=>!b.hidden);
  const signature=tabs.map(b=>b.id+':'+b.inert).join();
  if(signature!==navSignature){
   navSignature=signature;mobileNav.replaceChildren();more.querySelector('.more-tabs').replaceChildren();mobileButtons.clear();
   const {primary,secondary}=partitionMobileTabs(tabs);
   for(const b of tabs){const proxy=document.createElement('button');proxy.innerHTML=b.innerHTML;proxy.setAttribute('aria-label',b.getAttribute('aria-label')||b.textContent);proxy.onclick=()=>{closeMore();b.click();};(primary.includes(b)?mobileNav:more.querySelector('.more-tabs')).append(proxy);mobileButtons.set(b,proxy);}
   if(secondary.length)mobileNav.append(moreButton);else closeMore();
  }
  for(const [b,proxy] of mobileButtons){proxy.inert=b.inert;proxy.disabled=b.disabled;proxy.setAttribute('aria-current',b.getAttribute('aria-current')||'false');}
  moreButton.setAttribute('aria-current',String([...more.querySelectorAll('[aria-current="true"]')].length>0));
 }
 mobile.addEventListener('change',layout);
 return {
  reaction,assignFood(id){if(FOODS[id])quickFood=id;},get quickFood(){return quickFood;},
  attacked(){reaction('attacked');lastMessage='Under attack!';messageUntil=performance.now()+2000;},
  reset(){hidden=false;quickFood='cookedFish';journal.compact();menus.closeMenus();layout();},
  update(dt,show){if(visible!==show){visible=show;layout();}clock+=dt;if(clock<.15)return;clock=0;layout();
   const action=food.inventoryActions(quickFood)[0];const button=$('quick-food');button.disabled=!inventory[quickFood]||!!action?.disabled;button.querySelector('span').textContent=food.working?'Eating…':'Eat';button.title=`${ITEMS[quickFood].name} ×${inventory[quickFood]||0}`;button.setAttribute('aria-label',`${food.working?'Eating':'Quick eat'} ${button.title}`);
   $('player-combat-status').textContent=performance.now()<messageUntil?lastMessage:combat.working?'In combat · Auto-Retaliate '+(combat.autoRetaliate?'On':'Off'):'';
   drawMap();refreshNav();if(!gear.hidden)renderGear();if(!$('combat-panel').hidden)styleMenu.refresh();if(!$('journal').hidden)menus.refresh();
  },
  get state(){return {mobile:mobile.matches,moreOpen:!more.hidden,hidden,quickFood,expanded:journal.expanded,menuOpen:!$('journal').hidden};}
 };
}
