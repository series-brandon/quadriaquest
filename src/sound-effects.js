import {degreeMidi} from './music-theory.js';

// Sound effects and musical cues. Effects are short procedural sketches; cues (marked `cue`) are
// little phrases played on the current song's cue instrument, in its key, so rewards sound like
// part of the music in every area. Works on any context (live or offline), like the music player.
//
// Click rules (the lab's Check effect): attacks of at least 4 ms for tones and 8 ms for noise, and
// every envelope reaches silence before its source stops.
// Every envelope gain is set to 0 when created, before its automation: a gain node starts at 1,
// and a setValueAtTime(0) at the same instant a source starts lands a sample late in Chrome, so
// a noise source would begin with a one-sample spike.
export const EFFECTS={
 ui:{label:'Button'},
 blocked:{label:'Blocked / error'},
 pickup:{label:'Pick up',cue:true},
 craft:{label:'Crafting tap'},
 complete:{label:'Crafted',cue:true},
 eat:{label:'Eat'},
 chop:{label:'Chop'},
 mine:{label:'Mine'},
 fall:{label:'Tree or boulder falls'},
 hammer:{label:'Hammer (carpentry)'},
 cast:{label:'Fishing cast'},
 catch:{label:'Fish caught',cue:true},
 ignite:{label:'Campfire lit'},
 sizzle:{label:'Cooking'},
 anvil:{label:'Anvil'},
 furnace:{label:'Furnace'},
 doorOpen:{label:'Door opens'},
 doorClose:{label:'Door closes'},
 hit:{label:'Hit an enemy'},
 crit:{label:'Critical hit'},
 whiff:{label:'Attack missed'},
 strongCharge:{label:'Strong Strike charges'},
 strongHit:{label:'Strong Strike lands'},
 spellCharge:{label:'Spell gathers'},
 spellRelease:{label:'Spell released'},
 spellHit:{label:'Spell hits'},
 hurt:{label:'Player hurt'},
 victory:{label:'Enemy defeated',cue:true},
 progress:{label:'Quest progress',cue:true},
 task:{label:'Objective part complete',cue:true},
 objective:{label:'Objective complete',cue:true},
 quest:{label:'Quest complete',cue:true},
 level:{label:'Level up',cue:true},
 portal:{label:'Portal',cue:true}
};
// Seconds to lower the music under the bigger cues, so they read clearly.
const DUCK={level:1,quest:1.2};
const DEFAULT_PALETTE={root:62,mode:'ionian',voice:'celesta'};

// Milestone cues by importance. Cues raised together (the last pickup of a gathering objective
// also levels up a skill) play only the most important one.
export const CUE_RANK={progress:0,task:1,objective:2,quest:3,level:4};
export function createCuePicker(play,{window=120,schedule=setTimeout}={}){
 let pending=null;
 return function cue(kind,arg){
  if(!(kind in CUE_RANK))return;
  if(pending){if(CUE_RANK[kind]>CUE_RANK[pending.kind])Object.assign(pending,{kind,arg});return;}
  pending={kind,arg};
  schedule(()=>{const {kind,arg}=pending;pending=null;play(kind,arg);},window);
 };
}

