import {h,mount} from './ui/dom.js';
import {effect,signal} from './reactive.js';
import {combatPage} from './ui/pages/combat-page.js';

// Hosts the Combat page (ui/pages/combat-page.js) as a journal page. The page follows the
// combat systems' revisions, so it needs no refresh calls.
export function createCombatStyleMenu({styles,combat,panels,auras=null,assistance=null,equipment=null,character=null,health=null}){
 // A guide on the mode dropdown ("Show me how" from tips); it clears once the Combat page closes.
 const guide=signal(null);
 effect(()=>{if(panels.active.value!=='combat')guide.value=null;});
 const view=mount(()=>h('section',{id:'combat-panel','aria-label':'Combat'},combatPage({styles,combat,auras,assistance,equipment,character,health,guide})));
 document.getElementById('game-menus').append(view.node);
 const open=()=>panels.open('combat');
 panels.register({id:'combat',tab:'open-combat-styles',label:'Combat',icon:'Combat',order:50,primary:true,element:view.node,select:open});
 return {open,showModes(){open();guide.value='mode';}};
}
