// Pure music helpers: scales, pattern parsing and section rendering. No Web Audio here, so songs
// can be validated and arranged in node tests; music-player.js turns the events into sound.
//
// Pattern strings have one space-separated token per step ("|" is ignored, for readability):
//   melody/drift  scale degrees 1–7; each ' raises an octave and each , lowers one ("5," "1'")
//   bass/arp      chord tones: r root, t third, f fifth, o octave, e the chord's extension (7th/9th,
//                 or the octave on a plain triad); same ' and , marks
//   comp          c the whole chord (root below, the rest in one octave), l a light hit on its upper notes
//   drums         x low drum, o high drum, s shaker, k soft kick, w woodblock, h brush,
//                 t tambourine, g triangle (music-voices.js DRUM_KIT)
//   -  holds the previous note    .  rest
//
// Chords are scale degrees, optionally with a colour: 4 · '4:7' (diatonic 7th) · '2:9' · '1:add9'
// · '5:sus4' · '5:sus2' · '1:6'. Diatonic, so '4:7' in a major key is a major seventh.

export const MODES={
 ionian:[0,2,4,5,7,9,11],dorian:[0,2,3,5,7,9,10],phrygian:[0,1,3,5,7,8,10],lydian:[0,2,4,6,7,9,11],
 mixolydian:[0,2,4,5,7,9,10],aeolian:[0,2,3,5,7,8,10]
};
const CHORD_TONES=new Set(['r','t','f','o','e']);
const DRUMS=new Set(['x','o','s','k','w','h','t','g']);
const HITS=new Set(['c','l']);
const COLOURS={'':[0,2,4],7:[0,2,4,6],9:[0,2,4,6,8],add9:[0,2,4,8],sus4:[0,3,4],sus2:[0,1,4],6:[0,2,4,5]};
// Each layer has its own gain in the player, so the lab can mute it and combat can fade in.
export const LAYERS=['pad','comp','bass','arp','melody','drift','perc','combat'];

export const midiToFreq=midi=>440*2**((midi-69)/12);

// Degree 1 is the root; degrees past 7 (or below 1) wrap into neighbouring octaves.
export function degreeMidi(root,mode,degree){
 const scale=MODES[mode]||MODES.ionian,i=degree-1,octave=Math.floor(i/7);
 return root+octave*12+scale[((i%7)+7)%7];
}

// Small seeded generator (mulberry32) so a seed reproduces an arrangement exactly.
export function seededRandom(seed){
 let a=seed>>>0;
 return ()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
}

function octaveShift(marks){let shift=0;for(const mark of marks)shift+=mark==="'"?1:-1;return shift;}

