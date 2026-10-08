import test from 'node:test';
import assert from 'node:assert/strict';
import {journalTutorialActions} from './journal-tutorial-lock.js';

test('guided journal lessons permit only the required action, never closing or resizing',()=>{
 for(const kind of ['quests','skills','inventory']){
  assert.deepEqual(journalTutorialActions(kind+'-toggle'),['#game-menu-toggle']);
  assert.deepEqual(journalTutorialActions(kind+'-menu'),['#open-'+(kind==='skills'?'character':kind)]);
  assert.deepEqual(journalTutorialActions(kind+'-detail'),[]);
 }
 assert.deepEqual(journalTutorialActions('inventory-select'),['[data-item="sticks"]']);
 assert.deepEqual(journalTutorialActions('inventory-stacks'),[]);
 assert.deepEqual(journalTutorialActions('skills-summary'),[]);
 assert.deepEqual(journalTutorialActions('recipe'),['#craft-axes']);
 assert.deepEqual(journalTutorialActions('craft-menu'),['#open-crafting']);
 assert.deepEqual(journalTutorialActions('retry'),['#game-menu-toggle']);
});
test('optional guided recipes use the real highlighted action and release on completion',()=>{
 assert.deepEqual(journalTutorialActions('pickaxe','craft-pickaxes'),['#craft-pickaxes']);
 assert.deepEqual(journalTutorialActions('done','craft-hammers'),['#craft-hammers']);
 for(const stage of ['inactive','done','chop','mine','pickaxe']) assert.equal(journalTutorialActions(stage),null);
});

test('capture guard rejects stray actions and preserves native availability when unlocked',async()=>{
 const {mountJournalTutorialLock}=await import('./journal-tutorial-lock.js');
 const make=id=>({id,inert:false,attrs:new Map(),matches(selector){return selector==='#'+id;},closest(selector){return selector==='#gather-tutorial'?null:this;},getAttribute(key){return this.attrs.get(key);},hasAttribute(key){return this.attrs.has(key);},setAttribute(k,v){this.attrs.set(k,v);},removeAttribute(k){this.attrs.delete(k);}});
 const close=make('journal-close'),quest=make('open-quests'),craft=make('craft-axes');craft.disabled=true;
 const listeners={},host={querySelectorAll:selector=>selector==='.gold-guide[id]'?[]:[close,quest,craft],addEventListener:(type,fn)=>listeners[type]=fn};
 const controller={stage:'quests-menu',onStageChange(){}},lock=mountJournalTutorialLock(host,controller);lock.sync();
 assert.equal(close.inert,true);assert.equal(quest.inert,false);assert.equal(craft.disabled,true);
 let prevented=0,stopped=0;
 listeners.click({target:close,preventDefault:()=>prevented++,stopImmediatePropagation:()=>stopped++});
 assert.equal(prevented,1);assert.equal(stopped,1);
 listeners.click({target:quest,preventDefault:()=>prevented++,stopImmediatePropagation:()=>stopped++});
 assert.equal(prevented,1);
 controller.stage='done';lock.sync();assert.equal(lock.locked,false);assert.equal(close.inert,false);assert.equal(craft.disabled,true);assert.equal(close.hasAttribute('aria-disabled'),false);
});
