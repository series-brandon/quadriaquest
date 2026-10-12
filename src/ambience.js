// Ambience: a profile per place (areas set `ambience`; the splash and the opening choose their
// own) made of occasional one-shot sounds and an optional continuous bed. Beds crossfade when the
// profile changes; one-shots run on randomized timers. Birds go quiet during fights. A profile's
// `reverb` sends its sounds into a generated cave space (Cinderhold).
//
// Avoid anything periodic: steady oscillator wobbles repeat audibly within seconds. Movement comes
// from random walks (new targets at random times) and randomized one-shots instead.
//
// Click rules as for effects: attacks of at least 4 ms, envelopes reach silence before stopping.
// Every envelope gain is set to 0 when created, before its automation: a gain node starts at 1,
// and a setValueAtTime(0) at the same instant a source starts lands a sample late in Chrome, so
// a noise source would begin with a one-sample spike.
export const AMBIENT_SOUNDS={
 wind:'Wind gust',chirp:'Bird chirps',call:'Bird call',trill:'Bird trill',insect:'Crickets',bubble:'Brook (a run of bubbles)',
 clink:'Distant anvil',drip:'Water drip',rubble:'Falling stones and dirt'
};
// [min, max] seconds between each one-shot; `bed` is a continuous layer; `reverb` (0–1) is the
// cave send.
export const AMBIENCE_PROFILES={
 none:{label:'Silence'},
 breeze:{label:'Breeze (splash)',sounds:{wind:[9,16]}},
 meadow:{label:'Meadow (clearing, Gelton)',sounds:{wind:[10,18],chirp:[4,10],call:[8,16],trill:[12,22],insect:[8,16]}},
 // Each brook one-shot spans about a second of bubbles, so back-to-back timers keep it flowing.
 river:{label:'River (Willowbank)',bed:'water',sounds:{bubble:[.8,1.2],chirp:[5,11],call:[9,18]}},
 // Rock and stone rather than open air, in a cave-like space: drips, trickling stones, a smith at
 // work somewhere.
 forge:{label:'Stone town (Cinderhold)',reverb:.75,sounds:{drip:[2,6],rubble:[12,24],clink:[7,14]}}
};
const BIRDS=new Set(['chirp','call','trill']);
const BED_FADE=2.5;

