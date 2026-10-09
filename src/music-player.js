import {reactiveRecord,signal} from './reactive.js';
import {COZY_SONGS,SONGS} from './music-songs.js';
import {LAYERS,arrangement,renderSection,seededRandom,stepSeconds,swingOffset} from './music-theory.js';
import {DRUM_KIT,INSTRUMENTS,createVoices} from './music-voices.js';

const LAYER_LEVEL={pad:.9,comp:.7,bass:.8,arp:.4,melody:.9,drift:.8,perc:1.2,combat:.85};
const LAYER_PAN={pad:0,comp:-.2,bass:0,arp:-.3,melody:.1,drift:.3,perc:.2,combat:-.15};
const REVERB_SEND={pad:.7,comp:.3,bass:.12,arp:.5,melody:.45,drift:.7,perc:.2,combat:.15};
// Notes are scheduled on the audio clock this far ahead, so frame hitches never move a note.
const LOOKAHEAD=.3,TICK_MS=50,FADE_OUT=2.5,FADE_IN=1.5;

// Plays songs from music-songs.js on any context (live or offline). It owns a small mix chain
// (dry + generated hall reverb → gentle low-pass → compressor) into `destination`, crossfades
// between songs and fades a combat layer in and out. Songs come in arrangements: `cozy`
// (music-songs.js COZY_SONGS, where written) or the `original` ones. `options` are the knobs the playground's
// music lab drives; gameplay only calls `update(songId, combat)`.

// Lab options and the now-playing readout, kept outside the player so they exist (and can be
// bound to UI) before the first gesture creates the audio context.
export function createMusicState(){
 return {options:{style:signal('mix'),seed:signal(null),combat:signal('follow'),song:signal(null),arrangement:signal('cozy'),muted:reactiveRecord(Object.fromEntries(LAYERS.map(layer=>[layer,false])))},playing:signal(null)};
}

