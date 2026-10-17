import {SHOPS} from '../shops.js';
import {ENEMIES} from '../combat-rules.js';
import './test-armor.js';
export {createTrainingFixtures} from './training-fixtures.js';
export {createLumberjackFixtures} from './lumberjack-fixtures.js';
export {createCombatFixtures} from './combat-fixtures.js';
export {createWalkThroughFixtures} from './walkthrough-fixtures.js';
export {createEdgeFixtures} from './edge-fixtures.js';
export {createMovementFixtures} from './movement-fixtures.js';
export {createPerfProbe} from './perf-probe.js';
export {createPerfScenarios} from './perf-scenarios.js';
import {createCarpentryBridge} from '../carpentry-bridge.js';
import {Group} from 'three';
import {organizePlayground} from './playground-layout.js';
import {DIAGONAL_MOVES} from '../world.js';
import {COMBAT_GEOMETRY,METRICS} from '../combat-geometry.js';
import {FOLLOW,FOLLOW_DEFAULTS} from '../companion-follow.js';
import {enemySheetDetails,FORCE_ATTACKS} from './combat-fixtures.js';
import {playerActionMotion} from '../player-action-motion.js';
import {createModelViewer} from './model-viewer.js';
import {musicLab} from './music-lab.js';
import {mount} from '../ui/dom.js';
import {GRASS_BASE_COLOR,createGrassColors} from '../grass-palette.js';
import {icon,ICON_NAMES} from '../icons.js';
import {miningMotion,MINING_DURATION} from '../mining.js';
import {ITEMS,itemStack} from '../items.js';
import {SLIME_ACTOR_MOTIONS} from '../slime-presentation.js';
import {WATER_DEFAULTS} from '../water-effects.js';
import {socialMotion,SOCIAL_DURATIONS,HELD_MOTIONS} from '../slime-social.js';
import {TUTORIAL_CHECKPOINTS,getCheckpoint} from './tutorial-checkpoints.js';
import {PERF_SCENARIOS,DENSITY_STEPS} from './perf-scenarios.js';
import {createOpening,showGatheringPrompt} from '../opening.js';
import {idlePose,slideMotion,stepMotion,STEP_DURATION,workPose,spawnMotion,CHOP_DURATION} from '../slime-motion.js';
import {showSkillReward,grantSkillXp,addSkillLevels} from '../skills.js';
import {ATTRIBUTES} from '../character.js';
import {TREES} from '../lumberjack.js';
import {TOOL_TIERS} from '../tool-tiers.js';
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

