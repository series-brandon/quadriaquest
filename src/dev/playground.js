import {createCarpentryBridge} from '../carpentry-bridge.js';
import {Group} from 'three';
import {organizePlayground} from './playground-layout.js';
import {createModelPreview} from './model-preview.js';
import {GRASS_BASE_COLOR,createGrassColors} from '../grass-palette.js';
import {icon,ICON_NAMES} from '../icons.js';
import {miningMotion,MINING_DURATION} from '../mining.js';
import {ITEMS,itemStack} from '../items.js';
import {WATER_DEFAULTS} from '../water-effects.js';
import {socialMotion,SOCIAL_DURATIONS} from '../slime-social.js';
import {TUTORIAL_CHECKPOINTS,getCheckpoint} from './tutorial-checkpoints.js';
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

// This fixture lives only in playground builds; all behavior comes from production fishing.
export function addFishingFixture({world,scene,fishingSpots,clearingObjects}){
 const parent=new Group();scene.add(parent);clearingObjects.push(parent);
 return fishingSpots.add({tile:world.get('4,4'),parent});
}

export function addCarpentryFixture({world,currentWorld,scene,pickables,clearingObjects}){
 const parent=new Group();scene.add(parent);clearingObjects.push(parent);
 const bridge=createCarpentryBridge({tiles:[world.get('2,4')],parent,world:currentWorld,pickables});
 return bridge;
}

