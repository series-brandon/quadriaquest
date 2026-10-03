import {updateObjective,finishObjective} from './quests.js';
import {SOCIAL_DURATIONS} from './slime-social.js';
import {spawnMotion} from './slime-motion.js';
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

export function showGatheringPrompt(count){
  updateObjective('gather','Collect ground items','Collect all six handfuls of Sticks and Rocks scattered around the clearing. Click or tap a resource and wait until gathering finishes.',count,6);
  document.getElementById('tutorial-title').textContent='Gathering resources';
  document.getElementById('tutorial-copy').textContent=count>0
    ? 'Finish collecting the items off the ground.'
    : 'Click or tap a gold-highlighted item to gather it. Wait until you finish—moving interrupts gathering. Collect all six!';
  document.getElementById('tutorial-count').textContent=count+' / 6 collected';
  document.getElementById('tutorial-progress').style.width=`${count/6*100}%`;
}

export function showGatheringCompletion(){
  const tutorial=document.getElementById('gather-tutorial');tutorial.hidden=false;
  showGatheringPrompt(6);
  document.getElementById('tutorial-title').textContent='All six collected!';
  document.getElementById('tutorial-copy').textContent='A brilliant start. Your first resources are safely gathered.';
  tutorial.querySelector('.progress-track').hidden=false;tutorial.classList.add('complete');
  const button=document.getElementById('tutorial-continue');button.hidden=false;button.textContent='Click to continue';
}