const animations=['Attack (equipped)','Strong Strike (equipped)','Block (equipped)','Point','Stomp','Happy hop','Wave','Sleeping','Idle','Sliding','Jump up','Jump down','Spawn landing','Gathering','Crafting','Chopping','Mining','Celebration','Happy','Pleased','Focused','Preparing','Struggle','Concerned','Shocked','Distraught','Sad','Frown','Fainted','Angry'];
const durations={...SOCIAL_DURATIONS,'Celebration':4.3,Chopping:CHOP_DURATION,Mining:MINING_DURATION,'Spawn landing':1.2,'Jump up':STEP_DURATION,'Jump down':STEP_DURATION,Sliding:1/2.4};
export function mountPlayground(api){
 let countryBounds=false,biomeBounds=false;
  let worldEditor=null,modelPreview;
  const panel=document.createElement('details');panel.id='quadriaquest-dev-playground';panel.open=false;
  panel.innerHTML=`<summary>DEV PLAYGROUND <small>close</small></summary>
    <fieldset><legend>Training systems</legend><label>Action<select id="dev-training">${[['spawn','Spawn portable fixtures'],['copper','Mine copper'],['furnace','Use furnace'],['anvil','Use anvil'],['supplies','Use provision shelf'],['target','Fight practice target'],['scrapper','Fight live enemy'],['kit','Bow and arrow supply offers'],['learn','Learn Energy Strike'],['forget','Reset spells'],['reset','Reset fixtures'],['remove','Remove fixtures']].map(([id,label])=>`<option value="${id}">${label}</option>`).join('')}</select></label><button data-dev="training">Run</button><label>Cinderhold landmark<select id="dev-landmark">${['crystal','sarge','smith','ranger','mage','ki','scrapper','bruiser','furnace','anvil','crevice','golem'].map(id=>`<option>${id}</option>`).join('')}</select></label><button data-dev="landmark">Visit landmark</button></fieldset>
    <fieldset><legend>Biome test</legend><div><label>Biome <select id="dev-biome">${api.biomeIds.map(b=>`<option value="${b}"${b==='meadow'?' selected':''}>${b}</option>`).join('')}</select></label>
      <button data-dev="biome-enter">Go</button><button data-dev="biome-reseed">New seed</button><button data-dev="biome-here">What's here?</button><button data-dev="biome-bounds">Chunk outlines</button></div></fieldset>
    <fieldset><legend>Streaming test</legend><div><button data-dev="stream-enter">Enter streaming test</button><button data-dev="stream-far">Teleport ~100 tiles</button><button data-dev="stream-stall">Stall loading 3 s</button><button data-dev="stream-stats">Show stats</button></div>
      <label>Load radius (chunks)<select id="dev-stream-radius">${[1,2,3].map(r=>`<option value="${r}"${r===1?' selected':''}>${r} (${(2*r+1)**2} chunks)</option>`).join('')}</select></label>
      <label class="dev-toggle"><input type="checkbox" id="dev-stream-bounds"> Show chunk bounds</label></fieldset>
    <fieldset><legend>Travel practice</legend><label>Destination<select id="dev-travel"><option value="willowbank">Willowbank</option><option value="clearing">Clearing</option><option value="cinderhold">Cinderhold</option></select></label><button data-dev="travel">Travel</button><button data-dev="use-crystal">Walk to crystal</button><button data-dev="cancel-travel">Cancel travel</button></fieldset>
    <fieldset><legend>Tutorial checkpoints</legend><label>Tutorial step<select id="dev-checkpoint">${TUTORIAL_CHECKPOINTS.map(c=>`<option value="${c.id}">${c.label}</option>`).join('')}</select></label><button data-dev="checkpoint">Load step</button><button data-dev="reset-area">Reset current area</button>
      <div><button data-dev="wake">Wake up now</button><button data-dev="wake-skip">Wake up (skip lines)</button><button data-dev="dream">Back to the dream</button></div></fieldset>
    <fieldset><legend>Objective feedback</legend>${['tip','add','update','complete','quest','questAdvance','questFinish','questLevel','reset'].map(id=>`<button data-objective="${id}">${({tip:'Show tutorial tip',add:'Add objective',update:'Update progress',complete:'Complete objective',quest:'Start Playground Quest (two-part objective)',questAdvance:'Advance a Playground Quest part',questFinish:'Finish Playground Quest',questLevel:'Objective + level-up together',reset:'Clear objectives'})[id]}</button>`).join('')}</fieldset><fieldset><legend>UI &amp; audio polish</legend><label>Interface<select id="dev-interface">${[['quests','Quests'],['inventory','Inventory'],['skills','Skills'],['crafting','Crafting'],['companions','Companions'],['companion-name','Companion naming'],['food-confirm','Eat at full health (confirm)'],['cooking','Cooking'],['furnace','Furnace'],['anvil','Anvil'],['destinations','Destinations'],['combat-styles','Combat styles'],['powers','Powers (spells, auras, abilities)'],['settings','Settings tab'],['settings-popup','Settings popup'],['models','Model viewer'],['splash','Splash screen']].map(([id,label])=>`<option value="${id}">${label}</option>`).join('')}</select></label><button data-dev="interface">Open</button><button data-dev="receipt">Crafting receipt</button><button data-dev="clear-loot">Clear item feed</button><button data-dev="audio-reset">Reset audio</button><details><summary>Icon sheet</summary><div class="dev-icons">${ICON_NAMES.map(name=>`<span>${icon(name)} ${name}</span>`).join('')}</div></details></fieldset>
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
      </fieldset>
    <fieldset><legend>Maps</legend><div><button data-dev="world-editor">Open world editor</button><button data-dev="prop-gallery">Prop gallery</button><button data-dev="force-cutaway">Force cutaway</button><button data-dev="free-camera">Free camera</button><button data-dev="player-here">Player to camera</button><button data-dev="crystals-discover">Discover all crystals</button><button data-dev="crystals-forget">Forget crystals</button></div></fieldset>
    <fieldset><legend>Walls &amp; doors</legend><label>Action<select id="dev-edges"><option value="spawn">Build walls &amp; doors yard nearby</option><option value="inside">Walk into the room</option><option value="toggle">Open / close the door</option><option value="lock">Lock / unlock the door</option><option value="remove">Remove yard</option></select></label><button data-dev="edges">Run</button><div><button data-dev="building-map">Enter building test map</button><button data-dev="building-doors-open">Open all its doors</button><button data-dev="building-doors-close">Close all its doors</button></div><label class="dev-toggle"><input type="checkbox" id="dev-edge-overlay"> Show tile edges</label></fieldset>
    <fieldset><legend>Movement</legend><div>Diagonal steps ${[['player','Player'],['companion','Companion'],['npc','NPCs'],['townsfolk','Townsfolk'],['enemy','Creatures'],['body','Large bodies']].map(([id,label])=>`<label class="dev-toggle"><input type="checkbox" data-diagonal="${id}" checked> ${label}</label>`).join('')}</div><label>Melee reach<select id="dev-melee-reach"><option value="cardinal">Cardinal</option><option value="8way">8-way</option></select></label><label>Range metric<select id="dev-range-metric">${METRICS.map(m=>`<option>${m}</option>`).join('')}</select></label><label>Action<select id="dev-movement"><option value="yard">Build corner yard nearby</option><option value="remove">Remove corner yard</option></select></label><button data-dev="movement">Run</button><label class="dev-toggle"><input type="checkbox" id="dev-route-overlay"> Show routes and patrol areas</label></fieldset>
    <fieldset><legend>Walk-through characters</legend><label>Action<select id="dev-walkthrough"><option value="crowd">Spawn townsfolk crowd ahead</option><option value="walk-crowd">Walk past the crowd</option><option value="stand-walk">Stop on a townsfolk (steps aside)</option><option value="stand-never">Stop on the townsfolk that stays put</option><option value="golem">Spawn passive Cinder Golem ahead</option><option value="walk-golem">Walk past the golem</option><option value="remove">Remove fixtures</option></select></label><button data-dev="walkthrough">Run</button><label class="dev-toggle"><input type="checkbox" id="dev-occupancy-overlay"> Show solid and occupied tiles</label></fieldset>
    <fieldset><legend>NPC slimes</legend><label>Slime<select id="dev-npc">${[['sarge','Sergeant Bristle'],['smith','Borin Copperbelly'],['ranger','Fletch'],['mage','Wisp'],['ki','Ember'],['reed','Reed']].map(([id,name])=>`<option value="${id}">${name}</option>`).join('')}</select></label><label>Motion<select id="dev-npc-motion">${SLIME_ACTOR_MOTIONS.map(m=>`<option>${m}</option>`).join('')}</select></label><button data-dev="npc-play">Play</button><button data-dev="npc-stop">Stop</button></fieldset>
    <fieldset><legend>Companions</legend><label>Action<select id="dev-companion-action"><option value="spawn">Add follower here</option><option value="pet">Pet follower</option><option value="name">Rename follower</option><option value="rest">Rest here</option><option value="follow">Follow player</option><option value="hat">Put on / remove Companion Top Hat</option><option value="teleport">Teleport to me</option><option value="away-2">Send 2 tiles away</option><option value="away-5">Send 5 tiles away</option><option value="away-9">Send 9 tiles away</option><option value="follow-state">Show follow state</option><option value="stop">Stop animation</option><option value="reset">Reset companion</option></select></label><button data-companion="action" aria-label="Run companion action">Run</button><label>Animation<select id="dev-companion-animation">${['Idle','Walk','Sit','Scratch','Petting','Sleeping','Jump up','Jump down'].map(s=>`<option>${s}</option>`).join('')}</select></label><button data-companion="preview" aria-label="Loop companion animation">Loop</button><div>${[['pace','Pace',.3,1.5,.05],['sprint','Sprint ×',1,3,.1],['start','Start at',1,6,1],['teleport','Teleport past',3,20,1]].map(([id,label,min,max,step])=>`<label>${label} <input type="number" data-follow="${id}" min="${min}" max="${max}" step="${step}" value="${FOLLOW_DEFAULTS[id]}"></label>`).join('')}<button data-companion="follow-defaults">Default follow tuning</button></div></fieldset>
    <fieldset><legend>Terrain colors</legend>
      <label>Grass color <input id="dev-grass-color" type="color" value="${api.grassPalette.defaultColor}"></label>
      <button data-dev="grass-reset">Reset grass color</button>
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
      </fieldset>
    <fieldset><legend>Skills</legend>
      <label>Skill <select id="dev-skill">${Object.keys(api.skills).map(a=>`<option>${a}</option>`).join('')}</select></label>
      <label>Amount <input id="dev-skill-amount" type="number" min="0" max="1000000" step="1" value="20"></label>
      <div><button data-dev="xp">Add XP</button><button data-dev="levels">Add levels</button></div>
      </fieldset>
    <fieldset><legend>Character &amp; combat profile</legend><label>Attribute<select id="dev-attribute">${ATTRIBUTES.map(a=>`<option>${a}</option>`).join('')}</select></label><label>Value<input id="dev-attribute-value" type="number" min="1" max="500" value="10"></label><div><button data-dev="attribute-set">Set attribute</button><button data-dev="attribute-points">Grant 3 points</button><button data-dev="combat-profile">Show combat profile</button><button data-dev="character-reset">Reset character</button></div><div><button data-dev="combat-kit">Learn Strong Strike, Rush &amp; Harden</button><button data-dev="combat-kit-forget">Forget abilities, auras &amp; spells</button><button data-dev="queue-strike">Queue Strong Strike</button><button data-dev="quick-slots">Set up quick slots</button></div></fieldset>
    <fieldset><legend>Assistance, dual wield, armor, control &amp; backfire</legend><div><button data-dev="assist-state">Show assistance state</button><button data-dev="test-armor">Add all test armor</button></div>
     <label>Control test<select id="dev-control">${[['player:stun','Stun me 3s (6s protection)'],['player:immobilize','Immobilize me 3s'],['player:slow50','Slow me 50% for 5s (refreshes)'],['player:slow30','Slow me 30% for 10s (no refresh)'],['cleanse','Cleanse me (+10s protection)'],['enemy:stun','Stun nearest enemy 3s'],['enemy:immobilize','Immobilize nearest enemy 3s'],['enemy:slow50','Slow nearest enemy 50%']].map(([id,label])=>`<option value="${id}">${label}</option>`).join('')}</select></label><button data-dev="control-test">Apply</button>
     <label>Energy Strike requirement (Magic Technique)<input id="dev-spell-requirement" type="number" min="1" max="500" value="1"></label><button data-dev="spell-requirement">Set requirement</button></fieldset>
    <fieldset><legend>Inventory</legend>
      <label>Item <select id="dev-item">${Object.entries(ITEMS).map(([id,item])=>`<option value="${id}">${item.name}</option>`).join('')}</select></label>
      <label>Quantity <input id="dev-quantity" type="number" min="0" max="1000000" step="1" value="1"></label>
      <div><button data-dev="add">Add item</button><button data-dev="remove">Remove item</button><button data-dev="crude-gear">Add crude gear</button></div>
    </fieldset>
    <fieldset><legend>Economy</legend><label>Gold <input id="dev-gold" type="number" min="0" step="1" value="500"></label>
      <div><button data-dev="gold-set">Set gold</button><button data-dev="gold-add">+100 gold</button><button data-dev="gold-reset">Reset gold to 0</button></div>
      <label>Shop <select id="dev-shop">${Object.entries(SHOPS).map(([id,shop])=>`<option value="${id}">${shop.name}</option>`).join('')}</select></label>
      <div><button data-dev="shop-open">Open shop</button><button data-dev="shop-counter">Place shop counter</button><button data-dev="shop-counter-remove">Remove counter</button><button data-dev="shop-reset">Reset stock</button></div>
      <div><button data-dev="price-list">Price list</button></div>
    </fieldset>
    <fieldset><legend>Countryside</legend><label>Place <select id="dev-country-place"><option value="west-gate">West gate (inside; guards)</option><option value="south-gate">South gate (inside; guards)</option><option value="west-road">West road end (woodcutter)</option><option value="lake">Lake shore</option><option value="pond">Pond</option><option value="bridge">East road bridge</option><option value="ruins">Ruins (north hills)</option><option value="hills">North-east hills</option><option value="woods">South-west woods</option><option value="south-road">South road</option></select></label>
      <label>City biome <select id="dev-city-biome"><option value="blossom">Blossom garden</option><option value="willow">Willow green</option><option value="autumn">Autumn grove</option><option value="poplar">Poplar copse</option><option value="meadow">Meadow</option></select></label><div><button data-dev="city-biome-jump">Jump to city biome</button></div>
      <div><button data-dev="country-jump">Jump</button><button data-dev="country-bounds">Toggle chunk outlines</button><button data-dev="country-stats">Streaming stats</button><button data-dev="country-radius-1">Radius 1</button><button data-dev="country-radius-2">Radius 2</button></div>
    </fieldset>
    <fieldset><legend>Drops &amp; jobs</legend><label>Enemy <select id="dev-drop-enemy"><option value="">Test pile</option>${Object.keys(ENEMIES).map(id=>`<option value="${id}">${ENEMIES[id].name}</option>`).join('')}</select></label>
      <label>Seed <input id="dev-drop-seed" type="number" min="0" step="1" value="1"></label>
      <div><button data-dev="drops-roll">Roll drops</button><button data-dev="drops-spawn">Drop loot here</button><button data-dev="drops-seed">Fix seed</button><button data-dev="drops-random">Random again</button><button data-dev="drops-clear">Clear piles</button></div>
      <div><button data-dev="jobs-board">Open job board</button><button data-dev="jobs-noticeboard">Place noticeboard</button></div>
      <div><button data-dev="jobs-giver-post">Test post giver</button><button data-dev="jobs-giver-smith">Test bring giver</button><button data-dev="jobs-giver-baker">Test craft giver</button><button data-dev="jobs-giver-fishmonger">Test gather giver</button><button data-dev="jobs-recipient">Test recipient</button></div>
      <div><button data-dev="jobs-finish">Finish jobs</button><button data-dev="jobs-handin">Hand in all</button><button data-dev="jobs-abandon">Abandon all</button><button data-dev="jobs-cooldowns">Clear cooldowns</button><button data-dev="jobs-reset">Reset jobs</button></div>
    </fieldset>
    <fieldset><legend>Visual feedback only</legend><div>
      ${['Damage splat','Blocked splat','Miss splat','Going','Gathering','Crafting','Chopping','Mining','Smelting','Smithing','Opening','Traveling','Arrived','Done','Blocked','XP gain','Level gain','Item gain','Item loss','Clear'].map(a=>`<button data-juice="${a}">${a}</button>`).join('')}
    </div></fieldset>
    <fieldset><legend>Combat practice</legend><label>Action<select id="dev-combat"><option value="spawn">Spawn passive enemies</option><option value="spawn-typed">Spawn enemies as their types</option><option value="spawn-aggressive">Spawn aggressive enemies (3 tiles)</option><option value="spawn-hunters">Spawn pacifist-hunting enemies (3 tiles)</option><option value="spawn-golem">Spawn Cinder Golem (boss, hunts pacifists)</option><option value="scrapper">Fight Scrapper</option><option value="bruiser">Fight Bruiser</option><option value="golem">Fight Cinder Golem</option><option value="reset">Reset enemies</option><option value="defeat">Defeat and respawn</option><option value="remove">Remove enemies</option><option value="sheets">Show enemy stat sheets</option><option value="threat">Threat and aggression</option></select></label><button data-dev="combat">Run</button><label>Force attack<select id="dev-combat-attack"><option value="">Type’s mix</option>${FORCE_ATTACKS.map(([id,name])=>`<option value="${id}">${name}</option>`).join('')}</select></label><button data-dev="combat-force">Force</button><label>Creature<select id="dev-combat-kind">${Object.entries(ENEMIES).filter(([,e])=>!e.inert).map(([id,e])=>`<option value="${id}">${e.name} (Threat ${e.threat?.level??'–'})</option>`).join('')}</select></label><button data-dev="combat-kind">Spawn</button><button data-dev="combat-kind-fight">Fight</button><details><summary>Enemy stat sheets</summary>${enemySheetDetails()}</details></fieldset>
    <fieldset><legend>Player health</legend><label>Resource<select id="dev-resource"><option value="health">Health</option><option value="mana">Mana</option><option value="stamina">Stamina</option><option value="energy">Energy</option><option value="ki">Ki</option></select></label><label>Value<input id="dev-resource-value" type="number" min="0" max="5000" step="any" value="100"></label><button data-dev="resource-set">Set resource</button><button data-dev="resource-reset">Restore all resources</button><label>Action<select id="dev-health"><option value="heal">Restore health</option><option value="hurt">Lose 10 health</option></select></label><button data-dev="health">Apply</button></fieldset>
    <fieldset><legend>Carpentry practice</legend></fieldset>
    <fieldset><legend>Fishing practice</legend></fieldset>
    <fieldset><legend>Lumberjack practice</legend><label>Tree <select id="dev-tree">${Object.entries(TREES).map(([id,t])=>`<option value="${id}">${t.name} (Lv ${t.level})</option>`).join('')}</select></label>
      <label>Action <select id="dev-lumber">${[['plant','Plant this tree'],['plant-all','Plant every tier'],['level','Set Lumberjack to its level'],['info','Chop time and XP'],['fell','Fell planted trees (stumps)'],['reset','Regrow planted trees'],['remove','Remove planted trees']].map(([id,label])=>`<option value="${id}">${label}</option>`).join('')}</select></label><button data-dev="lumber">Run</button>
      <label>Axe <select id="dev-axe">${TOOL_TIERS.axe.tiers.map(t=>`<option value="${t.item}">${ITEMS[t.item]?.name||t.item} (Lv ${t.level})</option>`).join('')}</select></label><button data-dev="axe">Give axe</button></fieldset>
    <fieldset><legend>Resource picking</legend><label><input id="dev-hitboxes" type="checkbox"> Show half-tile hitboxes</label></fieldset>
    <fieldset><legend>Performance</legend><label>Scenario<select id="dev-perf-scenario">${PERF_SCENARIOS.map(s=>`<option value="${s.id}">${s.id}</option>`).join('')}</select></label><div><button data-dev="perf-scenario">Prepare scenario</button><button data-dev="perf-hud">Toggle perf HUD</button><button data-dev="perf-census">Log scene census</button></div><label>Density step<select id="dev-perf-density">${DENSITY_STEPS.map((s,i)=>`<option value="${i}">${s.series} · ${s.props} props</option>`).join('')}</select></label><button data-dev="perf-density">Build density step</button></fieldset>
    <fieldset><legend>Reset</legend><div><button data-reset="items">Ground items</button><button data-reset="trees">Trees</button><button data-reset="boulders">Boulders</button><button data-reset="all">Full test area</button></div></fieldset>
    <output id="dev-status" aria-live="polite">Ready. Starter kit: Sticks ×10, Rocks ×10, Crude Axe ×1, Crude Pickaxe ×1.</output>
    <pre id="dev-state"></pre>`;
  panel.querySelector('#dev-status').before(mount(()=>musicLab(api.audio)).node);
  const commands=organizePlayground(panel);
  document.body.append(panel);
  // A launcher tab (no page) in the journal's tab registry; it opens this debug panel.
  api.registerTab({id:'debug',tab:'show-debug-menu',label:'Debug',ariaLabel:'Show debug menu',order:1000,icon:()=>{const t=document.createElement('template');t.innerHTML='<svg class="game-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-14-2 16"/></svg>';return t.content.firstElementChild;},action:()=>{panel.open=true;panel.querySelector('summary').focus();}});
  const launcher=document.getElementById('show-debug-menu');launcher.setAttribute('aria-controls',panel.id);launcher.setAttribute('aria-expanded','false');
  async function openWorldEditor(){const {createWorldEditor}=await import('./world-editor.js');worldEditor??=createWorldEditor(api);await worldEditor.open();window.quadriaquest.worldEditor=worldEditor;}
  // The playground opens in the world editor on the overworld (docs/PLAYGROUND.md), unless the address asks for
  // the game (?game; the perf harness always does). The editor's World → Maps list switches to the game's clearing.
  if(!new URLSearchParams(location.search).has('game'))setTimeout(()=>openWorldEditor().catch(error=>console.error(error)),0);
  panel.addEventListener('toggle',()=>{launcher.setAttribute('aria-expanded',String(panel.open));if(!panel.open&&panel.contains(document.activeElement))launcher.focus();});

  const $=id=>panel.querySelector('#dev-'+id);
  const waterControls={"enabled": "enabled", "shimmers": "shimmers", "waves": "waves", "shoreline": "fixedShoreline", "color": "color", "faceted": "faceted", "strength": "waveStrength", "roughness": "roughness", "reflection": "reflectionStrength", "opacity": "opacity", "speed": "speed", "intensity": "intensity"};
  let preview=null,time=0,holdingFeedback=false,snapshotAge=0;
  const amount=id=>{const n=Number($(id).value);if(!Number.isSafeInteger(n)||n<0||n>1000000)throw Error('Enter a whole number from 0 to 1,000,000.');return n;};
  const status=text=>$('status').textContent=text;
  function stop(force=true){if(!force&&!preview&&!holdingFeedback)return;preview=null;time=0;holdingFeedback=false;api.finale.stopPreview();api.stop();}
  function refresh(){api.refresh();$('state').textContent=`Core: Lv ${api.character.core.level} · ${Math.floor(api.character.core.xp)} XP · ${api.character.unspent} unspent points`+'\n'+Object.entries(api.skills).filter(([,s])=>s.curve!=='adopted'||s.xp>0).map(([name,s])=>`${name}: Lv ${s.level} · ${Math.floor(s.xp)} XP`).join('\n')+'\n'+Object.entries(api.inventory).map(([name,n])=>itemStack(name,n)).join(' · ');}
  panel.addEventListener('click',async e=>{
    let b=e.target.closest('button');if(!b)return;if(b.dataset.command){const command=commands.get(b.dataset.command);b={dataset:command.actions[command.select.value]};}
    try{
      if(b.dataset.companion){stop();const c=api.companions;
       if(b.dataset.companion==='preview'){c.preview($('companion-animation').value);status('Companion preview: '+$('companion-animation').value);}
       else if(b.dataset.companion==='follow-defaults'){Object.assign(FOLLOW,FOLLOW_DEFAULTS);for(const input of panel.querySelectorAll('[data-follow]'))input.value=FOLLOW[input.dataset.follow];status('Follow tuning: defaults.');}
       else{const action=$('companion-action').value;if(action==='reset')c.reset();else if(action==='stop')c.cancel();else{if(!c.state.owned){c.acquire();c.update(0,0,null);}if(action==='pet')c.pet();if(action==='name')c.name();if(action==='rest')c.setFollowing(false);if(action==='follow')c.setFollowing(true);if(action==='hat'){if(!c.owns('companionHats'))api.inventory.companionHats=1;c.wear('companionHats');}
         if(action==='teleport')c.teleport();if(action.startsWith('away-'))c.sendAway(+action.slice(5));}
        const f=c.follow;status(action==='follow-state'||action==='teleport'||action.startsWith('away-')?`Companion: ${f.state}, ${f.speed.toFixed(2)}× walking${f.lastTeleport?`, last teleport: ${f.lastTeleport}`:''}.`:'Companion: '+action);}}

      if(b.dataset.objective)api.objectives[b.dataset.objective]();
      if(b.dataset.prompt){
        if(b.dataset.prompt==='hide')api.tip.hide();
        else{const count=Number(b.dataset.prompt);api.tip.show({progress:count/6,action:{label:'Dismiss',onPress:()=>api.tip.hide()}});showGatheringPrompt(api.tip,{stones:Math.min(count,3),sticks:Math.max(0,count-3)});}
        status('Gathering prompt preview — no gameplay progress changed.');
      }
      if(b.dataset.dev){
        const action=b.dataset.dev;
        if(action==='training')status(api.trainingAction($('training').value));
        if(action==='lumber')status(api.lumberjackAction($('lumber').value,$('tree').value));
        if(action==='axe')status(api.lumberjackAction('axe',$('axe').value));
        if(action==='landmark')api.landmark($('landmark').value);
        if(action==='npc-play')status(api.npcMotion($('npc').value,$('npc-motion').value));
        if(action==='npc-stop')status(api.npcMotion($('npc').value,null));
        if(action==='travel')status(api.travelTo($('travel').value)?'Travel started.':'Travel unavailable.');
        if(action==='use-crystal')api.usePortal();
        if(action==='biome-enter'){stop();status(await api.biomeJump($('biome').value)?`In the ${$('biome').value} band.`:'Could not land there.');}
        if(action==='biome-reseed'){const seed=await api.biomeReseed();status(seed===null?'Enter the biome test first.':`Biome test reseeded: seed ${seed}.`);}
        if(action==='biome-here')status(api.biomeHere||'Enter the biome test first.');
        if(action==='biome-bounds'){biomeBounds=!biomeBounds;status(api.biomeBounds(biomeBounds)?`Chunk outlines ${biomeBounds?'on':'off'}.`:'Enter the biome test first.');}
        if(action==='stream-enter'){stop();status(await api.enterStreamTest()?'Entered the streaming test.':'Could not find a landing tile.');api.streamRadius=+$('stream-radius').value;api.streamBounds=$('stream-bounds').checked;}
        if(action==='stream-far'){const a=Math.random()*Math.PI*2;status(api.streamTeleport(Math.round(Math.cos(a)*100),Math.round(Math.sin(a)*100))?'Teleported.':'Enter the streaming test first.');}
        if(action==='stream-stall'){api.streamStall(3);status('Loading stalled for 3 s.');}
        if(action==='stream-stats')status(JSON.stringify(api.streamStats));
        if(action==='cancel-travel'){api.cancelTravel();status('Travel cancelled.');}
        if(action==='wake'||action==='wake-skip'){stop();status(api.wakeUp({skip:action==='wake-skip'})?'Waking up…':'Already awake. Use Back to the dream first.');}
        if(action==='dream'){stop();api.reset('all');status('Back in the dream: full test session reset.');}
        if(action==='checkpoint'){stop();const checkpoint=getCheckpoint($('checkpoint').value);await api.loadCheckpoint(checkpoint);status('Loaded '+checkpoint.label+' with required resources.');}
        if(action==='perf-scenario'){stop();const id=$('perf-scenario').value;await window.quadriaquest.perf.prepare(id);status('Perf scenario ready: '+id);}
        if(action==='perf-density'){const step=window.quadriaquest.perf.sweep(+$('perf-density').value);status(`Density step ${step.step}: ${step.props} props, ${step.series}.`);}
        if(action==='perf-hud')status(api.perf.hud(!document.getElementById('quadriaquest-perf-hud'))?'Perf HUD on.':'Perf HUD off.');
        if(action==='perf-census'){const census=api.perf.census();console.table(census.byKind);console.log('Scene census',census);status(`Census: ${census.objects} objects, ${census.visibleMeshes} visible meshes, ${census.programs} programs (details in console).`);}
        if(action==='reset-area'){stop();api.closeSplash();api.resetCurrentArea();status('Current area reset.');}
        if(action==='combat'){status(api.combatAction($('combat').value));}
        if(action==='combat-force'){status(api.combatAction('force:'+$('combat-attack').value));}
        if(action==='combat-kind'){status(api.combatAction('spawn-kind:'+$('combat-kind').value));}
        if(action==='combat-kind-fight'){status(api.combatAction($('combat-kind').value));}
        if(action==='walkthrough'){status(api.walkThroughAction($('walkthrough').value));}
        if(action==='edges'){status(api.edgeAction($('edges').value));}
        if(action==='movement'){status(api.movementAction($('movement').value));}
        if(action==='world-editor'){stop();await openWorldEditor();status(`World editor: ${worldEditor.data.name}.`);}
        if(action==='prop-gallery'){stop();status(await api.enterMap('prop-gallery')?'The prop gallery: every prop by category (hover for names; sit, sleep, cook, smith, open and read them), with a fence gate, a low stone wall and an iron gate at the top.':'Could not open the prop gallery.');}
        if(action==='crystals-discover'){status(`${api.discoverAllCrystals()} Iter Crystals discovered.`);}
        if(action==='crystals-forget'){api.forgetCrystals();status('Discovered Iter Crystals forgotten: only known ones are listed.');}
        if(action==='player-here'){const t=api.playerHere();status(t?`Moved to ${t.x},${t.z}.`:'No open ground near the camera.');}
        if(action==='free-camera'){status(api.freeCamera()?'Free camera: WASD or middle-drag to pan (Shift: faster), scroll to zoom far out.':'Camera back on the slime.');}
        if(action==='force-cutaway'){status(api.toggleForceCutaway()?'Force cutaway on: every building has no roof and one-storey walls.':'Force cutaway off.');}
        if(action==='building-map'){stop();status(await api.enterBuildingTest()?'Entered the building test map: a small house (one door), a large hall (two doors) and a complex building with four rooms off a hallway. Every door starts closed: click one to open it.':'Could not enter the building test map.');}
        if(action==='resource-set'){const pool=$('resource').value==='health'?api.health:api.resources[$('resource').value];const value=Number($('resource-value').value);if(Number.isFinite(value))pool.value=value;}
        if(action==='resource-reset'){api.health.restore();api.resources.reset();}
        if(action==='health'){status(`Health: ${api.sharedAction($('health').value)} / ${api.health.max}`);}
        if(action==='splash-close')api.closeSplash();
        if(action==='interface'){stop();const name=$('interface').value;if(name==='models'){modelPreview??=createModelViewer(api.modals);modelPreview.show();}else if(name==='splash')api.showSplash();else api.openInterface(name);status('Opened '+name+'.');}

        if(action==='crafting-menu'){stop();api.showCrafting();}
        if(action==='receipt')api.itemFeed.show({sticks:-1,stones:-1,crudeAxe:1});
        if(action==='clear-loot')api.itemFeed.clear();
        if(action==='quests')document.getElementById('open-quests').click();
        if(action==='settings')api.openSettings();
        if(action==='audio-reset')api.audio.reset();
        if(action==='grass-reset'){api.grassPalette.reset();$('grass-color').value=api.grassPalette.defaultColor;status('Original grass palette restored.');}
        if(action==='models'){modelPreview??=createModelViewer(api.modals);modelPreview.show();}
        if(action==='water-restart'){api.restartWater();status('Water animation restarted.');}
        if(action==='water-reset'){Object.assign(api.waterSettings,WATER_DEFAULTS);for(const [id,key] of Object.entries(waterControls)){const input=$('water-'+id);if(input.type==='checkbox')input.checked=WATER_DEFAULTS[key];else input.value=WATER_DEFAULTS[key];}api.restartWater();status('Water defaults restored.');}
        if(action==='mining-lesson'){stop();api.miningLesson();}
        if(action==='mining-stop'){stop();api.stopMiningLesson();}
        if(action==='mine-nearest'){stop();api.mineNearest();}
        if(action==='inventory-menu'){stop();api.showInventory();}
        if(action==='inventory-lesson'){stop();api.inventoryLesson();}
        if(action==='gold-set'){api.wallet.set(amount('gold'),'playground');status(`Gold: ${api.wallet.gold} GP.`);}
        if(action==='gold-add'){api.wallet.earn(100,'playground');api.showItemChanges({gold:100});status(`Gold: ${api.wallet.gold} GP.`);}
        if(action==='gold-reset'){api.wallet.set(0,'playground');status('Gold reset to 0.');}
        if(action==='shop-open'){stop();api.openShop($('shop').value);}
        if(action==='shop-counter'){const at=api.placeShopCounter($('shop').value);status(at?`A ${$('shop').selectedOptions[0].textContent} counter at ${at.join(', ')}: click it to trade.`:'No room for a counter nearby.');}
        if(action==='shop-counter-remove'){api.removeShopCounter();status('Counter removed.');}
        if(action==='shop-reset'){api.shops.reset();status('Shop stock refilled.');}
        if(action==='drops-roll'){const id=$('drop-enemy').value;if(!id){status('Choose an enemy to roll its table.');}else{const r=api.rollDrops(id);status(`${ENEMIES[id].name} drops: ${Object.entries(r.items).map(([i,n])=>itemStack(i,n)).join(', ')||'nothing'}\nOdds: ${r.odds.map(o=>`${ITEMS[o.item].name} ${Math.round(o.chance*100)}% ×${o.count[0]}${o.count[1]!==o.count[0]?'–'+o.count[1]:''}`).join(' · ')||'none'}`);}}
        if(action==='drops-spawn'){const items=api.spawnLoot($('drop-enemy').value||null);status(items?Object.keys(items).length?`Loot pile: ${Object.entries(items).map(([i,n])=>itemStack(i,n)).join(', ')}. Click it to pick it up.`:'That roll dropped nothing.':'No free tile beside you.');}
        if(action==='drops-seed'){api.setDropSeed(amount('drop-seed'));status(`Drops use seed ${amount('drop-seed')}: rolls repeat.`);}
        if(action==='drops-random'){api.setDropSeed(null);status('Drops are random again.');}
        if(action==='drops-clear'){api.clearLoot();status('Loot piles cleared.');}
        if(action==='jobs-board'){stop();api.openJobBoard();}
        if(action==='city-biome-jump'){stop();const at=await api.cityBiomeJump($('city-biome').value);status(at?`In a ${$('city-biome').selectedOptions[0].textContent.toLowerCase()} at ${at.join(', ')}.`:'No such green here.');}
        if(action==='country-jump'){stop();const at=await api.countrysideJump($('country-place').value);status(at?`At ${at.join(', ')}.`:'No free tile there.');}
        if(action==='country-bounds'){countryBounds=!countryBounds;status(api.countrysideBounds(countryBounds)?`Chunk outlines ${countryBounds?'on':'off'}.`:'Enter Gelton first.');}
        if(action==='country-stats'){status(JSON.stringify(api.countrysideStats));}
        if(action.startsWith('country-radius-')){status(`Countryside radius ${api.countrysideRadius(+action.slice(15))}.`);}
        if(action==='jobs-noticeboard'){const at=api.placeNoticeboard();status(at?`A noticeboard at ${at.join(', ')}: click it for the job board.`:'No room for a noticeboard nearby.');}
        if(action.startsWith('jobs-giver-')){stop();api.talkToTestGiver(action.slice(11));}
        if(action==='jobs-recipient'){stop();api.talkToTestRecipient();}
        if(action==='jobs-finish'){status(`${api.finishJobs()} job(s) ready to hand in.`);}
        if(action==='jobs-handin'){status(`${api.handInAll()} job(s) handed in.`);}
        if(action==='jobs-abandon'){api.abandonJobs();status('Jobs abandoned.');}
        if(action==='jobs-cooldowns'){api.clearJobCooldowns();status('Givers are ready again.');}
        if(action==='jobs-reset'){api.resetJobs();status('Jobs, board and cooldowns reset.');}
        if(action==='price-list'){const rows=Object.entries(ITEMS).filter(([id])=>id!=='gold').map(([id,item])=>`${item.name}: buy ${item.value} GP, sell ${api.shops.sellPrice(id)} GP${item.sellable===false?' (not sellable)':''} [${item.category}]`);console.table(Object.fromEntries(Object.entries(ITEMS).map(([id,item])=>[id,{value:item.value,sell:api.shops.sellPrice(id),category:item.category,sellable:item.sellable!==false}])));status(rows.join('\n'));}
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
        if(action==='attribute-set'){const a=$('attribute').value;api.character.setAttribute(a,amount('attribute-value'));status(`${a}: ${api.character.attribute(a)} · ${api.character.unspent} unspent points.`);}
        if(action==='attribute-points'){api.character.grantPoints(3);status(`${api.character.unspent} unspent attribute points. Spend them in Skills.`);}
        if(action==='assist-state'){const a=api.assistance,d=a.danger,s=a.settings;status(`${s.mode} mode · retaliate ${s.retaliate} · class ${s.style} · goal ${s.goal||'none'} · ${d?`${d.enemy.rules.name}: max hit ${d.maxHit} after your defenses, ${d.hits} hit(s) to defeat you (${d.band}; auto-retaliate ${d.retaliate?'yes':'withheld'})`:'no engaged enemy'} · warning: ${a.warning||'none'} · manual overrides: ${JSON.stringify(s.manual)} · target override: ${s.override||'none'}.`);}
        if(action==='crude-gear'){const changes={};for(const id of ['crudeDagger','crudeSword','crudeShield','crudeHelm']){const before=api.inventory[id]||0;api.inventory[id]=Math.max(1,before);if(api.inventory[id]>before)changes[id]=api.inventory[id]-before;}api.showItemChanges(changes);status('Crude Dagger, Sword, Shield and Helm in the inventory. Equip them from Equipment.');}
        if(action==='test-armor'){api.addTestArmor();status('Added one of each test armor piece. Wear them from Equipment.');}
        if(action==='control-test')status(api.controlTest($('control').value));
        if(action==='spell-requirement'){api.spellRequirement(amount('spell-requirement'));const p=api.combatPreview();status(`Energy Strike now needs Magic Technique ${Math.max(1,amount('spell-requirement'))}${p.spell?`: ${+p.backfirePercent.toFixed(2)}% backfire, ${Math.round(p.effectiveness*100)}% effectiveness.`:'. Select Energy Strike to see the risk.'}`);}
        if(action==='combat-kit'){api.learnCombatKit(true);status('Learned Strong Strike, Rush and Harden. Use the HUD buttons or the Combat menu.');}
        if(action==='quick-slots'){api.quickSlotKit();status('Quick spell: Energy Strike (HUD Mana button queues one cast for your next attack, or opens your next fight). Quick auras: Rush and Harden (HUD Ki button switches them together). Simple mode hides the Energy and Ki buttons: pick Expert on the Combat page, or turn on Mode settings → Show Energy and Quick Ability / Show Ki and Quick Auras (switches to Custom).');}
         if(action==='combat-kit-forget'){api.learnCombatKit(false);status('Abilities, auras and spells forgotten; auras off.');}
        if(action==='queue-strike'){const r=api.queueStrongStrike();const p=api.combatPending();status(r===true?`Strong Strike ${p.pending?'queued':'withdrawn'}.`:r);}
        if(action==='character-reset'){api.character.reset();status('Character reset: base attributes, level-1 tracks, 3 creation points.');}
        if(action==='combat-profile'){const p=api.combatPreview(),d=api.combatDefense();status(`${p.name||p.item||'Bare hands'} (${p.combatStyle}, ${p.strategy}): ${p.min}–${p.max} damage every ${+p.interval.toFixed(3)}s, crit ${+p.critPercent.toFixed(3)}%, trains ${p.xpTrack}${p.proficiencyTrack?' + '+p.proficiencyTrack:''}${p.manaCost?`, ${p.manaCost} Mana`:''}, effectiveness ${Math.round(p.effectiveness*100)}%. Defense vs melee: dodge ${+d.dodgePercent.toFixed(3)}%, block ${+d.blockPercent.toFixed(3)}%, resistance ${+d.resistancePct.toFixed(2)}% (includes Harden). Pending: ${api.combatPending().pending||'none'}, committed ability: ${api.combatPending().committed||'none'}, consumable cooldown ${api.combatPending().cooldown.toFixed(1)}s, auras on: ${api.auras.state.active.join(', ')||'none'}.`);}
        if(action==='xp'||action==='levels'){
          // Shared grant path: combat tracks use the adopted curve and feed core XP like real awards.
          const name=$('skill').value,skill=api.skills[name],n=amount('skill-amount');
          const reward=action==='xp'?grantSkillXp(skill,n):addSkillLevels(skill,n);
          showSkillReward({...reward,skillName:name},api.player.position);
          status(`${name}: level ${skill.level}, ${Math.floor(skill.xp)} XP.`);
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
        if(['Damage splat','Blocked splat','Miss splat','Going','Gathering','Crafting','Chopping','Mining','Smelting','Smithing','Opening','Traveling','Arrived','Done'].includes(kind)){
          api.feedback.destination(api.getTile());
          if(['Gathering','Crafting','Chopping','Mining','Smelting','Smithing','Opening','Traveling','Done'].includes(kind))api.feedback.interacting(kind==='Done'?'Gathering':kind);
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
        if(action==='Reset finale')api.resetFinale();
        else if(action==='Use portal'){if(api.finale.busy)throw Error('Finish the current finale sequence first.');api.usePortal();}
        else if(action==='Enter Willowbank'){if(api.finale.busy)throw Error('Finish the current finale sequence first.');api.travelTo('willowbank');}
        else if(action==='Return to clearing'){if(api.finale.busy)throw Error('Finish the current finale sequence first.');api.travelTo('clearing');}
        else {
          if(api.finale.busy)throw Error('Finish the current dialogue or drop first, or use Reset finale.');
          if(api.areaId()!=='clearing')throw Error('Return to the clearing first.');
          const actions={'Closing dialogue':()=>api.finale.begin(),'Drop portal':()=>api.finale.dropPortal(),'Practice reset':()=>api.finale.resetPractice(),'Reward dialogue':()=>api.finale.revealReward(),'Drop chest':()=>api.finale.dropChest(),'Open chest':()=>api.finale.openChest(),'Celebration':()=>api.finale.celebrate(),'Wear/remove hat':()=>api.equipment.toggle('hats')};
          actions[action]();
        }
        status(action+'.');
      }
      if(b.dataset.reset){stop();api.reset(b.dataset.reset);status(`Reset ${b.dataset.reset}.`);}
      refresh();
    }catch(error){status(error.message);console.error(error);}
  });
  for(const [id,key,max] of [['roughness','roughness',1],['reflection','reflectionStrength',5]])$('water-'+id).addEventListener('input',()=>{const value=Number($('water-'+id).value);if(Number.isFinite(value))api.waterSettings[key]=Math.max(0,Math.min(max,value));});
  $('stream-radius').addEventListener('change',()=>{api.streamRadius=+$('stream-radius').value;});
  $('stream-bounds').addEventListener('change',()=>{api.streamBounds=$('stream-bounds').checked;});
  $('occupancy-overlay').addEventListener('change',()=>{api.occupancyOverlay=$('occupancy-overlay').checked;});
  $('edge-overlay').addEventListener('change',()=>{api.edgeOverlay=$('edge-overlay').checked;});
  $('route-overlay').addEventListener('change',()=>{api.routeOverlay=$('route-overlay').checked;});
  for(const input of panel.querySelectorAll('[data-diagonal]'))input.addEventListener('change',()=>{DIAGONAL_MOVES[input.dataset.diagonal]=input.checked;status(`Diagonal steps (${input.dataset.diagonal}): ${input.checked?'on':'off'}.`);});
  $('melee-reach').addEventListener('change',()=>{COMBAT_GEOMETRY.meleeReach=$('melee-reach').value;status(`Melee reach: ${COMBAT_GEOMETRY.meleeReach}.`);});
  $('range-metric').addEventListener('change',()=>{COMBAT_GEOMETRY.metric=$('range-metric').value;status(`Range metric: ${COMBAT_GEOMETRY.metric}.`);});
  for(const input of panel.querySelectorAll('[data-follow]'))input.addEventListener('input',()=>{const value=Number(input.value);if(Number.isFinite(value)&&value>0)FOLLOW[input.dataset.follow]=value;});
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
    get combatMotion(){if(!['Attack (equipped)','Strong Strike (equipped)','Block (equipped)'].includes(preview))return null;const profile=preview==='Strong Strike (equipped)'?{...api.combatProfile(),ability:'strongStrike'}:api.combatProfile();return {kind:preview==='Block (equipped)'?'Block':profile.style==='ranged'?'Archery':profile.style==='magic'?'Casting':'Combat',time:preview==='Block (equipped)'?time%1.2:time,profile};},
    get previewing(){return !!preview;},
    get mining(){return preview==='Mining';},
    get chopping(){return preview==='Chopping';},get time(){return time;},get holdingFeedback(){return holdingFeedback;},
    frame(dt){
      snapshotAge+=dt;if(snapshotAge>.25){snapshotAge=0;refresh();}
      if(!preview)return null;
      time+=dt*Number($('speed').value);
      const duration=['Attack (equipped)','Strong Strike (equipped)'].includes(preview)?api.combatProfile().interval*2:preview==='Block (equipped)'?1.2:durations[preview]||2;
      if(time>=duration){if($('loop').checked){if(!HELD_MOTIONS.includes(preview))time%=duration;if(preview==='Celebration')api.finale.celebrate({preview:true,rate:()=>Number($('speed').value)});}else{stop();status('Preview finished.');return null;}}
      if(preview==='Celebration')return null;
      if(this.combatMotion){const m=this.combatMotion;return {...playerActionMotion(m.kind,m.time,m.time,m.profile),lift:0};}
      if(preview==='Point'||preview==='Stomp')return {...playerActionMotion(preview,time),lift:0};
      if(SOCIAL_DURATIONS[preview])return socialMotion(preview,time);
      let pose=idlePose(time),expression='idle',handWork=null,lift=0;
      if(preview==='Sliding'){pose=slideMotion(time/duration);expression='focused';}
      if(preview.startsWith('Jump')){pose=stepMotion(time,preview==='Jump up'?.5:-.5);lift=pose.lift+(preview==='Jump down'?.5:0);expression=time<.32?'preparing':'struggle';}
      if(preview==='Mining'){handWork=time;expression='focused';pose=miningMotion(time).body;}
      if(['Gathering','Crafting','Chopping'].includes(preview)){handWork=time;expression='focused';pose=workPose(preview==='Chopping'?'chop':'gather',time);}
      if(preview==='Spawn landing'){pose=spawnMotion(time);lift=pose.lift;expression=time<.68?'struggle':'idle';}
      if(['Happy','Pleased','Focused','Preparing','Struggle','Concerned','Shocked','Distraught','Sad','Frown','Fainted','Angry'].includes(preview))expression=preview.toLowerCase();
      return {pose,expression,handWork,lift};
    }
  };
}