const animations=['Happy hop','Wave','Sleeping','Idle','Sliding','Jump up','Jump down','Spawn landing','Gathering','Crafting','Chopping','Mining','Celebration','Happy','Pleased','Focused','Preparing','Struggle','Concerned','Shocked','Distraught','Sad','Frown','Fainted'];
const durations={...SOCIAL_DURATIONS,'Celebration':4.3,Chopping:CHOP_DURATION,Mining:MINING_DURATION,'Spawn landing':1.2,'Jump up':STEP_DURATION,'Jump down':STEP_DURATION,Sliding:1/2.4};
export function mountPlayground(api){
  let modelPreview;
  const panel=document.createElement('details');panel.id='quadriaquest-dev-playground';panel.open=false;
  panel.innerHTML=`<summary>DEV PLAYGROUND <small>close</small></summary>
    <fieldset><legend>Tutorial checkpoints</legend><p class="dev-note">Loads the selected area and tutorial with its prerequisites. Replaces the current test session.</p><label>Tutorial step<select id="dev-checkpoint">${TUTORIAL_CHECKPOINTS.map(c=>`<option value="${c.id}">${c.label}</option>`).join('')}</select></label><button data-dev="checkpoint">Load step</button><button data-dev="reset-area">Reset current area</button></fieldset>
    <fieldset><legend>Objective feedback</legend>${['tip','add','update','complete','reset'].map(id=>`<button data-objective="${id}">${({tip:'Show tutorial tip',add:'Add objective',update:'Update progress',complete:'Complete objective',reset:'Clear objectives'})[id]}</button>`).join('')}</fieldset><fieldset><legend>UI &amp; audio polish</legend><label>Interface<select id="dev-interface">${[['quests','Quests'],['inventory','Inventory'],['skills','Skills'],['crafting','Crafting'],['companions','Companions'],['companion-name','Companion naming'],['cooking','Cooking'],['settings','Settings tab'],['settings-popup','Settings popup'],['models','Model viewer'],['splash','Splash screen']].map(([id,label])=>`<option value="${id}">${label}</option>`).join('')}</select></label><button data-dev="interface">Open</button><button data-dev="receipt">Crafting receipt</button><button data-dev="clear-loot">Clear item feed</button><button data-dev="audio-reset">Reset audio</button><details><summary>Icon sheet</summary><div class="dev-icons">${ICON_NAMES.map(name=>`<span>${icon(name)} ${name}</span>`).join('')}</div></details><p class="dev-note">Journal tabs, search, expand/minimize, and item controls use the real menus. Sound controls are in Settings (journal or splash cog).</p><label>Music preview<select id="dev-music"><option value="">Follow game</option><option value="splash">Splash</option><option value="intro">Introduction</option><option value="clearing">Clearing</option></select></label><div>${['pickup','craft','complete','chop','mine','fall','level','portal','blocked','wind','bird','insect'].map(name=>`<button data-sound="${name}">${name}</button>`).join('')}</div></fieldset>
    <p class="dev-note">Tutorial skipped · changes are session-only</p>
    <button data-dev="splash">Preview splash screen</button>
    <button data-dev="splash-randomize">Randomize splash slime</button>
    <button data-dev="splash-close">Exit splash preview</button><button data-dev="models">Shared model preview</button>
    <fieldset><legend>Animation preview</legend>
      <div class="dev-animation-options">
        <label>Animation <select id="dev-animation">${animations.map(a=>`<option>${a}</option>`).join('')}</select></label>
        <label>Speed <select id="dev-speed"><option value="0.25">¼×</option><option value="0.5">½×</option><option value="1" selected>1×</option><option value="2">2×</option></select></label>
      </div>
      <label class="dev-loop-control"><input id="dev-loop" type="checkbox" checked> Loop</label>
      <div><button data-dev="play">Play / restart</button><button data-dev="stop">Stop</button><button data-dev="face">Face camera</button><button data-dev="doze">Doze off</button><button data-dev="wake">Wake up</button></div>
      <label>Slime color <input id="dev-color" type="color" value="#a4ce77"></label>
      <p class="dev-note">Previews run in place without consuming items or earning XP. Stop to play normally.</p>
    </fieldset>
    <fieldset><legend>Companions</legend><p class="dev-note">Shared follower controls work in every area. Doze off / Wake up tests sleep with the player.</p><label>Action<select id="dev-companion-action"><option value="spawn">Add follower here</option><option value="pet">Pet follower</option><option value="name">Rename follower</option><option value="rest">Rest here</option><option value="follow">Follow player</option><option value="stop">Stop animation</option><option value="reset">Reset companion</option></select></label><button data-companion="action" aria-label="Run companion action">Run</button><label>Animation<select id="dev-companion-animation">${['Idle','Walk','Sit','Scratch','Petting','Sleeping','Jump up','Jump down'].map(s=>`<option>${s}</option>`).join('')}</select></label><button data-companion="preview" aria-label="Loop companion animation">Loop</button></fieldset>
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
    <fieldset><legend>Skills</legend>
      <label>Skill <select id="dev-skill">${Object.keys(api.skills).map(a=>`<option>${a}</option>`).join('')}</select></label>
      <label>Amount <input id="dev-skill-amount" type="number" min="0" max="1000000" step="1" value="20"></label>
      <div><button data-dev="xp">Add XP</button><button data-dev="levels">Add levels</button></div>
    </fieldset>
    <fieldset><legend>Inventory</legend>
      <label>Item <select id="dev-item">${Object.entries(ITEMS).map(([id,item])=>`<option value="${id}">${item.name}</option>`).join('')}</select></label>
      <label>Quantity <input id="dev-quantity" type="number" min="0" max="1000000" step="1" value="1"></label>
      <div><button data-dev="add">Add item</button><button data-dev="remove">Remove item</button></div>
    </fieldset>
    <fieldset><legend>Visual feedback only</legend><p class="dev-note">Item gain/loss uses the selected inventory item and quantity without changing your inventory.</p><div>
      ${['Damage splat','Blocked splat','Miss splat','Going','Gathering','Crafting','Chopping','Mining','Opening','Traveling','Arrived','Done','Blocked','XP gain','Level gain','Item gain','Item loss','Clear'].map(a=>`<button data-juice="${a}">${a}</button>`).join('')}
    </div></fieldset>
    <fieldset><legend>Player health</legend><label>Action<select id="dev-health"><option value="heal">Restore health</option><option value="hurt">Lose 10 health</option></select></label><button data-dev="health">Apply</button></fieldset>
    <fieldset><legend>Carpentry practice</legend><p class="dev-note">The clearing pond has a practice bridge at (2, 4). Add a Crude Hammer and Small Logs ×3 with Inventory controls, then click the broken bridge. Move to cancel; Full test area resets the bridge and rewards. The Willowbank bridge checkpoint exercises the same action with its injury and rescue story. Carpentry XP is available in Skills; hammering and bridge stages are in the model viewer.</p></fieldset>
    <fieldset><legend>Fishing practice</legend><p class="dev-note">The clearing pond has a Pondfish spot at (4, 4). Add a Crude Fishing Rod with Inventory controls, then click its ripples. Repeat catches, cancel by moving, and reset with Full test area. Willowbank · Catch Pondfish uses the same action. Fishing XP and levels use the Skills controls; cast, wait, and catch motions are in the shared model viewer.</p></fieldset>
    <fieldset><legend>Resource picking</legend><p class="dev-note">Trees, boulders, and ground items in both areas use shared actions. Inventory supplies axes/pickaxes; Skills adjusts Gathering, Lumberjack, and Mining. Move to cancel before depletion. Ground items, Trees, Boulders, and Full test area resets support repeats in the clearing. Willowbank resources respawn after 8 seconds; occupied or reserved tiles delay solid-resource respawns. Load Willowbank · Collect Flint to check its narrative callback. Model viewer motions reuse the production hit/depletion animations.</p><label><input id="dev-hitboxes" type="checkbox"> Show half-tile hitboxes</label></fieldset>
    <fieldset><legend>Reset</legend><div><button data-reset="items">Ground items</button><button data-reset="trees">Trees</button><button data-reset="boulders">Boulders</button><button data-reset="all">Full test area</button></div></fieldset>
    <output id="dev-status" aria-live="polite">Ready. Starter kit: Sticks ×10, Rocks ×10, Crude Axe ×1, Crude Pickaxe ×1.</output>
    <pre id="dev-state"></pre>`;
  const commands=organizePlayground(panel);
  document.body.append(panel);
  const launcher=document.createElement('button');launcher.id='show-debug-menu';launcher.dataset.journalLast='';launcher.type='button';launcher.setAttribute('aria-label','Show debug menu');launcher.setAttribute('aria-controls',panel.id);launcher.setAttribute('aria-expanded','false');launcher.innerHTML='<svg class="game-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-14-2 16"/></svg><span>Debug</span>';
  document.getElementById('game-menu-bar').append(launcher);
  launcher.onclick=()=>{panel.open=true;panel.querySelector('summary').focus();};
  panel.addEventListener('toggle',()=>{launcher.setAttribute('aria-expanded',String(panel.open));if(!panel.open&&panel.contains(document.activeElement))launcher.focus();});

  const $=id=>panel.querySelector('#dev-'+id);
  const waterControls={"enabled": "enabled", "shimmers": "shimmers", "waves": "waves", "shoreline": "fixedShoreline", "color": "color", "faceted": "faceted", "strength": "waveStrength", "roughness": "roughness", "reflection": "reflectionStrength", "opacity": "opacity", "speed": "speed", "intensity": "intensity"};
  let preview=null,time=0,holdingFeedback=false,snapshotAge=0;
  const amount=id=>{const n=Number($(id).value);if(!Number.isSafeInteger(n)||n<0||n>1000000)throw Error('Enter a whole number from 0 to 1,000,000.');return n;};
  const status=text=>$('status').textContent=text;
  panel.querySelector('#dev-music').onchange=e=>{api.audio.unlock();api.audio.preview(e.target.value||null);};
  function stop(force=true){if(!force&&!preview&&!holdingFeedback)return;preview=null;time=0;holdingFeedback=false;api.finale.stopPreview();api.stop();}
  function refresh(){api.refresh();$('state').textContent=Object.entries(api.skills).map(([name,s])=>`${name}: Lv ${s.level} · ${s.xp} XP`).join('\n')+'\n'+Object.entries(api.inventory).map(([name,n])=>itemStack(name,n)).join(' · ');}
  panel.addEventListener('click',async e=>{
    let b=e.target.closest('button');if(!b)return;if(b.dataset.command){const command=commands.get(b.dataset.command);b={dataset:command.actions[command.select.value]};}
    try{
      if(b.dataset.companion){stop();const c=api.companions;if(b.dataset.companion==='preview'){c.preview($('companion-animation').value);status('Companion preview: '+$('companion-animation').value);}else{const action=$('companion-action').value;if(action==='reset')c.reset();else if(action==='stop')c.cancel();else{if(!c.state.owned){c.acquire();c.update(0,0,null);}if(action==='pet')c.pet();if(action==='name')c.name();if(action==='rest')c.setFollowing(false);if(action==='follow')c.setFollowing(true);}status('Companion: '+action);}}

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
        if(action==='checkpoint'){stop();const checkpoint=getCheckpoint($('checkpoint').value);await api.loadCheckpoint(checkpoint);status('Loaded '+checkpoint.label+' with required resources.');}
        if(action==='reset-area'){stop();api.closeSplash();api.resetCurrentArea();status('Current area reset.');}
        if(action==='health'){status(`Health: ${api.sharedAction($('health').value)} / 30`);}
        if(action==='splash-close')api.closeSplash();
        if(action==='interface'){stop();const name=$('interface').value;if(name==='models'){modelPreview??=createModelPreview();modelPreview.show();}else if(name==='splash')api.showSplash();else api.openInterface(name);status('Opened '+name+'.');}

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
        if(action==='customization'){stop();api.customization();}
        if(action==='controls-lesson'){stop();api.controlsLesson();}
        if(action==='quests-lesson'){stop();api.questsLesson();}
        if(action==='skills-lesson'){stop();api.skillsLesson();}

        if(action==='splash'){stop();api.showSplash();}
        if(action==='splash-randomize'){stop();api.randomizeSplash();}
        if(action==='play'){stop();if(api.finale.busy)throw Error('Finish the finale sequence or use Reset finale first.');preview=$('animation').value;api.faceTowardCamera();if(preview==='Celebration')api.finale.celebrate({preview:true,rate:()=>Number($('speed').value)});status(`Previewing ${preview}.`);}
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
        if(['Damage splat','Blocked splat','Miss splat','Going','Gathering','Crafting','Chopping','Mining','Opening','Traveling','Arrived','Done'].includes(kind)){
          api.feedback.destination(api.getTile());
          if(['Gathering','Crafting','Chopping','Mining','Opening','Traveling','Done'].includes(kind))api.feedback.interacting(kind==='Done'?'Gathering':kind);
          if(['Arrived','Done'].includes(kind))api.feedback.complete();
        }
        if(kind==='Item gain'||kind==='Item loss')api.showItemChanges({[$('item').value]:amount('quantity')*(kind==='Item gain'?1:-1)});
        if(['Damage splat','Blocked splat','Miss splat'].includes(kind))api.sharedAction({'Damage splat':'hit','Blocked splat':'zero','Miss splat':'miss'}[kind]);
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
          const actions={'Closing dialogue':()=>api.finale.begin(),'Drop portal':()=>api.finale.dropPortal(),'Practice reset':()=>api.finale.resetPractice(),'Complete practice':()=>api.completePractice(),'Reward dialogue':()=>api.finale.revealReward(),'Drop chest':()=>api.finale.dropChest(),'Open chest':()=>api.finale.openChest(),'Celebration':()=>api.finale.celebrate(),'Wear/remove hat':()=>api.finale.equip()};
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
      if(time>=duration){if($('loop').checked){if(preview!=='Sleeping')time%=duration;if(preview==='Celebration')api.finale.celebrate({preview:true,rate:()=>Number($('speed').value)});}else{stop();status('Preview finished.');return null;}}
      if(preview==='Celebration')return null;
      if(SOCIAL_DURATIONS[preview])return socialMotion(preview,time);
      let pose=idlePose(time),expression='idle',handWork=null,lift=0;
      if(preview==='Sliding'){pose=slideMotion(time/duration);expression='focused';}
      if(preview.startsWith('Jump')){pose=stepMotion(time,preview==='Jump up'?.5:-.5);lift=pose.lift+(preview==='Jump down'?.5:0);expression=time<.32?'preparing':'struggle';}
      if(preview==='Mining'){handWork=time;expression='focused';pose=miningMotion(time).body;}
      if(['Gathering','Crafting','Chopping'].includes(preview)){handWork=time;expression='focused';pose=workPose(preview==='Chopping'?'chop':'gather',time);}
      if(preview==='Spawn landing'){pose=spawnMotion(time);lift=pose.lift;expression=time<.68?'struggle':'idle';}
      if(['Happy','Pleased','Focused','Preparing','Struggle','Concerned','Shocked','Distraught','Sad','Frown','Fainted'].includes(preview))expression=preview.toLowerCase();
      return {pose,expression,handWork,lift};
    }
  };
}
