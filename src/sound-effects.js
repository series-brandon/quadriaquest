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
 hit:{label:'Hit an enemy'},
 crit:{label:'Critical hit'},
 whiff:{label:'Attack missed'},
 hurt:{label:'Player hurt'},
 victory:{label:'Enemy defeated',cue:true},
 objective:{label:'Quest progress',cue:true},
 quest:{label:'Quest complete',cue:true},
 level:{label:'Level up',cue:true},
 portal:{label:'Portal',cue:true}
};
// Seconds to lower the music under the bigger cues, so they read clearly.
const DUCK={level:1.6,quest:2.2};
const DEFAULT_PALETTE={root:62,mode:'ionian',voice:'celesta'};

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

 const recipes={
  ui(){tone(620,{dur:.07,level:.025});},
  blocked(){tone(180,{dur:.16,level:.08,type:'triangle',glide:100});},
  pickup(){noise(1400,{dur:.1,level:.04,q:.6});notes([[5,8,10][Math.floor(Math.random()*3)]],{dur:.25,vel:.32});},
  craft(){noise(1800,{dur:.1,level:.12,q:1});tone(330*vary(),{dur:.12,level:.07,type:'triangle'});},
  complete(){notes([5,8],{gap:.09,dur:.5,vel:.5});},
  eat(){for(const at of [0,.17,.34])noise(1500*vary(),{at,dur:.16,level:.28,q:1.2,attack:.014});},
  chop(){noise(450,{dur:.14,level:.28,q:.8});tone(135*vary(),{dur:.14,level:.15,type:'triangle',glide:70});},
  mine(){noise(2600,{dur:.14,level:.2,q:.8});tone(1100*vary(),{dur:.16,level:.07,type:'triangle',glide:700});},
  fall(){noise(330,{dur:.8,level:.26,q:.6,sweep:180,attack:.02});tone(90,{dur:.45,level:.12,type:'triangle',glide:35,attack:.01});},
  hammer(){noise(1200,{dur:.07,level:.12,q:1.2,attack:.008});tone(300*vary(),{dur:.1,level:.1,type:'triangle',glide:220,attack:.004});},
  cast(){noise(700,{dur:.3,level:.07,q:1.2,sweep:2600,attack:.05});tone(520,{at:.5,dur:.12,level:.05,glide:180});noise(1100,{at:.5,dur:.16,level:.06,q:1});},
  catch(){noise(900,{dur:.35,level:.12,q:.7,sweep:500,attack:.01});notes([3,5,8],{at:.12,gap:.08,dur:.45,vel:.6});},
  ignite(){noise(220,{dur:.6,level:.2,type:'lowpass',q:.5,sweep:1600,attack:.03});tone(85,{dur:.4,level:.12,glide:55,attack:.01});},
  sizzle(){noise(4200,{dur:1.4,level:.05,type:'highpass',q:.5,attack:.25,hold:.8});},
  anvil(){for(const [freq,level] of [[1250,.06],[3350,.025],[5100,.012]])tone(freq*vary(),{dur:.7,level,attack:.004});noise(3000,{dur:.06,level:.035,q:1.5,attack:.008});},
  furnace(){noise(380,{dur:1.1,level:.24,type:'lowpass',q:.5,sweep:240,attack:.2,hold:.4});},
  hit(){tone(150*vary(),{dur:.15,level:.15,type:'triangle',glide:70,attack:.006});noise(900,{dur:.1,level:.16,q:.9,attack:.008});},
  crit(){recipes.hit();noise(3200,{dur:.15,level:.08,q:1.2,attack:.008});tone(880,{dur:.25,level:.05,glide:600});},
  whiff(){noise(2600,{dur:.2,level:.13,q:1.4,sweep:700,attack:.03});},
  hurt(){tone(230,{dur:.24,level:.12,glide:110,attack:.006});noise(420,{dur:.17,level:.12,q:.8,attack:.008});},
  victory(){notes([1,5,8],{gap:.1,dur:.6,vel:.6});},
  // Progress climbs the scale: an objective at 3/6 sounds halfway up the octave.
  objective(progress=0){notes([1+Math.round(Math.max(0,Math.min(1,progress))*6)],{dur:.35,vel:.45});},
  quest(){notes([5,8,10,12],{gap:.12,dur:.4,vel:.45});notes([[8,10,12]],{at:.55,dur:1.6,vel:.4});const {root,mode}=palette();voices.bass?.({time:ctx.currentTime+.55,midi:degreeMidi(root-24,mode,1),dur:1.4,vel:.8},out);},
  level(){notes([1,3,5,8],{gap:.08,dur:.45,vel:.5});notes([[8,10,12]],{at:.4,dur:1.2,vel:.4});},
  portal(){noise(300,{dur:1.3,level:.08,q:1,sweep:3200,attack:.25});notes([1,2,3,4,5,6,7,8],{at:.1,gap:.07,dur:.5,vel:.4});}
 };
 // Plays an effect; returns how long the music should duck under it (0 for most).
 function play(kind,arg){
  if(!recipes[kind])return 0;
  recipes[kind](arg);return DUCK[kind]||0;
 }
 return {play};
}