export function createSoundEffects(ctx,out,{voices,palette=()=>DEFAULT_PALETTE}){
 // Noise sources loop, so a random start offset never runs a long effect off the buffer's end.
 const sr=ctx.sampleRate,noiseBuffer=ctx.createBuffer(1,sr*2,sr),data=noiseBuffer.getChannelData(0);
 for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;

 // A gain that rises over `attack`, holds to `hold`, then falls exponentially to silence by `end`.
 function envelope(start,level,{attack=.006,hold=0,end}){
  const gain=ctx.createGain();gain.gain.value=0;gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(level,start+attack);
  gain.gain.setValueAtTime(level,start+Math.max(attack,hold));gain.gain.exponentialRampToValueAtTime(.0001,end);return gain;
 }
 function tone(freq,{at=0,dur=.2,level=.1,type='sine',glide=freq,attack=.006}={}){
  const start=ctx.currentTime+at,end=start+dur,osc=ctx.createOscillator();osc.type=type;
  osc.frequency.setValueAtTime(freq,start);osc.frequency.exponentialRampToValueAtTime(Math.max(20,glide),end);
  osc.connect(envelope(start,level,{attack,end})).connect(out);osc.start(start);osc.stop(end+.05);
 }
 // Noise bursts get a slower default attack than tones: a loud noise onset under ~8 ms reads as a click.
 function noise(freq,{at=0,dur=.2,level=.1,type='bandpass',q=.7,sweep=freq,attack=.009,hold=0}={}){
  const start=ctx.currentTime+at,end=start+dur,source=ctx.createBufferSource(),filter=ctx.createBiquadFilter();
  source.buffer=noiseBuffer;source.loop=true;filter.type=type;filter.Q.value=q;filter.frequency.setValueAtTime(freq,start);filter.frequency.exponentialRampToValueAtTime(Math.max(30,sweep),end);
  source.connect(filter).connect(envelope(start,level,{attack,hold,end})).connect(out);source.start(start,Math.random());source.stop(end+.05);
 }
 // Notes in the current song's key on its cue instrument. Degrees are relative to an octave above
 // the song's root (1 = that tonic), so cues sit above the melody.
 function notes(degrees,{at=0,gap=.09,dur=.4,vel=.7,lift=12}={}){
  const {root,mode,voice}=palette(),play=voices[voice]||voices.celesta;
  degrees.forEach((degree,i)=>{for(const d of [].concat(degree))play({time:ctx.currentTime+at+i*gap,midi:degreeMidi(root+lift,mode,d),dur,vel},out);});
 }
 const vary=()=>.92+Math.random()*.16;
 // A sustained sound that can end early: each part is a source and its gain; stop() fades them out
 // over 80 ms (no click) and stops the sources.
 function sustained(parts){
  return {stop(){const now=ctx.currentTime;for(const {source,gain} of parts){gain.gain.cancelScheduledValues(now);gain.gain.setValueAtTime(Math.max(gain.gain.value,.0001),now);gain.gain.exponentialRampToValueAtTime(.0001,now+.08);try{source.stop(now+.1);}catch{}}}};
 }
 // The spell's gathering: a shimmer that swells and rises for `duration` seconds (the visible gather and
 // pull back), with a slow sparkle (tremolo). Returns a handle so a cancelled cast stops it.
 function spellGather(duration=2.4){
  const start=ctx.currentTime,end=start+duration,parts=[];
  const fade=(level,rise)=>{const gain=ctx.createGain();gain.gain.value=0;gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(level*.5,start+Math.max(.03,rise));gain.gain.linearRampToValueAtTime(level,end);gain.gain.exponentialRampToValueAtTime(.0001,end+.12);return gain;};
  const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),air=fade(.06,duration*.35);
  source.buffer=noiseBuffer;source.loop=true;filter.type='bandpass';filter.Q.value=2.2;filter.frequency.setValueAtTime(500,start);filter.frequency.exponentialRampToValueAtTime(3600,end);
  source.connect(filter).connect(air).connect(out);source.start(start,Math.random());source.stop(end+.2);parts.push({source,gain:air});
  for(const [from,to,level,rate] of [[440,880,.028,7],[660,1320,.018,9.5]]){
   const osc=ctx.createOscillator(),gain=fade(level,duration*.25),shimmer=ctx.createGain(),lfo=ctx.createOscillator(),depth=ctx.createGain();
   const f=from*vary();osc.frequency.setValueAtTime(f,start);osc.frequency.exponentialRampToValueAtTime(to*(f/from),end);
   shimmer.gain.value=.75;lfo.frequency.value=rate;depth.gain.value=.25;lfo.connect(depth).connect(shimmer.gain);
   osc.connect(shimmer).connect(gain).connect(out);osc.start(start);osc.stop(end+.2);lfo.start(start);lfo.stop(end+.2);
   parts.push({source:osc,gain},{source:lfo,gain:depth});
  }
  return sustained(parts);
 }

 const recipes={
  ui(){tone(620,{dur:.07,level:.025});},
  blocked(){tone(180,{dur:.16,level:.08,type:'triangle',glide:100});},
  pickup(){noise(1400,{dur:.1,level:.04,q:.6});notes([[5,8,10][Math.floor(Math.random()*3)]],{dur:.25,vel:.32});},
  craft(){noise(1800,{dur:.1,level:.12,q:1});tone(330*vary(),{dur:.12,level:.07,type:'triangle'});},
  complete(){notes([5,8],{gap:.09,dur:.5,vel:.5});},
  // Three munches, each a little quieter and lower: a crackle of tiny crisp grains (the crunch) over a
  // soft, muffled chew, with only a whisper of jaw thump.
  eat(){[[0,1,.11],[.22,.93,.085],[.44,.86,.065]].forEach(([at,pitch,level])=>{
   // The grains fall away step by step (each about half the last, ringing a little longer), so a crunch
   // fades into the chew instead of stopping short.
   [.8,.48,.28,.15].forEach((share,g)=>{const t=at+g*(.022+Math.random()*.006);noise((2600+Math.random()*1900)*pitch,{at:t,dur:.035+g*.014,level:level*share,q:1.6,attack:.008});});
   noise(820*pitch*vary(),{at,dur:.2,level:level*.55,type:'lowpass',q:.7,sweep:480*pitch,attack:.012});
   tone(130*pitch*vary(),{at,dur:.07,level:level*.15,type:'triangle',glide:95,attack:.008});});},
  chop(){noise(450,{dur:.14,level:.28,q:.8});tone(135*vary(),{dur:.14,level:.15,type:'triangle',glide:70});},
  mine(){noise(2600,{dur:.14,level:.2,q:.8});tone(1100*vary(),{dur:.16,level:.07,type:'triangle',glide:700});},
  fall(){noise(330,{dur:.8,level:.26,q:.6,sweep:180,attack:.02});tone(90,{dur:.45,level:.12,type:'triangle',glide:35,attack:.01});},
  hammer(){noise(1200,{dur:.07,level:.12,q:1.2,attack:.008});tone(300*vary(),{dur:.1,level:.1,type:'triangle',glide:220,attack:.004});},
  cast(){noise(700,{dur:.3,level:.07,q:1.2,sweep:2600,attack:.05});tone(520,{at:.5,dur:.12,level:.05,glide:180});noise(1100,{at:.5,dur:.16,level:.06,q:1});},
  catch(){noise(900,{dur:.35,level:.12,q:.7,sweep:500,attack:.01});notes([3,5,8],{at:.12,gap:.08,dur:.45,vel:.6});},
  ignite(){noise(220,{dur:.6,level:.2,type:'lowpass',q:.5,sweep:1600,attack:.03});tone(85,{dur:.4,level:.12,glide:55,attack:.01});},
  sizzle(){noise(4200,{dur:1.4,level:.05,type:'highpass',q:.5,attack:.25,hold:.8});},
  // A short wooden creak as a door swings open; a soft thud as it shuts.
  doorOpen(){noise(900*vary(),{dur:.22,level:.05,q:4,attack:.012});tone(190*vary(),{dur:.24,level:.05,type:'triangle',glide:240,attack:.01});},
  doorClose(){noise(320,{dur:.12,level:.16,q:.9,attack:.008});tone(105*vary(),{dur:.14,level:.12,type:'triangle',glide:80});},
  anvil(){for(const [freq,level] of [[1250,.06],[3350,.025],[5100,.012]])tone(freq*vary(),{dur:.7,level,attack:.004});noise(3000,{dur:.06,level:.035,q:1.5,attack:.008});},
  furnace(){noise(380,{dur:1.1,level:.24,type:'lowpass',q:.5,sweep:240,attack:.2,hold:.4});},
  hit(){tone(150*vary(),{dur:.15,level:.15,type:'triangle',glide:70,attack:.006});noise(900,{dur:.1,level:.16,q:.9,attack:.008});},
  crit(){recipes.hit();noise(3200,{dur:.15,level:.08,q:1.2,attack:.008});tone(880,{dur:.25,level:.05,glide:600});},
  whiff(){noise(2600,{dur:.2,level:.13,q:1.4,sweep:700,attack:.03});},
  // Strong Strike: a rising, rumbling charge through the half-second windup, then a heavy crack.
  strongCharge(){noise(180,{dur:.5,level:.14,type:'lowpass',q:.8,sweep:900,attack:.12,hold:.3});tone(70,{dur:.5,level:.09,type:'triangle',glide:140,attack:.12});},
  strongHit(){tone(95*vary(),{dur:.32,level:.22,type:'triangle',glide:45,attack:.004});noise(700,{dur:.22,level:.24,q:.8,sweep:250,attack:.008});noise(3800,{dur:.12,level:.1,q:1.3,attack:.008});},
  // Magic: the gathering shimmer for as long as the hands gather (stoppable; see start()), a bright zap
  // on release, and a sparkling impact in place of the plain hit.
  spellCharge(duration){return spellGather(duration);},
  spellRelease(){noise(3000,{dur:.25,level:.09,q:1.4,sweep:900,attack:.01});tone(990*vary(),{dur:.22,level:.06,glide:330,type:'triangle',attack:.005});},
  spellHit(){tone(1320*vary(),{dur:.3,level:.05,glide:1980,attack:.005});tone(1760*vary(),{at:.04,dur:.28,level:.035,attack:.005});noise(2200,{dur:.18,level:.1,q:1,attack:.008});tone(160,{dur:.15,level:.1,type:'triangle',glide:80,attack:.006});},
  hurt(){tone(230,{dur:.24,level:.12,glide:110,attack:.006});noise(420,{dur:.17,level:.12,q:.8,attack:.008});},
  victory(){notes([1,5,8],{gap:.1,dur:.6,vel:.6});},
  // Progress climbs the scale: an objective at 3/6 sounds halfway up the octave.
  progress(progress=0){notes([1+Math.round(Math.max(0,Math.min(1,progress))*6)],{dur:.35,vel:.45});},
  // Rising in size: a part (two notes), an objective (three), a quest (four).
  task(){notes([5,8],{gap:.1,dur:.4,vel:.42});},
  objective(){notes([5,8,12],{gap:.11,dur:.45,vel:.45});},
  quest(){notes([5,8,10,12],{gap:.12,dur:.6,vel:.45});},
  level(){notes([1,3,5,8],{gap:.08,dur:.6,vel:.5});},
  portal(){noise(300,{dur:1.3,level:.08,q:1,sweep:3200,attack:.25});notes([1,2,3,4,5,6,7,8],{at:.1,gap:.07,dur:.5,vel:.4});}
 };
 // Plays an effect; returns how long the music should duck under it (0 for most).
 function play(kind,arg){
  if(!recipes[kind])return 0;
  recipes[kind](arg);return DUCK[kind]||0;
 }
 // Starts an effect that may need to end early (spellCharge); returns a handle with stop().
 function start(kind,arg){const handle=recipes[kind]?.(arg);return handle?.stop?handle:{stop(){}};}
 return {play,start};
}
