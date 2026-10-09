import {midiToFreq} from './music-theory.js';

// Synthesized instruments for the music player. A few engines (plucked string, FM, mallet, wind,
// reed, bass, pad, drums) turn into many instruments through presets, so a new instrument is
// mostly numbers. Every voice schedules nodes at `time` on the given context (live or offline)
// and lets them stop themselves; nothing is kept per note. Stereo placement is per layer
// (music-player.js), which keeps each note's node count small. Shared buffers (noise, string
// tables, reed waves, the reverb impulse) are built once per context.
//
// Click rules (checked by the music lab's click check): every envelope reaches silence before its
// oscillator stops, and attacks are at least 4 ms.
// Every envelope gain is set to 0 when created, before its automation: a gain node starts at 1,
// and a setValueAtTime(0) at the same instant a source starts lands a sample late in Chrome, so
// a noise source would begin with a one-sample spike.

// The melodic instruments, for songs, tests and the lab's audition. `low`/`high` bound the range
// the audition plays; songs may go outside it.
export const INSTRUMENTS={
 flute:{label:'Flute',family:'wind',low:62,high:86},
 recorder:{label:'Recorder',family:'wind',low:60,high:84},
 ocarina:{label:'Ocarina',family:'wind',low:60,high:81},
 whistle:{label:'Tin whistle',family:'wind',low:62,high:88},
 clarinet:{label:'Clarinet',family:'reed',low:52,high:79},
 accordion:{label:'Accordion',family:'reed',low:53,high:81},
 tuba:{label:'Tuba',family:'reed',low:29,high:53},
 pluck:{label:'Nylon guitar',family:'string',low:40,high:76},
 harp:{label:'Harp',family:'string',low:36,high:84},
 banjo:{label:'Banjo',family:'string',low:48,high:79},
 keys:{label:'Electric piano',family:'fm',low:43,high:84},
 celesta:{label:'Celesta',family:'fm',low:60,high:96},
 vibes:{label:'Vibraphone',family:'fm',low:53,high:89},
 kalimba:{label:'Kalimba',family:'fm',low:55,high:84},
 bell:{label:'Bell',family:'fm',low:60,high:96},
 marimba:{label:'Marimba',family:'mallet',low:45,high:84},
 bass:{label:'Upright bass',family:'bass',low:28,high:55}
};
// Kit pieces for `drum` events, with what each is.
export const DRUM_KIT={x:'Low frame drum',o:'High hand drum',s:'Shaker',k:'Soft kick',w:'Woodblock',h:'Brush',t:'Tambourine',g:'Triangle'};

// Instrument levels are normalized so a mid-range note at full velocity is about as loud as the
// flute's (RMS ~.06 over its first 300 ms); songs balance roles with their `mix`. The flute and
// recorder keep their original levels.
//
// Karplus–Strong strings. `hump`/`noise` shape the excitation (a smooth hump is a fingertip, noise
// is a pick; `width` narrows the hump, which brightens it without noise's tick); `soft` low-passes the noise; `decay` is the loop gain (lower dies faster); `length`
// is the table's seconds (it must outlast `ring` plus the damping).
const STRINGS={
 pluck:{hump:.8,noise:.25,soft:.3,decay:.9965,level:.12,ring:1.6,length:2.4},
 harp:{hump:.9,noise:.18,soft:.25,decay:.998,level:.1,ring:2.2,length:3.4},
 banjo:{hump:.9,width:.35,noise:.08,soft:.3,decay:.991,level:.2,ring:.7,length:1.8}
};
// Two-operator FM. The modulation index falls from `index` to `indexEnd` over `indexTime`; the
// gain decays toward `sustain` (a fraction of `level`) and releases after max(dur, minDur).
const FM={
 keys:{ratio:1,index:1.6,indexEnd:.12,indexTime:.9,level:.14,sustain:.25,decayTau:.4,releaseTau:.25,minDur:.6},
 bell:{ratio:3.5,index:2.2,indexEnd:.05,indexTime:1.8,level:.1,sustain:0,decayTau:.9,releaseTau:.9,minDur:3,attack:.008},
 celesta:{ratio:4,index:1.1,indexEnd:.02,indexTime:.25,level:.11,sustain:0,decayTau:.55,releaseTau:.3,minDur:1.2},
 vibes:{ratio:4,index:.7,indexEnd:.03,indexTime:.4,level:.125,sustain:.25,decayTau:.9,releaseTau:.35,minDur:.4,tremolo:{rate:5.5,depth:.3}},
 kalimba:{ratio:5.93,index:1.5,indexEnd:.01,indexTime:.06,level:.115,sustain:0,decayTau:.45,releaseTau:.2,minDur:.8}
};
// Breath instruments: body waveform, a quiet octave edge, delayed vibrato, a breath of noise.
const WINDS={
 flute:{body:'sine',edge:.08,vibrato:.006,rate:5.2,breath:.025,level:.09},
 // Hollower and steadier than the flute: a triangle body, less vibrato, a softer chiff.
 recorder:{body:'triangle',edge:.025,vibrato:.0025,rate:5.2,breath:.018,level:.075},
 // Round and pure, slow vibrato, a little more air.
 ocarina:{body:'sine',edge:.012,vibrato:.003,rate:4.6,breath:.03,level:.09},
 // Bright and breathy with quick vibrato.
 whistle:{body:'sine',edge:.05,vibrato:.007,rate:6,breath:.035,level:.086}
};
// Reeds and brass from fixed harmonic recipes (sine amplitudes 1..n) through a low-pass.
// `detune` stacks oscillators (the accordion's beating musette); `bloom` opens the filter on
// the attack (the tuba's "oom").
const REEDS={
 clarinet:{harmonics:[1,0,.45,0,.25,0,.12,0,.06],detune:[0],cutoff:2400,level:.085,attack:.03,release:.14,vibrato:.003},
 accordion:{harmonics:[1,.6,.45,.35,.25,.2,.12,.08],detune:[-7,7],cutoff:3200,level:.094,attack:.025,release:.1,vibrato:0},
 tuba:{harmonics:[1,.55,.25,.12],detune:[0],cutoff:500,bloom:900,level:.155,attack:.03,release:.1,vibrato:0}
};
// Marimba: a fundamental and two fast-fading overtones, as on a tuned bar.
const MALLET={partials:[[1,1,.45],[3.9,.2,.06],[9.2,.05,.025]],level:.115};

