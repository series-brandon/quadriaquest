import {randomName} from './random-names.js';
import {updateObjective,finishObjective} from './quests.js';
import {SOCIAL_DURATIONS} from './slime-social.js';
import {spawnMotion} from './slime-motion.js';
import {h} from './ui/dom.js';
import {iconNode} from './ui/icon.js';
import {modeChoice} from './ui/dialogs/mode-choice.js';
const openingLines = [
  'Hello there!',
  'Welcome to the world of Quadria!',
  "Me? I'm not important, but you! You will be more important to this world than you could ever know.",
  "First off, let's get to know a little about you."
];
const clearingLines = [
  'Here we are!',
  'A small part of Quadria, specifically built for you to learn the ropes!',
  "Let's get started by learning how to gather some resources.",
  "In this area, you'll see some sticks and rocks. Try picking them up!"
];

const GATHER_TEXT="Click or tap a gold-highlighted item to gather it. Wait until you finish—moving interrupts gathering. Collect 3 Rocks and 3 Sticks!";
// The clearing's gathering objective: one task with a portion per material, so the crafting lessons
// that follow always have 3 Rocks and 3 Sticks. got: {stones, sticks} picked up so far.
const GATHER_EACH=3,GATHER_TOTAL=GATHER_EACH*2;
export const GATHER_DONE={stones:GATHER_EACH,sticks:GATHER_EACH};
const gathered=got=>Math.min(got.stones||0,GATHER_EACH)+Math.min(got.sticks||0,GATHER_EACH);
const gatherComplete=got=>gathered(got)===GATHER_TOTAL;
const gatherCount=got=>`Rocks ${Math.min(got.stones||0,GATHER_EACH)}/${GATHER_EACH} · Sticks ${Math.min(got.sticks||0,GATHER_EACH)}/${GATHER_EACH}`;
export function updateGatherObjective(got={}){
  updateObjective('gather','Collect ground items','Collect 3 Rocks and 3 Sticks scattered around the clearing. Click or tap a resource and wait until gathering finishes.',0,1,[{label:'Collect 3 Rocks',current:got.stones||0,total:GATHER_EACH},{label:'Collect 3 Sticks',current:got.sticks||0,total:GATHER_EACH}]);
}
// The gathering lesson's tip (ui/hud/tip.js). The progress bar shows only once it is visible.
export function showGatheringPrompt(tip,got){
  updateGatherObjective(got);
  tip.update({title:'Gathering resources',text:gathered(got)>0?'Finish collecting the items off the ground.':GATHER_TEXT,count:gatherCount(got),...(tip.state.progress===null?{}:{progress:gathered(got)/GATHER_TOTAL})});
}

export function showGatheringCompletion(tip,onPress){
  updateGatherObjective(GATHER_DONE);
  tip.show({title:'All collected!',text:'A brilliant start. Your first resources are safely gathered.',count:gatherCount(GATHER_DONE),progress:1,complete:true,action:{label:'Click to continue',onPress}});
}