export function createOpening({player,visual,face,setColor,showClearing,introSpawn,spawn,onComplete,onFirstLevel,onFirstQuest}) {
  const dialogue=document.getElementById('dialogue');
  const line=document.getElementById('dialogue-line');
  const prompt=document.getElementById('dialogue-prompt');
  const controls=document.getElementById('dialogue-controls');
  const veil=document.getElementById('scene-fade');
  const tutorial=document.getElementById('gather-tutorial');
  const continueButton=document.createElement('button');
  continueButton.id='tutorial-continue';continueButton.type='button';continueButton.textContent='Click to continue';continueButton.hidden=true;
  tutorial.append(continueButton);
  let finished=false,reaction=null,skillsPending=false;
  let phase='intro-wait',age=0,step=0,mode='line',next=null;
  let name='Pip',color='#a4ce77',inClearing=false,playable=false;
  const lessons=[
    {id:'rotate',text:'Use the arrow keys or drag the screen to rotate the camera',success:'Nice! You can look around.'},
    {id:'zoom',text:'Use the scroll wheel or pinch-and-zoom to zoom in and out!',success:'Perfect! A closer look.'},
    {id:'move',text:'Click/Tap to move to any location. Beware! You might not be able to go to some locations.',success:'You made it!'},
    {id:'gather',text:"Click or tap a gold-highlighted item to gather it. Wait until you finish—moving interrupts gathering. Collect all six!"}
  ];
  let briefing=false,controlsDone=null;
  let lesson=0,awaitingContinue=false,rotationAmount=0,zoomAmount=0,moveGoal=null;
  let collectedCount=0,interruption=null,xpExplained=false,levelExplained=false;
  function showGatherSuccess(){showGatheringCompletion();awaitingContinue=true;}
  function explainSkill(kind){
    briefing=false;tutorial.hidden=false;interruption=kind;awaitingContinue=true;continueButton.hidden=false;
    continueButton.textContent=kind==='xp'||kind==='level'?'Continue':kind==='level-encouragement'?'Okay':'Dismiss';
    tutorial.classList.add('complete');tutorial.querySelector('.progress-track').hidden=true;
    document.getElementById('tutorial-title').textContent=kind==='xp'?'Experience points · 1/2':kind==='xp-benefits'?'Experience points · 2/2':kind==='level'?'Your first level · 1/2':'Your first level · 2/2';
    document.getElementById('tutorial-copy').textContent=kind==='xp'
      ? 'You just gained your first experience points! Most activities in Quadria reward experience in a specific skill.'
      : kind==='xp-benefits' ? 'Earn enough experience to level up. Higher skill levels improve your abilities!'
      : kind==='level' ? "You just gained your first level! Your Gathering ability just got a little bit better!"
      : "It’s just a start. Keep going! Soon you’ll be a master of many skills!";
  }
  function showLesson(){
    tutorial.hidden=false;
    briefing=lesson===3;continueButton.hidden=false;continueButton.disabled=lesson<3;continueButton.textContent=lesson<3?'Continue':'Dismiss';
    document.getElementById('tutorial-title').textContent=['Rotate your view','Zoom in and out','Find your footing','Pick up some items'][lesson];
    document.getElementById('tutorial-copy').textContent=lessons[lesson].text;
    document.getElementById('tutorial-count').textContent=lesson===3?collectedCount+' / 6 collected':(lesson+1)+' / 4';
    tutorial.classList.remove('complete');
    tutorial.querySelector('.progress-track').hidden=lesson!==3;
    if(lesson===3)showGatheringPrompt(collectedCount);
    else updateObjective(lessons[lesson].id,['Rotate the camera','Try zooming','Move to a new tile'][lesson],lessons[lesson].text);
    tutorial.querySelector('.progress-track').hidden=true;document.getElementById('tutorial-count').textContent='';
    if(lesson===3&&collectedCount>0){briefing=false;tutorial.hidden=true;}
  }
  function succeed(){
    if(awaitingContinue)return;
    continueButton.disabled=false;continueButton.textContent='Continue';
    finishObjective(lessons[lesson].id);tutorial.hidden=false;briefing=false;awaitingContinue=true;continueButton.hidden=false;tutorial.classList.add('complete');
    document.getElementById('tutorial-title').textContent='✓ Well done!';
    document.getElementById('tutorial-copy').textContent=lessons[lesson].success;
  }
  continueButton.addEventListener('click',event=>{
    event.stopPropagation();
    if(continueButton.disabled)return;
    if(briefing){briefing=false;tutorial.hidden=true;return;}
    if(!awaitingContinue)return;
    awaitingContinue=false;continueButton.hidden=true;
    if(interruption){
      const completed=interruption;interruption=null;
      if(completed==='xp')explainSkill('xp-benefits');else if(completed==='xp-benefits')showLesson();else if(completed==='level')explainSkill('level-encouragement');else if(onFirstLevel){skillsPending=true;onFirstLevel(()=>{skillsPending=false;showLesson();showGatherSuccess();});}else showGatherSuccess();
      return;
    }
    if(lesson===2&&controlsDone){const done=controlsDone;controlsDone=null;done();return;}
    if(lesson<lessons.length-1){lesson++;showLesson();}
    else {tutorial.hidden=true;if(onComplete){finished=true;onComplete();}}
  });
  const transition=to=>{phase=to;age=0;};
  function show(text,kind='line',advance=null){
    dialogue.hidden=false;line.textContent=text;mode=kind;next=advance;
    controls.replaceChildren();prompt.hidden=kind!=='line';
    dialogue.setAttribute('aria-label',text);
    dialogue.tabIndex=kind==='line'?0:-1;
  }
  function button(text,action,secondary=false){
    const b=document.createElement('button');b.type='button';b.textContent=text;
    if(secondary)b.className='secondary';
    b.addEventListener('click',e=>{e.stopPropagation();action();});controls.append(b);return b;
  }
  function openingLine(){
    if(step<openingLines.length)show(openingLines[step++],'line',openingLine);
    else chooseColor();
  }
  function chooseColor(){
    show('What do you look like?','color');
    const label=document.createElement('label');label.className='color-choice';label.textContent='Your slime color';
    const input=document.createElement('input');input.type='color';input.value=color;input.setAttribute('aria-label','Slime color');
    input.addEventListener('input',()=>{color=input.value;setColor(color);});label.append(input);controls.append(label);
    button('This is me',()=>{
      show('So this is what you look like?','confirm');
      button('Yes',()=>{reaction={kind:'Happy hop',time:0};show("Brilliant! You're a dashing little one!",'line',chooseName);});
      button('No, try another color',chooseColor,true);
    });
  }
  function chooseName(){
    show("What's your name?",'name');
    const input=document.createElement('input');input.type='text';input.maxLength=24;
    input.placeholder='Your name';input.value=name;input.autocomplete='off';input.setAttribute('aria-label','Your name');controls.append(input);
    const submit=()=>{
      const proposed=input.value.trim();
      if(!proposed){input.setCustomValidity('Please enter a name.');input.reportValidity();return;}
      name=proposed;show(`So they call you ${name}?`,'confirm');
      button('Yes',()=>{reaction={kind:'Wave',time:0};show(`Well, ${name}, you're in for quite an adventure! Let's get you started!`,'line',()=>{dialogue.hidden=true;transition('fade-out');});});
      button('No, change my name',chooseName,true);
    };
    input.addEventListener('input',()=>input.setCustomValidity(''));
    input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();e.stopPropagation();submit();}});
    button('That’s my name',submit);input.focus();
  }
  function clearingLine(){
    if(step<clearingLines.length){show(clearingLines[step++],'line',clearingLine);}
    else {
      dialogue.hidden=true;
      const beginLessons=()=>{playable=true;transition('play');showLesson();document.querySelector('.character-card strong').textContent=name;};
      if(onFirstQuest)onFirstQuest(beginLessons);else beginLessons();
    }
  }
  function advance(){if(reaction)return;if(mode==='line'&&next){const action=next;next=null;action();}}
  dialogue.addEventListener('click',e=>{if(!e.target.closest('button,input,label'))advance();});
  dialogue.addEventListener('keydown',e=>{
    if(e.target===dialogue&&(e.key==='Enter'||e.key===' ')){e.preventDefault();advance();}
  });
  function landAnimation(t){
    const landing=inClearing?spawn:introSpawn;
    player.visible=true;player.position.copy(landing);
    visual.rotation.set(0,0,0);face.set(t<.68?'struggle':'idle');
    const {squash,lift}=spawnMotion(t);player.position.y+=lift;
    visual.scale.set(1/Math.sqrt(squash),squash,1/Math.sqrt(squash));
    visual.position.y=-.07*squash;
  }
  function enterFreePlay(){finished=true;playable=true;inClearing=true;lesson=3;briefing=awaitingContinue=skillsPending=false;controlsDone=null;continueButton.disabled=false;tutorial.hidden=true;dialogue.hidden=true;transition('play');}
  player.visible=false;player.position.copy(introSpawn);player.position.y+=14;
  player.rotation.y=Math.PI/4;
  return {
    enterFreePlay,
    startLevelExplanation(){enterFreePlay();finished=false;collectedCount=6;xpExplained=levelExplained=true;showGatheringPrompt(6);explainSkill('level');},
    startGathering(){enterFreePlay();finished=false;collectedCount=0;xpExplained=levelExplained=false;interruption=null;showLesson();},
    startControls(done){finished=false;playable=true;inClearing=true;lesson=0;awaitingContinue=false;rotationAmount=zoomAmount=0;moveGoal=null;controlsDone=done;dialogue.hidden=true;transition('play');showLesson();},
    get reaction(){return reaction;},
    get quiet(){return phase==='dialogue'&&!reaction;},
    get finished(){return finished;},
    get playable(){return playable;},
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
    collected(count,reward){
      if(lesson!==3||finished)return;
      if(count>0&&briefing){briefing=false;tutorial.hidden=true;}
      collectedCount=count;
      updateObjective('gather','Collect ground items','Collect all six handfuls of Sticks and Rocks scattered around the clearing. Click or tap a resource and wait until gathering finishes.',count,6);
      document.getElementById('tutorial-count').textContent=`${count} / 6 collected`;
      document.getElementById('tutorial-progress').style.width=`${count/6*100}%`;
      if(reward&&!xpExplained){xpExplained=true;explainSkill('xp');}
      else if(reward?.leveledUp&&!levelExplained){levelExplained=true;explainSkill('level');}
      else if(count===6)showGatherSuccess();
    }
  };
}