export function createVoices(ctx){
 // Noise sources loop, so a random start offset never runs a long breath or hit off the buffer's end.
 const sr=ctx.sampleRate,noiseBuffer=ctx.createBuffer(1,sr*2,sr),noise=noiseBuffer.getChannelData(0);
 for(let i=0;i<noise.length;i++)noise[i]=Math.random()*2-1;
 const strings=new Map(),waves=new Map();

 // One table per preset and three semitones, retuned by playback rate. The averaging filter delays
 // the loop by half a sample, so the table's true pitch is sr/(P+.5).
 function stringTable(name,midi){
  const base=Math.floor(midi/3)*3,key=name+base;if(strings.has(key))return strings.get(key);
  const p=STRINGS[name],period=Math.max(2,Math.round(sr/midiToFreq(base)-.5)),length=Math.ceil(sr*p.length),buffer=ctx.createBuffer(1,length,sr),data=buffer.getChannelData(0);
  let soft=0;for(let i=0;i<period;i++){soft+=p.soft*((Math.random()*2-1)-soft);const x=i/(period*(p.width||1));data[i]=(x<1?p.hump*Math.sin(Math.PI*x):0)+p.noise*soft;}
  const decay=p.decay-Math.max(0,base-72)*.0002;let peak=0;
  for(let i=period;i<length;i++){data[i]=decay*.5*(data[i-period]+(i>period?data[i-period-1]:0));}
  for(let i=0;i<length;i++)peak=Math.max(peak,Math.abs(data[i]));
  if(peak)for(let i=0;i<length;i++)data[i]/=peak;
  // Fade the table's last quarter second, so a note that outlives it ends silently instead of cutting off.
  const fade=Math.floor(sr*.25);for(let i=0;i<fade;i++)data[length-1-i]*=i/fade;
  const table={buffer,freq:sr/(period+.5),seconds:p.length};strings.set(key,table);return table;
 }
 function reedWave(name){
  if(!waves.has(name)){const harmonics=REEDS[name].harmonics,imag=new Float32Array([0,...harmonics]);waves.set(name,ctx.createPeriodicWave(new Float32Array(imag.length),imag));}
  return waves.get(name);
 }

 function envelope(time,peak,attack,hold,release){
  const gain=ctx.createGain();gain.gain.value=0;gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(peak,time+attack);
  gain.gain.setValueAtTime(peak,time+Math.max(attack,hold));gain.gain.exponentialRampToValueAtTime(.0001,time+Math.max(attack,hold)+release);return gain;
 }
 const osc=(type,freq,time,end)=>{const node=ctx.createOscillator();node.type=type;node.frequency.value=freq;node.start(time);node.stop(end);return node;};
 // Vibrato that waits, then fades in, so short notes stay steady.
 function vibrato(time,hold,end,freq,width,rate,targets){
  if(!width)return;const lfo=osc('sine',rate,time,end),depth=ctx.createGain();
  depth.gain.value=0;depth.gain.setValueAtTime(0,time);depth.gain.linearRampToValueAtTime(0,time+Math.min(.3,hold*.5));depth.gain.linearRampToValueAtTime(freq*width,time+Math.min(.7,hold));
  lfo.connect(depth);for(const target of targets)depth.connect(target);
 }

 const string=p=>name=>({time,midi,dur,vel},out)=>{
  const table=stringTable(name,midi),rate=midiToFreq(midi)/table.freq,playable=table.seconds/rate,source=ctx.createBufferSource(),ring=Math.min(Math.max(dur,p.ring),playable-.6),gain=ctx.createGain();
  source.buffer=table.buffer;source.playbackRate.value=rate;
  // A short fade-in: the string table starts at full amplitude, which clicks without it.
  gain.gain.value=0;gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(p.level*vel,time+.006);gain.gain.setTargetAtTime(0,time+ring,.12);
  source.connect(gain).connect(out);source.start(time);source.stop(time+Math.min(ring+1,playable));
 };
 // Decay and release are both setTargetAtTime curves (mixing them with ramps makes the gain jump),
 // and the oscillators run until the release is ~8 time constants down, so notes end silently.
 const fm=p=>({time,midi,dur,vel},out)=>{
  const freq=midiToFreq(midi),attack=p.attack||.006,release=time+Math.max(dur,p.minDur),end=release+Math.max(.5,8*p.releaseTau);
  const carrier=osc('sine',freq,time,end),mod=osc('sine',freq*p.ratio,time,end),depth=ctx.createGain();
  depth.gain.setValueAtTime(freq*p.index,time);depth.gain.exponentialRampToValueAtTime(freq*p.indexEnd,time+p.indexTime);
  const gain=ctx.createGain();gain.gain.value=0;gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(p.level*vel,time+attack);
  gain.gain.setTargetAtTime(p.level*p.sustain*vel,time+attack,p.decayTau);gain.gain.setTargetAtTime(0,release,p.releaseTau);
  mod.connect(depth).connect(carrier.frequency);carrier.connect(gain);
  if(p.tremolo){const trem=ctx.createGain(),lfo=osc('sine',p.tremolo.rate,time,end),lfoDepth=ctx.createGain();trem.gain.value=1-p.tremolo.depth;lfoDepth.gain.value=p.tremolo.depth;lfo.connect(lfoDepth).connect(trem.gain);gain.connect(trem).connect(out);}
  else gain.connect(out);
 };
 const wind=p=>({time,midi,dur,vel},out)=>{
  const freq=midiToFreq(midi),hold=Math.max(dur,.25),end=time+hold+.5,body=osc(p.body,freq,time,end),edge=osc('triangle',freq*2,time,end);
  vibrato(time,hold,end,freq,p.vibrato,p.rate,[body.frequency,edge.frequency]);
  // A 25 ms swell: long enough not to click, short enough that the note lands on the beat.
  const gain=envelope(time,p.level*vel,.025,hold,.2),edgeGain=ctx.createGain();edgeGain.gain.value=p.edge;
  const breath=ctx.createBufferSource(),band=ctx.createBiquadFilter(),breathGain=envelope(time,p.breath*vel,.03,.05,Math.max(.15,hold));
  breath.buffer=noiseBuffer;breath.loop=true;band.type='bandpass';band.frequency.value=freq*2;band.Q.value=1.5;breath.connect(band).connect(breathGain).connect(out);breath.start(time,Math.random());breath.stop(end);
  body.connect(gain);edge.connect(edgeGain).connect(gain);gain.connect(out);
 };
 const reed=p=>name=>({time,midi,dur,vel},out)=>{
  const freq=midiToFreq(midi),hold=Math.max(dur,.2),end=time+hold+p.release+.1,filter=ctx.createBiquadFilter(),gain=envelope(time,p.level*vel,p.attack,hold,p.release);
  filter.type='lowpass';filter.Q.value=.6;filter.frequency.setValueAtTime(p.cutoff,time);
  if(p.bloom){filter.frequency.linearRampToValueAtTime(p.bloom,time+p.attack+.02);filter.frequency.linearRampToValueAtTime(p.cutoff,time+p.attack+.2);}
  const bodies=p.detune.map(cents=>{const node=osc('sine',freq,time,end);node.setPeriodicWave(reedWave(name));node.detune.value=cents;node.connect(filter);return node;});
  vibrato(time,hold,end,freq,p.vibrato,5,bodies.map(node=>node.frequency));
  filter.connect(gain).connect(out);
 };
 const mallet=({time,midi,vel},out)=>{
  const freq=midiToFreq(midi),end=time+8*MALLET.partials[0][2]+.1;
  for(const [ratio,amount,tau] of MALLET.partials){
   if(freq*ratio>sr/2.2)continue;
   const partial=osc('sine',freq*ratio,time,end),gain=ctx.createGain();
   gain.gain.value=0;gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(MALLET.level*amount*vel,time+.004);gain.gain.setTargetAtTime(0,time+.004,tau);
   partial.connect(gain).connect(out);
  }
 };

 const voices={
  ...Object.fromEntries(Object.entries(STRINGS).map(([name,p])=>[name,string(p)(name)])),
  ...Object.fromEntries(Object.entries(FM).map(([name,p])=>[name,fm(p)])),
  ...Object.fromEntries(Object.entries(WINDS).map(([name,p])=>[name,wind(p)])),
  ...Object.fromEntries(Object.entries(REEDS).map(([name,p])=>[name,reed(p)(name)])),
  marimba:mallet,
  bass({time,midi,dur,vel},out){
   const freq=midiToFreq(midi),hold=Math.max(dur,.3),end=time+hold+.4,body=osc('triangle',freq,time,end),sub=osc('sine',freq,time,end),filter=ctx.createBiquadFilter();
   filter.type='lowpass';filter.frequency.value=Math.min(900,freq*5);
   const gain=ctx.createGain();gain.gain.value=0;gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(.09*vel,time+.012);gain.gain.exponentialRampToValueAtTime(.035*vel,time+hold);gain.gain.exponentialRampToValueAtTime(.0001,end);
   body.connect(filter);sub.connect(filter);filter.connect(gain).connect(out);
  },
  // A chord of slightly detuned saws through a slowly opening low-pass.
  pad({time,midis,dur,vel},out){
   const attack=Math.min(1.6,dur*.4),end=time+dur+2,filter=ctx.createBiquadFilter(),gain=ctx.createGain(),level=.035*vel;
   filter.type='lowpass';filter.Q.value=.5;filter.frequency.setValueAtTime(500,time);filter.frequency.linearRampToValueAtTime(1300,time+attack);filter.frequency.linearRampToValueAtTime(800,time+dur);
   gain.gain.value=0;gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(level,time+attack);gain.gain.setValueAtTime(level,time+dur-.1);gain.gain.setTargetAtTime(0,time+dur-.1,.6);
   for(const midi of midis)for(const cents of [-7,7]){const node=osc('sawtooth',midiToFreq(midi),time,end);node.detune.value=cents;node.connect(filter);}
   filter.connect(gain).connect(out);
  },
  // See DRUM_KIT. Kit attacks are 4–6 ms: anything faster reads as a click at these levels.
  drum({time,drum,vel},out){
   if(drum==='k'){const body=osc('sine',95,time,time+.35),gain=envelope(time,.4*vel,.006,.01,.25);body.frequency.setValueAtTime(95,time);body.frequency.exponentialRampToValueAtTime(48,time+.12);body.connect(gain).connect(out);return;}
   if(drum==='w'){const body=osc('sine',760,time,time+.15),gain=envelope(time,.11*vel,.004,.006,.08);body.frequency.setValueAtTime(760,time);body.frequency.exponentialRampToValueAtTime(640,time+.08);body.connect(gain).connect(out);return;}
   if(drum==='g'){const end=time+2.4;for(const [freq,amount] of [[2600,1],[6900,.3]]){const ting=osc('sine',freq,time,end),gain=ctx.createGain();gain.gain.value=0;gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(.035*amount*vel,time+.004);gain.gain.setTargetAtTime(0,time+.004,.3);ting.connect(gain).connect(out);}return;}
   const noisy=(type,freq,q,peak,attack,hold,release,length)=>{const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=envelope(time,peak*vel,attack,hold,release);source.buffer=noiseBuffer;source.loop=true;filter.type=type;filter.frequency.value=freq;filter.Q.value=q;source.connect(filter).connect(gain).connect(out);source.start(time,Math.random());source.stop(time+length);};
   if(drum==='h'){noisy('bandpass',2800,.7,.06,.012,.02,.12,.2);return;}
   // The shaker is a soft band of noise with a swelling attack, a "shh" rather than a tick.
   if(drum==='s'){noisy('bandpass',4200,.9,.08,.018,.012,.08,.15);return;}
   // Tambourine: bright jingles that ring a little longer than the shaker.
   if(drum==='t'){noisy('bandpass',7500,1.6,.07,.005,.02,.18,.3);return;}
   const low=drum==='x',body=osc('sine',low?120:240,time,time+.5),gain=ctx.createGain();
   body.frequency.setValueAtTime(low?120:240,time);body.frequency.exponentialRampToValueAtTime(low?52:160,time+.18);
   gain.gain.value=0;gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime((low?.3:.17)*vel,time+.004);gain.gain.exponentialRampToValueAtTime(.0001,time+(low?.42:.22));
   noisy('bandpass',low?500:1800,1,low?.06:.08,.004,.005,.05,.12);
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
 // Builds string tables ahead of time so the first notes don't pay for them.
 function warm(voice,midis){if(STRINGS[voice])for(const midi of midis)stringTable(voice,midi);}
 return {voices,impulse,warm};
}
