import {h,mount} from './ui/dom.js';
import {resourceMeter} from './ui/hud/meter.js';
import {compactQuery} from './ui/viewport.js';
import {bind} from './ui/scope.js';
import {panelTabs,anyAvailable} from './ui/panel-tabs.js';
import {signal,untracked} from './reactive.js';
import {mountMinimapControls} from './minimap-controls.js';
import {icon} from './icons.js';
import {ITEMS} from './items.js';
import {FOODS} from './player-health.js';
import {GEAR,ARMOR_SLOTS} from './equipment.js';
import {menuReaction,minimapTiles,minimapGrid,minimapGroundItems} from './player-interface-policy.js';

// Shared player chrome; every map supplies the same live world and player state.
export function createPlayerInterface({menus,journal,health,resources,food,inventory,equipment,world,tile,destination,move,enemies,groundItems,combat,styleMenu,auras,knowsAbility=()=>false,playerControl=null,assistance=null}){
 const $=id=>document.getElementById(id),mobile=compactQuery(),panels=menus.panels;
 const sidebar=document.createElement('aside');sidebar.id='player-sidebar';sidebar.setAttribute('aria-label','Player overview and journal');
 const overview=document.createElement('section');overview.id='player-overview';overview.innerHTML=`<div class="overview-heading"><button id="hide-player-panel" aria-label="Collapse player sidebar">${icon('collapseSidebar')}</button></div><div class="overview-map"><canvas width="136" height="136" role="img" aria-label="Nearby terrain, player, enemies and ground items (gold squares)"></canvas><span>N</span></div><div id="overview-vitals"></div><button id="quick-food">${icon('quickEat')}<span></span></button><small id="player-combat-status" role="status"></small>`;
 const heading=overview.querySelector('.overview-heading');
 const hud=document.createElement('aside');hud.id='player-mobile-hud';document.body.append(hud);
 menus.host.append(sidebar);sidebar.append(overview,$('journal'));$('overview-vitals').append($('player-health'),$('quick-food'));
 for(const [kind,label,action,glyph] of [['mana','Mana','Quick restore','quickRestore'],['stamina','Stamina','Sprint','sprint'],['energy','Energy','Strong Strike','strongStrike'],['ki','Ki','Auras','aura']]){
  const meter=mount(()=>resourceMeter({id:'player-'+kind,kind,label,resource:resources[kind]})).node;meter.classList.add('resource-placeholder',kind);
  const button=document.createElement('button');button.id={stamina:'toggle-sprint',mana:'quick-restore',energy:'quick-strong-strike',ki:'open-auras'}[kind];button.className=`resource-placeholder-action ${kind}`;button.disabled=kind==='mana';button.setAttribute('aria-label',kind==='mana'?'Quick restore — not yet available':action);button.title=button.getAttribute('aria-label');button.innerHTML=icon(glyph);
  if(kind==='stamina'){button.setAttribute('aria-pressed','false');button.onclick=()=>{resources.toggle();clock=.15;};}
  // Strong Strike queues one use for the next eligible melee attack; pressing again withdraws it before it attaches.
  if(kind==='energy'){button.setAttribute('aria-pressed','false');button.onclick=()=>{combat.queue('strongStrike');clock=.15;};}
  if(kind==='ki'){button.setAttribute('aria-pressed','false');button.onclick=()=>{styleMenu.open();clock=.15;};}
  $('overview-vitals').append(meter,button);
 }
 const mapCanvas=overview.querySelector('canvas');let mapCenter={x:tile().x,z:tile().z};
 const mapControls=mountMinimapControls(mapCanvas,{center:()=>mapCenter,move,changed:()=>{clock=.15;drawMap();}});
 // Phone tab bar: primary tabs plus a More sheet for the rest, both rendered from the panel host.
 const secondary=entry=>!entry.primary,moreOpen=signal(false),hasMore=anyAvailable(panels,secondary);
 let mobileNav,more,moreButton,moreClose;
 function closeMore(restoreFocus=false){moreOpen.value=false;if(restoreFocus)moreButton.focus();}
 mount(()=>{
  moreButton=h('button',{type:'button','aria-controls':'player-mobile-more','aria-expanded':moreOpen,hidden:()=>!hasMore.value,
   'aria-current':()=>!!panels.activeEntry.value&&secondary(panels.activeEntry.value),on:{click:()=>{moreOpen.value=!moreOpen.peek();if(moreOpen.peek())moreClose.focus();}}},
   h('b',{'aria-hidden':'true'},'•••'),h('span',null,'More'));
  moreClose=h('button',{type:'button','aria-label':'Close more menus',on:{click:()=>closeMore(true)}},'×');
  more=h('section',{id:'player-mobile-more','aria-label':'More player menus',hidden:()=>!moreOpen.value},
   h('div',{class:'more-heading'},h('strong',null,'More'),moreClose),
   panelTabs(h('div',{class:'more-tabs'}),panels,{filter:secondary,ids:false,onSelect:()=>closeMore()}));
  // The More button trails the keyed tabs; keyedList leaves trailing nodes in place.
  mobileNav=panelTabs(h('nav',{id:'player-mobile-nav','aria-label':'Player menu'}),panels,{filter:entry=>entry.primary,ids:false,onSelect:()=>closeMore()});
  mobileNav.append(moreButton);
  // Any page change (including from elsewhere) dismisses the More sheet.
  bind(()=>{panels.active.value;untracked(()=>closeMore());});
  return mobileNav;
 });
 menus.host.append(mobileNav,more);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!more.hidden){e.preventDefault();closeMore(true);}});
 document.addEventListener('pointerdown',e=>{if(!more.hidden&&!more.contains(e.target)&&!mobileNav.contains(e.target))closeMore();});
 let hidden=false,visible=false,quickFood='cookedFish',clock=0,gearSignature='',lastMessage='',messageUntil=0,layoutSignature='',foodSignature='';
 const gear=document.createElement('section');gear.id='equipment-panel';gear.innerHTML='<div class="crafting-heading"><h2>Equipment</h2><button aria-label="Close equipment">×</button></div><div class="equipment-list"></div>';$('journal').append(gear);gear.querySelector('button').addEventListener('click',()=>panels.dismiss());
 panels.register({id:'equipment',label:'Equipment',icon:'shields',order:80,element:gear,select(){panels.open('equipment');gearSignature='';renderGear();}});
 $('journal').append($('combat-panel'));
 
 function layout(){
  const signature=[visible,mobile.matches,hidden,journal.locked].join(':');if(signature===layoutSignature)return;layoutSignature=signature;
  document.body.classList.toggle('player-ui-active',visible);document.body.classList.toggle('journal-guided',journal.locked);
  document.body.classList.toggle('player-sidebar-open',visible&&!mobile.matches&&!hidden);
  sidebar.hidden=!visible||mobile.matches||hidden;hud.hidden=!visible||(!mobile.matches&&!hidden);
  // Keep the toggle outside panel stacking contexts so dialogue cannot cover it.
  const headingParent=document.body;if(heading.parentElement!==headingParent)headingParent.prepend(heading);heading.hidden=!visible||mobile.matches;
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
  const signature=JSON.stringify(equipment.slots)+Object.keys(GEAR).map(id=>`${inventory[id]}:${equipment.inventoryActions(id).map(a=>a.label+a.disabled)}`).join();if(signature===gearSignature)return;gearSignature=signature;
  const list=gear.querySelector('.equipment-list');list.replaceChildren();
  // Armor slots appear once something can fill them.
  const slots=equipment.slots,armorOwned=Object.keys(GEAR).some(id=>GEAR[id].armor&&inventory[id]>0);
  for(const [slot,label] of [['main','Main hand'],['off','Off hand'],['head','Head'],...(armorOwned?ARMOR_SLOTS.map(s=>[s,s[0].toUpperCase()+s.slice(1)]):[])]){const p=document.createElement('p');p.textContent=label+': '+(ITEMS[slots[slot]]?.name||'Empty');list.append(p);}
  for(const id of Object.keys(GEAR).filter(id=>inventory[id]>0))for(const action of equipment.inventoryActions(id)){const b=document.createElement('button');b.innerHTML=icon(id);b.append(document.createTextNode(`${ITEMS[id].name} · ${action.label}`));b.disabled=action.disabled;b.onclick=()=>{action.run();renderGear();menus.refresh();};list.append(b);}
 }
 function drawMap(){
  const canvas=overview.querySelector('canvas'),ctx=canvas.getContext('2d'),p=tile(),radius=mapControls.radius;mapCenter={x:p.x,z:p.z};
  const grid=minimapGrid(canvas.parentElement.clientWidth-8,devicePixelRatio,radius),{size,pixels,gap}=grid;
  if(canvas.width!==pixels){canvas.width=canvas.height=pixels;canvas.style.width=(grid.width+8)+'px';}
  ctx.fillStyle='#41394a';ctx.fillRect(0,0,pixels,pixels);
  for(const t of minimapTiles(world,p,radius)){ctx.fillStyle=t.water?'#7a9caf':t.blocksSight?'#706679':t.blocked?'#97869a':t.safe?'#b4b59b':'#b2a39d';ctx.fillRect((t.x-p.x+radius)*size,(t.z-p.z+radius)*size,size-gap,size-gap);}
  for(const n of minimapGroundItems(world,groundItems(),p,radius)){
   const marker=Math.max(3,Math.round(size*.35)),x=(n.x-p.x+radius+.5)*size,z=(n.z-p.z+radius+.5)*size;
   ctx.fillStyle='#41394a';ctx.fillRect(Math.round(x-marker/2)-gap,Math.round(z-marker/2)-gap,marker+gap*2,marker+gap*2);
   ctx.fillStyle='#ffd878';ctx.fillRect(Math.round(x-marker/2),Math.round(z-marker/2),marker,marker);
  }
  for(const a of enemies()){if(a.opened||Math.abs(a.x-p.x)>radius||Math.abs(a.z-p.z)>radius)continue;ctx.fillStyle=a.aggro?'#f3a16e':'#bd7669';ctx.beginPath();ctx.arc((a.x-p.x+radius+.5)*size,(a.z-p.z+radius+.5)*size,size*.375,0,Math.PI*2);ctx.fill();}
  const goal=destination();if(goal){const dx=goal.x-p.x,dz=goal.z-p.z,distance=mobile.matches?Math.hypot(dx,dz):Math.max(Math.abs(dx),Math.abs(dz)),limit=mobile.matches?radius-.5:radius,scale=distance>limit?limit/distance:1,x=(dx*scale+radius+.5)*size,y=(dz*scale+radius+.5)*size;ctx.strokeStyle='#fff';ctx.lineWidth=Math.max(2,gap);ctx.strokeRect(x-size*.42,y-size*.42,size*.84,size*.84);ctx.beginPath();ctx.moveTo(x-size*.25,y);ctx.lineTo(x+size*.25,y);ctx.moveTo(x,y-size*.25);ctx.lineTo(x,y+size*.25);ctx.stroke();}
  ctx.fillStyle='#eff6b9';ctx.beginPath();ctx.arc(pixels/2,pixels/2,size*.5,0,Math.PI*2);ctx.fill();
 }
 mobile.addEventListener('change',layout);
 return {
  reaction,assignFood(id){if(FOODS[id])quickFood=id;},get quickFood(){return quickFood;},
  attacked(){reaction('attacked');lastMessage='Under attack!';messageUntil=performance.now()+2000;},
  reset(){mapControls.reset();hidden=false;quickFood='cookedFish';journal.compact();menus.closeMenus();layout();},
  update(dt,show){if(visible!==show){visible=show;layout();}clock+=dt;if(clock<.15)return;clock=0;layout();if(!visible)return;
   const action=food.inventoryActions(quickFood)[0];const button=$('quick-food'),signature=[quickFood,inventory[quickFood],food.working,!!action?.disabled].join(':');if(signature!==foodSignature){foodSignature=signature;button.disabled=!inventory[quickFood]||!!action?.disabled;button.querySelector('span').textContent=food.working?'Eating…':'Eat';button.title=`${ITEMS[quickFood].name} ×${inventory[quickFood]||0}`;button.setAttribute('aria-label',`${food.working?'Eating':'Quick eat'} ${button.title}`);}
   // Control effects and their immunity windows are always shown; advisory danger comes from assistance.
   const control=playerControl?.summary||'',advice=assistance?.warning||'',status=[performance.now()<messageUntil?lastMessage:'',advice,control].filter(Boolean).join(' · ')||(combat.working?'In combat · '+(assistance?.modeLabel||'Auto-Retaliate '+(combat.autoRetaliate?'On':'Off')):'');if($('player-combat-status').textContent!==status)$('player-combat-status').textContent=status;
   const strike=$('quick-strong-strike'),queued=combat.pending==='strongStrike'||!!combat.committedAbility,known=knowsAbility('strongStrike'),strikeLabel=!known?'Strong Strike — not learned':queued?'Strong Strike queued for your next melee attack (press to withdraw)':'Strong Strike (50 Energy, next melee attack)';
   if(strike.disabled===known)strike.disabled=!known;if(strike.getAttribute('aria-pressed')!==String(queued))strike.setAttribute('aria-pressed',String(queued));if(strike.title!==strikeLabel){strike.title=strikeLabel;strike.setAttribute('aria-label',strikeLabel);}
   const auraButton=$('open-auras'),glowing=String(!!auras?.anyActive);if(auraButton.getAttribute('aria-pressed')!==glowing)auraButton.setAttribute('aria-pressed',glowing);const sprint=$('toggle-sprint'),pressed=String(resources.sprint);if(sprint.getAttribute('aria-pressed')!==pressed)sprint.setAttribute('aria-pressed',pressed);if(sprint.disabled!==(resources.stamina.value===0))sprint.disabled=resources.stamina.value===0;
   drawMap();if(panels.isOpen('equipment'))renderGear();if(panels.isOpen('combat'))styleMenu.refresh();if(!$('journal').hidden)menus.refresh();
  },
  get state(){return {minimapRadius:mapControls.radius,destination:destination()?{x:destination().x,z:destination().z}:null,mobile:mobile.matches,moreOpen:moreOpen.peek(),hidden,quickFood,expanded:journal.expanded,menuOpen:!$('journal').hidden};}
 };
}
