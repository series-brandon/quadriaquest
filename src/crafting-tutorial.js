const introduction=[
  "Wow! Look at you go. You've already picked up some resources and gained some experience with a little level growth to boot!",
  'Keep an eye out for items that could be sitting around on the ground. You never know what you might find.',
  "That being said, you're not going to find everything you need just sitting on the ground.",
  "See those trees over there? If we could chop them down, I bet we'd get some even better resources.",
  "Unfortunately you're going to have a hard time taking one down without an axe.",
  "So let's learn about crafting.",
  "Let's go ahead and open the game menu!",
  'Oh, right, sorry, just a sec...',
  'There we go! Now you should be able to get into your menus to craft what we need.'
];
export function createCraftingTutorial({getInventory,startCraft,freePlay=false,onComplete=()=>{}}){
  const $=id=>document.getElementById(id);
  let stage=freePlay?'done':'inactive',lineIndex=0,advance=null,successNext=null,firstTree=!freePlay;
  const host=document.createElement('div');host.id='game-menus';host.hidden=!freePlay;
  host.innerHTML=`<button id="game-menu-toggle" aria-label="Open game menu" aria-expanded="false"><span aria-hidden="true">☰</span></button>
    <nav id="game-menu-bar" hidden aria-label="Game menu"><button id="open-crafting">Crafting</button></nav>
    <section id="crafting-panel" hidden aria-label="Crafting"><div class="crafting-heading"><h2>Crafting</h2><button id="close-crafting" aria-label="Close crafting menu">×</button></div><p class="crafting-intro">Something useful from something simple.</p>
      <button id="craft-axe" class="recipe"><span class="axe-symbol" aria-hidden="true">⚒</span><span><strong class="item-name">Crude Axe</strong><small>1 Stick + 1 Stone · 2 seconds</small></span><span aria-hidden="true">→</span></button>
      <p id="crafting-stock"></p><p id="recipe-error" role="status"></p>
    </section>`;
  document.body.append(host);
  function guide(id){for(const node of host.querySelectorAll('.gold-guide'))node.classList.remove('gold-guide');if(id)$(id).classList.add('gold-guide');}
  function closeMenus(){ $('game-menu-bar').hidden=true;$('crafting-panel').hidden=true;$('game-menu-toggle').setAttribute('aria-expanded','false');}
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
    if(lineIndex===8){host.hidden=false;guide('game-menu-toggle');stage='menu';}
    if(lineIndex<introduction.length){const last=lineIndex===8;say(introduction[lineIndex++],last?()=>tutorial('Open the game menu using the glowing button.'):nextIntro);}
  }
  function activateChopping(){stage='chop';guide(null);tutorial('Click on a tree with an appropriate tool in your inventory to start chopping it down. Be patient! If you move before you finish, you’ll have to start over!');}
  function advanceLine(event){if(event.target.closest('button,input,label'))return;if(advance){const next=advance;advance=null;next();}}
  $('dialogue').addEventListener('click',advanceLine);
  $('dialogue').addEventListener('keydown',e=>{if(e.target===$('dialogue')&&(e.key==='Enter'||e.key===' ')){e.preventDefault();advanceLine(e);}});
  $('tutorial-continue')?.addEventListener('click',()=>{if(successNext){const next=successNext;successNext=null;next();}});
  $('game-menu-toggle').addEventListener('click',()=>{
    if(['intro','crafting','craft-success','chop-dialogue','chop-success'].includes(stage))return;
    if(stage==='menu'||stage==='retry'){
      advance=null;stage='craft-menu';tutorial('Open the crafting menu.');$('game-menu-bar').hidden=false;guide('open-crafting');
    }else $('game-menu-bar').hidden=!$('game-menu-bar').hidden;
    $('game-menu-toggle').setAttribute('aria-expanded',String(!$('game-menu-bar').hidden));
  });
  $('open-crafting').addEventListener('click',()=>{
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
  function refresh(){const i=getInventory();$('crafting-stock').textContent=`Sticks: ${i.sticks} · Stones: ${i.stones} · Crude Axes: ${i.axes||0} · Wooden Logs: ${i.logs||0}`;$('recipe-error').textContent='';$('craft-axe').disabled=i.sticks<1||i.stones<1;}
  return {
    start(){stage='intro';lineIndex=0;nextIntro();},
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
