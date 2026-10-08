import {updateObjective,finishObjective,setObjectiveHelp} from './quests.js';
import {showGatheringCompletion} from './opening.js';
import {computed,signal} from './reactive.js';
const introduction=[
  "Wow! Look at you go. You've already picked up some resources and gained some experience with a little level growth to boot!",
  'Keep an eye out for items that could be sitting around on the ground. You never know what you might find.',
  "That being said, you're not going to find everything you need just sitting on the ground.",
  "See those trees over there? If we could chop them down, I bet we'd get some even better resources.",
  "Unfortunately you're going to have a hard time taking one down without an axe.",
  "So let's learn about crafting.",
  "Open your game menu again. This time, we'll make something!"
];
// Item names the tips emphasise.
const ITEM_TERMS=['Crude Pickaxe','Crude Axe','Small Logs','Sticks','Rocks','Stone','Boulder'];
export function createCraftingTutorial({menus,narrator,tip,freePlay=false,onComplete=()=>{}}){
  const $=id=>document.getElementById(id);
  let stage=freePlay?'done':'inactive',lineIndex=0,advance=null,successNext=null,firstTree=!freePlay;
  const stageListeners=new Set(),stageState=signal(stage);
  function setStage(value){stage=value;stageState.value=value;menus.setSkillGuidance({locked:stage.startsWith('skills-'),focus:stage==='skills-detail'?'Gathering':null});for(const listener of stageListeners)listener();}
  let skillsDone=null,inventoryDone=null,questsDone=null,miningGuided=false;
  // The tip's "Show me how": whether it shows and what it does (mining guidance by default).
  let helpShown=false,helpAction=()=>{};
  const syncHelp=()=>tip.update({help:helpShown?{onPress:()=>helpAction()}:null});
  const showHelp=on=>{helpShown=!!on;syncHelp();};
  const {host,panels,inventoryMenu,selectRecipe,closeMenus,openSkills,openInventory}=menus;
  host.hidden=!freePlay;
  for(const id of ['inventory','crafting'])panels.setAvailable(id,freePlay);
  menus.events.selected=id=>{if(miningGuided&&stage==='pickaxe')guide(id==='pickaxes'?'craft-pickaxes':'choose-pickaxes');};
  menus.events.inventoryLocked=()=>stage.startsWith('inventory-');
  menus.events.inventorySelected=id=>{
    if(stage!=='inventory-select'||id!=='sticks')return;
    setStage('inventory-detail');inventoryMenu.guide(false);
    tutorial("Select an item to read about it. These sticks might not look like much, but they'll come in handy soon!",true,()=>{
      closeMenus();guide(null);inventoryMenu.lock(false);setStage(freePlay?'done':'inactive');
      finishObjective('inventory');const done=inventoryDone;inventoryDone=null;
      if(done)done();else{successNext=()=>tip.hide();showGatheringCompletion(tip,continueTip);}
    });tip.update({title:'A closer look'});tip.updateAction({label:'Got it!'});
  };
  menus.events.openInventory=()=>{
    if(stage==='inventory-menu'){
      setStage('inventory-stacks');guide(null);openInventory();inventoryMenu.lock(true);
      tutorial("Here are your supplies! Items of the same type stack together. The number on each stack shows how many you're carrying.",true,()=>{
        setStage('inventory-select');tutorial('Select your Sticks stack to take a closer look.');inventoryMenu.guide(true);
      });tip.update({title:'A closer look'});tip.updateAction({label:'Continue'});
    }else return !['inactive','done','chop','pickaxe','mine'].includes(stage);
    return true;
  };
  function startInventory(done){
    closeMenus();guide(null);advance=null;successNext=null;inventoryDone=done;setStage('inventory-intro');host.hidden=false;
    say('Now, what happened to all those sticks and rocks you picked up?',()=>say('Assuming no holes in reality, you should have them stored safe and sound.',()=>say("Everything you collect goes into your inventory. Let's have a look!",()=>{
      panels.setAvailable('inventory',true);setStage('inventory-toggle');guide('game-menu-toggle');tutorial('Open the game menu to check your inventory.');
    })));
  }
  function renderSkills(){menus.setSkillGuidance({locked:stage.startsWith('skills-'),focus:stage==='skills-detail'?'Gathering':null});}
  menus.events.openSkills=()=>{
    if(stage==='skills-menu'){
      setStage('skills-detail');guide(null);openSkills();
      tutorial("Here's your Gathering skill! Each skill shows your current level, total experience, and progress toward the next level. You've reached Gathering level 2!",true,()=>{
        setStage('skills-summary');renderSkills();tutorial('You can check your skills here any time. Skills improve as you use them, so try different activities and watch yourself grow!',true,()=>{
          finishObjective('skills');const done=skillsDone;skillsDone=null;startInventory(done);
        });tip.update({title:'A closer look'});tip.updateAction({label:'Got it!'});
      });tip.update({title:'A closer look'});tip.updateAction({label:'Continue'});
    }else return !['inactive','done','chop','pickaxe','mine'].includes(stage);
    return true;
  };
  function startQuests(done){
    closeMenus();guide(null);advance=null;questsDone=done;setStage('quests-intro');host.hidden=true;
    updateObjective('gather','Collect ground items','Collect all six handfuls of Sticks and Rocks scattered around the clearing. Click or tap a resource and wait until gathering finishes.',0,6);
    tutorial("You've been given a quest! Open your game menu to view your quests.",false,()=>{
      setStage('quests-reveal');
      say('Oh wait, I forgot... here you go!',()=>{
        setStage('quests-toggle');tutorial('Open your menu with the button in the top right corner');
      });
      host.hidden=false;guide('game-menu-toggle');
    });
  }
  function questsOpened(){
    if(stage!=='quests-menu')return;
    setStage('quests-detail');guide(null);
    tutorial('Here are your quests! Each quest shows what you need to do and tracks your progress. Your first task is to collect six items from the ground. You can return here whenever you need a reminder.',false,()=>{
      closeMenus();setStage(freePlay?'done':'inactive');tip.hide();
      const done=questsDone;questsDone=null;if(done)done();
    });
  }
  function startSkills(done){
    closeMenus();skillsDone=done;setStage('skills-intro');
    host.hidden=false;
    say("Want to see how far you've come? Let's take a peek at your skills.",()=>{
      guide('game-menu-toggle');setStage('skills-toggle');tutorial('Open the game menu to check your skills.');
    });
  }

  function guide(id){for(const node of host.querySelectorAll('.gold-guide'))node.classList.remove('gold-guide');if(id)$(id).classList.add('gold-guide');}
  function tutorial(text,success=false,next=null){
    helpShown=false;narrator.hide();successNext=next||(()=>tip.hide());
    tip.show({
      title:success?'Well done!':({chop:'Chop a tree',pickaxe:'Craft a Crude Pickaxe',mine:'Mine a boulder',recipe:'Craft a Crude Axe',crafting:'Crafting your axe','mining-craft':'Crafting your pickaxe'})[stage]||'Learning the ropes',
      text,emphasis:ITEM_TERMS,complete:success,action:{label:next?'Continue':'Dismiss',onPress:continueTip},
    });
    const goals={menu:['axe','Craft a Crude Axe','Use the Crafting tab to make a Crude Axe with Sticks ×1 and Rocks ×1. Stay still until crafting finishes.'],chop:['chop','Chop a tree','With a Crude Axe in your inventory, click a tree in the clearing and wait to obtain Small Logs.'],pickaxe:['pickaxe','Craft a Crude Pickaxe','Use the Crafting tab to make a Crude Pickaxe with Sticks ×1 and Rocks ×1. Use Show me how if you need guidance.'],mine:['mine','Mine a boulder','With a Crude Pickaxe in your inventory, click a boulder in the clearing to obtain Stone. Stay still until mining finishes.']};
    if(goals[stage])updateObjective(...goals[stage]);
    if(stage.startsWith('skills-'))updateObjective('skills','Explore your skills',text);
    if(stage.startsWith('inventory-'))updateObjective('inventory','Check your inventory',text);
  }
  function say(text,next){
    showHelp(false);tip.hide();advance=next;
    narrator.show({text,next:advanceLine});
  }
  function nextIntro(){
    if(lineIndex<introduction.length){const last=lineIndex===introduction.length-1;say(introduction[lineIndex++],last?()=>{host.hidden=false;setStage('menu');guide('game-menu-toggle');tutorial('Open the game menu using the glowing button.');}:nextIntro);}
  }
  function activateChopping(){setStage('chop');guide(null);tutorial('Click on a tree with an appropriate tool in your inventory to start chopping it down. Be patient! If you move before you finish, you’ll have to start over!');}
  function pickaxeGuide(){
    if(!miningGuided||stage!=='pickaxe')return;
    guide(panels.isOpen('crafting')?(menus.selectedRecipe==='pickaxes'?'craft-pickaxes':'choose-pickaxes'):(panels.navShown.peek()||panels.isOpen('character')||panels.isOpen('inventory'))?'open-crafting':'game-menu-toggle');
  }
  function pickaxePrompt(){
    setStage('pickaxe');setObjectiveHelp('pickaxe',()=>{closeMenus();helpAction();});tutorial('Craft a Crude Pickaxe using Sticks ×1 and Rocks ×1.');showHelp(!miningGuided);pickaxeGuide();
  }
  function activateMining(){
    setStage('mine');setObjectiveHelp('mine',()=>{closeMenus();helpAction();});miningGuided=false;guide(null);tutorial('Mine a Boulder to collect Stone.');showHelp(true);
  }
  function startMining(){
    helpAction=miningHelp;
    closeMenus();guide(null);advance=null;successNext=null;miningGuided=false;setStage('mining-intro');host.hidden=false;panels.setAvailable('crafting',true);
    const lines=[
      'Nicely done! Wood will come in handy, but some things need something sturdier.',
      'See those boulders? We can mine some Stone from them.',
      "Those handfuls of Rocks you've collected are useful for simple tools. Let's make one that can tackle something bigger!",
      'Remember how you crafted the axe? Do the same thing, but this time make a Crude Pickaxe!'
    ];
    let index=0;const next=()=>index<lines.length?say(lines[index++],next):pickaxePrompt();next();
  }
  const miningHelp=()=>{
    miningGuided=true;showHelp(false);
    if(stage==='pickaxe')pickaxeGuide();
    if(stage==='mine')tutorial('Click/Tap a highlighted Boulder to start mining. Keep your Crude Pickaxe in your inventory, and wait until you’re finished. Moving away will interrupt mining.');
  };  helpAction=miningHelp;

  function reset(){helpAction=miningHelp;closeMenus();guide(null);inventoryMenu.guide(false);inventoryMenu.lock(false);advance=successNext=null;questsDone=skillsDone=inventoryDone=null;miningGuided=false;setStage('done');firstTree=false;showHelp(false);narrator.hide();tip.hide();}
  function advanceLine(){if(advance){const next=advance;advance=null;next();}}
  // The tip's Continue/Dismiss while the crafting tutorial owns it.
  function continueTip(){if(successNext){const next=successNext;successNext=null;next();}}
  menus.events.toggle=()=>{
    if(stage.startsWith('quests-')){if(stage==='quests-toggle'){setStage('quests-menu');panels.showNav();guide('open-quests');tutorial('Open the Quests tab to see your new quest.');}return true;}
    if(stage.startsWith('inventory-')){if(stage==='inventory-toggle'){setStage('inventory-menu');panels.showNav();guide('open-inventory');tutorial('Open the Inventory menu.');}return true;}
    if(stage.startsWith('skills-')){if(stage==='skills-toggle'){setStage('skills-menu');panels.showNav();guide('open-character');tutorial('Open the Character menu to see your skills.');}return true;}
    if(stage==='pickaxe'){panels.toggleNav();pickaxeGuide();return true;}
    if(['mining-intro','mining-crafted','mining-success','mining-craft','intro','crafting','craft-success','chop-dialogue','chop-success'].includes(stage))return true;
    if(stage==='menu'||stage==='retry'){
      advance=null;setStage('craft-menu');tutorial('Open the crafting menu.');panels.showNav();guide('open-crafting');
    }else return false;
    return true;
  };
  menus.events.openCrafting=()=>{
    if(stage.startsWith('quests-')||stage.startsWith('skills-')||stage.startsWith('inventory-'))return true;
    menus.openCrafting(stage==='pickaxe'?'pickaxes':'axes');
    if(stage==='pickaxe')selectRecipe('pickaxes');
    if(['craft-menu','recipe','retry'].includes(stage)){setStage('recipe');selectRecipe('axes');tutorial('Craft a Crude Axe.');guide('craft-axes');}
    pickaxeGuide();return true;
  };
  menus.events.closeCrafting=()=>{if(stage==='recipe'){setStage('retry');guide('game-menu-toggle');}pickaxeGuide();};
  function craftStarted(id){
    guide(null);
    if(id==='axes'&&stage==='recipe'){setStage('crafting');tutorial('Be patient while you’re crafting. If you move before you finish, you’ll have to start over!');}
    if(id==='pickaxes'&&stage==='pickaxe'){setStage('mining-craft');tutorial('Making your Crude Pickaxe… Moving before it’s finished will interrupt crafting.');}
  };
  return {
    craftStarted,
    debugCheckpoint:typeof __PLAYGROUND__!=='undefined'&&__PLAYGROUND__?async function(target){
      reset();host.hidden=false;firstTree=true;
      if(target.startsWith('quests-'))startQuests();
      else if(target.startsWith('skills-'))startSkills();
      else if(target.startsWith('inventory-'))startInventory();
      else if(['mining-intro','pickaxe','mining-craft','mining-crafted','mine','mining-success'].includes(target))startMining();
      else this.start();
      // Follow real transitions to install the same callbacks and menu locks as gameplay.
      for(let n=0;n<40&&stage!==target;n++){
        await Promise.resolve();
        if(advance){const fn=advance;advance=null;fn();}
        else if(successNext){const fn=successNext;successNext=null;fn();}
        else if(['quests-toggle','skills-toggle','inventory-toggle','menu'].includes(stage))$('game-menu-toggle').click();
        else if(stage==='quests-menu')$('open-quests').click();
        else if(stage==='skills-menu')$('open-character').click();
        else if(stage==='inventory-menu')$('open-inventory').click();
        else if(stage==='inventory-select'){inventoryMenu.panel.querySelector('[data-item="sticks"]')?.click();}
        else if(stage==='craft-menu')$('open-crafting').click();
        else if(stage==='recipe'){
          if(target==='crafting'){$('craft-axes').click();break;}
          setStage('crafting');this.craftComplete('axes');
        }else if(stage==='chop')this.chopped(1);
        else if(stage==='pickaxe'){
          if(target==='mining-craft'){$('craft-pickaxes').click();break;}
          setStage('mining-craft');this.craftComplete('pickaxes');
        }else if(stage==='mine')this.mined();else break;
      }
      if(stage!==target)throw Error(`Could not load ${target}; stopped at ${stage}.`);
    }:undefined,
    onStageChange(listener){stageListeners.add(listener);return ()=>stageListeners.delete(listener);},
    sayChapter(text,next){setStage('done');say(text,next);},
    showChapterTip(title,text,next=null,onHelp=null){setStage('done');tutorial(text,title==='Well done!'||title.includes('Complete'),next);tip.update({title});helpAction=onHelp||(()=>{});showHelp(!!onHelp);},
    previewTip(){tutorial('Click a resource and wait to finish gathering. Your Quests tab keeps track of your progress.');},
    startQuests,questsOpened,startSkills,startInventory,startMining,reset,
    start(){ panels.setAvailable('crafting',true);setStage('intro');lineIndex=0;nextIntro();},
    get blocksMovement(){return !['inactive','crafting','retry','chop','done','pickaxe','mining-craft','mine'].includes(stage);},
    get highlightBoulders(){return stage==='mine'&&miningGuided;},
    get highlightTrees(){return stage==='chop'&&firstTree;},
    get stage(){return stage;},
    // Reactive stage for UI that must follow lessons (journal close locks).
    stageState:computed(()=>stageState.value),
    craftCancelled(){if(stage==='mining-craft'){pickaxePrompt();return;}if(stage==='crafting'){setStage('retry');guide('game-menu-toggle');tutorial('Crafting interrupted. Your materials are safe. Open the menu and craft a Crude Axe again.');}},
    craftComplete(output){if(!['axes','pickaxes'].includes(output))return;finishObjective(output==='pickaxes'?'pickaxe':'axe');if(stage==='mining-craft'&&output==='pickaxes'){setStage('mining-crafted');tutorial('Crude Pickaxe crafted! You’re ready to mine.',true,()=>{setStage('mining-intro');say('Remember how you cut down a tree? Mining Stone works the same way!',()=>say('With your pickaxe in your inventory, find a boulder and give it a try.',activateMining));});return;}if(stage==='crafting'&&output==='axes'){setStage('craft-success');tutorial('You crafted a Crude Axe! Your new tool is in your inventory.',true,()=>{setStage('chop-dialogue');say("All right! We've got an axe! Let's do some light deforestation!",activateChopping);});}},
    chopped(logs){finishObjective('chop');if(firstTree){firstTree=false;setStage('chop-success');tutorial(`You chopped your first tree and gained Small Logs ×${logs}!`,true,startMining);}},
    mined(){finishObjective('mine');if(stage==='mine'){setStage('mining-success');miningGuided=false;tutorial('You mined your first Stone! With better resources comes the ability to craft better tools. Be on the lookout for better materials on your adventures!',true,()=>{setStage('done');tip.hide();onComplete();});}},
  };
}