// One token per step: {note} | 'hold' | 'rest'. Throws on anything unknown so song typos fail tests.
export function parseTokens(pattern,kind='melody'){
 const out=[];
 for(const token of String(pattern).split(/\s+/)){
  if(!token||token==='|')continue;
  if(token==='-'){out.push('hold');continue;}
  if(token==='.'){out.push('rest');continue;}
  if(kind==='drum'){if(!DRUMS.has(token))throw Error(`Unknown drum token "${token}"`);out.push({drum:token});continue;}
  if(kind==='comp'){if(!HITS.has(token))throw Error(`Unknown comp token "${token}"`);out.push({light:token==='l'});continue;}
  const match=/^([1-7rtfoe])([',]*)$/.exec(token);
  if(!match)throw Error(`Unknown ${kind} token "${token}"`);
  const [,head,marks]=match,shift=octaveShift(marks);
  if(kind==='melody'){if(!/[1-7]/.test(head))throw Error(`Melody needs degrees, got "${token}"`);out.push({degree:Number(head)+shift*7});}
  else{if(!CHORD_TONES.has(head))throw Error(`Chord pattern needs r/t/f/o/e, got "${token}"`);out.push({tone:head,shift});}
 }
 return out;
}

// Steps → notes with lengths. A hold extends the note before it; a rest ends it.
export function stepsToNotes(tokens){
 const notes=[];let current=null;
 tokens.forEach((token,step)=>{
  if(token==='hold'){if(current)current.len++;return;}
  if(token==='rest'){current=null;return;}
  current={step,len:1,...token};notes.push(current);
 });
 return notes;
}

export function parseChord(entry){
 const match=/^([1-7])(?::(7|9|add9|sus4|sus2|6))?$/.exec(String(entry));
 if(!match)throw Error(`Unknown chord "${entry}"`);
 return {degree:Number(match[1]),tones:COLOURS[match[2]??'']};
}

// A chord-pattern token as a scale degree. t and f follow sus chords; e is the top colour tone.
export function chordTone(chord,{tone,shift}){
 const tones=chord.tones,offset=tone==='r'?0:tone==='t'?tones[1]:tone==='f'?tones[2]:tone==='o'?7:tones.length>3?tones[tones.length-1]:7;
 return chord.degree+offset+shift*7;
}

export function sectionShape(song,section){
 const meter=song.meter||8,chords=(section.chords||[1]).map(parseChord),barsPerChord=section.barsPerChord||1;
 const bars=section.bars||Math.max(section.melody?.length||0,chords.length*barsPerChord);
 return {meter,bars,steps:bars*meter,chordAt:bar=>chords[Math.floor(bar/barsPerChord)%chords.length],chordStart:bar=>bar%barsPerChord===0,barsPerChord};
}

// Places each chord tone in [low, low+12) so consecutive chords move by small steps.
export function voiceChord(song,chord,low){
 return chord.tones.map(offset=>{let midi=degreeMidi(song.root,song.mode,chord.degree+offset);while(midi<low)midi+=12;while(midi>=low+12)midi-=12;return midi;}).sort((a,b)=>a-b);
}

// Seeded ornaments and thinning for repeats, so a theme never plays back identically twice.
export function varyMelody(notes,rng){
 const out=[];
 notes.forEach((note,i)=>{
  const next=notes[i+1];
  // Drop some weak-beat notes by letting the previous note ring through them.
  if(out.length&&note.step%4!==0&&rng()<.12){out[out.length-1].len+=note.len;return;}
  const copy={...note};out.push(copy);
  if(copy.len<2||rng()>.32)return;
  // A passing tone between thirds, otherwise an upper neighbour, on the note's last step.
  const gap=next&&next.step===copy.step+copy.len?next.degree-copy.degree:0;
  const degree=Math.abs(gap)===2?copy.degree+Math.sign(gap):copy.degree+1;
  copy.len--;out.push({step:copy.step+copy.len,len:1,degree});
 });
 return out;
}

// Generative noodling: a few chord tones or colour notes per bar, moving mostly by step.
function driftNotes(song,section,shape,rng){
 const density=section.drift??.35,notes=[],candidates=shape.meter===6?[0,2,3,5]:[0,2,3,4,6];let previous=section.driftCenter??5;
 for(let bar=0;bar<shape.bars;bar++){
  const chord=shape.chordAt(bar),pool=[...new Set([...chord.tones,1,5])].flatMap(o=>[chord.degree+o-7,chord.degree+o,chord.degree+o+7]).filter(d=>d>=1&&d<=10);
  for(const offset of candidates){
   if(rng()>density*(offset===0?1.4:.75))continue;
   const sorted=[...pool].sort((a,b)=>Math.abs(a-previous)-Math.abs(b-previous)),degree=sorted[Math.floor(rng()*Math.min(3,sorted.length))];
   notes.push({step:bar*shape.meter+offset,degree,vel:.55+rng()*.35,dyad:rng()<.18});previous=degree;
  }
 }
 notes.forEach((note,i)=>{const next=notes[i+1];note.len=Math.max(2,Math.min(8,(next?next.step:shape.steps)-note.step));});
 return notes;
}

const DEFAULT_COMBAT={8:{drum:'x . s . o . s x',pulse:'r - . r - . f, .'},6:{drum:'x . s o . s',pulse:'r - . f, - .'}};

// Every note a section plays, in steps from its start. `layer` routes it to that layer's gain.
export function renderSection(song,name,{rng=Math.random,varied=false}={}){
 const section=song.sections[name];if(!section)throw Error(`${song.id}: no section "${name}"`);
 const shape=sectionShape(song,section),events=[],voices=song.voices||{};
 if(section.kind==='rest')return {name,kind:'rest',steps:shape.steps,bars:shape.bars,events};
 const padLow=song.root-12+(song.padOffset||0);
 for(let bar=0;bar<shape.bars;bar++){
  const chord=shape.chordAt(bar),barStep=bar*shape.meter;
  if(section.pad!==false&&shape.chordStart(bar))events.push({layer:'pad',voice:'pad',step:barStep,len:shape.barsPerChord*shape.meter,midis:voiceChord(song,chord,padLow),vel:section.pad??1});
  for(const [layer,pattern,octave] of [['bass',section.bass,-24],['arp',section.arp,-12]]){
   if(!pattern)continue;
   for(const note of stepsToNotes(parseTokens(pattern,'chord')))events.push({layer,voice:voices[layer]||(layer==='bass'?'bass':'pluck'),step:barStep+note.step,len:note.len,midi:degreeMidi(song.root+octave,song.mode,chordTone(chord,note)),vel:layer==='arp'?.75:1});
  }
  if(section.comp){
   // Chord hits as separate notes on a melodic voice: the root an octave below, the rest packed in one octave.
   const low=song.root-8,upper=voiceChord(song,chord,low);let bass=degreeMidi(song.root,song.mode,chord.degree);while(bass>=low)bass-=12;while(bass<low-12)bass+=12;
   for(const note of stepsToNotes(parseTokens(section.comp,'comp'))){
    const midis=note.light?upper.slice(-3):[bass,...upper],vel=(note.light?.5:note.step===0?.8:.65)/Math.sqrt(midis.length);
    for(const midi of midis)events.push({layer:'comp',voice:voices.comp||'keys',step:barStep+note.step,len:note.len,midi,vel});
   }
  }
  if(section.perc)for(const note of stepsToNotes(parseTokens(section.perc,'drum')))events.push({layer:'perc',voice:'drum',drum:note.drum,step:barStep+note.step,len:note.len,vel:note.step===0?1:.8});
  const combat={...DEFAULT_COMBAT[shape.meter],...song.combat};
  if(song.combat!==false){
   for(const note of stepsToNotes(parseTokens(combat.drum,'drum')))events.push({layer:'combat',voice:'drum',drum:note.drum,step:barStep+note.step,len:note.len,vel:note.drum==='s'?.6:1});
   for(const note of stepsToNotes(parseTokens(combat.pulse,'chord')))events.push({layer:'combat',voice:'bass',step:barStep+note.step,len:note.len,midi:degreeMidi(song.root-12,song.mode,chordTone(chord,note)),vel:.55});
  }
 }
 if(section.melody){
  let notes=stepsToNotes(parseTokens(section.melody.join(' '),'melody'));
  let voice=section.voice||voices.melody||'pluck';
  if(varied){notes=varyMelody(notes,rng);if(voices.alt&&rng()<.5)voice=voices.alt;}
  for(const note of notes)events.push({layer:'melody',voice,step:note.step,len:note.len,midi:degreeMidi(song.root,song.mode,note.degree),vel:note.step%accentEvery(song)===0?1:.82});
 }
 if(section.kind==='drift'||section.drift){
  for(const note of driftNotes(song,section,shape,rng)){
   const midi=degreeMidi(song.root,song.mode,note.degree),voice=voices.drift||'keys';
   events.push({layer:'drift',voice,step:note.step,len:note.len,midi,vel:note.vel});
   if(note.dyad)events.push({layer:'drift',voice,step:note.step,len:note.len,midi:degreeMidi(song.root,song.mode,note.degree-2),vel:note.vel*.7});
  }
 }
 events.sort((a,b)=>a.step-b.step);
 return {name,kind:section.kind||'theme',steps:shape.steps,bars:shape.bars,events};
}

// Form entries are section names; a trailing "~" plays a seeded variation. Styles narrow the form
// to written themes or generative drift (rests stay so the music still breathes).
export function arrangement(song,style='mix'){
 const entries=song.form.map(entry=>({name:entry.replace(/~$/,''),varied:entry.endsWith('~')}));
 if(style==='mix')return entries;
 const kept=entries.filter(({name})=>{const kind=song.sections[name].kind||'theme';return kind==='rest'||kind===style;});
 return kept.some(({name})=>song.sections[name].kind!=='rest')?kept:entries;
}

// Steps between accented melody notes: half bars in 4/4, beats in 6/8, whole bars in a 3/4 waltz
// (6 eighths, two per beat), or a song's own `accent`.
export const accentEvery=song=>song.accent??((song.meter||8)===8?4:(song.stepsPerBeat||2)===3?3:6);

export const stepSeconds=song=>60/song.bpm/(song.stepsPerBeat||2);

// Swing delays every off-beat step by a fraction of a step (0 straight, ~.33 a full shuffle).
export const swingOffset=(song,step)=>step%2===1?(song.swing||0)*stepSeconds(song):0;
