import {createMusicPlayer,createMusicState} from '../music-player.js';
import {LAYERS} from '../music-theory.js';
import {createSoundEffects} from '../sound-effects.js';
import {createAmbience} from '../ambience.js';

// Dev-only click check: renders the real player offline, dry (reverb and compressor swapped for
// plain gains so nothing masks a fault), and flags waveform discontinuities: a second difference
// that is large absolutely, against the local peak, and against the roughness around it.
// A cut-off envelope or a full-level note start shows up here; steady tones, even bright high
// ones (whose second differences are large but even), don't. Abrupt level drops (noise cut off
// mid-sound) are flagged separately.
// MIN_JUMP sits above the winds' breath chiff (~.015) and below real faults (.035 and up).
const SAMPLE_RATE=44100,BLOCK=128,MIN_JUMP=.02,MIN_RATIO=.1,MIN_SPIKE=6;
// Noise-based layers (shaker, brush, tambourine) are discontinuous by nature and would always flag.
const SKIPPED_LAYERS=new Set(['perc','combat']);

export function findClicks(data,{sampleRate=SAMPLE_RATE,ignoreBefore=.15}={}){
 const count=Math.ceil(data.length/BLOCK),blocks=new Float32Array(count),bends=new Float32Array(count);
 for(let i=0;i<data.length;i++){const level=Math.abs(data[i]);if(level>blocks[i/BLOCK|0])blocks[i/BLOCK|0]=level;if(i>1)bends[i/BLOCK|0]+=Math.abs(data[i]-2*data[i-1]+data[i-2])/BLOCK;}
 const clicks=[];let last=-Infinity;
 for(let n=Math.max(2,Math.floor(ignoreBefore*sampleRate));n<data.length;n++){
  const jump=Math.abs(data[n]-2*data[n-1]+data[n-2]);if(jump<MIN_JUMP)continue;
  const b=n/BLOCK|0,peak=Math.max(blocks[b-1]||0,blocks[b],blocks[b+1]||0);
  if(jump/(peak+1e-6)<MIN_RATIO)continue;
  // Roughness is relative to level, so noise swelling in (rough at any level) isn't a spike, but a
  // smooth tone cut or started at full level is.
  const rough=i=>(blocks[i]||0)>1e-4?bends[i]/blocks[i]:0,around=(rough(b-2)+rough(b-1)+rough(b+1)+rough(b+2))/4;
  if(jump/(peak+1e-6)<MIN_SPIKE*around)continue;
  if(n-last>sampleRate*.01)clicks.push({time:n/sampleRate,jump});
  last=n;
 }
 // Cut-offs: a sound that drops more than 20 dB from one ~23 ms window to the next while it was
 // steady or rising. Noise stopping mid-swell has no single spike, but it can't fall this fast
 // through any envelope the voices use. Windows span a low bass note's whole cycle, so a slow
 // wave's zero crossings don't look like drops; a fade's tail is already falling, so it's skipped.
 // A fade-out faster than ~25 ms from a steady level counts as a cut-off (it nearly sounds like one).
 const WINDOW=8,level=(from,to)=>{let peak=0;for(let i=Math.max(0,from);i<Math.min(count,to);i++)peak=Math.max(peak,blocks[i]);return peak;};
 const first=Math.max(2*WINDOW,Math.ceil(ignoreBefore*sampleRate/BLOCK));
 for(let b=first;b<count-WINDOW;b++){
  const before=level(b-WINDOW,b),earlier=level(b-2*WINDOW,b-WINDOW),after=level(b+1,b+1+WINDOW);
  // Steady: playing at a similar level a window earlier too, so a percussive hit that rises from
  // silence and decays fast isn't mistaken for a cut-off.
  if(before>MIN_JUMP&&earlier>before*.5&&earlier<before*1.25&&after<before*.1&&!clicks.some(c=>Math.abs(c.time-b*BLOCK/sampleRate)<.03))clicks.push({time:b*BLOCK/sampleRate,jump:before,cut:true});
 }
 return clicks.sort((x,y)=>x.time-y.time);
}

function offline(seconds){
 const ctx=new OfflineAudioContext(1,Math.ceil(SAMPLE_RATE*seconds),SAMPLE_RATE);
 ctx.createConvolver=()=>ctx.createGain();
 ctx.createDynamicsCompressor=()=>Object.assign(ctx.createGain(),{threshold:{},knee:{},ratio:{},attack:{},release:{}});
 return ctx;
}

// One song, each melodic layer on its own so a click names its layer.
export async function checkSong(songId,{arrangement='cozy',style='mix',seconds=45}={}){
 const results={};
 for(const layer of LAYERS.filter(layer=>!SKIPPED_LAYERS.has(layer))){
  const ctx=offline(seconds),state=createMusicState();
  state.options.arrangement.value=arrangement;state.options.style.value=style;state.options.seed.value=1;
  for(const other of LAYERS)state.options.muted[other]=other!==layer;
  const player=createMusicPlayer(ctx,ctx.destination,{state});player.update(songId,false);player.tick(seconds);
  results[layer]=findClicks((await ctx.startRendering()).getChannelData(0));
 }
 return results;
}

// One instrument's audition phrase (or the drum kit's tonal pieces).
export async function checkInstrument(voice){
 const ctx=offline(12),player=createMusicPlayer(ctx,ctx.destination,{state:createMusicState()});
 player.audition(voice,{skipNoise:true});
 return findClicks((await ctx.startRendering()).getChannelData(0),{ignoreBefore:0});
}

// One sound effect or cue (cues use the default palette: a celesta in D major).
export async function checkEffect(kind,arg=.5){
 const ctx=offline(4),player=createMusicPlayer(ctx,ctx.destination,{state:createMusicState()});
 createSoundEffects(ctx,ctx.destination,{voices:player.voices,palette:player.palette}).play(kind,arg);
 return findClicks((await ctx.startRendering()).getChannelData(0),{ignoreBefore:0});
}

// One ambient one-shot (wind, a bird, crickets…).
export async function checkAmbient(kind){
 const ctx=offline(7);createAmbience(ctx,ctx.destination).play(kind);
 return findClicks((await ctx.startRendering()).getChannelData(0),{ignoreBefore:0});
}

export function describeClicks(results){
 const lines=Object.entries(results).filter(([,clicks])=>clicks.length).map(([layer,clicks])=>`${layer}: ${clicks.length} at ${clicks.slice(0,4).map(c=>c.time.toFixed(2)+'s').join(', ')}${clicks.length>4?'…':''}`);
 return lines.length?'Clicks found. '+lines.join('; '):'No clicks found.';
}
