import {h,mount} from './ui/dom.js';
import {iconNode} from './ui/icon.js';
import {resourceMeter} from './ui/hud/meter.js';
import {compactQuery} from './ui/viewport.js';
import {bind} from './ui/scope.js';
import {panelTabs,anyAvailable} from './ui/panel-tabs.js';
import {quickActions} from './ui/hud/quick-actions.js';
import {warningChip} from './ui/hud/warning-chip.js';
import {equipmentPage} from './ui/pages/equipment-page.js';
import {computed,signal,untracked} from './reactive.js';
import {mountMinimapControls} from './minimap-controls.js';
import {icon} from './icons.js';
import {FOODS} from './player-health.js';
import {menuReaction,minimapTiles,minimapGrid,minimapGroundItems} from './player-interface-policy.js';

// Shared player chrome; every map supplies the same live world and player state.
export function createPlayerInterface({modals=null,menus,journal,health,resources,food,inventory,equipment,world,tile,destination,move,enemies,groundItems,combat,styles,styleMenu,auras,toast=()=>{},playerControl=null,assistance=null}){
 const $=id=>document.getElementById(id),mobile=compactQuery(),panels=menus.panels;
 const sidebar=document.createElement('aside');sidebar.id='player-sidebar';sidebar.setAttribute('aria-label','Player overview and journal');
 const overview=document.createElement('section');overview.id='player-overview';overview.innerHTML=`<div class="overview-heading"><button id="hide-player-panel" aria-label="Collapse player sidebar">${icon('collapseSidebar')}</button></div><div class="overview-map"><canvas width="136" height="136" role="img" aria-label="Nearby terrain, player, enemies and ground items (gold squares)"></canvas><span>N</span></div><div id="overview-vitals"></div>`;
 const heading=overview.querySelector('.overview-heading');
 // Pop out the docked journal (its header row is dropped in the sidebar to save height).
 const popOut=h('button',{id:'journal-pop-out',type:'button','aria-label':'Pop out journal',title:'Pop out journal',on:{click:()=>journal.popOut()}},iconNode('popOut'));heading.append(popOut);
 const hud=document.createElement('aside');hud.id='player-mobile-hud';document.body.append(hud);
 menus.host.append(sidebar);sidebar.append(overview,$('journal'));$('overview-vitals').append($('player-health'));
 // Combat warnings: a transient chip under the action row (no space while idle). Danger persists on
 // enemy health plates and control effects show on the player's plate, so this only announces changes.
 let warning;mount(()=>{warning=warningChip({id:'player-combat-status',advice:()=>assistance?.warning??''});return warning.node;});
 overview.append(warning.node);
 // Action row: one quick action under each meter (ui/hud/quick-actions.js), pushed by gameplay state.
 const quickFood=signal('cookedFish');let actions;
 mount(()=>{actions=quickActions({inventory,food,quickFood,resources,styles,combat,auras,assistance,toast,ate:()=>reaction('action'),openCombat:()=>styleMenu.open()});return actions.eat;});
 const actionFor={health:actions.eat,mana:actions.quickSpell,stamina:actions.sprint,energy:actions.strongStrike,ki:actions.quickAuras};
 for(const [kind,node] of Object.entries(actionFor))node.classList.add('resource-placeholder-action',kind);
 $('overview-vitals').append(actionFor.health);
 const meters={};
 for(const [kind,label] of [['mana','Mana'],['stamina','Stamina'],['energy','Energy'],['ki','Ki']]){
  const meter=mount(()=>resourceMeter({id:'player-'+kind,kind,label,resource:resources[kind]})).node;meter.classList.add('resource-placeholder',kind);meters[kind]=meter;
  $('overview-vitals').append(meter,actionFor[kind]);
 }
 // The Show Energy / Show Ki policies (off in Simple and Pacifist, on in Expert) decide whether the
 // Energy (Quick Ability) and Ki (Quick Auras) meters and buttons show. The row closes up the gap.
 const shows=computed(()=>{assistance?.revision.value;const p=assistance?.settings.policies;return {energy:!p||p.showEnergy,ki:!p||p.showKi};});
 mount(()=>{bind(()=>{const {energy,ki}=shows.value,vitals=$('overview-vitals');
  meters.energy.hidden=actionFor.energy.hidden=!energy;meters.ki.hidden=actionFor.ki.hidden=!ki;
  vitals.dataset.columns=String(3+energy+ki);vitals.toggleAttribute('data-energy-hidden',!energy);});return $('overview-vitals');});
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
 let hidden=false,visible=false,clock=0,layoutSignature='',lastAttacked=-Infinity;
 // Equipment page (ui/pages/equipment-page.js): reactive on equipment and the inventory.
 const gear=mount(()=>h('section',{id:'equipment-panel','aria-label':'Equipment'},equipmentPage({equipment,inventory}))).node;$('journal').append(gear);
 panels.register({id:'equipment',label:'Equipment',icon:'shields',order:80,element:gear});
 $('journal').append($('combat-panel'),$('powers-panel'));
 
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
  popOut.hidden=mobile.matches||hidden;
  const toggle=$('hide-player-panel');toggle.hidden=mobile.matches;const label=hidden?'Expand player sidebar':'Collapse player sidebar';if(toggle.getAttribute('aria-label')!==label){toggle.setAttribute('aria-label',label);toggle.title=label;toggle.innerHTML=icon(hidden?'expandSidebar':'collapseSidebar');}toggle.setAttribute('aria-expanded',String(!hidden));
 }
 function reaction(event='action'){
  closeMore();
  if(menuReaction(mobile.matches,event)==='close'){
   menus.closeMenus();
   if(mobile.matches&&event==='attacked'){modals?.closeAll('attacked');for(const d of document.querySelectorAll('dialog[open]:not(.q-modal)')){d.close();d.dispatchEvent(new Event('cancel'));}}
  }else journal.compact();
  layout();
 }
 menus.events.action=()=>reaction('action');
 menus.events.beforeClose=event=>{closeMore();if(event==='dismiss'&&!mobile.matches&&!hidden)return false;const result=menuReaction(mobile.matches,event);if(result==='compact')journal.compact();return result==='close';};
 $('hide-player-panel').onclick=()=>{hidden=!hidden;journal.setDocked(false);if(hidden)menus.closeMenus('dismiss');layout();};
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
  reaction,assignFood(id){if(FOODS[id])quickFood.value=id;},get quickFood(){return quickFood.peek();},
  // Announce being attacked only when it starts (no hit in the last 10s), not on every hit of a fight.
  // One-off notices (assistance tips, mode changes) through the warning chip.
  tip(text){warning.announce(text);},
  attacked(){reaction('attacked');const now=performance.now();if(now-lastAttacked>10000)warning.announce('Under attack!');lastAttacked=now;},
  reset(){mapControls.reset();hidden=false;quickFood.value='cookedFish';journal.compact();menus.closeMenus();layout();},
  update(dt,show){if(visible!==show){visible=show;layout();}clock+=dt;if(clock<.15)return;clock=0;layout();if(!visible)return;
   drawMap();
  },
  get state(){return {minimapRadius:mapControls.radius,destination:destination()?{x:destination().x,z:destination().z}:null,mobile:mobile.matches,moreOpen:moreOpen.peek(),hidden,quickFood:quickFood.peek(),expanded:journal.expanded,menuOpen:!$('journal').hidden};}
 };
}
