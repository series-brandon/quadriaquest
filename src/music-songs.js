// Original compositions as compact data (see music-theory.js for the pattern notation). Each
// song mixes written themes (folk melodies) with drift sections (sparse generated phrases) and
// rests. Areas pick a song by id through their `music` field; menus and the opening use their own.
//
// Chords are scale degrees (1 = tonic triad). Melody bars hold `meter` steps each.

export const SONGS={
 // Title theme: rolling harp under a flute line.
 splash:{
  id:'splash',title:'Over Quadria',root:62,mode:'ionian',bpm:66,meter:8,
  voices:{melody:'flute',alt:'pluck',arp:'pluck',drift:'keys'},combat:false,
  sections:{
   intro:{kind:'theme',chords:[1,6,4,5],arp:'r f o f t\' f o f',bass:'r - - - - - - -',pad:.8},
   a:{kind:'theme',chords:[1,6,4,5,1,6,2,5],arp:'r f o f t\' f o f',bass:'r - - - - - - -',melody:[
    '1 - - 3 5 - - -','6 - 5 - 3 - - -','4 - 6 - 1\' - - 2\'','2\' - - - 1\' 7 - -',
    '1 - - 3 5 - 1\' -','3\' - - 2\' 1\' - 6 -','2\' - - 1\' 6 - 4 -','5 - - - - - . .']},
   drift:{kind:'drift',chords:[1,4,6,5],barsPerChord:2,drift:.3,pad:.9},
   rest:{kind:'rest',bars:2}
  },
  form:['intro','a','drift','a~','rest']
 },
 // The awakening: no written melody, just bells over slow dorian chords.
 intro:{
  id:'intro',title:'Waking',root:62,mode:'dorian',bpm:58,meter:8,
  voices:{drift:'bell'},combat:false,
  sections:{
   drift:{kind:'drift',chords:[1,4,1,7],barsPerChord:2,drift:.28,bass:'r - - - - - - -'},
   rest:{kind:'rest',bars:2}
  },
  form:['drift','rest','drift~','rest']
 },
 // Pastoral D major: plucked theme, flute on repeats, sparse keys between.
 clearing:{
  id:'clearing',title:'Morning Clearing',root:62,mode:'ionian',bpm:80,meter:8,
  voices:{melody:'pluck',alt:'flute',arp:'keys',drift:'keys'},
  sections:{
   open:{kind:'drift',chords:[1,4],barsPerChord:2,drift:.35},
   a:{kind:'theme',chords:[1,4,1,5,1,4,5,1],bass:'r - - - f, - - -',melody:[
    '3 - 5 - 1\' - 7 6','6 - - - 4 - 6 -','5 - 3 - 2 3 5 -','2 - - - - - . .',
    '3 - 5 - 1\' - 2\' -','1\' - 7 6 - - 4 -','5 - 6 - 7 - 2\' -','1\' - - - - - . .']},
   b:{kind:'theme',chords:[6,4,1,5,6,4,2,5],bass:'r - - - r - f, -',arp:'. . r f o . . .',melody:[
    '6 - 1\' - 3\' - 2\' 1\'','1\' - - 6 4 - 6 -','5 - 3 - 5 - 1\' -','7 - - - 5 - - .',
    '6 - 1\' - 3\' - - -','4\' - 3\' - 2\' - 1\' -','2\' - 1\' - 6 - 2\' -','1\' - 7 - - - . .']},
   drift:{kind:'drift',chords:[1,6,4,5],barsPerChord:2,drift:.38},
   rest:{kind:'rest',bars:3}
  },
  form:['open','a','a~','b','a~','drift','rest']
 },
 // Riverside village jig in 6/8: flute lead, harp rolling underneath.
 willowbank:{
  id:'willowbank',title:'Willow Waters',root:67,mode:'ionian',bpm:96,stepsPerBeat:3,meter:6,
  voices:{melody:'flute',alt:'pluck',arp:'pluck',drift:'keys'},
  sections:{
   a:{kind:'theme',chords:[1,4,1,5,1,4,5,1],bass:'r - - f, - -',arp:'r f o f t\' f',melody:[
    '3 - 2 1 - 5,','1 - 3 4 - 6','5 - 3 1 - 3','2 - - 5, - -',
    '3 - 2 1 - 5,','1 - 3 4 - 6','5 - 4 2 - 7,','1 - - - . .']},
   b:{kind:'theme',chords:[6,4,1,5,6,4,5,1],bass:'r - - f, - -',arp:'r f o f t\' f',melody:[
    '6 - 7 1\' - 3\'','1\' - 6 4 - 6','5 - 3 5 - 1\'','2\' - 1\' 7 - 5',
    '6 - 7 1\' - 3\'','4\' - 3\' 1\' - 6','5 - 7 2\' - 1\'','7 - 1\' - - .']},
   drift:{kind:'drift',chords:[1,4,6,5],barsPerChord:2,drift:.4,bass:'r - - - - -'},
   rest:{kind:'rest',bars:4}
  },
  form:['a','a~','b','a~','drift','rest']
 },
 // Forge town in A minor: low plucked theme, bells and hand drums when fighting.
 cinderhold:{
  id:'cinderhold',title:'Cinderhold Embers',root:69,mode:'aeolian',bpm:84,meter:8,
  voices:{melody:'pluck',alt:'flute',drift:'bell'},
  combat:{drum:'x . s x o . s .',pulse:'r - . r - . r .'},
  sections:{
   drift:{kind:'drift',chords:[1,1,6,7],barsPerChord:2,drift:.3,bass:'r - - - - - - -',driftCenter:3},
   a:{kind:'theme',chords:[1,6,7,1,1,4,6,7],bass:'r - - r - - f, -',melody:[
    '1 - - 7, 1 - 3 -','4 - 3 - 1 - 6, -','7, - 2 - 4 - 5 -','3 - - - 1 - - .',
    '5 - 3 - 5 - 6 5','4 - - 3 4 - 6 -','6 - 1\' - 7 6 - -','7, - 2 - 1 - - .']},
   rest:{kind:'rest',bars:3}
  },
  form:['drift','a','a~','drift~','rest']
 }
};

