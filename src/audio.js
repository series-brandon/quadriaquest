import {reactiveRecord,signal} from './reactive.js';
import {createMusicPlayer,createMusicState} from './music-player.js';
import {createSoundEffects} from './sound-effects.js';
import {createAmbience} from './ambience.js';
// Original, lightweight procedural sound. No audio downloads or external services.
// Music: music-player.js (composed songs as data, synthesized voices). Effects and cues:
// sound-effects.js (cues play in the current song's key). Ambience: ambience.js (a profile per place).
export function createGameAudio(){
 let context,player=null,effects=null,ambience=null,buses={},duckUntil=0;
 const musicState=createMusicState(),{options:musicOptions}=musicState;
 // The playground's ambience override (a profile id), or null to follow the game.
 const ambienceOverride=signal(null),ambienceProfile=signal(null);
 // Reactive so settings pages follow changes from any source (sliders, reset, the playground).
 const settings=reactiveRecord({music:.22,effects:.45,ambience:.25,muted:false});
 try{Object.assign(settings,JSON.parse(localStorage.getItem('quadriaquest-audio')??localStorage.getItem('quadra-audio')??'{}'));}catch{}
 for(const key of ['music','effects','ambience'])settings[key]=Math.max(0,Math.min(1,Number(settings[key])||0));
 let scheduledMusic=null;
 function volume(){scheduledMusic=null;if(!context)return;for(const [key,bus]of Object.entries(buses))bus.gain.setTargetAtTime(settings.muted?0:Math.max(0,Math.min(1,Number(settings[key])||0)),context.currentTime,.1);}
 function unlock(){
  if(!(window.AudioContext||window.webkitAudioContext))return;
  if(!context){
   context=new (window.AudioContext||window.webkitAudioContext)();
   for(const key of ['music','effects','ambience']){const bus=context.createGain();bus.connect(context.destination);buses[key]=bus;}
   volume();player=createMusicPlayer(context,buses.music,{state:musicState});player.start();
   effects=createSoundEffects(context,buses.effects,{voices:player.voices,palette:player.palette});
   ambience=createAmbience(context,buses.ambience);
  }
  if(context.state==='suspended')context.resume().catch(()=>{});
 }
 // `arg` is effect-specific (an objective's progress, 0–1).
 function play(kind,arg){
  if(!effects||context.state!=='running')return;
  const duck=effects.play(kind,arg);if(duck)duckUntil=Math.max(duckUntil,context.currentTime+duck);
 }
 // A sound that may need to end early (a spell's gathering); returns a handle with stop().
 function start(kind,arg){if(!effects||context.state!=='running')return {stop(){}};return effects.start(kind,arg);}

 // `song` is a music-songs.js id (area music, menus, the opening); `combat` fades in the combat
 // layer and quiets birds; `place` is an ambience profile (ambience.js).
 function update(dt,song,dialogue,combat,place){player?.update(song,combat);if(!context||context.state!=='running'||document.hidden)return;
  // Schedule only when the target changes; a new automation event every frame grows the audio-thread timeline.
  const ducked=context.currentTime<duckUntil;
  const musicTarget=settings.muted?0:settings.music*(dialogue?.45:1)*(ducked?.5:1);if(musicTarget!==scheduledMusic){scheduledMusic=musicTarget;buses.music.gain.setTargetAtTime(musicTarget,context.currentTime,ducked?.08:.3);}
  ambience.update(dt,ambienceOverride.peek()??place,{combat});if(ambience.profile!==ambienceProfile.peek())ambienceProfile.value=ambience.profile;
 }
 // The playground's music lab drives these; gameplay only passes song ids to update().
 const music={...musicState,setMuted(layer,muted){musicOptions.muted[layer]=!!muted;player?.refreshLayer(layer);},setCombat(mode){musicOptions.combat.value=mode;player?.tick();},restart(){player?.restart();},audition(voice){unlock();return player?.audition(voice)??0;}};
 // `profile` is the playing ambience profile (a signal, for the lab's readout).
 const ambient={override:ambienceOverride,profile:ambienceProfile,play(kind){unlock();ambience?.play(kind);}};
 function set(key,value){settings[key]=key==='muted'?!!value:Math.max(0,Math.min(1,Number(value)||0));volume();try{localStorage.setItem('quadriaquest-audio',JSON.stringify(settings));}catch{}}
 document.addEventListener('visibilitychange',()=>{if(context){if(document.hidden)context.suspend();else context.resume().catch(()=>{});}});
 document.addEventListener('pointerdown',unlock,{once:true});document.addEventListener('keydown',unlock,{once:true});
 document.addEventListener('click',e=>{if(e.target.closest('button'))play('ui');});
 return {play,start,update,unlock,set,settings,music,ambience:ambient,
  preview(value){musicOptions.song.value=value||null;},
  reset(){
   for(const [key,value]of Object.entries({music:.22,effects:.45,ambience:.25,muted:false}))set(key,value);
   musicOptions.song.value=null;musicOptions.style.value='mix';musicOptions.arrangement.value='cozy';musicOptions.seed.value=null;musicOptions.combat.value='follow';
   for(const layer of Object.keys(musicOptions.muted))music.setMuted(layer,false);player?.restart();ambienceOverride.value=null;
  },
  get ready(){return context?.state==='running';}};
}
