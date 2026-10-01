import {createInventoryMenu} from './inventory-menu.js';
import {showGatheringCompletion} from './opening.js';
import {GATHERING_XP_PER_LEVEL} from './skills.js';
const introduction=[
  "Wow! Look at you go. You've already picked up some resources and gained some experience with a little level growth to boot!",
  'Keep an eye out for items that could be sitting around on the ground. You never know what you might find.',
  "That being said, you're not going to find everything you need just sitting on the ground.",
  "See those trees over there? If we could chop them down, I bet we'd get some even better resources.",
  "Unfortunately you're going to have a hard time taking one down without an axe.",
  "So let's learn about crafting.",
  "Open your game menu again. This time, we'll make something!"
];
export function createCraftingTutorial({getInventory,getSkills,startCraft,freePlay=false,onComplete=()=>{}}){
  const $=id=>document.getElementById(id);
  let stage=freePlay?'done':'inactive',lineIndex=0,advance=null,successNext=null,firstTree=!freePlay;
  let skillsDone=null,inventoryDone=null;
  if(!$('tutorial-continue')){const b=document.createElement('button');b.id='tutorial-continue';b.hidden=true;$('gather-tutorial').append(b);}
  const host=document.createElement('div');host.id='game-menus';host.hidden=!freePlay;
  host.innerHTML=`<button id="game-menu-toggle" aria-label="Open game menu" aria-expanded="false"><span aria-hidden="true">☰</span></button>
    <nav id="game-menu-bar" hidden aria-label="Game menu"><button id="open-skills">Skills</button><button id="open-inventory" hidden>Inventory</button><button id="open-crafting" hidden>Crafting</button></nav>
    <section id="crafting-panel" hidden aria-label="Crafting"><div class="crafting-heading"><h2>Crafting</h2><button id="close-crafting" aria-label="Close crafting menu">×</button></div><p class="crafting-intro">Something useful from something simple.</p>
      <button id="craft-axe" class="recipe"><span class="axe-symbol" aria-hidden="true">⚒</span><span><strong class="item-name">Crude Axe</strong><small>1 Stick + 1 Stone · 2 seconds</small></span><span aria-hidden="true">→</span></button>
      <p id="crafting-stock"></p><p id="recipe-error" role="status"></p>
    </section>`;
  document.body.append(host);
  const skillsPanel=document.createElement('section');skillsPanel.id='skills-panel';skillsPanel.hidden=true;skillsPanel.setAttribute('aria-label','Skills');
  skillsPanel.innerHTML='<div class="crafting-heading"><h2>Skills</h2><button id="close-skills" aria-label="Close skills menu">×</button></div><div id="skills-list"></div>';
  host.append(skillsPanel);$('open-crafting').hidden=!freePlay;
  const inventoryMenu=createInventoryMenu(host,getInventory,id=>{
    if(stage!=='inventory-select'||id!=='sticks')return;
    stage='inventory-detail';inventoryMenu.guide(false);
    tutorial("Select an item to read about it. These sticks might not look like much, but they'll come in handy soon!",true,()=>{
      closeMenus();guide(null);inventoryMenu.lock(false);stage=freePlay?'done':'inactive';
      const done=inventoryDone;inventoryDone=null;
      if(done)done();else{showGatheringCompletion();successNext=()=>{$('gather-tutorial').hidden=true;};}
    });$('tutorial-title').textContent='TUTORIAL';$('tutorial-continue').textContent='Got it!';
  },()=>{if(!stage.startsWith('inventory-'))closeMenus();});
  $('open-inventory').hidden=!freePlay;
  function openInventory(){closeMenus();inventoryMenu.open();}
  $('open-inventory').onclick=()=>{
    if(stage==='inventory-menu'){
      stage='inventory-stacks';guide(null);openInventory();inventoryMenu.lock(true);
      tutorial("Here are your supplies! Items of the same type stack together. The number on each stack shows how many you're carrying.",true,()=>{
        stage='inventory-select';tutorial('Select your Sticks to take a closer look.');inventoryMenu.guide(true);
      });$('tutorial-title').textContent='TUTORIAL';$('tutorial-continue').textContent='Continue';
    }else if(['inactive','done','chop'].includes(stage))openInventory();
  };
  function startInventory(done){
    closeMenus();guide(null);advance=null;successNext=null;inventoryDone=done;stage='inventory-intro';host.hidden=false;
    say('Now, what happened to all those sticks and stones you picked up?',()=>say('Assuming no holes in reality, you should have them stored safe and sound.',()=>say("Everything you collect goes into your inventory. Let's have a look!",()=>{
      $('open-inventory').hidden=false;stage='inventory-toggle';guide('game-menu-toggle');tutorial('Open the game menu to check your inventory.');
    })));
  }
  function renderSkills(){
    $('close-skills').disabled=stage.startsWith('skills-');
    $('skills-list').innerHTML=Object.entries(getSkills()).map(([name,skill])=>{
      const progress=skill.xp%GATHERING_XP_PER_LEVEL,remaining=GATHERING_XP_PER_LEVEL-progress;
      return `<article class="skill-entry ${stage==='skills-detail'&&name==='Gathering'?'skill-focus':''}"><div><strong>${name}</strong><b>Level ${skill.level}</b></div><p>${skill.xp} total XP</p><progress max="${GATHERING_XP_PER_LEVEL}" value="${progress}" aria-label="${name} progress toward level ${skill.level+1}"></progress><small>${progress} / ${GATHERING_XP_PER_LEVEL} XP toward Level ${skill.level+1}</small><small>${remaining} XP to next level</small></article>`;
    }).join('');
  }
  function openSkills(){closeMenus();renderSkills();skillsPanel.hidden=false;}
  $('open-skills').onclick=()=>{
    if(stage==='skills-menu'){
      stage='skills-detail';guide(null);openSkills();
      tutorial("Here's your Gathering skill! Each skill shows your current level, total experience, and progress toward the next level. You've reached Gathering level 2!",true,()=>{
        stage='skills-summary';renderSkills();tutorial('You can check your skills here any time. Skills improve as you use them, so try different activities and watch yourself grow!',true,()=>{
          const done=skillsDone;skillsDone=null;startInventory(done);
        });$('tutorial-title').textContent='TUTORIAL';$('tutorial-continue').textContent='Got it!';
      });$('tutorial-title').textContent='TUTORIAL';$('tutorial-continue').textContent='Continue';
    }else if(['inactive','done','chop'].includes(stage))openSkills();
  };
  $('close-skills').onclick=()=>{if(!stage.startsWith('skills-'))closeMenus();};
  function startSkills(done){
    closeMenus();skillsDone=done;stage='skills-intro';
    say("Want to see how far you've come? Let's take a peek at your skills.",()=>say('Go ahead and open the game menu!',()=>say('Oh, right, sorry, just a sec...',()=>{
      host.hidden=false;guide('game-menu-toggle');
      say('There we go! Now you can keep track of all those growing talents.',()=>{stage='skills-toggle';tutorial('Open the game menu to check your skills.');});
    })));
  }

  function guide(id){for(const node of host.querySelectorAll('.gold-guide'))node.classList.remove('gold-guide');if(id)$(id).classList.add('gold-guide');}
  function closeMenus(){ $('game-menu-bar').hidden=true;$('crafting-panel').hidden=true;skillsPanel.hidden=true;inventoryMenu.close();$('game-menu-toggle').setAttribute('aria-expanded','false');}
  function writeItems(element,text){
    element.replaceChildren();
    for(const part of text.split(/(Crude Axe|Wooden Logs|Stick|Stone)/g)){
      if(/^(Crude Axe|Wooden Logs|Stick|Stone)$/.test(part)){const strong=document.createElement('strong');strong.className='item-name';strong.textContent=part;element.append(strong);}
      else element.append(document.createTextNode(part));
    }
  }
  function tutorial(text,success=false,next=null){
    $('dialogue').hidden=true;$('gather-tutorial').hidden=false;
    $('tutorial-title').textContent=success?'✓ Well done!':'TUTORIAL';
    $('tutorial-count').textContent='';writeItems($('tutorial-copy'),text);
    $('gather-tutorial').querySelector('.progress-track').hidden=true;
    $('gather-tutorial').classList.toggle('complete',success);
    $('tutorial-continue').hidden=!success;$('tutorial-continue').textContent='Click to continue';successNext=next;
  }
  function say(text,next){
    $('gather-tutorial').hidden=true;$('dialogue').hidden=false;$('dialogue-line').textContent=text;
    $('dialogue').setAttribute('aria-label',text);$('dialogue').tabIndex=0;
    $('dialogue-controls').replaceChildren();$('dialogue-prompt').hidden=false;advance=next;
  }
  function nextIntro(){
    if(lineIndex<introduction.length){const last=lineIndex===introduction.length-1;say(introduction[lineIndex++],last?()=>{host.hidden=false;stage='menu';guide('game-menu-toggle');tutorial('Open the game menu using the glowing button.');}:nextIntro);}
  }
  function activateChopping(){stage='chop';guide(null);tutorial('Click on a tree with an appropriate tool in your inventory to start chopping it down. Be patient! If you move before you finish, you’ll have to start over!');}
  function advanceLine(event){if(event.target.closest('button,input,label'))return;if(advance){const next=advance;advance=null;next();}}
  $('dialogue').addEventListener('click',advanceLine);
  $('dialogue').addEventListener('keydown',e=>{if(e.target===$('dialogue')&&(e.key==='Enter'||e.key===' ')){e.preventDefault();advanceLine(e);}});
  $('tutorial-continue')?.addEventListener('click',()=>{if(successNext){const next=successNext;successNext=null;next();}});
  $('game-menu-toggle').addEventListener('click',()=>{
    if(stage.startsWith('inventory-')){if(stage==='inventory-toggle'){stage='inventory-menu';$('game-menu-bar').hidden=false;$('game-menu-toggle').setAttribute('aria-expanded','true');guide('open-inventory');tutorial('Open the Inventory menu.');}return;}
    if(stage.startsWith('skills-')){if(stage==='skills-toggle'){stage='skills-menu';$('game-menu-bar').hidden=false;$('game-menu-toggle').setAttribute('aria-expanded','true');guide('open-skills');tutorial('Open the Skills menu.');}return;}
    if(['intro','crafting','craft-success','chop-dialogue','chop-success'].includes(stage))return;
    if(stage==='menu'||stage==='retry'){
      advance=null;stage='craft-menu';tutorial('Open the crafting menu.');$('game-menu-bar').hidden=false;guide('open-crafting');
    }else $('game-menu-bar').hidden=!$('game-menu-bar').hidden;
    $('game-menu-toggle').setAttribute('aria-expanded',String(!$('game-menu-bar').hidden));
  });
  $('open-crafting').addEventListener('click',()=>{
    if(stage.startsWith('skills-')||stage.startsWith('inventory-'))return;
    closeMenus();
    $('crafting-panel').hidden=false;$('game-menu-bar').hidden=true;$('game-menu-toggle').setAttribute('aria-expanded','false');
    if(['craft-menu','recipe','retry'].includes(stage)){stage='recipe';tutorial('Craft a Crude Axe.');guide('craft-axe');}
    refresh();
  });
  $('close-crafting').addEventListener('click',()=>{closeMenus();if(stage==='recipe'){stage='retry';guide('game-menu-toggle');}});
  $('craft-axe').addEventListener('click',()=>{
    if(!['recipe','chop','done'].includes(stage))return;
    if(!startCraft()){$('recipe-error').textContent='You need 1 Stick and 1 Stone, and must finish moving first.';return;}
    closeMenus();guide(null);
    if(stage==='recipe'){stage='crafting';tutorial('Be patient while you’re crafting. If you move before you finish, you’ll have to start over!');}
  });
  function refresh(){if(!inventoryMenu.panel.hidden)inventoryMenu.refresh();if(!skillsPanel.hidden)renderSkills();const i=getInventory();$('crafting-stock').textContent=`Sticks: ${i.sticks} · Stones: ${i.stones} · Crude Axes: ${i.axes||0} · Wooden Logs: ${i.logs||0}`;$('recipe-error').textContent='';$('craft-axe').disabled=i.sticks<1||i.stones<1;}
  return {
    startSkills,openSkills,startInventory,openInventory,
    start(){ $('open-crafting').hidden=false;stage='intro';lineIndex=0;nextIntro();},
    get blocksMovement(){return !['inactive','crafting','retry','chop','done'].includes(stage);},
    get canChop(){return stage==='chop'||stage==='done';},
    get highlightTrees(){return stage==='chop'&&firstTree;},
    get stage(){return stage;},
    craftCancelled(){if(stage==='crafting'){stage='retry';guide('game-menu-toggle');tutorial('Crafting interrupted. Your materials are safe. Open the menu and craft a Crude Axe again.');}},
    craftComplete(){refresh();if(stage==='crafting'){stage='craft-success';tutorial('You crafted a Crude Axe! Your new tool is in your inventory.',true,()=>{stage='chop-dialogue';say("All right! We've got an axe! Let's do some light deforestation!",activateChopping);});}},
    chopped(logs){refresh();if(firstTree){firstTree=false;stage='chop-success';tutorial(`You chopped your first tree and gained ${logs} Wooden Logs!`,true,()=>{stage='done';$('gather-tutorial').hidden=true;onComplete();});}},
    closeMenus,refresh
  };
}
