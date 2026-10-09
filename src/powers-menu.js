import {h,mount} from './ui/dom.js';
import {signal} from './reactive.js';
import {powersPage} from './ui/pages/powers-page.js';

// Hosts the Powers page (ui/pages/powers-page.js) as a journal page: Spells, Auras and Abilities.
// The page follows the shared systems' revisions, so it needs no refresh calls.
export function createPowersMenu({styles,auras,assistance=null,combat,character=null,panels}){
 const section=signal('spells');
 const view=mount(()=>h('section',{id:'powers-panel','aria-label':'Powers',hidden:true},powersPage({styles,auras,assistance,combat,character,section})));
 document.getElementById('game-menus').append(view.node);
 const open=(sub=null)=>{if(sub)section.value=sub;panels.open('powers');};
 panels.register({id:'powers',label:'Powers',icon:'spell',order:55,element:view.node,select:()=>open()});
 return {open};
}