// onHandChosen(side): the dominant hand picked after naming ('right' or 'left').
// onModeChosen(mode): the play style picked next (a combat mode preset).
// onSkipTutorial(): the player chose to skip the tutorial after picking a play style; the host wakes
// them into the world (waking.js) instead of starting the clearing.
export function createOpening({narrator,tip,player,visual,face,setColor,showClearing,introSpawn,spawn,onComplete,onFirstLevel,onFirstQuest,onHandChosen=()=>{},onModeChosen=()=>{},onSkipTutorial=null}) {
  const veil=document.getElementById('scene-fade');
  let finished=false,reaction=null,skillsPending=false;
  let phase='intro-wait',age=0,step=0,mode='line',next=null;
  let name='Pip',color='#a4ce77',inClearing=false,playable=false;
  const lessons=[
    {id:'rotate',text:'Use the arrow keys or drag the screen to rotate the camera',success:'Nice! You can look around.'},
    {id:'zoom',text:'Use the scroll wheel or pinch-and-zoom to zoom in and out!',success:'Perfect! A closer look.'},
    {id:'move',text:'Click/Tap to move to any location. Beware! You might not be able to go to some locations.',success:'You made it!'},
    {id:'gather',text:GATHER_TEXT}
  ];
  const LESSON_TITLES=['Rotate the camera','Try zooming','Move to a new tile'];
  let briefing=false,controlsDone=null;
  let lesson=0,awaitingContinue=false,rotationAmount=0,zoomAmount=0,moveGoal=null;
  let collected={},interruption=null,xpExplained=false,levelExplained=false;
  function showGatherSuccess(){showGatheringCompletion(tip,onContinue);awaitingContinue=true;}
  function explainSkill(kind){
    briefing=false;interruption=kind;awaitingContinue=true;
    tip.show({
      title:kind==='xp'?'Experience points · 1/2':kind==='xp-benefits'?'Experience points · 2/2':kind==='level'?'Your first level · 1/2':'Your first level · 2/2',
      text:kind==='xp'
        ? 'You just gained your first experience points! Most activities in Quadria reward experience in a specific skill.'
        : kind==='xp-benefits' ? 'Earn enough experience to level up. Higher skill levels improve your abilities!'
        : kind==='level' ? "You just gained your first level! Your Gathering ability just got a little bit better!"
        : "It’s just a start. Keep going! Soon you’ll be a master of many skills!",
      count:tip.state.count,complete:true,
      action:{label:kind==='xp'||kind==='level'?'Continue':kind==='level-encouragement'?'Okay':'Dismiss',onPress:onContinue},
    });
  }
  function showLesson(){
    briefing=lesson===3;
    if(lesson===3)updateGatherObjective(collected);
    else updateObjective(lessons[lesson].id,LESSON_TITLES[lesson],lessons[lesson].text);
    tip.show({
      title:lesson===3?'Gathering resources':['Rotate your view','Zoom in and out','Find your footing'][lesson],
      text:lesson===3?(gathered(collected)>0?'Finish collecting the items off the ground.':GATHER_TEXT):lessons[lesson].text,
      action:{label:lesson<3?'Continue':'Dismiss',disabled:lesson<3,onPress:onContinue},
    });
    if(lesson===3&&gathered(collected)>0){briefing=false;tip.hide();}
  }
  function succeed(){
    if(awaitingContinue)return;
    finishObjective(lessons[lesson].id);briefing=false;awaitingContinue=true;
    tip.show({title:'✓ Well done!',text:lessons[lesson].success,count:tip.state.count,complete:true,action:{label:'Continue',onPress:onContinue}});
  }
  // The tip's Continue/Dismiss while the opening owns it.
  function onContinue(){
    if(briefing){briefing=false;tip.hide();return;}
    if(!awaitingContinue)return;
    awaitingContinue=false;tip.update({action:null});
    if(interruption){
      const completed=interruption;interruption=null;
      if(completed==='xp')explainSkill('xp-benefits');else if(completed==='xp-benefits')showLesson();else if(completed==='level')explainSkill('level-encouragement');else if(onFirstLevel){skillsPending=true;onFirstLevel(()=>{skillsPending=false;showLesson();showGatherSuccess();});}else showGatherSuccess();
      return;
    }
    if(lesson===2&&controlsDone){const done=controlsDone;controlsDone=null;done();return;}
    if(lesson<lessons.length-1){lesson++;showLesson();}
    else {tip.hide();if(onComplete){finished=true;onComplete();}}
  }
  const transition=to=>{phase=to;age=0;};
  // The narrator box (ui/hud/narrator.js) owns the markup and input; the opening supplies lines,
  // their controls and what follows. Lines advance through `advance`, which waits out reactions.
  function show(text,kind='line',then=null,{controls=null,size=null}={}){
    mode=kind;next=then;
    narrator.show({text,presentation:inClearing?'conversation':'customize',input:kind!=='line',next:kind==='line'?advance:null,controls,size});
  }
  const button=(text,action,secondary=false)=>h('button',{type:'button',class:secondary?'q-narrator__button q-narrator__button--quiet':'q-narrator__button',on:{click:event=>{event.stopPropagation();action();}}},text);
  function openingLine(){
    if(step<openingLines.length)show(openingLines[step++],'line',openingLine);
    else chooseColor();
  }
  function chooseColor(){
    show('What do you look like?','color',null,{controls:()=>[
      h('label',{class:'q-narrator__color'},'Your slime color',
        h('input',{type:'color',value:color,'aria-label':'Slime color',on:{input:event=>{color=event.target.value;setColor(color);}}})),
      button('This is me',()=>show('So this is what you look like?','confirm',null,{controls:()=>[
        button('Yes',()=>{reaction={kind:'Happy hop',time:0};show("Brilliant! You're a dashing little one!",'line',chooseName);}),
        button('No, try another color',chooseColor,true),
      ]})),
    ]});
  }
  function chooseName(){
    let input;
    const submit=()=>{
      const proposed=input.value.trim();
      if(!proposed){input.setCustomValidity('Please enter a name.');input.reportValidity();return;}
      name=proposed;show(`So they call you ${name}?`,'confirm',null,{controls:()=>[
        button('Yes',()=>{reaction={kind:'Wave',time:0};chooseHand();}),
        button('No, change my name',chooseName,true),
      ]});
    };
    show("What's your name?",'name',null,{controls:()=>[
      h('span',{class:'q-narrator__name'},
        h('input',{type:'text',maxlength:24,placeholder:'Your name',value:name,autocomplete:'off','aria-label':'Your name',ref:element=>{input=element;},
          on:{input:()=>input.setCustomValidity(''),keydown:event=>{if(event.key==='Enter'){event.preventDefault();event.stopPropagation();submit();}}}}),
        h('button',{type:'button',class:'q-narrator__dice',title:'Generate a random name','aria-label':'Generate a random name',
          on:{click:event=>{event.stopPropagation();input.value=randomName(input.value);input.setCustomValidity('');}}},iconNode('dice'))),
      button('That’s my name',submit),
    ]});
    input.focus?.();
  }
  // The dominant hand leads two-handed attacks (changeable any time on the Combat page).
  function chooseHand(){
    const pick=side=>{onHandChosen(side);show(side==='left'?'A lefty! Noted.':'Right it is!','line',chooseMode);};
    show('Which hand do you favor?','hand',null,{controls:()=>[
      button('Right hand',()=>pick('right')),
      button('Left hand',()=>pick('left')),
    ]});
  }
  // How the player wants to play: Pacifist, Simple or Expert (changeable any time on the Combat page).
  function chooseMode(){
    show('Before we get too far, how would you like your experience to go?','mode',null,{size:'tall',controls:()=>modeChoice({onConfirm:mode=>{
      onModeChosen(mode);
      if(onSkipTutorial)chooseTutorial();else beginTutorial();
    }})});
  }
  function beginTutorial(){show(`Well, ${name}, you're in for quite an adventure! Let's get you started!`,'line',()=>{narrator.hide();transition('fade-out');});}
  // Play the guided tutorial, or skip straight to waking up in the world.
  function chooseTutorial(){
    show('Would you like to learn the ropes first, or jump straight into the world?','tutorial',null,{controls:()=>[
      button('Play the tutorial',beginTutorial),
      button('Skip the tutorial',()=>show('Skip the tutorial and wake up in the world? You will start with a full set of supplies.','confirm',null,{controls:()=>[
        button('Yes, skip it',()=>{narrator.hide();onSkipTutorial();}),
        button('No, go back',chooseTutorial,true),
      ]}),true),
    ]});
  }
  function clearingLine(){
    if(step<clearingLines.length){show(clearingLines[step++],'line',clearingLine);}
    else {
      narrator.hide();
      const beginLessons=()=>{playable=true;transition('play');showLesson();};
      if(onFirstQuest)onFirstQuest(beginLessons);else beginLessons();
    }
  }
  function advance(){if(reaction)return;if(mode==='line'&&next){const action=next;next=null;action();}}
  function landAnimation(t){
    const landing=inClearing?spawn:introSpawn;
    player.visible=true;player.position.copy(landing);
    visual.rotation.set(0,0,0);face.set(t<.68?'struggle':'idle');
    const {squash,lift}=spawnMotion(t);player.position.y+=lift;
    visual.scale.set(1/Math.sqrt(squash),squash,1/Math.sqrt(squash));
    visual.position.y=-.07*squash;
  }
  function enterFreePlay(){next=null;reaction=null;interruption=null;finished=true;playable=true;inClearing=true;lesson=3;briefing=awaitingContinue=skillsPending=false;controlsDone=null;tip.hide();narrator.hide();transition('play');}
  player.visible=false;player.position.copy(introSpawn);player.position.y+=14;
  player.rotation.y=Math.PI/4;
  return {
    enterFreePlay,
    debugCheckpoint:typeof __PLAYGROUND__!=='undefined'&&__PLAYGROUND__?function(step){
      enterFreePlay();interruption=null;reaction=null;collected={};xpExplained=levelExplained=false;
      if(['color','name','hand','mode','tutorial'].includes(step)){this.startCustomization();({name:chooseName,hand:chooseHand,mode:chooseMode,tutorial:chooseTutorial})[step]?.();return;}
      finished=false;
      if(['rotate','zoom','move'].includes(step)){this.startControls(null);lesson=['rotate','zoom','move'].indexOf(step);showLesson();return;}
      if(step==='gather'){this.startGathering();return;}
      if(step==='gather-resume'){lesson=3;collected={sticks:1};xpExplained=true;showLesson();return;}
      if(step==='gather-complete'){collected={...GATHER_DONE};showGatherSuccess();return;}
      collected=step.startsWith('level')?{...GATHER_DONE}:{sticks:1};xpExplained=true;levelExplained=step.startsWith('level');explainSkill(step);
    }:undefined,
    // Skipping tutorial chapters (tutorial-chapters.js): the camera lessons are marked done and
    // gathering starts; or gathering is marked done and the next lesson (onComplete) starts.
    skipControls(){for(let i=0;i<3;i++)updateObjective(lessons[i].id,LESSON_TITLES[i],lessons[i].text,1,1);this.startGathering();},
    skipGathering(){updateGatherObjective(GATHER_DONE);enterFreePlay();onComplete?.();},
    get lesson(){return lesson;},
    startLevelExplanation(){enterFreePlay();finished=false;collected={...GATHER_DONE};xpExplained=levelExplained=true;showGatheringPrompt(tip,collected);explainSkill('level');},
    startGathering(){enterFreePlay();finished=false;collected={};xpExplained=levelExplained=false;interruption=null;showLesson();},
    startControls(done){finished=false;playable=true;inClearing=true;lesson=0;awaitingContinue=false;rotationAmount=zoomAmount=0;moveGoal=null;controlsDone=done;narrator.hide();transition('play');showLesson();},
    get reaction(){return reaction;},
    get quiet(){return phase==='dialogue'&&!reaction;},
    get finished(){return finished;},
    get playable(){return playable;},
    get canOrbit(){return playable||(!inClearing&&phase==='dialogue');},
    startCustomization(){finished=false;playable=false;inClearing=false;reaction=null;tip.hide();transition('dialogue');chooseColor();},
    get canMove(){return playable&&lesson>=2&&!awaitingContinue&&!skillsPending;},
    get canGather(){return playable&&lesson===3&&!awaitingContinue&&!skillsPending;},
    rotated(amount){if(playable&&!briefing&&lesson===0){rotationAmount+=Math.abs(amount);if(rotationAmount>=.08)succeed();}},
    zoomed(amount){if(playable&&!briefing&&lesson===1){zoomAmount+=Math.abs(amount);if(zoomAmount>=.045)succeed();}},
    moving(from,to){if(lesson===2&&!awaitingContinue)moveGoal={from:{x:from.x,z:from.z},to:{x:to.x,z:to.z}};},
    arrived(at){if(lesson!==2||!moveGoal)return;const {from,to}=moveGoal;if(at.x===to.x&&at.z===to.z&&(at.x!==from.x||at.z!==from.z)){moveGoal=null;succeed();}},
    get inClearing(){return inClearing;},
    get profile(){return {name,color};},
    update(dt){
      age+=dt;
      if(reaction){reaction.time+=dt;if(reaction.time>=SOCIAL_DURATIONS[reaction.kind])reaction=null;}
      if(playable)return;
      if(phase==='intro-wait'&&age>=.9)transition('intro-drop');
      else if(phase==='intro-drop'||phase==='world-drop'){
        landAnimation(age);
        if(age>=1.3){const world=phase==='world-drop';transition('dialogue');step=0;if(world)clearingLine();else openingLine();}
      }else if(phase==='fade-out'){
        veil.style.opacity=String(Math.min(1,age/1.25));
        if(age>=1.25){showClearing();inClearing=true;player.visible=false;player.position.set(spawn.x,spawn.y+14,spawn.z);transition('fade-hold');}
      }else if(phase==='fade-hold'&&age>=.35)transition('fade-in');
      else if(phase==='fade-in'){
        veil.style.opacity=String(Math.max(0,1-age/1.25));
        if(age>=1.25)transition('world-wait');
      }else if(phase==='world-wait'&&age>=.85)transition('world-drop');
      else if(phase==='dialogue'){
        const squash=1+Math.sin(age*2.8)*.05;
        visual.scale.set(1/Math.sqrt(squash),squash,1/Math.sqrt(squash));visual.position.y=-.07*squash;
      }
    },
    // got: {stones, sticks} in the inventory after a pickup.
    collected(got,reward){
      if(lesson!==3||finished)return;
      if(gathered(got)>0&&briefing){briefing=false;tip.hide();}
      collected={stones:got.stones||0,sticks:got.sticks||0};
      updateGatherObjective(collected);
      tip.update({count:gatherCount(collected),...(tip.state.progress===null?{}:{progress:gathered(collected)/GATHER_TOTAL})});
      if(reward&&!xpExplained){xpExplained=true;explainSkill('xp');}
      else if(reward?.leveledUp&&!levelExplained){levelExplained=true;explainSkill('level');}
      else if(gatherComplete(collected))showGatherSuccess();
    }
  };
}