// Cozy arrangements (Stardew Valley is the reference): brisk tempos with a light swing,
// fingerpicked strings and soft piano chords, bouncy bass, soft kit percussion, coloured chords and a close room. Ids match
// SONGS; the player prefers these when the `cozy` arrangement is selected. `mix` scales a song's
// layers relative to the player's defaults. `voices.cue` plays the song's reward cues
// (sound-effects.js), in its key.
export const COZY_SONGS={
 // The open world (tin whistle, kalimba, vibraphone, upright bass; E-flat major): a 3/4 waltz,
 // oom-pah-pah from the bass and vibraphone, a kalimba breather.
 world:{
  id:'world',title:'Open Road',root:63,mode:'ionian',bpm:132,meter:6,reverb:.5,
  voices:{cue:'vibes',melody:'whistle',alt:'kalimba',comp:'vibes',drift:'kalimba'},
  mix:{melody:1.2,comp:1.3,bass:1,perc:.7},
  sections:{
   intro:{kind:'theme',chords:['1:add9','5:7'],pad:false,comp:'. . l - l -',bass:'r - . . . .'},
   a:{kind:'theme',chords:['1:add9','4:7','5','1','6:7','2:7','5:sus4','5'],pad:false,comp:'. . l - l -',bass:'r - . . . .',perc:'k . . . . .',melody:[
    "3 - - 5 1' -",'6 - 5 - 3 -','2 - - 4 7, -','1 - - - . .',
    "3 - - 5 1' -","2' - 1' - 6 -",'5 - - 4 5 -','2 - - - . .']},
   b:{kind:'theme',chords:['4:7','5','3:7','6:7','4:7','5','1:add9','1'],pad:false,comp:'. . l - l -',bass:'r - . . f, .',perc:'k . . . . .',melody:[
    "1' - - 7 6 -",'5 - - 4 2 -','3 - 5 - 7 -','6 - - - 5 -',
    "4 - 6 - 1' -","2' - - 1' 7 -","1' - 3' - 2' -","1' - - - . ."]},
   break:{kind:'drift',chords:['1:add9','4:7','6:7','5'],barsPerChord:2,pad:false,drift:.3,bass:'r - . . . .',perc:'g . . . . .'}
  },
  form:['intro','a','b','a~','break','b~','a~']
 },
 // Title theme (flute, harp, celesta; D major): the original splash tune over rolling harp, and a
 // B section on harp that quotes the clearing's melody so the title and the first area sound related.
 splash:{
  id:'splash',title:'Over Quadria (Cozy)',root:62,mode:'ionian',bpm:100,meter:8,swing:.05,reverb:.55,
  voices:{cue:'harp',melody:'flute',alt:'celesta',comp:'celesta',arp:'harp',drift:'celesta'},combat:false,
  mix:{melody:.9,arp:.35,comp:1,bass:.8},
  sections:{
   intro:{kind:'theme',chords:['1:add9','6:7'],pad:false,arp:"r f o f t' f o f",comp:'c - - - - - - -',bass:'r - - - . . . .',perc:'g . . . . . . .'},
   a:{kind:'theme',chords:['1:add9','6:7','4:7','5','1:add9','6:7','2:7','5'],pad:false,arp:"r f o f t' f o f",comp:'c - - - l - - -',bass:'r - . . f, - . .',perc:'k . . . . . s .',melody:[
    '1 - - 3 5 - - -','6 - 5 - 3 - - -',"4 - 6 - 1' - - 2'","2' - - - 1' 7 - -",
    "1 - - 3 5 - 1' -","3' - - 2' 1' - 6 -","2' - - 1' 6 - 4 -",'5 - - - - - . .']},
   b:{kind:'theme',chords:['1:add9','4:7','6:7','5:sus4','1:add9','4:7','2:7','5'],pad:false,voice:'harp',arp:"r . f o t' . o f",comp:'c - - - l - - -',bass:'r - . . f, - . .',perc:'k . s . . . s .',melody:[
    '1 . 2 3 - 5 . 3','4 - 3 2 - 3 . .','3 . 2 3 - 5 . 6','5 - - - 4 - 2 .',
    "1 . 2 3 - 5 . 1'",'7 - 6 5 - 3 . .','4 - 3 2 . 1 2 3','2 - - - . . . .']},
   break:{kind:'drift',chords:['1:add9','4:7'],barsPerChord:2,pad:false,drift:.25,arp:'r f o f e f o f',comp:'c - - - - - - -',bass:'r - - - . . . .'}
  },
  form:['intro','a','b','a~','break']
 },
 // The opening, waking up (ocarina, harp, celesta; G major): slow and airy in the clearing's key,
 // with the clearing tune's first line on ocarina as a preview.
 intro:{
  id:'intro',title:'Waking (Cozy)',root:67,mode:'ionian',bpm:76,meter:8,reverb:.75,
  voices:{cue:'celesta',melody:'ocarina',comp:'celesta',arp:'harp',drift:'celesta'},combat:false,
  mix:{melody:1.2,arp:1,comp:1,bass:.45},
  sections:{
   drift:{kind:'drift',chords:['1:add9','4:7'],barsPerChord:2,pad:false,drift:.22,arp:'r . . . f . . .',bass:'r - - - - - - -'},
   motif:{kind:'theme',chords:['1:add9','4:7','6:7','5:sus4'],pad:false,arp:'r . . . f . . .',comp:'c - - - - - - -',bass:'r - - - - - - -',melody:[
    '1 . 2 3 - 5 . 3','4 - 3 2 - 3 . .','3 . 2 3 - 5 . 6','5 - - - - - . .']},
   rest:{kind:'rest',bars:2}
  },
  form:['drift','motif','rest','drift~','motif~','rest']
 },
 // Riverside village jig in 6/8 (accordion, banjo, tuba, tambourine; F major): the original tune on
 // accordion over banjo picking and a tuba oom-pah, with tin whistle on some repeats.
 willowbank:{
  id:'willowbank',title:'Willow Waters (Cozy)',root:65,mode:'ionian',bpm:96,stepsPerBeat:3,meter:6,reverb:.45,
  voices:{cue:'kalimba',melody:'accordion',alt:'whistle',arp:'banjo',bass:'tuba',drift:'banjo'},
  mix:{melody:1.1,arp:1,bass:.7,perc:.7},
  sections:{
   a:{kind:'theme',chords:['1:add9','4:7','1','5:sus4','1:add9','4:7','5','1'],pad:false,arp:'r . f o . f',bass:'r - . f, - .',perc:'k . . t . .',melody:[
    '3 - 2 1 - 5,','1 - 3 4 - 6','5 - 3 1 - 3','2 - - 5, - -',
    '3 - 2 1 - 5,','1 - 3 4 - 6','5 - 4 2 - 7,','1 - - - . .']},
   b:{kind:'theme',chords:['6:7','4:7','1:add9','5','6:7','4:7','5:sus4','1'],pad:false,arp:'r . f o . f',bass:'r - . f, - .',perc:'k . s t . s',melody:[
    "6 - 7 1' - 3'","1' - 6 4 - 6","5 - 3 5 - 1'","2' - 1' 7 - 5",
    "6 - 7 1' - 3'","4' - 3' 1' - 6","5 - 7 2' - 1'","7 - 1' - - ."]},
   break:{kind:'drift',chords:['1:add9','4:7','6:7','5'],barsPerChord:2,pad:false,drift:.3,arp:'r f o f e f',bass:'r - - . . .'}
  },
  form:['a','a~','b','a~','break']
 },
 // Forge-town tavern tune (clarinet, marimba, hand drums; A dorian, minor but bright): bouncy bass,
 // marimba oom-pah and a clarinet tune that skips around the chords.
 cinderhold:{
  id:'cinderhold',title:'Cinderhold Embers (Cozy)',root:69,mode:'dorian',bpm:116,meter:8,swing:.08,reverb:.4,
  voices:{cue:'marimba',melody:'clarinet',alt:'marimba',comp:'marimba',arp:'marimba',drift:'marimba'},
  combat:{drum:'x . s x o . s .',pulse:'r - . r - . r .'},
  mix:{melody:1.1,comp:1,bass:.8,perc:.8},
  sections:{
   open:{kind:'theme',chords:['1:7','4'],pad:false,comp:'c - l - c - l -',bass:'r - . r f, - . .',perc:'x . s . o . s .'},
   a:{kind:'theme',chords:['1:7','4','1:7','7','3','4','5:7','1'],pad:false,comp:'c - l - c - l -',bass:'r - . r f, - . .',perc:'x . s . o . s .',melody:[
    '5 . 3 1 - 3 5 .',"6 - 4 - 6 . 1' -","5 . 3 5 - 1' 7 6",'7 - 5 - 2 - . .',
    '3 . 5 3 - 1 2 3','4 - 6 4 - 2 . 4',"5 - 7 - 2' - 1' 7",'1 - - - . . . .']},
   b:{kind:'theme',chords:['4','3','7','1:7','4','3','5:sus4','5:7'],pad:false,arp:"r . f o t' . o f",comp:'c - - - l - - -',bass:'r - . . f, - . .',perc:'x . . . o . s .',melody:[
    "1' - 6 - 4 - 6 -",'7 - 5 - 3 - 5 -',"6 - 7 1' - 7 6 5",'5 - - - . . 3 4',
    "6 - 4 - 1' - 6 -",'5 - 3 - 7 - 5 -',"5 - 1' - 2' - 1' -",'7 - 5 - 2 - . .']},
   break:{kind:'drift',chords:['1:7','4'],barsPerChord:2,pad:false,drift:.28,arp:'r f o f e f o f',bass:'r - - - . . . .',driftCenter:3}
  },
  form:['open','a','a~','b','a~','break','b~','a~']
 },
 // G major: recorder tune over fingerpicked strings and soft piano chords, a flute B section, a
 // fingerpicked breather.
 clearing:{
  id:'clearing',title:'Sunny Clearing',root:67,mode:'ionian',bpm:112,meter:8,swing:.05,reverb:.45,
  // The recorder/flute leads; fingerpicking and piano chords sit well underneath it. (Scaled
  // for the normalized guitar and piano levels, so the balance is unchanged.)
  mix:{melody:1.35,arp:1,comp:.9,drift:2,bass:.8},
  voices:{cue:'celesta',melody:'recorder',alt:'flute',comp:'keys',arp:'pluck',drift:'keys'},
  sections:{
   open:{kind:'theme',chords:['1:add9','4:7'],pad:false,arp:"r . f o t' . o f",bass:'r - . . f, - . .',perc:'k . . . w . . .'},
   a:{kind:'theme',chords:['1:add9','4:7','6:7','5:sus4','1:add9','4:7','2:7','5'],pad:false,arp:"r . f o t' . o f",bass:'r - . . f, - . .',perc:'k . s . w . s .',melody:[
    '1 . 2 3 - 5 . 3','4 - 3 2 - 3 . .','3 . 2 3 - 5 . 6','5 - - - 4 - 2 .',
    "1 . 2 3 - 5 . 1'",'7 - 6 5 - 3 . .','4 - 3 2 . 1 2 3','2 - - - . . . .']},
   b:{kind:'theme',chords:['4:7','5','3:7','6:7','2:7','5:sus4','5','5'],pad:false,voice:'flute',comp:'c - - - l - - -',bass:'r - . . f, - . .',perc:'s . s . s . s .',melody:[
    '3 - 5 6 - 5 3 .','2 - 5 6 - 5 2 .','7, - 2 3 - 5 . 3','3 - - - 2 . 1 2',
    '1 - 3 4 - 3 1 .','2 - 5 - 4 - 2 -','7, - 2 - 5 - 7 -','6 - 5 - 7, - - .']},
   break:{kind:'drift',chords:['1:add9','4:7'],barsPerChord:2,pad:false,drift:.25,arp:'r f o f e f o f',comp:'c - - - - - - -',bass:'r - - - . . . .'}
  },
  form:['open','a','a~','b','a~','break','b~','a~']
 }
};

// Every song id, including cozy-only songs (such as the world's).
export const SONG_IDS=[...new Set([...Object.keys(SONGS),...Object.keys(COZY_SONGS)])];