export function createMusicPlayer(ctx,destination,{songs=SONGS,cozy=COZY_SONGS,state=createMusicState()}={}){
 const {voices,impulse,warm}=createVoices(ctx);
 const dry=ctx.createGain(),reverb=ctx.createConvolver(),wet=ctx.createGain(),tone=ctx.createBiquadFilter(),glue=ctx.createDynamicsCompressor(),trim=ctx.createGain();
 reverb.buffer=impulse();wet.gain.value=.6;tone.type='lowpass';tone.frequency.value=9000;
 glue.threshold.value=-12;glue.knee.value=10;glue.ratio.value=2.5;glue.attack.value=.02;glue.release.value=.25;
 dry.connect(tone);reverb.connect(wet).connect(tone);// Chrome's compressor adds make-up gain; the trim keeps music under effects at equal sliders.
 trim.gain.value=.6;tone.connect(glue).connect(trim).connect(destination);

 const {options,playing}=state;
 let current=null,fading=[],wanted=null,combatWanted=false,combatOn=false,combatOffAt=-Infinity,timer=null;

 // Cozy-only songs (no original) play in either arrangement.
 const songFor=id=>(options.arrangement.peek()==='cozy'&&cozy[id])||songs[id]||cozy[id]||null;
 // A song's `mix` scales its own layers (e.g. accompaniment under the melody) without touching others.
 const level=(layer,song)=>(options.muted[layer]?0:layer==='combat'?(combatOn?LAYER_LEVEL.combat:0):LAYER_LEVEL[layer])*(song?.mix?.[layer]??1);
 function instance(id,at){
  const song=songFor(id),seed=options.seed.peek()??Math.floor(Math.random()*1e9),out=ctx.createGain(),wetOut=ctx.createGain(),layers={};
  // `reverb` scales a song's room: cozy songs sit closer than the default hall.
  for(const [gain,full] of [[out,1],[wetOut,song.reverb??1]]){gain.gain.value=0;gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(full,at+FADE_IN);}
  out.connect(dry);wetOut.connect(reverb);
  for(const layer of LAYERS){const gain=ctx.createGain(),send=ctx.createGain();gain.gain.value=level(layer,song);send.gain.value=REVERB_SEND[layer];gain.connect(out);gain.connect(send).connect(wetOut);layers[layer]=gain;
   if(LAYER_PAN[layer]&&ctx.createStereoPanner){const pan=ctx.createStereoPanner();pan.pan.value=LAYER_PAN[layer];gain.disconnect();gain.connect(pan);pan.connect(out);pan.connect(send).connect(wetOut);}}
  for(const voice of new Set([...Object.values(song.voices||{}),...Object.values(song.sections).map(section=>section.voice)]))warm(voice,[song.root-24,song.root-12,song.root,song.root+12]);
  return {id,song,seed,rng:seededRandom(seed),out,wetOut,layers,step:stepSeconds(song),form:[],index:-1,section:null,start:at,cursor:0,timeline:[],endAt:null};
 }
 function nextSection(inst){
  for(let guard=0;guard<64;guard++){
   inst.index++;
   if(inst.index>=inst.form.length){inst.form=arrangement(inst.song,options.style.peek());inst.index=0;}
   const entry=inst.form[inst.index];
   // Rests would drop the beat mid-fight; skip them while the combat layer plays.
   if(combatOn&&inst.song.sections[entry.name].kind==='rest')continue;
   inst.section=renderSection(inst.song,entry.name,{rng:inst.rng,varied:entry.varied});inst.cursor=0;
   inst.timeline.push({start:inst.start,name:entry.name,varied:entry.varied,kind:inst.section.kind,bars:inst.section.bars});return;
  }
 }
 function schedule(inst,horizon,now){
  if(!inst.section)nextSection(inst);
  const sectionEnd=()=>inst.start+inst.section.steps*inst.step;
  // After a stall (a throttled timer), skip ahead instead of firing a burst of late notes.
  if(sectionEnd()<now-.25){inst.start=now+.05;inst.section=null;nextSection(inst);}
  for(;;){
   const event=inst.section.events[inst.cursor];
   const time=event?inst.start+event.step*inst.step+swingOffset(inst.song,event.step):sectionEnd();
   if(time>horizon)return;
   if(!event){inst.start=sectionEnd();nextSection(inst);continue;}
   inst.cursor++;
   if(time<now-.02||(inst.endAt!==null&&time>inst.endAt))continue;
   if(options.muted[event.layer])continue;
   if(event.layer==='combat'&&!combatOn&&time>combatOffAt+3)continue;
   // Unseeded on purpose: a locked seed must reproduce the arrangement whatever gets scheduled.
   const humanize=event.layer==='combat'?0:(Math.random()-.5)*.012;
   voices[event.voice]({...event,time:Math.max(now,time+humanize),dur:event.len*inst.step},inst.layers[event.layer]);
  }
 }
 function report(now){
  if(!current){if(playing.peek())playing.value=null;return;}
  const timeline=current.timeline;while(timeline.length>1&&timeline[1].start<=now)timeline.shift();
  const part=timeline[0],barLength=current.step*(current.song.meter||8),bar=part?Math.max(0,Math.min(part.bars-1,Math.floor((now-part.start)/barLength))):0;
  const next={song:current.id,title:current.song.title,section:part?.name??'',kind:part?.kind??'',varied:!!part?.varied,bar:bar+1,bars:part?.bars??0,seed:current.seed,combat:combatOn};
  const last=playing.peek();if(!last||Object.keys(next).some(key=>next[key]!==last[key]))playing.value=next;
 }
 function applyCombat(now){
  const forced=options.combat.peek(),on=forced==='on'||(forced==='follow'&&combatWanted);
  if(on===combatOn)return;combatOn=on;if(!on)combatOffAt=now;
  for(const inst of [current,...fading])inst?.layers.combat.gain.setTargetAtTime(level('combat',inst.song),now,on?.4:1.2);
 }
 function switchTo(id,now){
  if(current){for(const gain of [current.out,current.wetOut]){gain.gain.cancelScheduledValues(now);gain.gain.setValueAtTime(gain.gain.value,now);gain.gain.linearRampToValueAtTime(0,now+FADE_OUT);}current.endAt=now+FADE_OUT;fading.push(current);}
  current=id&&songFor(id)?instance(id,now+(current?.6:.05)):null;
 }
 // Schedules everything due before `horizon`. The live timer passes nothing; offline renders
 // pass their full length.
 function tick(horizon){
  const now=ctx.currentTime;horizon??=now+LOOKAHEAD;
  applyCombat(now);
  const target=options.song.peek()??wanted;
  if(target!==(current?.id??null)||(current&&current.song!==songFor(target)))switchTo(target,now);
  for(const inst of fading)schedule(inst,horizon,now);
  fading=fading.filter(inst=>{if(now<inst.endAt+.5)return true;inst.out.disconnect();inst.wetOut.disconnect();return false;});
  if(current)schedule(current,horizon,now);
  report(now);
 }
 function restart(){const now=ctx.currentTime,id=current?.id;switchTo(null,now);if(id)current=instance(id,now+.1);tick();}
 return {
  options,playing,tick,restart,voices,
  // The current song's key and cue instrument, for musical sound effects (sound-effects.js).
  // Songs name it as `voices.cue`; otherwise their drift instrument, else a celesta in D.
  palette(){const song=current?.song;return song?{root:song.root,mode:song.mode,voice:song.voices?.cue||song.voices?.drift||'celesta'}:{root:62,mode:'ionian',voice:'celesta'};},
  update(songId,combat){wanted=songId||null;combatWanted=!!combat;},
  // Re-reads a layer's mute (or the combat layer's state) after options change.
  refreshLayer(layer){for(const inst of [current,...fading])inst?.layers[layer].gain.setTargetAtTime(level(layer,inst.song),ctx.currentTime,.05);},
  // Plays an instrument (a rising-and-falling arpeggio across its range) or the drum kit through
  // the music mix, for the lab's audition. Returns its length in seconds.
  // `skipNoise` leaves out the noise-based kit pieces (the click check can't judge them).
  audition(voice,{skipNoise=false}={}){
   const now=ctx.currentTime+.05,out=ctx.createGain(),send=ctx.createGain();out.connect(dry);out.connect(send).connect(reverb);send.gain.value=.4;
   if(voice==='drum'){const kit=Object.keys(DRUM_KIT).filter(drum=>!skipNoise||!'sht'.includes(drum));kit.forEach((drum,i)=>voices.drum({time:now+i*.45,drum,vel:1},out));setTimeout(()=>out.disconnect(),(kit.length*.45+3)*1000);return kit.length*.45;}
   const {low,high}=INSTRUMENTS[voice],steps=[0,4,7,12,16,19,24,19,16,12,7,4,0],root=low+Math.max(0,Math.floor((high-low-24)/2)),notes=steps.map(step=>Math.min(high,root+step));
   notes.forEach((midi,i)=>voices[voice]({time:now+i*.32,midi,dur:i===notes.length-1?1:.28,vel:.9},out));
   setTimeout(()=>out.disconnect(),(notes.length*.32+5)*1000);return notes.length*.32+1;
  },
  start(){if(!timer)timer=setInterval(()=>{if(ctx.state==='running')tick();},TICK_MS);},
  stop(){clearInterval(timer);timer=null;switchTo(null,ctx.currentTime);},
  get songs(){return songs;}
 };
}
