import {midiToFreq} from './music-theory.js';

// Synthesized instruments for the music player. Every voice schedules nodes at `time` on the
// given context (live or offline) and lets them stop themselves; nothing is kept per note.
// Stereo placement is per layer (music-player.js), which keeps each note's node count small.
// Shared buffers (noise, plucked-string tables, the reverb impulse) are built once per context.
export function createVoices(ctx){
 const sr=ctx.sampleRate,noiseBuffer=ctx.createBuffer(1,sr*2,sr),noise=noiseBuffer.getChannelData(0);
 for(let i=0;i<noise.length;i++)noise[i]=Math.random()*2-1;
 const strings=new Map();

 // Karplus–Strong plucked string, one table per three semitones and retuned by playback rate.
 // The excitation is low-passed noise, so the string starts soft without a filter per note.
 // The averaging filter delays the loop by half a sample, so the table's true pitch is sr/(P+.5).
 function stringTable(midi){
  const base=Math.floor(midi/3)*3;if(strings.has(base))return strings.get(base);
  const period=Math.max(2,Math.round(sr/midiToFreq(base)-.5)),length=Math.ceil(sr*2.4),buffer=ctx.createBuffer(1,length,sr),data=buffer.getChannelData(0);
  // The excitation is mostly a smooth hump with a little filtered noise: a fingertip rather than a
  // pick, so the attack doesn't tick.
  let soft=0;for(let i=0;i<period;i++){soft+=.3*((Math.random()*2-1)-soft);data[i]=.8*Math.sin(Math.PI*i/period)+.35*soft;}
  const decay=.9965-Math.max(0,base-72)*.0002;let peak=0;
  for(let i=period;i<length;i++){data[i]=decay*.5*(data[i-period]+(i>period?data[i-period-1]:0));}
  for(let i=0;i<length;i++)peak=Math.max(peak,Math.abs(data[i]));
  if(peak)for(let i=0;i<length;i++)data[i]/=peak;
  const table={buffer,freq:sr/(period+.5)};strings.set(base,table);return table;
 }

 function envelope(time,peak,attack,hold,release){
  const gain=ctx.createGain();gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(peak,time+attack);
  gain.gain.setValueAtTime(peak,time+Math.max(attack,hold));gain.gain.exponentialRampToValueAtTime(.0001,time+Math.max(attack,hold)+release);return gain;
 }
 const osc=(type,freq,time,end)=>{const node=ctx.createOscillator();node.type=type;node.frequency.value=freq;node.start(time);node.stop(end);return node;};

 // Wind instruments: a body oscillator, a quiet octave edge, delayed vibrato and a breath of
 // filtered noise at the start.
 function wind({body:type,edge:edgeLevel,vibrato:width,breath:breathLevel,level}){
  return ({time,midi,dur,vel},out)=>{
   const freq=midiToFreq(midi),hold=Math.max(dur,.25),end=time+hold+.5,body=osc(type,freq,time,end),edge=osc('triangle',freq*2,time,end);
   const vibrato=osc('sine',5.2,time,end),depth=ctx.createGain();depth.gain.setValueAtTime(0,time);depth.gain.linearRampToValueAtTime(0,time+Math.min(.3,hold*.5));depth.gain.linearRampToValueAtTime(freq*width,time+Math.min(.7,hold));
   vibrato.connect(depth);depth.connect(body.frequency);depth.connect(edge.frequency);
   // A 25 ms swell: long enough not to click, short enough that the note lands on the beat.
   const gain=envelope(time,level*vel,.025,hold,.2),edgeGain=ctx.createGain();edgeGain.gain.value=edgeLevel;
   const breath=ctx.createBufferSource(),band=ctx.createBiquadFilter(),breathGain=envelope(time,breathLevel*vel,.03,.05,Math.max(.15,hold));
   breath.buffer=noiseBuffer;band.type='bandpass';band.frequency.value=freq*2;band.Q.value=1.5;breath.connect(band).connect(breathGain).connect(out);breath.start(time,Math.random());breath.stop(end);
   body.connect(gain);edge.connect(edgeGain).connect(gain);gain.connect(out);
  };
 }

 const voices={
  pluck({time,midi,dur,vel},out){
   const table=stringTable(midi),source=ctx.createBufferSource(),ring=Math.max(dur,1.6),gain=ctx.createGain();
   source.buffer=table.buffer;source.playbackRate.value=midiToFreq(midi)/table.freq;
   // A short fade-in: the string table starts at full amplitude, which clicks without it.
   gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(.6*vel,time+.006);gain.gain.setTargetAtTime(0,time+ring,.12);
   source.connect(gain).connect(out);source.start(time);source.stop(time+ring+1);
  },
  // Two-operator FM: ratio 1 gives a soft electric piano; the index fades so notes mellow out.
  keys({time,midi,dur,vel},out){
   // Decay and release are both setTargetAtTime curves (mixing them with ramps makes the gain jump),
   // and the oscillators run until the release is ~8 time constants down, so notes end silently.
   const freq=midiToFreq(midi),release=time+Math.max(dur,.6),end=release+2,carrier=osc('sine',freq,time,end),mod=osc('sine',freq,time,end),depth=ctx.createGain();
   depth.gain.setValueAtTime(freq*1.6,time);depth.gain.exponentialRampToValueAtTime(freq*.12,time+.9);
   const gain=ctx.createGain();gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(.28*vel,time+.006);
   gain.gain.setTargetAtTime(.07*vel,time+.006,.4);gain.gain.setTargetAtTime(0,release,.25);
   mod.connect(depth).connect(carrier.frequency);carrier.connect(gain).connect(out);
  },
  // Inharmonic FM bell (ratio 3.5) with a long, quiet tail.
  bell({time,midi,vel},out){
   const freq=midiToFreq(midi),end=time+4,carrier=osc('sine',freq,time,end),mod=osc('sine',freq*3.5,time,end),depth=ctx.createGain();
   depth.gain.setValueAtTime(freq*2.2,time);depth.gain.exponentialRampToValueAtTime(freq*.05,time+1.8);
   const gain=ctx.createGain();gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(.13*vel,time+.008);gain.gain.exponentialRampToValueAtTime(.0001,end);
   mod.connect(depth).connect(carrier.frequency);carrier.connect(gain).connect(out);
  },
  flute:wind({body:'sine',edge:.08,vibrato:.006,breath:.025,level:.09}),
  // Hollower and steadier than the flute: a triangle body, less vibrato, a softer chiff.
  recorder:wind({body:'triangle',edge:.025,vibrato:.0025,breath:.018,level:.075}),
  bass({time,midi,dur,vel},out){
   const freq=midiToFreq(midi),hold=Math.max(dur,.3),end=time+hold+.4,body=osc('triangle',freq,time,end),sub=osc('sine',freq,time,end),filter=ctx.createBiquadFilter();
   filter.type='lowpass';filter.frequency.value=Math.min(900,freq*5);
   const gain=ctx.createGain();gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(.09*vel,time+.012);gain.gain.exponentialRampToValueAtTime(.035*vel,time+hold);gain.gain.exponentialRampToValueAtTime(.0001,end);
   body.connect(filter);sub.connect(filter);filter.connect(gain).connect(out);
  },
  // A chord of slightly detuned saws through a slowly opening low-pass.
  pad({time,midis,dur,vel},out){
   const attack=Math.min(1.6,dur*.4),end=time+dur+2,filter=ctx.createBiquadFilter(),gain=ctx.createGain(),level=.035*vel;
   filter.type='lowpass';filter.Q.value=.5;filter.frequency.setValueAtTime(500,time);filter.frequency.linearRampToValueAtTime(1300,time+attack);filter.frequency.linearRampToValueAtTime(800,time+dur);
   gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(level,time+attack);gain.gain.setValueAtTime(level,time+dur-.1);gain.gain.setTargetAtTime(0,time+dur-.1,.6);
   for(const midi of midis)for(const cents of [-7,7]){const node=osc('sawtooth',midiToFreq(midi),time,end);node.detune.value=cents;node.connect(filter);}
   filter.connect(gain).connect(out);
  },
  // Hand drums: x low frame drum, o higher tom, s shaker; light kit: k soft kick, w woodblock, h brush.
  // Light-kit attacks are 4–6 ms: anything faster reads as a click at these levels.
  drum({time,drum,vel},out){
   if(drum==='k'){const body=osc('sine',95,time,time+.35),gain=envelope(time,.4*vel,.006,.01,.25);body.frequency.setValueAtTime(95,time);body.frequency.exponentialRampToValueAtTime(48,time+.12);body.connect(gain).connect(out);return;}
   if(drum==='w'){const body=osc('sine',760,time,time+.15),gain=envelope(time,.11*vel,.004,.006,.08);body.frequency.setValueAtTime(760,time);body.frequency.exponentialRampToValueAtTime(640,time+.08);body.connect(gain).connect(out);return;}
   if(drum==='h'){const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=envelope(time,.06*vel,.012,.02,.12);source.buffer=noiseBuffer;filter.type='bandpass';filter.frequency.value=2800;filter.Q.value=.7;source.connect(filter).connect(gain).connect(out);source.start(time,Math.random());source.stop(time+.2);return;}
   // The shaker is a soft band of noise with a swelling attack, a "shh" rather than a tick.
   if(drum==='s'){const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=envelope(time,.08*vel,.018,.012,.08);source.buffer=noiseBuffer;filter.type='bandpass';filter.frequency.value=4200;filter.Q.value=.9;source.connect(filter).connect(gain).connect(out);source.start(time,Math.random());source.stop(time+.15);return;}
   const low=drum==='x',body=osc('sine',low?120:240,time,time+.5),gain=ctx.createGain();
   body.frequency.setValueAtTime(low?120:240,time);body.frequency.exponentialRampToValueAtTime(low?52:160,time+.18);
   gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime((low?.3:.17)*vel,time+.004);gain.gain.exponentialRampToValueAtTime(.0001,time+(low?.42:.22));
   const hit=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),hitGain=envelope(time,(low?.06:.08)*vel,.002,.005,.05);
   hit.buffer=noiseBuffer;filter.type='bandpass';filter.frequency.value=low?500:1800;hit.connect(filter).connect(hitGain).connect(out);hit.start(time,Math.random());hit.stop(time+.12);
   body.connect(gain).connect(out);
  }
 };

 // Stereo hall impulse built from decaying noise that darkens as it fades; no file needed.
 function impulse(seconds=2.6){
  const length=Math.ceil(sr*seconds),buffer=ctx.createBuffer(2,length,sr),preDelay=Math.floor(sr*.018);
  for(let channel=0;channel<2;channel++){
   const data=buffer.getChannelData(channel);let smooth=0;
   for(let i=preDelay;i<length;i++){const t=(i-preDelay)/(length-preDelay),tone=.6-t*.5;smooth+=tone*((Math.random()*2-1)-smooth);data[i]=smooth*(1-t)**2.4;}
  }
  return buffer;
 }
 return {voices,impulse,warm(midis){for(const midi of midis)stringTable(midi);}};
}
