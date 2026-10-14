import {h} from '../ui/dom.js';
import {segmented,toggleSwitch} from '../ui/controls.js';
import {COZY_SONGS,SONGS,SONG_IDS} from '../music-songs.js';
import {LAYERS} from '../music-theory.js';
import {INSTRUMENTS} from '../music-voices.js';
import {signal} from '../reactive.js';
import {EFFECTS} from '../sound-effects.js';
import {AMBIENCE_PROFILES,AMBIENT_SOUNDS} from '../ambience.js';
import {checkAmbient,checkEffect,checkInstrument,checkSong,describeClicks} from './audio-check.js';

// Dev-only music and sound lab: drives the real music player (song, style, layers, combat layer,
// seed), plays any instrument, effect or ambient sound, overrides the ambience profile, and runs
// offline click checks. Shows what the player is playing. Built with the kit; everything reads the player's signals.
export function musicLab(audio){
 const {options,playing}=audio.music;
 const act=fn=>(...args)=>{audio.unlock();fn(...args);};
 const restart=act(()=>audio.music.restart());
 const instrument=signal('flute'),effect=signal('level'),ambientSound=signal('chirp'),check=signal('');
 const pick=(value,choices)=>h('select',{on:{change:event=>{value.value=event.target.value;}}},choices.map(([id,label])=>h('option',{value:id,selected:()=>value.value===id},label)));
 // Offline renders take a few seconds; the result replaces the line when it's ready.
 const runCheck=async(label,run)=>{check.value=`Checking ${label}…`;try{check.value=`${label}: ${await run()}`;}catch(error){check.value=`${label}: check failed (${error.message})`;}};
 const readout=()=>{
  const now=playing.value;if(!now)return audio.ready?'Silent':'Silent: click anything to start audio';
  const seed=options.seed.value===null?`seed ${now.seed}`:`seed ${now.seed} (locked)`;
  return `${now.title} · ${now.section}${now.varied?' (varied)':''} [${now.kind}] · bar ${now.bar}/${now.bars} · ${seed}${now.combat?' · combat':''} · ambience ${audio.ambience.profile.value??'–'}`;
 };
 return h('fieldset',{class:'dev-music-lab'},
  h('legend',null,'Music & sound lab'),
  h('output',{class:'dev-music-lab__now','aria-live':'off'},readout),
  h('label',null,'Song',
   h('select',{on:{change:act(event=>audio.preview(event.target.value||null))}},
    h('option',{value:'',selected:()=>options.song.value===null},'Follow game'),
    SONG_IDS.map(id=>h('option',{value:id,selected:()=>options.song.value===id},(SONGS[id]??COZY_SONGS[id]).title.replace(/ \(Cozy\)$/,''))))),
  segmented({label:'Arrangement',value:options.arrangement,options:[{value:'cozy',label:'Cozy'},{value:'original',label:'Original'}],onChange:act(value=>{options.arrangement.value=value;})}),
  segmented({label:'Style',value:options.style,options:[{value:'mix',label:'Mix'},{value:'theme',label:'Themes'},{value:'drift',label:'Drift'}],onChange:act(value=>{options.style.value=value;audio.music.restart();})}),
  segmented({label:'Combat layer',value:options.combat,options:[{value:'follow',label:'Follow'},{value:'on',label:'On'},{value:'off',label:'Off'}],onChange:act(value=>audio.music.setCombat(value))}),
  h('div',{class:'dev-music-lab__layers'},LAYERS.map(layer=>toggleSwitch({label:layer[0].toUpperCase()+layer.slice(1),on:()=>!options.muted[layer],onChange:act(on=>audio.music.setMuted(layer,!on))}))),
  h('div',null,
   h('button',{type:'button',on:{click:restart}},'Restart song'),
   h('button',{type:'button',disabled:()=>!playing.value||options.seed.value!==null,on:{click:act(()=>{options.seed.value=playing.peek().seed;})}},'Lock seed'),
   h('button',{type:'button',disabled:()=>options.seed.value===null,on:{click:act(()=>{options.seed.value=null;audio.music.restart();})}},'Random seed')),
  h('label',null,'Instrument',
   h('select',{on:{change:event=>{instrument.value=event.target.value;}}},
    Object.entries(INSTRUMENTS).map(([id,{label,family}])=>h('option',{value:id,selected:()=>instrument.value===id},`${label} (${family})`)),
    h('option',{value:'drum',selected:()=>instrument.value==='drum'},'Drum kit'))),
  h('div',null,
   h('button',{type:'button',on:{click:act(()=>audio.music.audition(instrument.peek()))}},'Play instrument'),
   h('button',{type:'button',on:{click:()=>{const voice=instrument.peek();runCheck(voice==='drum'?'Drum kit':INSTRUMENTS[voice].label,async()=>describeClicks({[voice]:await checkInstrument(voice)}));}}},'Check instrument'),
   h('button',{type:'button',on:{click:()=>{const id=playing.peek()?.song??'clearing';runCheck(`Song ${id}`,async()=>describeClicks(await checkSong(id,{arrangement:options.arrangement.peek()})));}}},'Check song')),
  h('label',null,'Effect',pick(effect,Object.entries(EFFECTS).map(([id,{label,cue}])=>[id,cue?`${label} ♪`:label]))),
  h('div',null,
   h('button',{type:'button',on:{click:act(()=>audio.play(effect.peek(),.5))}},'Play effect'),
   h('button',{type:'button',on:{click:()=>{const kind=effect.peek();runCheck(EFFECTS[kind].label,async()=>describeClicks({[kind]:await checkEffect(kind)}));}}},'Check effect')),
  h('label',null,'Ambience',
   h('select',{on:{change:act(event=>{audio.ambience.override.value=event.target.value||null;})}},
    h('option',{value:'',selected:()=>audio.ambience.override.value===null},'Follow game'),
    Object.entries(AMBIENCE_PROFILES).map(([id,{label}])=>h('option',{value:id,selected:()=>audio.ambience.override.value===id},label)))),
  h('label',null,'Ambient sound',pick(ambientSound,Object.entries(AMBIENT_SOUNDS))),
  h('div',null,
   h('button',{type:'button',on:{click:act(()=>audio.ambience.play(ambientSound.peek()))}},'Play sound'),
   h('button',{type:'button',on:{click:()=>{const kind=ambientSound.peek();runCheck(AMBIENT_SOUNDS[kind],async()=>describeClicks({[kind]:await checkAmbient(kind)}));}}},'Check sound')),
  h('output',{class:'dev-music-lab__check','aria-live':'polite'},check));
}
