import {idlePose,slideMotion,stepMotion,STEP_DURATION,workPose,spawnMotion,CHOP_DURATION} from '../slime-motion.js';
import {showSkillReward} from '../skills.js';
import './playground.css';

// This entire module (including its stylesheet) is behind the compile-time flag.
export function createFreeOpening({player,visual,spawn,showClearing}){
  showClearing();player.visible=true;player.position.copy(spawn);visual.scale.setScalar(1);
  for(const id of ['dialogue','gather-tutorial','scene-fade'])document.getElementById(id).hidden=true;
  return {playable:true,canMove:true,canGather:true,finished:true,inClearing:true,
    profile:{name:'Pip',color:'#a4ce77'},update(){},rotated(){},zoomed(){},moving(){},arrived(){},collected(){}};
}

const animations=['Idle','Sliding','Jump up','Jump down','Spawn landing','Gathering','Crafting','Chopping','Hat celebration','Happy','Focused','Preparing','Struggle'];
const durations={'Hat celebration':4.3,Chopping:CHOP_DURATION,'Spawn landing':1.2,'Jump up':STEP_DURATION,'Jump down':STEP_DURATION,Sliding:1/2.4};
export function mountPlayground(api){
  const panel=document.createElement('details');panel.id='quadra-dev-playground';panel.open=true;
  panel.innerHTML=`<summary>DEV PLAYGROUND <small>collapse</small></summary>
    <p class="dev-note">Tutorial skipped · changes are session-only</p>
    <fieldset><legend>Animation preview</legend>
      <label>Animation <select id="dev-animation">${animations.map(a=>`<option>${a}</option>`).join('')}</select></label>
      <label><input id="dev-loop" type="checkbox" checked> Loop</label>
      <label>Speed <select id="dev-speed"><option value="0.25">¼×</option><option value="0.5">½×</option><option value="1" selected>1×</option><option value="2">2×</option></select></label>
      <div><button data-dev="play">Play / restart</button><button data-dev="stop">Stop</button><button data-dev="face">Face camera</button></div>
      <label>Slime color <input id="dev-color" type="color" value="#a4ce77"></label>
      <p class="dev-note">Previews run in place without consuming items or earning XP. Stop to play normally.</p>
    </fieldset>
    <fieldset><legend>Skills</legend>
      <label>Skill <select id="dev-skill">${Object.keys(api.skills).map(a=>`<option>${a}</option>`).join('')}</select></label>
      <label>Amount <input id="dev-skill-amount" type="number" min="0" max="1000000" step="1" value="20"></label>
      <div><button data-dev="xp">Add XP</button><button data-dev="levels">Add levels</button></div>
    </fieldset>
    <fieldset><legend>Inventory</legend>
      <label>Item <select id="dev-item"><option value="sticks">Stick</option><option value="stones">Stone</option><option value="axes">Crude Axe</option><option value="logs">Wooden Logs</option><option value="hats">Top Hat</option></select></label>
      <label>Quantity <input id="dev-quantity" type="number" min="0" max="1000000" step="1" value="1"></label>
      <div><button data-dev="add">Add item</button><button data-dev="remove">Remove item</button></div>
    </fieldset>
    <fieldset><legend>Visual feedback only</legend><p class="dev-note">Item gain/loss uses the selected inventory item and quantity without changing your inventory.</p><div>
      ${['Going','Gathering','Crafting','Chopping','Opening','Traveling','Arrived','Done','Blocked','XP gain','Level gain','Item gain','Item loss','Clear'].map(a=>`<button data-juice="${a}">${a}</button>`).join('')}
    </div></fieldset>
    <fieldset><legend>Tutorial finale</legend><p class="dev-note">Replay the real sequence or test its parts. Practice reset arms the hidden goal; Complete practice clears those objects without granting loot.</p><div>
      ${['Closing dialogue','Drop portal','Use portal','Practice reset','Complete practice','Reward dialogue','Drop chest','Open chest','Hat celebration','Wear/remove hat','Enter placeholder','Return to clearing','Reset finale'].map(a=>`<button data-finale="${a}">${a}</button>`).join('')}
    </div></fieldset>
    <fieldset><legend>Reset</legend><div><button data-reset="items">Ground items</button><button data-reset="trees">Trees</button><button data-reset="all">Full test area</button></div></fieldset>
    <output id="dev-status" aria-live="polite">Ready. Starter kit: 10 Sticks, 10 Stones, 1 Crude Axe.</output>
    <pre id="dev-state"></pre>`;
  document.body.append(panel);
  const $=id=>panel.querySelector('#dev-'+id);
  let preview=null,time=0,holdingFeedback=false,snapshotAge=0;
  const amount=id=>{const n=Number($(id).value);if(!Number.isSafeInteger(n)||n<0||n>1000000)throw Error('Enter a whole number from 0 to 1,000,000.');return n;};
  const status=text=>$('status').textContent=text;
  function stop(force=true){if(!force&&!preview&&!holdingFeedback)return;preview=null;time=0;holdingFeedback=false;api.finale.stopPreview();api.stop();}
  function refresh(){api.refresh();$('state').textContent=Object.entries(api.skills).map(([name,s])=>`${name}: Lv ${s.level} · ${s.xp} XP`).join('\n')+'\n'+Object.entries(api.inventory).map(([name,n])=>`${name}: ${n}`).join(' · ');}
  panel.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    try{
      if(b.dataset.dev){
        const action=b.dataset.dev;
        if(action==='play'){stop();if(api.finale.busy)throw Error('Finish the finale sequence or use Reset finale first.');preview=$('animation').value;api.faceTowardCamera();if(preview==='Hat celebration')api.finale.celebrate({preview:true,rate:()=>Number($('speed').value)});status(`Previewing ${preview}.`);}
        if(action==='stop'){stop();status('Preview stopped. Normal play enabled.');}
        if(action==='face')api.faceTowardCamera();
        if(action==='xp'||action==='levels'){
          const name=$('skill').value,skill=api.skills[name],n=amount('skill-amount'),old=skill.level;
          skill.xp+=action==='xp'?n:n*120;skill.level=1+Math.floor(skill.xp/120);
          showSkillReward({skillName:name,xp:action==='xp'?n:n*120,level:skill.level,leveledUp:skill.level>old},api.player.position);
          status(`${name}: level ${skill.level}, ${skill.xp} XP.`);
        }
        if(action==='add'||action==='remove'){
          const item=$('item').value,n=amount('quantity'),before=api.inventory[item];
          api.inventory[item]=Math.max(0,before+(action==='add'?n:-n));
          api.showItemChanges({[item]:api.inventory[item]-before});
          status(`${item}: ${api.inventory[item]}`);
        }
      }
      if(b.dataset.juice){
        stop();const kind=b.dataset.juice;holdingFeedback=true;
        if(['Going','Gathering','Crafting','Chopping','Opening','Traveling','Arrived','Done'].includes(kind)){
          api.feedback.destination(api.getTile());
          if(['Gathering','Crafting','Chopping','Opening','Traveling','Done'].includes(kind))api.feedback.interacting(kind==='Done'?'Gathering':kind);
          if(['Arrived','Done'].includes(kind))api.feedback.complete();
        }
        if(kind==='Item gain'||kind==='Item loss')api.showItemChanges({[$('item').value]:amount('quantity')*(kind==='Item gain'?1:-1)});
        if(kind==='Blocked')api.feedback.pulse(api.player.position,false);
        if(kind==='XP gain'||kind==='Level gain')showSkillReward({skillName:$('skill').value,xp:20,level:api.skills[$('skill').value].level+1,leveledUp:kind==='Level gain'},api.player.position);
        if(kind==='Clear'){holdingFeedback=false;api.feedback.clearDestination();}
        status(`${kind} feedback preview — no gameplay rewards applied.`);
      }
      if(b.dataset.finale){
        stop();const action=b.dataset.finale;
        if(action==='Reset finale')api.finale.reset();
        else if(action==='Use portal'){if(api.finale.busy)throw Error('Finish the current finale sequence first.');api.finale.usePortal();}
        else if(action==='Enter placeholder'){if(api.finale.busy)throw Error('Finish the current finale sequence first.');api.finale.travel('placeholder');}
        else if(action==='Return to clearing'){if(api.finale.busy)throw Error('Finish the current finale sequence first.');api.finale.travel('clearing');}
        else {
          if(api.finale.busy)throw Error('Finish the current dialogue or drop first, or use Reset finale.');
          if(api.finale.inPlaceholder)throw Error('Return to the clearing first.');
          const actions={'Closing dialogue':()=>api.finale.begin(),'Drop portal':()=>api.finale.dropPortal(),'Practice reset':()=>api.finale.resetPractice(),'Complete practice':()=>api.completePractice(),'Reward dialogue':()=>api.finale.revealReward(),'Drop chest':()=>api.finale.dropChest(),'Open chest':()=>api.finale.openChest(),'Hat celebration':()=>api.finale.celebrate(),'Wear/remove hat':()=>api.finale.equip()};
          actions[action]();
        }
        status(action+'.');
      }
      if(b.dataset.reset){stop();api.reset(b.dataset.reset);status(`Reset ${b.dataset.reset}.`);}
      refresh();
    }catch(error){status(error.message);}
  });
  $('color').addEventListener('input',()=>api.color($('color').value));
  api.reset('all');refresh();
  return {
    stop:()=>stop(false),
    get chopping(){return preview==='Chopping';},get time(){return time;},get holdingFeedback(){return holdingFeedback;},
    frame(dt){
      snapshotAge+=dt;if(snapshotAge>.25){snapshotAge=0;refresh();}
      if(!preview)return null;
      time+=dt*Number($('speed').value);
      const duration=durations[preview]||2;
      if(time>=duration){if($('loop').checked){time%=duration;if(preview==='Hat celebration')api.finale.celebrate({preview:true,rate:()=>Number($('speed').value)});}else{stop();status('Preview finished.');return null;}}
      if(preview==='Hat celebration')return null;
      let pose=idlePose(time),expression='idle',handWork=null,lift=0;
      if(preview==='Sliding'){pose=slideMotion(time/duration);expression='focused';}
      if(preview.startsWith('Jump')){pose=stepMotion(time,preview==='Jump up'?.5:-.5);lift=pose.lift+(preview==='Jump down'?.5:0);expression=time<.32?'preparing':'struggle';}
      if(['Gathering','Crafting','Chopping'].includes(preview)){handWork=time;expression='focused';pose=workPose(preview==='Chopping'?'chop':'gather',time);}
      if(preview==='Spawn landing'){pose=spawnMotion(time);lift=pose.lift;expression=time<.68?'struggle':'idle';}
      if(['Happy','Focused','Preparing','Struggle'].includes(preview))expression=preview.toLowerCase();
      return {pose,expression,handWork,lift};
    }
  };
}
