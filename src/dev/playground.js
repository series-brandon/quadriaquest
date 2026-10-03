import {organizePlayground} from './playground-layout.js';
import {createModelPreview} from './model-preview.js';
import {GRASS_BASE_COLOR,createGrassColors} from '../grass-palette.js';
import {icon,ICON_NAMES} from '../icons.js';
import {miningMotion,MINING_DURATION} from '../mining.js';
import {ITEMS,itemStack} from '../items.js';
import {WATER_DEFAULTS} from '../water-effects.js';
import {socialMotion,SOCIAL_DURATIONS} from '../slime-social.js';
import {mountThemeComparison} from './theme-comparison.js';
import {createOpening,showGatheringPrompt} from '../opening.js';
import {idlePose,slideMotion,stepMotion,STEP_DURATION,workPose,spawnMotion,CHOP_DURATION} from '../slime-motion.js';
import {showSkillReward} from '../skills.js';
import './playground.css';

// This entire module (including its stylesheet) is behind the compile-time flag.
export function createFreeOpening(options){
  const opening=createOpening(options);
  options.showClearing();options.player.visible=true;options.player.position.copy(options.spawn);options.visual.scale.setScalar(1);
  opening.enterFreePlay();document.getElementById('scene-fade').hidden=true;
  return opening;
}

export function createGrassPaletteControls(getMaterials){
  const set=value=>{const colors=createGrassColors(value);getMaterials().forEach((material,i)=>material.color.copy(colors[i%colors.length]));};
  return {defaultColor:GRASS_BASE_COLOR,set,reset:()=>set(GRASS_BASE_COLOR)};
}