export function createAmbience(ctx,out){
 // Noise sources loop: a random start offset plus a long sound would otherwise run off the end
 // of the buffer and cut out mid-swell.
 const sr=ctx.sampleRate,noiseBuffer=ctx.createBuffer(1,sr*4,sr),data=noiseBuffer.getChannelData(0);
 for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
 let profile='none',timers={},bed=null,flow=1;
 // Everything goes through `bus`: straight out, and into the cave reverb at the profile's level.
 const bus=ctx.createGain(),cave=ctx.createConvolver(),wet=ctx.createGain();
 cave.buffer=caveImpulse();wet.gain.value=0;bus.connect(out);bus.connect(cave).connect(wet).connect(out);

 // A stone room: a few early reflections, then a dense, dark tail of about two seconds.
 function caveImpulse(seconds=2){
  const length=Math.ceil(sr*seconds),buffer=ctx.createBuffer(2,length,sr);
  for(let channel=0;channel<2;channel++){
   const d=buffer.getChannelData(channel);let smooth=0;
   for(const [ms,level] of [[19,.5],[31+channel*6,.38],[53-channel*5,.28],[79+channel*3,.2]])d[Math.floor(sr*ms/1000)]+=level*(channel?-1:1);
   for(let i=Math.floor(sr*.03);i<length;i++){const t=i/length;smooth+=(.45-t*.35)*((Math.random()*2-1)-smooth);d[i]+=.6*smooth*(1-t)**3;}
  }
  return buffer;
 }

 function envelope(start,level,attack,hold,end){
  const gain=ctx.createGain();gain.gain.value=0;gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(level,start+attack);
  gain.gain.setValueAtTime(level,start+Math.max(attack,hold));gain.gain.exponentialRampToValueAtTime(.0001,end);return gain;
 }
 // Sounds come from a random place in the stereo field.
 function placed(pan){if(!ctx.createStereoPanner)return bus;const node=ctx.createStereoPanner();node.pan.value=pan;node.connect(bus);return node;}
 function tone(freq,{at=0,dur=.2,level=.04,glide=freq,vibrato=0,dest=bus,attack=.008}){
  const start=ctx.currentTime+at,end=start+dur,osc=ctx.createOscillator();osc.frequency.setValueAtTime(freq,start);osc.frequency.exponentialRampToValueAtTime(glide,end);
  if(vibrato){const lfo=ctx.createOscillator(),depth=ctx.createGain();lfo.frequency.value=vibrato.rate;depth.gain.value=vibrato.depth;lfo.connect(depth).connect(osc.frequency);lfo.start(start);lfo.stop(end+.05);}
  osc.connect(envelope(start,level,attack,0,end)).connect(dest);osc.start(start);osc.stop(end+.05);
 }
 // A short band of noise (falling grit, splashes); noise attacks stay at 8 ms or more.
 function grit(freq,{at=0,dur=.04,level=.02,q=1.5,dest=bus,attack=.008,type='bandpass'}){
  const start=ctx.currentTime+at,end=start+dur,source=ctx.createBufferSource(),filter=ctx.createBiquadFilter();
  source.buffer=noiseBuffer;source.loop=true;filter.type=type;filter.frequency.value=freq;filter.Q.value=q;
  source.connect(filter).connect(envelope(start,level,attack,0,end)).connect(dest);source.start(start,Math.random()*3);source.stop(end+.05);
 }
 const sounds={
  // A slow swell of wind through a drifting band.
  wind(){const start=ctx.currentTime,dur=4+Math.random()*2,source=ctx.createBufferSource(),filter=ctx.createBiquadFilter();
   source.buffer=noiseBuffer;source.loop=true;filter.type='bandpass';filter.Q.value=.6;filter.frequency.setValueAtTime(380,start);filter.frequency.linearRampToValueAtTime(650+Math.random()*250,start+dur*.5);filter.frequency.linearRampToValueAtTime(420,start+dur);
   source.connect(filter).connect(envelope(start,.09,dur*.4,dur*.55,start+dur)).connect(placed((Math.random()-.5)*.8));source.start(start,Math.random()*2);source.stop(start+dur+.05);},
  chirp(){const dest=placed((Math.random()-.5)*1.2),base=1500+Math.random()*500;for(let i=0;i<3;i++)tone(base,{at:i*.2,dur:.15,level:.035,glide:base*1.6,dest});},
  // Two falling whistled notes, like a chickadee.
  call(){const dest=placed((Math.random()-.5)*1.2),high=2600+Math.random()*300;tone(high,{dur:.28,level:.03,dest,vibrato:{rate:28,depth:20}});tone(high*.8,{at:.34,dur:.32,level:.028,dest,vibrato:{rate:28,depth:18}});},
  // A quick warble.
  trill(){const dest=placed((Math.random()-.5)*1.2),freq=3000+Math.random()*600;tone(freq,{dur:.5,level:.022,glide:freq*.9,dest,vibrato:{rate:22,depth:260}});},
  // About a second of brook: bubbles (short sines whose pitch rises as they surface) at random
  // times, pitches, levels and places. `flow` wanders slowly, so the brook gets busier and calmer.
  bubble(){
   flow=Math.max(.5,Math.min(1.6,flow+(Math.random()-.5)*.35));
   const count=Math.round((3+Math.random()*5)*flow);
   for(let i=0;i<count;i++){
    const freq=450*2**(Math.random()*1.7),at=Math.random()*1.1,dur=.025+Math.random()*.05;
    tone(freq,{at,dur,level:(.006+Math.random()*.012)*(freq<900?1:.7),glide:freq*(1.4+Math.random()*.9),dest:placed((Math.random()-.5)*1.4),attack:.004});
   }
  },
  // One plink: a short sine that leaps up in pitch, the sound of a drop landing in a pool.
  drip(){const freq=900+Math.random()*700;tone(freq,{dur:.07,level:.03,glide:freq*2.3,dest:placed((Math.random()-.5)*1.4),attack:.004});},
  // A few pebbles skittering down, speeding up, over a soft hiss of dirt.
  // Dull and distant (low-passed, slow-ish attacks): bright pebble ticks read as clicks.
  rubble(){const dest=ctx.createBiquadFilter(),count=4+Math.floor(Math.random()*5);dest.type='lowpass';dest.frequency.value=1800;dest.connect(placed((Math.random()-.5)*1.2));let at=0;
   for(let i=0;i<count;i++){grit(900+Math.random()*900,{at,dur:.07,level:.03*(1-i/count*.6),q:1.2,dest,attack:.014});at+=.14*(1-i/count)+.04;}
   grit(700,{dur:.7,level:.014,q:.5,dest,attack:.08,type:'lowpass'});},
  insect(){const dest=placed((Math.random()-.5)*1.4);for(let i=0;i<4;i++)tone(4200,{at:i*.11,dur:.05,level:.015,dest,attack:.006});},
  // Far-off hammering: a muffled metallic ring, two or three strikes.
  clink(){const dest=placed((Math.random()-.5)*.9),filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=2200;filter.connect(dest);const strikes=2+Math.floor(Math.random()*2);
   for(let s=0;s<strikes;s++)for(const [freq,level] of [[1250,.022],[3350,.008]])tone(freq*(.97+Math.random()*.06),{at:s*.55,dur:.6,level,dest:filter,attack:.005});}
 };
 // Continuous beds: looped noise through moving filters, faded in and out on profile changes.
 function startBed(kind){
  const start=ctx.currentTime,source=ctx.createBufferSource(),gain=ctx.createGain(),nodes=[source];source.buffer=noiseBuffer;source.loop=true;
  gain.gain.value=0;gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(1,start+BED_FADE);gain.connect(bus);
  // The water bed is only a soft, low wash under the bubbles. Its tone and level wander by random
  // walk (new targets at random times), never on a cycle.
  const filter=ctx.createBiquadFilter(),level=ctx.createGain();filter.type='lowpass';filter.Q.value=.3;filter.frequency.value=520;level.gain.value=.012;
  source.connect(filter).connect(level).connect(gain);source.start(start,Math.random()*3);
  let next=0;
  return {kind,gain,
   update(dt){next-=dt;if(next>0)return;next=1.5+Math.random()*2.5;const now=ctx.currentTime;
    filter.frequency.setTargetAtTime(380+Math.random()*380,now,1.2);level.gain.setTargetAtTime(.009+Math.random()*.005,now,1.2);},
   stop(){const now=ctx.currentTime;gain.gain.cancelScheduledValues(now);gain.gain.setValueAtTime(gain.gain.value,now);gain.gain.linearRampToValueAtTime(0,now+BED_FADE);for(const node of nodes)node.stop(now+BED_FADE+.1);setTimeout(()=>gain.disconnect(),(BED_FADE+.5)*1000);}};
 }
 function setProfile(next){
  if(next===profile)return;profile=next;const spec=AMBIENCE_PROFILES[next]||AMBIENCE_PROFILES.none;
  // Stagger the first sounds so a new place doesn't open with everything at once.
  timers=Object.fromEntries(Object.entries(spec.sounds||{}).map(([kind,[min,max]])=>[kind,min*.3+Math.random()*(max-min)]));
  if(bed?.kind!==spec.bed){bed?.stop();bed=spec.bed?startBed(spec.bed):null;}
  wet.gain.setTargetAtTime(spec.reverb||0,ctx.currentTime,.8);
 }
 return {
  // Called each frame with the place's profile id; `combat` silences the birds.
  update(dt,next,{combat=false}={}){
   setProfile(AMBIENCE_PROFILES[next]?next:'none');const spec=AMBIENCE_PROFILES[profile];bed?.update(dt);
   for(const kind of Object.keys(timers)){
    timers[kind]-=dt;if(timers[kind]>0)continue;
    const [min,max]=spec.sounds[kind];timers[kind]=min+Math.random()*(max-min);
    if(!(combat&&BIRDS.has(kind)))sounds[kind]();
   }
  },
  play(kind){sounds[kind]?.();},
  get profile(){return profile;},
  stop(){setProfile('none');}
 };
}
