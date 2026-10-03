import {RECIPES,canMake} from './willowbank-rules.js';
import {ITEMS} from './items.js';
import {updateObjective,finishObjective,setObjectiveHelp} from './quests.js';
import {icon} from './icons.js';
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
export function createCraftingTutorial({getInventory,getSkills,startCraft,equipment={},chapter={},freePlay=false,onComplete=()=>{}}){
  const $=id=>document.getElementById(id);
  let stage=freePlay?'done':'inactive',lineIndex=0,advance=null,successNext=null,firstTree=!freePlay;
  let skillsDone=null,inventoryDone=null,questsDone=null,miningGuided=false;
  const help=document.createElement('button');help.id='tutorial-help';help.textContent='Show me how';help.hidden=true;$('gather-tutorial').append(help);
  if(!$('tutorial-continue')){const b=document.createElement('button');b.id='tutorial-continue';b.hidden=true;$('gather-tutorial').append(b);}
  const actions=document.createElement('div');actions.className='tutorial-actions';actions.append(help,$('tutorial-continue'));$('gather-tutorial').append(actions);
  const host=document.createElement('div');host.id='game-menus';host.hidden=!freePlay;
  host.innerHTML=`<button id="game-menu-toggle" aria-label="Open game menu" aria-expanded="false"><span aria-hidden="true">☰</span></button>
    <nav id="game-menu-bar" hidden aria-label="Game menu"><button id="open-skills">Skills</button><button id="open-inventory" hidden>Inventory</button><button id="open-crafting" hidden>Crafting</button></nav>
    <section id="crafting-panel" hidden aria-label="Crafting"><div class="crafting-heading"><h2>Crafting</h2><button id="close-crafting" aria-label="Close crafting menu">×</button></div>
      <div class="recipe-choices"><button class="recipe-choice" id="choose-axe" aria-pressed="true">${icon('axes')} Crude Axe</button><button class="recipe-choice" id="choose-pickaxe" aria-pressed="false" hidden>${icon('pickaxes')} Crude Pickaxe</button></div>
      <article class="recipe-detail" id="axe-detail"><h3>Crude Axe</h3><p>A simple tool for chopping trees.</p><div class="ingredient-counts" id="axe-ingredients"></div><div class="recipe-facts"><span>Time · 2 seconds</span><span>Produces · Crude Axe ×1</span></div><button id="craft-axe" class="recipe">Craft Crude Axe</button></article>
      <article class="recipe-detail" id="pickaxe-detail" hidden><h3>Crude Pickaxe</h3><p>A simple tool for mining boulders.</p><div class="ingredient-counts" id="pickaxe-ingredients"></div><div class="recipe-facts"><span>Time · 2 seconds</span><span>Produces · Crude Pickaxe ×1</span></div><button id="craft-pickaxe" class="recipe" hidden>Craft Crude Pickaxe</button></article>
      <p id="recipe-error" role="status"></p>
    </section>`;
  document.body.append(host);
  const skillsPanel=document.createElement('section');skillsPanel.id='skills-panel';skillsPanel.hidden=true;skillsPanel.setAttribute('aria-label','Skills');
  skillsPanel.innerHTML='<div class="crafting-heading"><h2>Skills</h2><button id="close-skills" aria-label="Close skills menu">×</button></div><input id="skills-search" class="journal-search" type="search" placeholder="Search skills…" aria-label="Search skills"><div id="skills-list"></div>';
  host.append(skillsPanel);$('open-crafting').hidden=!freePlay;$('craft-pickaxe').hidden=!freePlay;$('choose-pickaxe').hidden=!freePlay;
  const recipeKinds=['axe','pickaxe',...Object.keys(RECIPES).filter(k=>!RECIPES[k].station)];
  for(const kind of recipeKinds.slice(2)){const recipe=RECIPES[kind];const choice=document.createElement('button');choice.className='recipe-choice';choice.id='choose-'+kind;choice.hidden=true;choice.innerHTML=icon(kind)+' '+recipe.name;choice.onclick=()=>selectRecipe(kind);$('crafting-panel').querySelector('.recipe-choices').append(choice);const detail=document.createElement('article');detail.id=kind+'-detail';detail.className='recipe-detail';detail.hidden=true;detail.innerHTML=`<h3>${recipe.name}</h3><p>${ITEMS[kind].description}</p><div class="ingredient-counts" id="${kind}-ingredients"></div><div class="recipe-facts"><span>Time · ${recipe.duration} seconds</span><span>Produces · ${recipe.name} ×1</span></div><button class="recipe" id="craft-${kind}">Craft ${recipe.name}</button>`;$('crafting-panel').insertBefore(detail,$('recipe-error'));$('craft-'+kind).onclick=()=>{if(chapter.craft?.(kind))closeMenus();};}
  const recipeBrowser=document.createElement('div');recipeBrowser.className='recipe-browser';
  const recipeDetails=document.createElement('div');recipeDetails.className='recipe-details';
  const recipeBack=document.createElement('button');recipeBack.className='recipe-back';recipeBack.textContent='← All recipes';recipeBack.onclick=()=>{$('crafting-panel').classList.remove('viewing-recipe');};
  recipeDetails.append(recipeBack);for(const kind of recipeKinds)recipeDetails.append($(kind+'-detail'));
  recipeBrowser.append($('crafting-panel').querySelector('.recipe-choices'),recipeDetails);$('crafting-panel').insertBefore(recipeBrowser,$('recipe-error'));
  function selectRecipe(name){$('crafting-panel').classList.add('viewing-recipe');for(const kind of recipeKinds){$(kind+'-detail').hidden=kind!==name;$('choose-'+kind).setAttribute('aria-pressed',String(kind===name));}if(miningGuided&&stage==='pickaxe')guide(name==='pickaxe'?'craft-pickaxe':'choose-pickaxe');}
  $('choose-axe').onclick=()=>selectRecipe('axe');$('choose-pickaxe').onclick=()=>selectRecipe('pickaxe');
  const inventoryMenu=createInventoryMenu(host,getInventory,id=>{
    if(stage!=='inventory-select'||id!=='sticks')return;
    stage='inventory-detail';inventoryMenu.guide(false);
    tutorial("Select an item to read about it. These sticks might not look like much, but they'll come in handy soon!",true,()=>{
      closeMenus();guide(null);inventoryMenu.lock(false);stage=freePlay?'done':'inactive';
      finishObjective('inventory');const done=inventoryDone;inventoryDone=null;
      if(done)done();else{showGatheringCompletion();successNext=()=>{$('gather-tutorial').hidden=true;};}
    });$('tutorial-title').textContent='A closer look';$('tutorial-continue').textContent='Got it!';
  },()=>{if(!stage.startsWith('inventory-'))closeMenus();},equipment);
  $('open-inventory').hidden=!freePlay;
  function openInventory(){closeMenus();inventoryMenu.open();}
  $('open-inventory').onclick=()=>{
    if(stage==='inventory-menu'){
      stage='inventory-stacks';guide(null);openInventory();inventoryMenu.lock(true);
      tutorial("Here are your supplies! Items of the same type stack together. The number on each stack shows how many you're carrying.",true,()=>{
        stage='inventory-select';tutorial('Select your Sticks stack to take a closer look.');inventoryMenu.guide(true);
      });$('tutorial-title').textContent='A closer look';$('tutorial-continue').textContent='Continue';
    }else if(['inactive','done','chop','pickaxe','mine'].includes(stage))openInventory();
  };
  function startInventory(done){
    closeMenus();guide(null);advance=null;successNext=null;inventoryDone=done;stage='inventory-intro';host.hidden=false;
    say('Now, what happened to all those sticks and rocks you picked up?',()=>say('Assuming no holes in reality, you should have them stored safe and sound.',()=>say("Everything you collect goes into your inventory. Let's have a look!",()=>{
      $('open-inventory').hidden=false;stage='inventory-toggle';guide('game-menu-toggle');tutorial('Open the game menu to check your inventory.');
    })));
  }
  $('skills-search').oninput=()=>renderSkills();
  const skillRows=new Map();
  function renderSkills(){
    $('close-skills').disabled=stage.startsWith('skills-');
    const skills=getSkills(),search=($('skills-search').value||'').toLowerCase();
    for(const [name,row] of skillRows)if(!skills[name]){row.remove();skillRows.delete(name);}
    for(const [name,skill] of Object.entries(skills)){
      let row=skillRows.get(name);
      if(!row){
        row=document.createElement('details');row.dataset.skill=name;row.className='skill-entry';
        row.innerHTML=`<summary>${icon(name)}<strong>${name}</strong><b></b><progress max="${GATHERING_XP_PER_LEVEL}" aria-label="${name} progress"></progress></summary><p></p><progress max="${GATHERING_XP_PER_LEVEL}"></progress><small></small><small></small>`;
        skillRows.set(name,row);$('skills-list').append(row);
      }
      row.hidden=!name.toLowerCase().includes(search);
      const focus=stage==='skills-detail'&&name==='Gathering';
      // Open once on entering the lesson, without overriding subsequent clicks.
      if(focus&&!row.tutorialFocused)row.open=true;
      row.tutorialFocused=focus;row.classList.toggle('skill-focus',focus);
      const signature=`${skill.level}:${skill.xp}`;
      if(row.skillSignature===signature)continue;
      row.skillSignature=signature;
      const progress=skill.xp%GATHERING_XP_PER_LEVEL,remaining=GATHERING_XP_PER_LEVEL-progress;
      row.querySelector('b').textContent=`Lv ${skill.level}`;
      row.querySelector('p').textContent=`${skill.xp} total XP`;
      const bars=row.querySelectorAll('progress');for(const bar of bars)bar.value=progress;
      bars[1].setAttribute('aria-label',`${name} progress toward level ${skill.level+1}`);
      const labels=row.querySelectorAll('small');
      labels[0].textContent=`${progress} / ${GATHERING_XP_PER_LEVEL} XP toward Level ${skill.level+1}`;
      labels[1].textContent=`${remaining} XP to next level`;
    }
  }
  function openSkills(){closeMenus();$('skills-search').value='';renderSkills();skillsPanel.hidden=false;}
  $('open-skills').onclick=()=>{
    if(stage==='skills-menu'){
      stage='skills-detail';guide(null);openSkills();
      tutorial("Here's your Gathering skill! Each skill shows your current level, total experience, and progress toward the next level. You've reached Gathering level 2!",true,()=>{
        stage='skills-summary';renderSkills();tutorial('You can check your skills here any time. Skills improve as you use them, so try different activities and watch yourself grow!',true,()=>{
          finishObjective('skills');const done=skillsDone;skillsDone=null;startInventory(done);
        });$('tutorial-title').textContent='A closer look';$('tutorial-continue').textContent='Got it!';
      });$('tutorial-title').textContent='A closer look';$('tutorial-continue').textContent='Continue';
    }else if(['inactive','done','chop','pickaxe','mine'].includes(stage))openSkills();
  };
  $('close-skills').onclick=()=>{if(!stage.startsWith('skills-'))closeMenus();};
  function startQuests(done){
    closeMenus();guide(null);advance=null;questsDone=done;stage='quests-intro';host.hidden=true;
    updateObjective('gather','Collect ground items','Collect all six handfuls of Sticks and Rocks scattered around the clearing. Click or tap a resource and wait until gathering finishes.',0,6);
    tutorial("You've been given a quest! Open your game menu to view your quests.",false,()=>{
      stage='quests-reveal';
      say('Oh wait, I forgot... here you go!',()=>{
        stage='quests-toggle';tutorial('Open your menu with the button in the top right corner');
      });
      host.hidden=false;guide('game-menu-toggle');
    });
  }
  function questsOpened(){
    if(stage!=='quests-menu')return;
    stage='quests-detail';guide(null);
    tutorial('Here are your quests! Each quest shows what you need to do and tracks your progress. Your first task is to collect six items from the ground. You can return here whenever you need a reminder.',false,()=>{
      closeMenus();stage=freePlay?'done':'inactive';$('gather-tutorial').hidden=true;
      const done=questsDone;questsDone=null;if(done)done();
    });
  }
  function startSkills(done){
    closeMenus();skillsDone=done;stage='skills-intro';
    host.hidden=false;
    say("Want to see how far you've come? Let's take a peek at your skills.",()=>{
      guide('game-menu-toggle');stage='skills-toggle';tutorial('Open the game menu to check your skills.');
    });
  }

  function guide(id){for(const node of host.querySelectorAll('.gold-guide'))node.classList.remove('gold-guide');if(id)$(id).classList.add('gold-guide');}
  function closeMenus(){if($('settings-panel'))$('settings-panel').hidden=true;if($('companions-panel'))$('companions-panel').hidden=true; if($('quests-panel'))$('quests-panel').hidden=true;$('game-menu-bar').hidden=true;$('crafting-panel').hidden=true;skillsPanel.hidden=true;inventoryMenu.close();$('game-menu-toggle').setAttribute('aria-expanded','false');}
  function writeItems(element,text){
    element.replaceChildren();
    for(const part of text.split(/(Crude Pickaxe|Crude Axe|Small Logs|Sticks|Rocks|Stone|Boulder)/g)){
      if(/^(Crude Pickaxe|Crude Axe|Small Logs|Sticks|Rocks|Stone|Boulder)$/.test(part)){const strong=document.createElement('strong');strong.className='item-name';strong.textContent=part;element.append(strong);}
      else element.append(document.createTextNode(part));
    }
  }
  function tutorial(text,success=false,next=null){
    help.hidden=true;$('dialogue').hidden=true;$('gather-tutorial').hidden=false;
    $('tutorial-title').textContent=success?'Well done!':({chop:'Chop a tree',pickaxe:'Craft a Crude Pickaxe',mine:'Mine a boulder',recipe:'Craft a Crude Axe',crafting:'Crafting your axe','mining-craft':'Crafting your pickaxe'})[stage]||'Learning the ropes';
    $('tutorial-count').textContent='';writeItems($('tutorial-copy'),text);
    $('gather-tutorial').querySelector('.progress-track').hidden=true;
    $('gather-tutorial').classList.toggle('complete',success);
    $('tutorial-continue').disabled=false;$('tutorial-continue').hidden=false;$('tutorial-continue').textContent=next?'Continue':'Dismiss';successNext=next||(()=>{$('gather-tutorial').hidden=true;});
    const goals={menu:['axe','Craft a Crude Axe','Use the Crafting tab to make a Crude Axe with Sticks ×1 and Rocks ×1. Stay still until crafting finishes.'],chop:['chop','Chop a tree','With a Crude Axe in your inventory, click a tree in the clearing and wait to obtain Small Logs.'],pickaxe:['pickaxe','Craft a Crude Pickaxe','Use the Crafting tab to make a Crude Pickaxe with Sticks ×1 and Rocks ×1. Use Show me how if you need guidance.'],mine:['mine','Mine a boulder','With a Crude Pickaxe in your inventory, click a boulder in the clearing to obtain Stone. Stay still until mining finishes.']};
    if(goals[stage])updateObjective(...goals[stage]);
    if(stage.startsWith('skills-'))updateObjective('skills','Explore your skills',text);
    if(stage.startsWith('inventory-'))updateObjective('inventory','Check your inventory',text);
  }
  function say(text,next){
    help.hidden=true;$('gather-tutorial').hidden=true;$('dialogue').hidden=false;$('dialogue-line').textContent=text;
    $('dialogue').setAttribute('aria-label',text);$('dialogue').tabIndex=0;
    $('dialogue-controls').replaceChildren();$('dialogue-prompt').hidden=false;advance=next;
  }
  function nextIntro(){
    if(lineIndex<introduction.length){const last=lineIndex===introduction.length-1;say(introduction[lineIndex++],last?()=>{host.hidden=false;stage='menu';guide('game-menu-toggle');tutorial('Open the game menu using the glowing button.');}:nextIntro);}
  }
  function activateChopping(){stage='chop';guide(null);tutorial('Click on a tree with an appropriate tool in your inventory to start chopping it down. Be patient! If you move before you finish, you’ll have to start over!');}
  function pickaxeGuide(){
    if(!miningGuided||stage!=='pickaxe')return;
    guide(!$('crafting-panel').hidden?(!$('pickaxe-detail').hidden?'craft-pickaxe':'choose-pickaxe'):(!$('game-menu-bar').hidden||!skillsPanel.hidden||!inventoryMenu.panel.hidden)?'open-crafting':'game-menu-toggle');
  }
  function pickaxePrompt(){
    stage='pickaxe';setObjectiveHelp('pickaxe',()=>{closeMenus();help.onclick();});tutorial('Craft a Crude Pickaxe using Sticks ×1 and Rocks ×1.');help.hidden=miningGuided;pickaxeGuide();
  }
  function activateMining(){
    stage='mine';setObjectiveHelp('mine',()=>{closeMenus();help.onclick();});miningGuided=false;guide(null);tutorial('Mine a Boulder to collect Stone.');help.hidden=false;
  }
  function startMining(){
    help.onclick=miningHelp;
    closeMenus();guide(null);advance=null;successNext=null;miningGuided=false;stage='mining-intro';host.hidden=false;$('open-crafting').hidden=false;$('craft-pickaxe').hidden=false;$('choose-pickaxe').hidden=false;
    const lines=[
      'Nicely done! Wood will come in handy, but some things need something sturdier.',
      'See those boulders? We can mine some Stone from them.',
      "Those handfuls of Rocks you've collected are useful for simple tools. Let's make one that can tackle something bigger!",
      'Remember how you crafted the axe? Do the same thing, but this time make a Crude Pickaxe!'
    ];
    let index=0;const next=()=>index<lines.length?say(lines[index++],next):pickaxePrompt();next();
  }
  const miningHelp=help.onclick=()=>{
    miningGuided=true;help.hidden=true;
    if(stage==='pickaxe')pickaxeGuide();
    if(stage==='mine')tutorial('Click/Tap a highlighted Boulder to start mining. Keep your Crude Pickaxe in your inventory, and wait until you’re finished. Moving away will interrupt mining.');
  };
  function reset(){help.onclick=miningHelp;closeMenus();guide(null);inventoryMenu.guide(false);inventoryMenu.lock(false);advance=successNext=null;questsDone=null;miningGuided=false;stage='done';firstTree=false;help.hidden=true;$('dialogue').hidden=true;$('gather-tutorial').hidden=true;}
  function advanceLine(event){if(event.target.closest('button,input,label'))return;if(advance){const next=advance;advance=null;next();}}
  $('dialogue').addEventListener('click',advanceLine);
  $('dialogue').addEventListener('keydown',e=>{if(e.target===$('dialogue')&&(e.key==='Enter'||e.key===' ')){e.preventDefault();advanceLine(e);}});
  $('tutorial-continue')?.addEventListener('click',()=>{if(successNext){const next=successNext;successNext=null;next();}});
  $('game-menu-toggle').addEventListener('click',()=>{
    if(stage.startsWith('quests-')){if(stage==='quests-toggle'){stage='quests-menu';$('game-menu-bar').hidden=false;guide('open-quests');tutorial('Open the Quests tab to see your new quest.');}return;}
    if(stage.startsWith('inventory-')){if(stage==='inventory-toggle'){stage='inventory-menu';$('game-menu-bar').hidden=false;$('game-menu-toggle').setAttribute('aria-expanded','true');guide('open-inventory');tutorial('Open the Inventory menu.');}return;}
    if(stage.startsWith('skills-')){if(stage==='skills-toggle'){stage='skills-menu';$('game-menu-bar').hidden=false;$('game-menu-toggle').setAttribute('aria-expanded','true');guide('open-skills');tutorial('Open the Skills menu.');}return;}
    if(stage==='pickaxe'){$('game-menu-bar').hidden=!$('game-menu-bar').hidden;$('game-menu-toggle').setAttribute('aria-expanded',String(!$('game-menu-bar').hidden));pickaxeGuide();return;}
    if(['mining-intro','mining-crafted','mining-success','mining-craft','intro','crafting','craft-success','chop-dialogue','chop-success'].includes(stage))return;
    if(stage==='menu'||stage==='retry'){
      advance=null;stage='craft-menu';tutorial('Open the crafting menu.');$('game-menu-bar').hidden=false;guide('open-crafting');
    }else $('game-menu-bar').hidden=!$('game-menu-bar').hidden;
    $('game-menu-toggle').setAttribute('aria-expanded',String(!$('game-menu-bar').hidden));
  });
  $('open-crafting').addEventListener('click',()=>{$('crafting-panel').classList.remove('viewing-recipe');
    if(stage.startsWith('quests-')||stage.startsWith('skills-')||stage.startsWith('inventory-'))return;
    closeMenus();
    selectRecipe(stage==='pickaxe'?'pickaxe':'axe');$('crafting-panel').hidden=false;$('game-menu-bar').hidden=true;$('game-menu-toggle').setAttribute('aria-expanded','false');
    if(['craft-menu','recipe','retry'].includes(stage)){stage='recipe';tutorial('Craft a Crude Axe.');guide('craft-axe');}
    pickaxeGuide();refresh();if(stage==='done')$('crafting-panel').classList.remove('viewing-recipe');
  });
  $('close-crafting').addEventListener('click',()=>{closeMenus();if(stage==='recipe'){stage='retry';guide('game-menu-toggle');}pickaxeGuide();});
  $('craft-axe').addEventListener('click',()=>{
    if(!['recipe','done'].includes(stage))return;
    if(!startCraft('axes')){$('recipe-error').textContent='You need Sticks ×1 and Rocks ×1, and must finish moving first.';return;}
    closeMenus();guide(null);
    if(stage==='recipe'){stage='crafting';tutorial('Be patient while you’re crafting. If you move before you finish, you’ll have to start over!');}
  });
  $('craft-pickaxe').onclick=()=>{
    if(!['pickaxe','mine','done'].includes(stage))return;
    if(!startCraft('pickaxes')){$('recipe-error').textContent='You need Sticks ×1 and Rocks ×1, and must finish moving first.';return;}
    closeMenus();guide(null);
    if(stage==='pickaxe'){stage='mining-craft';tutorial('Making your Crude Pickaxe… Moving before it’s finished will interrupt crafting.');}
  };
  function refresh(){$('crafting-panel').classList.toggle('chapter-recipes',!!chapter.unlocked?.());for(const kind of recipeKinds.slice(2)){const r=RECIPES[kind],inv=getInventory();$('choose-'+kind).hidden=!chapter.unlocked?.();$('craft-'+kind).disabled=!canMake(inv,r);$('craft-'+kind).title=canMake(inv,r)?'':'Missing the ingredients or tool listed above';$(kind+'-ingredients').innerHTML=Object.entries({...r.cost,...r.tools}).map(([id,n])=>`<span class="ingredient ${inv[id]>=n?'enough':'missing'}">${icon(id)} ${ITEMS[id].name} · ${n} required / ${inv[id]||0} owned${r.tools?.[id]?' · Reusable tool':''}</span>`).join('');}if(!inventoryMenu.panel.hidden)inventoryMenu.refresh();if(!skillsPanel.hidden)renderSkills();const i=getInventory();for(const kind of ['axe','pickaxe']){$(kind+'-ingredients').innerHTML=[['sticks','Sticks'],['stones','Rocks']].map(([key,name])=>`<span class="ingredient ${i[key]>=1?'enough':'missing'}">${icon(key)}<span>${name} · 1 required / ${i[key]||0} owned${i[key]>=1?'':' · Missing 1'}</span></span>`).join('');}$('recipe-error').textContent='';$('craft-axe').disabled=i.sticks<1||i.stones<1||!['recipe','done'].includes(stage);$('craft-pickaxe').disabled=i.sticks<1||i.stones<1||!['pickaxe','mine','done'].includes(stage);}
  return {
    selectRecipe,
    sayChapter(text,next){stage='done';say(text,next);},
    showChapterTip(title,text,next=null,onHelp=null){stage='done';tutorial(text,title==='Well done!'||title.includes('Complete'),next);$('tutorial-title').textContent=title;help.hidden=!onHelp;help.onclick=onHelp||(()=>{});},
    previewTip(){tutorial('Click a resource and wait to finish gathering. Your Quests tab keeps track of your progress.');},
    startQuests,questsOpened,startSkills,openSkills,startInventory,openInventory,startMining,reset,
    start(){ $('open-crafting').hidden=false;stage='intro';lineIndex=0;nextIntro();},
    get blocksMovement(){return !['inactive','crafting','retry','chop','done','pickaxe','mining-craft','mine'].includes(stage);},
    get canMine(){return stage==='mine'||stage==='done';},
    get highlightBoulders(){return stage==='mine'&&miningGuided;},
    get canChop(){return stage==='chop'||stage==='done';},
    get highlightTrees(){return stage==='chop'&&firstTree;},
    get stage(){return stage;},
    craftCancelled(){if(stage==='mining-craft'){pickaxePrompt();return;}if(stage==='crafting'){stage='retry';guide('game-menu-toggle');tutorial('Crafting interrupted. Your materials are safe. Open the menu and craft a Crude Axe again.');}},
    craftComplete(output){finishObjective(output==='pickaxes'?'pickaxe':'axe');refresh();if(stage==='mining-craft'&&output==='pickaxes'){stage='mining-crafted';tutorial('Crude Pickaxe crafted! You’re ready to mine.',true,()=>{stage='mining-intro';say('Remember how you cut down a tree? Mining Stone works the same way!',()=>say('With your pickaxe in your inventory, find a boulder and give it a try.',activateMining));});return;}if(stage==='crafting'){stage='craft-success';tutorial('You crafted a Crude Axe! Your new tool is in your inventory.',true,()=>{stage='chop-dialogue';say("All right! We've got an axe! Let's do some light deforestation!",activateChopping);});}},
    chopped(logs){finishObjective('chop');refresh();if(firstTree){firstTree=false;stage='chop-success';tutorial(`You chopped your first tree and gained Small Logs ×${logs}!`,true,startMining);}},
    mined(){finishObjective('mine');refresh();if(stage==='mine'){stage='mining-success';miningGuided=false;tutorial('You mined your first Stone! With better resources comes the ability to craft better tools. Be on the lookout for better materials on your adventures!',true,()=>{stage='done';$('gather-tutorial').hidden=true;onComplete();});}},
    closeMenus,refresh
  };
}