const animations=['Happy hop','Wave','Sleeping','Idle','Sliding','Jump up','Jump down','Spawn landing','Gathering','Crafting','Chopping','Mining','Hat celebration','Happy','Focused','Preparing','Struggle','Concerned','Shocked','Distraught','Sad','Frown'];
const durations={...SOCIAL_DURATIONS,'Hat celebration':4.3,Chopping:CHOP_DURATION,Mining:MINING_DURATION,'Spawn landing':1.2,'Jump up':STEP_DURATION,'Jump down':STEP_DURATION,Sliding:1/2.4};
export function mountPlayground(api){
  let modelPreview;
  const panel=document.createElement('details');panel.id='quadriaquest-dev-playground';panel.open=false;
  panel.innerHTML=`<summary>DEV PLAYGROUND <small>close</small></summary>
    <fieldset><legend>Tips &amp; objectives</legend><button data-dev="controls-lesson">Replay camera &amp; movement tips</button><button data-dev="quests-lesson">Replay Quests tutorial</button><button data-objective="tip">Show tutorial tip</button><button data-objective="add">Add objective</button><button data-objective="update">Update objective</button><button data-objective="complete">Complete objective</button><button data-objective="reset">Reset objectives</button><button data-dev="quests">Open Quests</button></fieldset><fieldset><legend>UI &amp; audio polish</legend><button data-dev="crafting-menu">Open Crafting menu</button><button data-dev="receipt">Crafting receipt</button><button data-dev="clear-loot">Clear item feed</button><button data-dev="audio-reset">Reset audio</button><button data-dev="settings">Open Settings</button><details><summary>Icon sheet</summary><div class="dev-icons">${ICON_NAMES.map(name=>`<span>${icon(name)} ${name}</span>`).join('')}</div></details><p class="dev-note">Journal tabs, search, expand/minimize, and item controls use the real menus. Sound controls are in Settings (journal or splash cog).</p><label>Music preview<select id="dev-music"><option value="">Follow game</option><option value="splash">Splash</option><option value="intro">Introduction</option><option value="clearing">Clearing</option></select></label><div>${['pickup','craft','complete','chop','mine','fall','level','portal','blocked','wind','bird','insect'].map(name=>`<button data-sound="${name}">${name}</button>`).join('')}</div></fieldset>
    <p class="dev-note">Tutorial skipped · changes are session-only</p>
    <button data-dev="splash">Preview splash screen</button>
    <button data-dev="splash-randomize">Randomize splash slime</button>
    <button data-dev="themes">Compare UI styles</button><button data-dev="models">Shared model preview</button>
    <fieldset><legend>Animation preview</legend>
      <label>Animation <select id="dev-animation">${animations.map(a=>`<option>${a}</option>`).join('')}</select></label>
      <label><input id="dev-loop" type="checkbox" checked> Loop</label>
      <label>Speed <select id="dev-speed"><option value="0.25">¼×</option><option value="0.5">½×</option><option value="1" selected>1×</option><option value="2">2×</option></select></label>
      <div><button data-dev="play">Play / restart</button><button data-dev="stop">Stop</button><button data-dev="face">Face camera</button><button data-dev="doze">Doze off</button><button data-dev="wake">Wake up</button></div>
      <label>Slime color <input id="dev-color" type="color" value="#a4ce77"></label>
      <p class="dev-note">Previews run in place without consuming items or earning XP. Stop to play normally.</p>
    </fieldset>
    <fieldset><legend>Willowbank chapter</legend>
      <button data-willow="enter">Enter Willowbank</button><button data-willow="reset">Reset Willowbank</button><button data-willow="wander">Wander goblins now</button>
      <label>Quest checkpoint<select id="dev-willow-stage">${['meet','bridge','fish','flint','fire','place','cook','eat'].map(s=>`<option>${s}</option>`).join('')}</select></label><button data-willow="stage">Load checkpoint + supplies</button>
      <div>${['arrival','talk','heal','hurt','lose','cancel','name','placement','tip'].map(s=>`<button data-willow="${s}">${s}</button>`).join('')}</div>
      <button data-willow="hit">Damage splat (3)</button><button data-willow="zero">Blocked splat (0)</button><button data-willow="miss">Miss splat</button><button data-willow="follow">Test follower</button>
      <button data-willow="bridgeIntro">Replay bridge introduction</button><button data-willow="combatPractice">Load combat sandbox (deferred area 3)</button><button data-willow="scrapper">Fight Scrapper</button><button data-willow="bruiser">Fight Bruiser</button><button data-willow="chop">Chop a tree</button><button data-willow="mine">Mine a boulder</button><button data-willow="repair">Repair bridge</button><button data-willow="fish">Fish</button>
      <label>Animation<select id="dev-willow-animation">${['Unarmed','Sword and shield','Defeated','Repairing','Hammer injury','Fishing','Cooking','Goblin idle','Goblin walk','Goblin attack','Goblin hit','Corgi happy','Corgi sad','Corgi walk','Reed idle'].map(s=>`<option>${s}</option>`).join('')}</select></label><button data-willow="preview">Loop chapter animation</button>
      <p class="dev-note">Enter first, then choose a checkpoint. Checkpoints supply materials and replay the real quest. Inventory/skill controls include all new items and skills. Cancel stops previews. Reset restores encounters, bridge, follower, resources, and health.</p>
    </fieldset>
    <fieldset><legend>Terrain colors</legend>
      <label>Grass color <input id="dev-grass-color" type="color" value="${api.grassPalette.defaultColor}"></label>
      <button data-dev="grass-reset">Reset grass color</button>
      <p class="dev-note">Live clearing and splash grass color. Subtle tile variations stay centered on your chosen color. Session-only; reset restores the original palette.</p>
    </fieldset>
    <fieldset><legend>Water animation</legend>
      <label><input id="dev-water-enabled" type="checkbox" ${WATER_DEFAULTS.enabled?'checked':''}> Animate water</label>
      <label><input id="dev-water-shimmers" type="checkbox" ${WATER_DEFAULTS.shimmers?'checked':''}> Shimmer strips</label>
      <label><input id="dev-water-waves" type="checkbox" ${WATER_DEFAULTS.waves?'checked':''}> Surface waves</label>
      <label><input id="dev-water-shoreline" type="checkbox" ${WATER_DEFAULTS.fixedShoreline?'checked':''}> Fixed shoreline</label>
      <label>Water color <input id="dev-water-color" type="color" value="${WATER_DEFAULTS.color}"></label>
      <label><input id="dev-water-faceted" type="checkbox" ${WATER_DEFAULTS.faceted?'checked':''}> Faceted water lighting</label>
      <label>Wave strength <input id="dev-water-strength" type="number" min="0" max="4" step="0.25" value="${WATER_DEFAULTS.waveStrength}"></label>
      <label>Water roughness <input id="dev-water-roughness" type="number" min="0" max="1" step="0.05" value="${WATER_DEFAULTS.roughness}"></label>
      <label>Reflection strength <input id="dev-water-reflection" type="number" min="0" max="5" step="0.25" value="${WATER_DEFAULTS.reflectionStrength}"></label>
      <label>Water opacity <input id="dev-water-opacity" type="number" min="0" max="1" step="0.05" value="${WATER_DEFAULTS.opacity}"></label>
      <label>Water speed <input id="dev-water-speed" type="number" min="0" max="3" step="0.25" value="${WATER_DEFAULTS.speed}"></label>
      <label>Water intensity <input id="dev-water-intensity" type="number" min="0" max="3" step="0.25" value="${WATER_DEFAULTS.intensity}"></label>
      <div><button data-dev="water-restart">Replay water</button><button data-dev="water-reset">Reset water</button></div>
      <p class="dev-note">Short drifting shimmer lines in the clearing and splash ponds. Compare surface waves and faceted lighting independently. Wave strength 4 is the default. Uncheck Fixed shoreline to let waves lap against banks. Lower roughness gives sharper highlights; reflection strength 0 removes sky reflections. Opacity 1 is opaque; lower it to reveal the shallow bed and pebbles. Speed 0 pauses; Water intensity controls only the shimmer strips and has no effect while they are off.</p>
    </fieldset>
    <fieldset><legend>Skills</legend><div><button data-dev="skills-menu">Open Skills menu</button><button data-dev="skills-lesson">Replay Skills tutorial</button></div><p class="dev-note">Replay sets Gathering to level 2 (120 XP) for the first-level lesson.</p>
      <label>Skill <select id="dev-skill">${Object.keys(api.skills).map(a=>`<option>${a}</option>`).join('')}</select></label>
      <label>Amount <input id="dev-skill-amount" type="number" min="0" max="1000000" step="1" value="20"></label>
      <div><button data-dev="xp">Add XP</button><button data-dev="levels">Add levels</button></div>
    </fieldset>
    <fieldset><legend>Inventory</legend><div><button data-dev="inventory-menu">Open Inventory menu</button><button data-dev="inventory-lesson">Replay Inventory tutorial</button></div><p class="dev-note">Tutorial replay sets Sticks ×3 and Rocks ×3.</p>
      <label>Item <select id="dev-item">${Object.entries(ITEMS).map(([id,item])=>`<option value="${id}">${item.name}</option>`).join('')}</select></label>
      <label>Quantity <input id="dev-quantity" type="number" min="0" max="1000000" step="1" value="1"></label>
      <div><button data-dev="add">Add item</button><button data-dev="remove">Remove item</button></div>
    </fieldset>
    <fieldset><legend>Visual feedback only</legend><p class="dev-note">Item gain/loss uses the selected inventory item and quantity without changing your inventory.</p><div>
      ${['Going','Gathering','Crafting','Chopping','Mining','Opening','Traveling','Arrived','Done','Blocked','XP gain','Level gain','Item gain','Item loss','Clear'].map(a=>`<button data-juice="${a}">${a}</button>`).join('')}
    </div></fieldset>
    <fieldset><legend>Gathering tutorial prompt</legend><button data-dev="level-lesson">Replay first level tips</button><button data-dev="gathering-lesson">Replay gathering tutorial</button><div><button data-prompt="0">Before first pickup</button><button data-prompt="1">After first XP</button><button data-prompt="hide">Hide prompt</button></div></fieldset>
    <fieldset><legend>Tutorial finale</legend><p class="dev-note">Replay the real sequence or test its parts. Practice reset arms the hidden goal; Complete practice clears those objects without granting loot.</p><div>
      ${['Closing dialogue','Drop portal','Use portal','Practice reset','Complete practice','Reward dialogue','Drop chest','Open chest','Hat celebration','Wear/remove hat','Enter Willowbank','Return to clearing','Reset finale'].map(a=>`<button data-finale="${a}">${a}</button>`).join('')}
    </div></fieldset>
    <fieldset><legend>Mining</legend><div><button data-dev="mining-lesson">Replay Mining tutorial</button><button data-dev="mining-stop">Stop Mining tutorial</button><button data-dev="mine-nearest">Mine nearest boulder</button></div><p class="dev-note">Replay restores boulders, gives Sticks ×3 / Rocks ×3, removes the pickaxe, and offers optional guidance. Use Mining animation to loop the real swing.</p></fieldset>
    <fieldset><legend>Resource picking</legend><label><input id="dev-hitboxes" type="checkbox"> Show half-tile hitboxes</label></fieldset>
    <fieldset><legend>Reset</legend><div><button data-reset="items">Ground items</button><button data-reset="trees">Trees</button><button data-reset="boulders">Boulders</button><button data-reset="all">Full test area</button></div></fieldset>
    <output id="dev-status" aria-live="polite">Ready. Starter kit: Sticks ×10, Rocks ×10, Crude Axe ×1, Crude Pickaxe ×1.</output>
    <pre id="dev-state"></pre>`;
  const commands=organizePlayground(panel);
  document.body.append(panel);
  const launcher=document.createElement('button');launcher.id='show-debug-menu';launcher.dataset.journalLast='';launcher.type='button';launcher.setAttribute('aria-label','Show debug menu');launcher.setAttribute('aria-controls',panel.id);launcher.setAttribute('aria-expanded','false');launcher.innerHTML='<svg class="game-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-14-2 16"/></svg><span>Debug</span>';
  document.getElementById('game-menu-bar').append(launcher);
  launcher.onclick=()=>{panel.open=true;panel.querySelector('summary').focus();};
  panel.addEventListener('toggle',()=>{launcher.setAttribute('aria-expanded',String(panel.open));if(!panel.open&&panel.contains(document.activeElement))launcher.focus();});
  const compareThemes=mountThemeComparison(api);
  const $=id=>panel.querySelector('#dev-'+id);
  const waterControls={"enabled": "enabled", "shimmers": "shimmers", "waves": "waves", "shoreline": "fixedShoreline", "color": "color", "faceted": "faceted", "strength": "waveStrength", "roughness": "roughness", "reflection": "reflectionStrength", "opacity": "opacity", "speed": "speed", "intensity": "intensity"};
  let preview=null,time=0,holdingFeedback=false,snapshotAge=0;
  const amount=id=>{const n=Number($(id).value);if(!Number.isSafeInteger(n)||n<0||n>1000000)throw Error('Enter a whole number from 0 to 1,000,000.');return n;};
  const status=text=>$('status').textContent=text;
  panel.querySelector('#dev-music').onchange=e=>{api.audio.unlock();api.audio.preview(e.target.value||null);};
  function stop(force=true){if(!force&&!preview&&!holdingFeedback)return;preview=null;time=0;holdingFeedback=false;api.finale.stopPreview();api.stop();}
  function refresh(){api.refresh();$('state').textContent=Object.entries(api.skills).map(([name,s])=>`${name}: Lv ${s.level} · ${s.xp} XP`).join('\n')+'\n'+Object.entries(api.inventory).map(([name,n])=>itemStack(name,n)).join(' · ');}
  panel.addEventListener('click',e=>{
    let b=e.target.closest('button');if(!b)return;if(b.dataset.command){const command=commands.get(b.dataset.command);b={dataset:command.actions[command.select.value]};}
    try{
      if(b.dataset.willow){const name=b.dataset.willow;if(name==='enter')api.enterWillow();else if(!api.willow.active)throw Error('Enter Willowbank first.');else if(name==='stage')api.willow.debug.stage($('willow-stage').value);else if(name==='preview')api.willow.debug.preview($('willow-animation').value);else if(['scrapper','bruiser'].includes(name))api.willow.debug.fight(name);else api.willow.debug[name]();status('Willowbank: '+name);}
      if(b.dataset.objective)api.objectives[b.dataset.objective]();
      if(b.dataset.sound){api.audio.unlock();api.audio.play(b.dataset.sound);}
      if(b.dataset.prompt){
        const tutorial=document.getElementById('gather-tutorial');
        tutorial.hidden=b.dataset.prompt==='hide';
        if(!tutorial.hidden){showGatheringPrompt(Number(b.dataset.prompt));tutorial.classList.remove('complete');tutorial.querySelector('.progress-track').hidden=false;}
        status('Gathering prompt preview — no gameplay progress changed.');
      }
      if(b.dataset.dev){
        const action=b.dataset.dev;
        if(action==='crafting-menu'){stop();api.showCrafting();}
        if(action==='receipt')api.itemFeed.show({sticks:-1,stones:-1,axes:1});
        if(action==='clear-loot')api.itemFeed.clear();
        if(action==='quests')document.getElementById('open-quests').click();
        if(action==='settings')api.openSettings();
        if(action==='audio-reset'){api.audio.reset();panel.querySelector('#dev-music').value='';for(const input of document.querySelectorAll('[data-audio]'))input.value=api.audio.settings[input.dataset.audio];document.getElementById('audio-muted').checked=false;}
        if(action==='grass-reset'){api.grassPalette.reset();$('grass-color').value=api.grassPalette.defaultColor;status('Original grass palette restored.');}
        if(action==='models'){modelPreview??=createModelPreview();modelPreview.show();}
        if(action==='water-restart'){api.restartWater();status('Water animation restarted.');}
        if(action==='water-reset'){Object.assign(api.waterSettings,WATER_DEFAULTS);for(const [id,key] of Object.entries(waterControls)){const input=$('water-'+id);if(input.type==='checkbox')input.checked=WATER_DEFAULTS[key];else input.value=WATER_DEFAULTS[key];}api.restartWater();status('Water defaults restored.');}
        if(action==='mining-lesson'){stop();api.miningLesson();}
        if(action==='mining-stop'){stop();api.stopMiningLesson();}
        if(action==='mine-nearest'){stop();api.mineNearest();}
        if(action==='inventory-menu'){stop();api.showInventory();}
        if(action==='inventory-lesson'){stop();api.inventoryLesson();}
        if(action==='skills-menu'){stop();api.showSkills();}
        if(action==='level-lesson'){stop();api.levelLesson();}
        if(action==='gathering-lesson'){stop();api.gatheringLesson();}
        if(action==='controls-lesson'){stop();api.controlsLesson();}
        if(action==='quests-lesson'){stop();api.questsLesson();}
        if(action==='skills-lesson'){stop();api.skillsLesson();}
        if(action==='themes'){stop();compareThemes();}
        if(action==='splash'){stop();api.showSplash();}
        if(action==='splash-randomize'){stop();api.randomizeSplash();}
        if(action==='play'){stop();if(api.finale.busy)throw Error('Finish the finale sequence or use Reset finale first.');preview=$('animation').value;api.faceTowardCamera();if(preview==='Hat celebration')api.finale.celebrate({preview:true,rate:()=>Number($('speed').value)});status(`Previewing ${preview}.`);}
        if(action==='stop'){stop();status('Preview stopped. Normal play enabled.');}
        if(action==='face')api.faceTowardCamera();
        if(action==='doze'){stop();api.doze();status('Dozing naturally. Orbit or zoom without waking; click to wake.');}
        if(action==='wake'){stop();api.wake();status('Awake.');}
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
          status(itemStack(item,api.inventory[item]));
        }
      }
      if(b.dataset.juice){
        stop();const kind=b.dataset.juice;holdingFeedback=true;
        if(['Going','Gathering','Crafting','Chopping','Mining','Opening','Traveling','Arrived','Done'].includes(kind)){
          api.feedback.destination(api.getTile());
          if(['Gathering','Crafting','Chopping','Mining','Opening','Traveling','Done'].includes(kind))api.feedback.interacting(kind==='Done'?'Gathering':kind);
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
        else if(action==='Enter Willowbank'){if(api.finale.busy)throw Error('Finish the current finale sequence first.');api.finale.travel('placeholder');}
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
  for(const [id,key,max] of [['roughness','roughness',1],['reflection','reflectionStrength',5]])$('water-'+id).addEventListener('input',()=>{const value=Number($('water-'+id).value);if(Number.isFinite(value))api.waterSettings[key]=Math.max(0,Math.min(max,value));});
  $('water-shimmers').addEventListener('change',()=>api.waterSettings.shimmers=$('water-shimmers').checked);
  $('water-shoreline').addEventListener('change',()=>api.waterSettings.fixedShoreline=$('water-shoreline').checked);
  $('grass-color').addEventListener('input',()=>api.grassPalette.set($('grass-color').value));
  $('water-color').addEventListener('input',()=>api.waterSettings.color=$('water-color').value);
  $('water-faceted').addEventListener('change',()=>api.waterSettings.faceted=$('water-faceted').checked);
  $('water-strength').addEventListener('input',()=>{const value=Number($('water-strength').value);if(Number.isFinite(value))api.waterSettings.waveStrength=Math.max(0,Math.min(4,value));});
  $('water-opacity').addEventListener('input',()=>{const value=Number($('water-opacity').value);if(Number.isFinite(value))api.waterSettings.opacity=Math.max(0,Math.min(1,value));});
  $('water-waves').addEventListener('change',()=>api.waterSettings.waves=$('water-waves').checked);
  $('water-enabled').addEventListener('change',()=>api.waterSettings.enabled=$('water-enabled').checked);
  for(const name of ['speed','intensity'])$('water-'+name).addEventListener('input',()=>{const value=Number($('water-'+name).value);if(Number.isFinite(value))api.waterSettings[name]=Math.max(0,Math.min(3,value));});
  $('hitboxes').addEventListener('change',()=>api.showResourceHitboxes($('hitboxes').checked));
  $('color').addEventListener('input',()=>api.color($('color').value));
  api.reset('all');refresh();
  return {
    stop:()=>stop(false),
    get previewing(){return !!preview;},
    get mining(){return preview==='Mining';},
    get chopping(){return preview==='Chopping';},get time(){return time;},get holdingFeedback(){return holdingFeedback;},
    frame(dt){
      snapshotAge+=dt;if(snapshotAge>.25){snapshotAge=0;refresh();}
      if(!preview)return null;
      time+=dt*Number($('speed').value);
      const duration=durations[preview]||2;
      if(time>=duration){if($('loop').checked){if(preview!=='Sleeping')time%=duration;if(preview==='Hat celebration')api.finale.celebrate({preview:true,rate:()=>Number($('speed').value)});}else{stop();status('Preview finished.');return null;}}
      if(preview==='Hat celebration')return null;
      if(SOCIAL_DURATIONS[preview])return socialMotion(preview,time);
      let pose=idlePose(time),expression='idle',handWork=null,lift=0;
      if(preview==='Sliding'){pose=slideMotion(time/duration);expression='focused';}
      if(preview.startsWith('Jump')){pose=stepMotion(time,preview==='Jump up'?.5:-.5);lift=pose.lift+(preview==='Jump down'?.5:0);expression=time<.32?'preparing':'struggle';}
      if(preview==='Mining'){handWork=time;expression='focused';pose=miningMotion(time).body;}
      if(['Gathering','Crafting','Chopping'].includes(preview)){handWork=time;expression='focused';pose=workPose(preview==='Chopping'?'chop':'gather',time);}
      if(preview==='Spawn landing'){pose=spawnMotion(time);lift=pose.lift;expression=time<.68?'struggle':'idle';}
      if(['Happy','Focused','Preparing','Struggle','Concerned','Shocked','Distraught','Sad','Frown'].includes(preview))expression=preview.toLowerCase();
      return {pose,expression,handWork,lift};
    }
  };
}
