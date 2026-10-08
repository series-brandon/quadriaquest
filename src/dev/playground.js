import './test-armor.js';
export {createTrainingFixtures} from './training-fixtures.js';
export {createCombatFixtures} from './combat-fixtures.js';
export {createPerfProbe} from './perf-probe.js';
export {createPerfScenarios} from './perf-scenarios.js';
import {createCarpentryBridge} from '../carpentry-bridge.js';
import {Group} from 'three';
import {organizePlayground} from './playground-layout.js';
import {enemySheetDetails} from './combat-fixtures.js';
import {playerActionMotion} from '../player-action-motion.js';
import {createModelPreview} from './model-preview.js';
import {GRASS_BASE_COLOR,createGrassColors} from '../grass-palette.js';
import {icon,ICON_NAMES} from '../icons.js';
import {miningMotion,MINING_DURATION} from '../mining.js';
import {ITEMS,itemStack} from '../items.js';
import {WATER_DEFAULTS} from '../water-effects.js';
import {socialMotion,SOCIAL_DURATIONS} from '../slime-social.js';
import {TUTORIAL_CHECKPOINTS,getCheckpoint} from './tutorial-checkpoints.js';
import {PERF_SCENARIOS} from './perf-scenarios.js';
import {createOpening,showGatheringPrompt} from '../opening.js';
import {idlePose,slideMotion,stepMotion,STEP_DURATION,workPose,spawnMotion,CHOP_DURATION} from '../slime-motion.js';
import {showSkillReward,grantSkillXp,addSkillLevels} from '../skills.js';
import {ATTRIBUTES} from '../character.js';
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

