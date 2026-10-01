const openingLines = [
  'Hello there!',
  'Welcome to the world of Quadra!',
  "Me? I'm not important, but you! You will be more important to this world than you could ever know.",
  "First off, let's get to know a little about you."
];
const clearingLines = [
  'Here we are!',
  'A small part of Quadra, specifically built for you to learn the ropes!',
  "Let's get started by learning how to gather some resources.",
  "In this area, you'll see some sticks and stones. Try picking them up!"
];

export function createOpening({player,visual,face,setColor,showClearing,introSpawn,spawn}) {
  const dialogue=document.getElementById('dialogue');
  const line=document.getElementById('dialogue-line');
  const prompt=document.getElementById('dialogue-prompt');
  const controls=document.getElementById('dialogue-controls');
  const veil=document.getElementById('scene-fade');
  const tutorial=document.getElementById('gather-tutorial');
  let phase='intro-wait',age=0,step=0,mode='line',next=null;
  let name='Pip',color='#a4ce77',inClearing=false,playable=false;
  const lessons=[
    {id:'rotate',text:'Use the arrow keys or drag the screen to rotate the camera',success:'Nice! You can look around.'},
    {id:'zoom',text:'Use the scroll wheel or pinch-and-zoom to zoom in and out!',success:'Perfect! A closer look.'},
    {id:'move',text:'Click/Tap to move to any location. Beware! You might not be able to go to some locations.',success:'You made it!'},
    {id:'gather',text:"Click/Tap on a resource to collect it. You will walk over and begin collecting. Collecting takes a moment, so be sure to wait until it's done before you click/tap away."}
  ];
  let lesson=0,successAge=null,rotationAmount=0,zoomAmount=0,moveGoal=null;
  function showLesson(){
    document.getElementById('tutorial-title').textContent='TUTORIAL';
    document.getElementById('tutorial-copy').textContent=lessons[lesson].text;
    document.getElementById('tutorial-count').textContent=lesson===3?'0 / 6 collected':(lesson+1)+' / 4';
    tutorial.classList.remove('complete');
    tutorial.querySelector('.progress-track').hidden=lesson!==3;
  }
  function succeed(){
    if(successAge!==null)return;
    successAge=0;tutorial.classList.add('complete');
    document.getElementById('tutorial-title').textContent='✓ Well done!';
    document.getElementById('tutorial-copy').textContent=lessons[lesson].success;
  }
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
      button('Yes',()=>show("Brilliant! You're a dashing little one!",'line',chooseName));
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
      button('Yes',()=>show(`Well, ${name}, you're in for quite an adventure! Let's get you started!`,'line',()=>{dialogue.hidden=true;transition('fade-out');}));
      button('No, change my name',chooseName,true);
    };
    input.addEventListener('input',()=>input.setCustomValidity(''));
    input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();e.stopPropagation();submit();}});
    button('That’s my name',submit);input.focus();
  }
  function clearingLine(){
    if(step<clearingLines.length)show(clearingLines[step++],'line',clearingLine);
    else {
      dialogue.hidden=true;tutorial.hidden=false;playable=true;transition('play');showLesson();
      document.querySelector('.character-card strong').textContent=name;
    }
  }
  function advance(){if(mode==='line'&&next){const action=next;next=null;action();}}
  dialogue.addEventListener('click',e=>{if(!e.target.closest('button,input,label'))advance();});
  dialogue.addEventListener('keydown',e=>{
    if(e.target===dialogue&&(e.key==='Enter'||e.key===' ')){e.preventDefault();advance();}
  });
  function landAnimation(t){
    const landing=inClearing?spawn:introSpawn;
    player.visible=true;player.position.copy(landing);
    visual.rotation.set(0,0,0);face.set(t<.68?'struggle':'idle');
    let squash=1;
    if(t<.68){const p=Math.min(1,t/.68);player.position.y+=14*(1-p*p);squash=1+.18*Math.sin(Math.PI*p);}
    else {const p=Math.min(1,(t-.68)/.52);squash=1-.3*Math.sin(Math.PI*p)*Math.exp(-p);}
    visual.scale.set(1/Math.sqrt(squash),squash,1/Math.sqrt(squash));
    visual.position.y=-.07*squash;
  }
  player.visible=false;player.position.copy(introSpawn);player.position.y+=14;
  player.rotation.y=Math.PI/4;
  return {
    get playable(){return playable;},
    get canMove(){return playable&&lesson>=2&&successAge===null;},
    get canGather(){return playable&&lesson===3;},
    rotated(amount){if(playable&&lesson===0){rotationAmount+=Math.abs(amount);if(rotationAmount>=.08)succeed();}},
    zoomed(amount){if(playable&&lesson===1){zoomAmount+=Math.abs(amount);if(zoomAmount>=.045)succeed();}},
    moving(from,to){if(lesson===2&&successAge===null)moveGoal={from:{x:from.x,z:from.z},to:{x:to.x,z:to.z}};},
    arrived(at){if(lesson!==2||!moveGoal)return;const {from,to}=moveGoal;if(at.x===to.x&&at.z===to.z&&(at.x!==from.x||at.z!==from.z)){moveGoal=null;succeed();}},
    get inClearing(){return inClearing;},
    get profile(){return {name,color};},
    update(dt){
      age+=dt;
      if(playable){
        if(successAge!==null){successAge+=dt;if(successAge>=1.15){lesson++;successAge=null;showLesson();}}
        return;
      }
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
    collected(count){
      if(lesson!==3)return;
      document.getElementById('tutorial-count').textContent=`${count} / 6 collected`;
      document.getElementById('tutorial-progress').style.width=`${count/6*100}%`;
      if(count===6){
        document.getElementById('tutorial-title').textContent='All six collected!';
        document.getElementById('tutorial-copy').textContent='A brilliant start. Your first resources are safely gathered.';
        tutorial.classList.add('complete');
      }
    }
  };
}
