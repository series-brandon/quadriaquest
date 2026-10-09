import {h} from '../ui/dom.js';
import {segmented,toggleSwitch} from '../ui/controls.js';
import {SONGS,SONG_IDS} from '../music-songs.js';
import {LAYERS} from '../music-theory.js';

// Dev-only music lab: drives the real music player (song, style, layers, combat layer, seed)
// and shows what it is playing. Built with the kit; everything reads the player's signals.
export function musicLab(audio){
 const {options,playing}=audio.music;
 const act=fn=>(...args)=>{audio.unlock();fn(...args);};
 const restart=act(()=>audio.music.restart());
 const readout=()=>{
  const now=playing.value;if(!now)return audio.ready?'Silent':'Silent: click anything to start audio';
  const seed=options.seed.value===null?`seed ${now.seed}`:`seed ${now.seed} (locked)`;
  return `${now.title} · ${now.section}${now.varied?' (varied)':''} [${now.kind}] · bar ${now.bar}/${now.bars} · ${seed}${now.combat?' · combat':''}`;
 };
 return h('fieldset',{class:'dev-music-lab'},
  h('legend',null,'Music lab'),
  h('output',{class:'dev-music-lab__now','aria-live':'off'},readout),
  h('label',null,'Song',
   h('select',{on:{change:act(event=>audio.preview(event.target.value||null))}},
    h('option',{value:'',selected:()=>options.song.value===null},'Follow game'),
    SONG_IDS.map(id=>h('option',{value:id,selected:()=>options.song.value===id},SONGS[id].title)))),
  h('p',{class:'dev-note'},'Arrangement: Cozy plays the Stardew-style versions (every song has one); Original plays the first versions. Switching crossfades.'),
  segmented({label:'Arrangement',value:options.arrangement,options:[{value:'cozy',label:'Cozy'},{value:'original',label:'Original'}],onChange:act(value=>{options.arrangement.value=value;})}),
  h('p',{class:'dev-note'},'Style picks which parts of the song play: written themes, generated drift, or both. It restarts the song.'),
  segmented({label:'Style',value:options.style,options:[{value:'mix',label:'Mix'},{value:'theme',label:'Themes'},{value:'drift',label:'Drift'}],onChange:act(value=>{options.style.value=value;audio.music.restart();})}),
  h('p',{class:'dev-note'},'Combat layer: hand drums and a bass pulse that fade in while fighting (Follow uses the real combat state).'),
  segmented({label:'Combat layer',value:options.combat,options:[{value:'follow',label:'Follow'},{value:'on',label:'On'},{value:'off',label:'Off'}],onChange:act(value=>audio.music.setCombat(value))}),
  h('div',{class:'dev-music-lab__layers'},LAYERS.map(layer=>toggleSwitch({label:layer[0].toUpperCase()+layer.slice(1),on:()=>!options.muted[layer],onChange:act(on=>audio.music.setMuted(layer,!on))}))),
  h('div',null,
   h('button',{type:'button',on:{click:restart}},'Restart song'),
   h('button',{type:'button',disabled:()=>!playing.value||options.seed.value!==null,on:{click:act(()=>{options.seed.value=playing.peek().seed;})}},'Lock seed'),
   h('button',{type:'button',disabled:()=>options.seed.value===null,on:{click:act(()=>{options.seed.value=null;audio.music.restart();})}},'Random seed')));
}