const animations=['Attack (equipped)','Block (equipped)','Point','Stomp','Happy hop','Wave','Sleeping','Idle','Sliding','Jump up','Jump down','Spawn landing','Gathering','Crafting','Chopping','Mining','Celebration','Happy','Pleased','Focused','Preparing','Struggle','Concerned','Shocked','Distraught','Sad','Frown','Fainted','Angry'];
const durations={...SOCIAL_DURATIONS,'Celebration':4.3,Chopping:CHOP_DURATION,Mining:MINING_DURATION,'Spawn landing':1.2,'Jump up':STEP_DURATION,'Jump down':STEP_DURATION,Sliding:1/2.4};
export function mountPlayground(api){
  let modelPreview;
  const panel=document.createElement('details');panel.id='quadriaquest-dev-playground';panel.open=false;
  panel.innerHTML=`<summary>DEV PLAYGROUND <small>close</small></summary>
    <fieldset><legend>Training systems</legend><p class="dev-note">Portable production copper/stations/supplies/targets work in this map before visiting any tutorial. Add pickaxe/hammer and materials through Inventory. Use Combat for bow/Energy Strike. Move to cancel; reset to repeat. Crystal and station interface previews never grant items or teleport.</p><label>Action<select id="dev-training">${[['spawn','Spawn portable fixtures'],['copper','Mine copper'],['furnace','Use furnace'],['anvil','Use anvil'],['supplies','Use provision shelf'],['target','Fight practice target'],['scrapper','Fight live enemy'],['kit','Bow and arrow supply offers'],['learn','Learn Energy Strike'],['forget','Reset spells'],['reset','Reset fixtures'],['remove','Remove fixtures']].map(([id,label])=>`<option value="${id}">${label}</option>`).join('')}</select></label><button data-dev="training">Run</button><label>Cinderhold landmark<select id="dev-landmark">${['crystal','sarge','smith','ranger','mage','ki','scrapper','bruiser','furnace','anvil'].map(id=>`<option>${id}</option>`).join('')}</select></label><button data-dev="landmark">Visit landmark</button></fieldset>
    <fieldset><legend>Travel practice</legend><p class="dev-note">Uses shared travel and real crystals. Repeat trips, cancel during the fade, or reset the current area. Inventory and skills persist across travel.</p><label>Destination<select id="dev-travel"><option value="willowbank">Willowbank</option><option value="clearing">Clearing</option><option value="cinderhold">Cinderhold</option></select></label><button data-dev="travel">Travel</button><button data-dev="use-crystal">Walk to crystal</button><button data-dev="cancel-travel">Cancel travel</button></fieldset>
    <fieldset><legend>Tutorial checkpoints</legend><p class="dev-note">Loads the selected area and tutorial with its prerequisites. Replaces the current test session. Cinderhold arrival/meet replay Bristle’s greeting and both responses; refused loads his flustered state. Visit the sarge landmark, then talk to leave or resume training. Reset current area to repeat.</p><label>Tutorial step<select id="dev-checkpoint">${TUTORIAL_CHECKPOINTS.map(c=>`<option value="${c.id}">${c.label}</option>`).join('')}</select></label><button data-dev="checkpoint">Load step</button><button data-dev="reset-area">Reset current area</button></fieldset>
    <fieldset><legend>Objective feedback</legend>${['tip','add','update','complete','reset'].map(id=>`<button data-objective="${id}">${({tip:'Show tutorial tip',add:'Add objective',update:'Update progress',complete:'Complete objective',reset:'Clear objectives'})[id]}</button>`).join('')}</fieldset><fieldset><legend>UI &amp; audio polish</legend><label>Interface<select id="dev-interface">${[['quests','Quests'],['inventory','Inventory'],['skills','Skills'],['crafting','Crafting'],['companions','Companions'],['companion-name','Companion naming'],['food-confirm','Eat at full health (confirm)'],['cooking','Cooking'],['furnace','Furnace'],['anvil','Anvil'],['destinations','Destinations'],['combat-styles','Combat styles'],['settings','Settings tab'],['settings-popup','Settings popup'],['models','Model viewer'],['splash','Splash screen']].map(([id,label])=>`<option value="${id}">${label}</option>`).join('')}</select></label><button data-dev="interface">Open</button><button data-dev="receipt">Crafting receipt</button><button data-dev="clear-loot">Clear item feed</button><button data-dev="audio-reset">Reset audio</button><details><summary>Icon sheet</summary><div class="dev-icons">${ICON_NAMES.map(name=>`<span>${icon(name)} ${name}</span>`).join('')}</div></details><p class="dev-note">Journal tabs, search, expand/minimize, and item controls use the real menus. Performance checks: run <code>npm run perf</code>, or use the Performance section's HUD and scenarios. After idle checks, change health/items/skills, start and cancel crafting, toggle combat style/retaliation, resize/collapse/restore and reset to verify cached UI refreshes. Crafting includes Crude Axe and Crude Pickaxe in every area: add Sticks and Rocks, craft, move to cancel, and repeat. Player UI: desktop sidebar owns the viewport; collapse/expand it using the overview button and expand the journal. Docked desktop journal always stays open; Escape and page dismissals must not hide it. Collapsed overview floats without a panel on the right, map above resources; expand from the bottom-right button. Collapse using the tab attached outside the sidebar. During narrator and character dialogue, repeatedly collapse/expand: the toggle stays above the dimming overlay, the dialogue remains on the same line and recenters in the game viewport. Check enlarged minimap/resource separation at 701/1200px and 320px mobile. Inventory/health controls exercise repeated Eat and quick food; restore full health and use either Eat entry point to check the compact confirmation on mobile, cancel without consumption, confirm, and repeat; Equipment and Combat reuse production controls. At mobile widths use four fixed bottom tabs and More for all remaining pages (including this playground); check 320px width and short landscape heights, repeat open/close and Escape. Health is a red fill orb with its current number and a Quick eat icon beneath it. Use Restore health/Lose 10 health and combat to check full/partial/empty fill, then eat to refill; check the same controls with the mobile journal open. Health, mana and stamina start at 100. Mana restoration is not available yet; the boot toggles sprint at 2× speed for 1 stamina per .5 seconds of movement; the desktop minimap is centered above them. Ground pickups appear as gold squares: gather one, verify its marker disappears, reset Ground items and verify it returns. Repeat after travel; inactive-map items must not appear. Walk across tiles and check equal grid spacing. The quickEat, quickRestore and sprint icons are included in the icon sheet. Tutorial tip, dialogue/checkpoint, and station preview controls exercise viewport centering with the sidebar shown/hidden; incoming attacks close fullscreen menus, including misses. Combat practice spawns real attackers. Desktop pages stay open across travel, story interactions, defeat and reset; only explicit close or tab switching dismisses a page. Map travel updates the minimap; Full test area resets the UI. While walking, use Eat, Craft, or Place Campfire: finish the current step before starting. Click a new destination to cancel a queued action; Full test area resets it. Movement inspection includes the step destination and queued action. Crafting level changes the displayed time. Tutorial checkpoints cover their guided lessons; Full test area resets items and skills. Sound controls are in Settings (journal or splash cog).</p><label>Music preview<select id="dev-music"><option value="">Follow game</option><option value="splash">Splash</option><option value="intro">Introduction</option><option value="clearing">Clearing</option><option value="cinderhold">Cinderhold</option></select></label><div>${['pickup','craft','complete','chop','mine','fall','level','portal','blocked','wind','bird','insect'].map(name=>`<button data-sound="${name}">${name}</button>`).join('')}</div></fieldset>
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
      <p class="dev-note">Combat skills and every proficiency use the adopted XP curve and route through the production award (core XP converts 5:1; each core level grants 3 attribute points). Prototype skills keep 120 XP per level.</p>
    </fieldset>
    <fieldset><legend>Character &amp; combat profile</legend><p class="dev-note">Uses the production character. Set an attribute's total value (base 10 for capacity attributes, 1 otherwise; unspent points adjust), grant points, then spend them with + in Skills. Constitution/Mentis/Endurance change maximum Health/Mana/Stamina without refilling. Strategy and spell selection live in the real Combat menu. Show combat profile prints the attack the next windup would commit, plus your current defenses. Full test area resets the character.</p><label>Attribute<select id="dev-attribute">${ATTRIBUTES.map(a=>`<option>${a}</option>`).join('')}</select></label><label>Value<input id="dev-attribute-value" type="number" min="1" max="500" value="10"></label><div><button data-dev="attribute-set">Set attribute</button><button data-dev="attribute-points">Grant 3 points</button><button data-dev="combat-profile">Show combat profile</button><button data-dev="character-reset">Reset character</button></div><p class="dev-note">Abilities and auras use the production queue and Ki system (no mentor yet: learn here). Strong Strike queues for the next melee attack (HUD lightning button or Combat menu; press again to withdraw), spends 50 Energy on impact and cancels if Energy drops below 50 before then. Toggle Rush/Harden in Combat: 0.5 Ki fee + 0.5 Ki/s each; set Ki low with Player health controls to watch exhaustion turn both off, then Ki recover. Eat mid-fight: healing applies at once, the windup restarts, the queued ability clears and a second meal waits for the 2s cooldown. At a real crystal (Travel practice → Walk to crystal) use Restore (keeps auras) and Redistribute (refunds points, turns auras off), both outside combat only.</p><div><button data-dev="combat-kit">Learn Strong Strike, Rush &amp; Harden</button><button data-dev="combat-kit-forget">Forget abilities, auras &amp; spells</button><button data-dev="queue-strike">Queue Strong Strike</button><button data-dev="quick-slots">Set up quick slots</button></div></fieldset>
    <fieldset><legend>Assistance, dual wield, armor, control &amp; backfire</legend><p class="dev-note">All production systems. <b>Assistance</b>: the Combat menu's Auto/Manual, Pacifist, Class (runs Optimize), training goal and Advanced settings; Auto reads actual enemy stats for warnings (HUD status), adaptive retaliation (withheld at 1–3 hits unless you attacked that target), auto-eat at ≤150% of the max hit and auto auras. Lower health or fight a Bruiser to see bands; Show assistance state prints the assessment. <b>Dual wield</b>: add a second Copper Dagger via Inventory, equip main and off hand from Equipment, then choose Attack hands / damage types in Combat → Manual. <b>Armor</b>: add test pieces (Medium/Heavy ones need levels 10/20 to be fully effective), wear them, take hits for armor XP. <b>Control</b>: test stuns/slows on you or the nearest enemy; protection windows show in the HUD status and enemy label. <b>Backfire</b>: raise Energy Strike's Magic Technique requirement, then cast (Combat shows the risk). Full test area resets all of these.</p>
     <div><button data-dev="assist-state">Show assistance state</button><button data-dev="test-armor">Add all test armor</button></div>
     <label>Control test<select id="dev-control">${[['player:stun','Stun me 3s (6s protection)'],['player:immobilize','Immobilize me 3s'],['player:slow50','Slow me 50% for 5s (refreshes)'],['player:slow30','Slow me 30% for 10s (no refresh)'],['cleanse','Cleanse me (+10s protection)'],['enemy:stun','Stun nearest enemy 3s'],['enemy:immobilize','Immobilize nearest enemy 3s'],['enemy:slow50','Slow nearest enemy 50%']].map(([id,label])=>`<option value="${id}">${label}</option>`).join('')}</select></label><button data-dev="control-test">Apply</button>
     <label>Energy Strike requirement (Magic Technique)<input id="dev-spell-requirement" type="number" min="1" max="500" value="1"></label><button data-dev="spell-requirement">Set requirement</button></fieldset>
    <fieldset><legend>Inventory</legend>
      <label>Item <select id="dev-item">${Object.entries(ITEMS).map(([id,item])=>`<option value="${id}">${item.name}</option>`).join('')}</select></label>
      <label>Quantity <input id="dev-quantity" type="number" min="0" max="1000000" step="1" value="1"></label>
      <div><button data-dev="add">Add item</button><button data-dev="remove">Remove item</button></div>
    </fieldset>
    <fieldset><legend>Visual feedback only</legend><p class="dev-note">Item gain/loss uses the selected inventory item and quantity without changing your inventory.</p><div>
      ${['Damage splat','Blocked splat','Miss splat','Going','Gathering','Crafting','Chopping','Mining','Opening','Traveling','Arrived','Done','Blocked','XP gain','Level gain','Item gain','Item loss','Clear'].map(a=>`<button data-juice="${a}">${a}</button>`).join('')}
    </div></fieldset>
    <fieldset><legend>Combat practice</legend><p class="dev-note">Spawn portable enemies in the current area. Pacifist (Attacks: Prevented) draws no aggression: spawn aggressive enemies, pick Pacifist on the Combat page and walk past them; pacifist-hunting enemies still engage (their hover reads “Hunts pacifists”). Switching to Pacifist mid-chase keeps that enemy aggressive until the leash or a safe tile ends it. Enemy HP, damage bounds, attack interval and Threat derive from shared stat sheets through the production combat formulas (Scrapper 50 HP, 1–10; Bruiser 100 HP, 3–20; both every 2.5s). Show enemy stat sheets prints the derived values; the table lists every configured input. Reset restores these shared baselines. Fight unarmed or craft/equip gear through the normal menus; every attack resolves through the shared formulas and awards per-attack XP (strategy skill + weapon proficiency; Shield proficiency when hit or blocking with a shield). Splats distinguish Miss!, Dodged!, Blocked! and orange criticals. Choose strategies in the real Combat menu, including mid-fight; the next attack uses them. Walk away to exercise pursuit and leash; use health controls and Eat during combat. Toggle Auto-Retaliate in the real Combat menu, including while fighting. Passive enemies ignore proximity; aggressive fixtures notice within 3 tiles (outside safe zones). Test crafting/fishing interruption, combat while eating, and first melee/ranged/magic impacts including misses. Reset restores enemies; Full test area removes fixtures and resets equipment/XP. The model viewer has goblin, combat, and defeat motions. This fixture adds no quest.</p><label>Action<select id="dev-combat"><option value="spawn">Spawn passive enemies</option><option value="spawn-aggressive">Spawn aggressive enemies (3 tiles)</option><option value="spawn-hunters">Spawn pacifist-hunting enemies (3 tiles)</option><option value="scrapper">Fight Scrapper</option><option value="bruiser">Fight Bruiser</option><option value="reset">Reset enemies</option><option value="defeat">Defeat and respawn</option><option value="remove">Remove enemies</option><option value="sheets">Show enemy stat sheets</option></select></label><button data-dev="combat">Run</button><details><summary>Enemy stat sheets</summary>${enemySheetDetails()}</details></fieldset>
    <fieldset><legend>Player health</legend><label>Resource<select id="dev-resource"><option value="health">Health</option><option value="mana">Mana</option><option value="stamina">Stamina</option><option value="energy">Energy</option><option value="ki">Ki</option></select></label><label>Value<input id="dev-resource-value" type="number" min="0" max="5000" value="100"></label><button data-dev="resource-set">Set resource</button><button data-dev="resource-reset">Restore all resources</button><p class="dev-note">Use 51, 50, 25, 24 and 0 to check orb colors. Toggle the boot and click minimap tiles to test 2× movement, 1 stamina per .5 moving seconds, pause/resume and exhaustion. Scroll/pinch the map, cancel a pinch, click blocked tiles, redirect mid-step and repeat after travel. Full reset restores 100 resources, walking speed and map zoom.</p><label>Action<select id="dev-health"><option value="heal">Restore health</option><option value="hurt">Lose 10 health</option></select></label><button data-dev="health">Apply</button></fieldset>
    <fieldset><legend>Carpentry practice</legend><p class="dev-note">The clearing pond has a practice bridge at (2, 4). Add a Crude Hammer and Small Logs ×3 with Inventory controls, then click the broken bridge. Move to cancel; Full test area resets the bridge and rewards. The Willowbank bridge checkpoint exercises the same action with its injury and rescue story. Carpentry XP is available in Skills; hammering and bridge stages are in the model viewer.</p></fieldset>
    <fieldset><legend>Fishing practice</legend><p class="dev-note">The clearing pond has a Pondfish spot at (4, 4). Add a Crude Fishing Rod with Inventory controls, then click its ripples. Repeat catches, cancel by moving, and reset with Full test area. Willowbank · Catch Pondfish uses the same action. Fishing XP and levels use the Skills controls; cast, wait, and catch motions are in the shared model viewer.</p></fieldset>
    <fieldset><legend>Resource picking</legend><p class="dev-note">Trees, boulders, and ground items in both areas use shared actions. Inventory supplies axes/pickaxes; Skills adjusts Gathering, Lumberjack, and Mining. Move to cancel before depletion. Ground items, Trees, Boulders, and Full test area resets support repeats in the clearing. Willowbank resources respawn after 8 seconds; occupied or reserved tiles delay solid-resource respawns. Load Willowbank · Collect Flint to check its narrative callback. Model viewer motions reuse the production hit/depletion animations.</p><label><input id="dev-hitboxes" type="checkbox"> Show half-tile hitboxes</label></fieldset>
    <fieldset><legend>Performance</legend><p class="dev-note">Same probe and scenarios as <code>npm run perf</code>. The HUD shows main-thread frame time, GPU time when the browser exposes it, draw calls, scene objects and the slowest loop phases. Prepare loads a perf scenario with its fixed camera; census logs scene contents by group and mesh kind to the console.</p><label>Scenario<select id="dev-perf-scenario">${PERF_SCENARIOS.map(s=>`<option value="${s.id}">${s.id}</option>`).join('')}</select></label><div><button data-dev="perf-scenario">Prepare scenario</button><button data-dev="perf-hud">Toggle perf HUD</button><button data-dev="perf-census">Log scene census</button></div></fieldset>
    <fieldset><legend>Reset</legend><div><button data-reset="items">Ground items</button><button data-reset="trees">Trees</button><button data-reset="boulders">Boulders</button><button data-reset="all">Full test area</button></div></fieldset>
    <output id="dev-status" aria-live="polite">Ready. Starter kit: Sticks ×10, Rocks ×10, Crude Axe ×1, Crude Pickaxe ×1.</output>
    <pre id="dev-state"></pre>`;
  const commands=organizePlayground(panel);
  document.body.append(panel);
  // A launcher tab (no page) in the journal's tab registry; it opens this debug panel.
  api.registerTab({id:'debug',tab:'show-debug-menu',label:'Debug',ariaLabel:'Show debug menu',order:1000,icon:()=>{const t=document.createElement('template');t.innerHTML='<svg class="game-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-14-2 16"/></svg>';return t.content.firstElementChild;},action:()=>{panel.open=true;panel.querySelector('summary').focus();}});
  const launcher=document.getElementById('show-debug-menu');launcher.setAttribute('aria-controls',panel.id);launcher.setAttribute('aria-expanded','false');
  panel.addEventListener('toggle',()=>{launcher.setAttribute('aria-expanded',String(panel.open));if(!panel.open&&panel.contains(document.activeElement))launcher.focus();});

  const $=id=>panel.querySelector('#dev-'+id);
  const waterControls={"enabled": "enabled", "shimmers": "shimmers", "waves": "waves", "shoreline": "fixedShoreline", "color": "color", "faceted": "faceted", "strength": "waveStrength", "roughness": "roughness", "reflection": "reflectionStrength", "opacity": "opacity", "speed": "speed", "intensity": "intensity"};
  let preview=null,time=0,holdingFeedback=false,snapshotAge=0;
  const amount=id=>{const n=Number($(id).value);if(!Number.isSafeInteger(n)||n<0||n>1000000)throw Error('Enter a whole number from 0 to 1,000,000.');return n;};
  const status=text=>$('status').textContent=text;
  panel.querySelector('#dev-music').onchange=e=>{api.audio.unlock();api.audio.preview(e.target.value||null);};
  function stop(force=true){if(!force&&!preview&&!holdingFeedback)return;preview=null;time=0;holdingFeedback=false;api.finale.stopPreview();api.stop();}
  function refresh(){api.refresh();$('state').textContent=`Core: Lv ${api.character.core.level} · ${Math.floor(api.character.core.xp)} XP · ${api.character.unspent} unspent points`+'\n'+Object.entries(api.skills).filter(([,s])=>s.curve!=='adopted'||s.xp>0).map(([name,s])=>`${name}: Lv ${s.level} · ${Math.floor(s.xp)} XP`).join('\n')+'\n'+Object.entries(api.inventory).map(([name,n])=>itemStack(name,n)).join(' · ');}
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
        if(action==='training')status(api.trainingAction($('training').value));
        if(action==='landmark')api.landmark($('landmark').value);
        if(action==='travel')status(api.travelTo($('travel').value)?'Travel started.':'Travel unavailable.');
        if(action==='use-crystal')api.usePortal();
        if(action==='cancel-travel'){api.cancelTravel();status('Travel cancelled.');}
        if(action==='checkpoint'){stop();const checkpoint=getCheckpoint($('checkpoint').value);await api.loadCheckpoint(checkpoint);status('Loaded '+checkpoint.label+' with required resources.');}
        if(action==='perf-scenario'){stop();const id=$('perf-scenario').value;await window.quadriaquest.perf.prepare(id);status('Perf scenario ready: '+id);}
        if(action==='perf-hud')status(api.perf.hud(!document.getElementById('quadriaquest-perf-hud'))?'Perf HUD on.':'Perf HUD off.');
        if(action==='perf-census'){const census=api.perf.census();console.table(census.byKind);console.log('Scene census',census);status(`Census: ${census.objects} objects, ${census.visibleMeshes} visible meshes, ${census.programs} programs (details in console).`);}
        if(action==='reset-area'){stop();api.closeSplash();api.resetCurrentArea();status('Current area reset.');}
        if(action==='combat'){status(api.combatAction($('combat').value));}
        if(action==='resource-set'){const pool=$('resource').value==='health'?api.health:api.resources[$('resource').value];const value=Number($('resource-value').value);if(Number.isFinite(value))pool.value=value;}
        if(action==='resource-reset'){api.health.restore();api.resources.reset();}
        if(action==='health'){status(`Health: ${api.sharedAction($('health').value)} / ${api.health.max}`);}
        if(action==='splash-close')api.closeSplash();
        if(action==='interface'){stop();const name=$('interface').value;if(name==='models'){modelPreview??=createModelPreview();modelPreview.show();}else if(name==='splash')api.showSplash();else api.openInterface(name);status('Opened '+name+'.');}

        if(action==='crafting-menu'){stop();api.showCrafting();}
        if(action==='receipt')api.itemFeed.show({sticks:-1,stones:-1,axes:1});
        if(action==='clear-loot')api.itemFeed.clear();
        if(action==='quests')document.getElementById('open-quests').click();
        if(action==='settings')api.openSettings();
        if(action==='audio-reset'){api.audio.reset();panel.querySelector('#dev-music').value='';}
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
        if(action==='attribute-set'){const a=$('attribute').value;api.character.setAttribute(a,amount('attribute-value'));status(`${a}: ${api.character.attribute(a)} · ${api.character.unspent} unspent points.`);}
        if(action==='attribute-points'){api.character.grantPoints(3);status(`${api.character.unspent} unspent attribute points. Spend them in Skills.`);}
        if(action==='assist-state'){const a=api.assistance,d=a.danger,s=a.settings;status(`${s.mode} mode · retaliate ${s.retaliate} · class ${s.style} · goal ${s.goal||'none'} · ${d?`${d.enemy.rules.name}: max hit ${d.maxHit} after your defenses, ${d.hits} hit(s) to defeat you (${d.band}; auto-retaliate ${d.retaliate?'yes':'withheld'})`:'no engaged enemy'} · warning: ${a.warning||'none'} · manual overrides: ${JSON.stringify(s.manual)} · target override: ${s.override||'none'}.`);}
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
        if(action==='Reset finale')api.resetFinale();
        else if(action==='Use portal'){if(api.finale.busy)throw Error('Finish the current finale sequence first.');api.usePortal();}
        else if(action==='Enter Willowbank'){if(api.finale.busy)throw Error('Finish the current finale sequence first.');api.travelTo('willowbank');}
        else if(action==='Return to clearing'){if(api.finale.busy)throw Error('Finish the current finale sequence first.');api.travelTo('clearing');}
        else {
          if(api.finale.busy)throw Error('Finish the current dialogue or drop first, or use Reset finale.');
          if(api.areaId()!=='clearing')throw Error('Return to the clearing first.');
          const actions={'Closing dialogue':()=>api.finale.begin(),'Drop portal':()=>api.finale.dropPortal(),'Practice reset':()=>api.finale.resetPractice(),'Complete practice':()=>api.completePractice(),'Reward dialogue':()=>api.finale.revealReward(),'Drop chest':()=>api.finale.dropChest(),'Open chest':()=>api.finale.openChest(),'Celebration':()=>api.finale.celebrate(),'Wear/remove hat':()=>api.equipment.toggle('hats')};
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
    get combatMotion(){if(!['Attack (equipped)','Block (equipped)'].includes(preview))return null;const profile=api.combatProfile();return {kind:preview==='Block (equipped)'?'Block':profile.style==='ranged'?'Archery':profile.style==='magic'?'Casting':'Combat',time:preview==='Block (equipped)'?time%1.2:time,profile};},
    get previewing(){return !!preview;},
    get mining(){return preview==='Mining';},
    get chopping(){return preview==='Chopping';},get time(){return time;},get holdingFeedback(){return holdingFeedback;},
    frame(dt){
      snapshotAge+=dt;if(snapshotAge>.25){snapshotAge=0;refresh();}
      if(!preview)return null;
      time+=dt*Number($('speed').value);
      const duration=preview==='Attack (equipped)'?api.combatProfile().interval*2:preview==='Block (equipped)'?1.2:durations[preview]||2;
      if(time>=duration){if($('loop').checked){if(preview!=='Sleeping')time%=duration;if(preview==='Celebration')api.finale.celebrate({preview:true,rate:()=>Number($('speed').value)});}else{stop();status('Preview finished.');return null;}}
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
