// Cinderhold narrative only; training and dialogue presentation remain shared.
// pacifist(): attacks are prevented, so Bristle refuses to train (turnedAway runs after his line).
// returning: he turned the player away before, so he skips straight to his offer.
// Declining to fight: the unknown narrator answers by combat mode. Already Pacifist, it warns about
// the creatures that hunt pacifists anyway; otherwise it offers Pacifist (makePacifist(), the shared
// mode change), continuing with that warning if accepted or the Threat Level primer if declined.
export function bristleIntroduction({say,choose,refuse,train,leave,refused=false,pacifist=()=>false,makePacifist=()=>{},turnedAway=leave,returning=false}){
 const bristle=(text,expression='angry')=>({text,expression});
 const narrator=texts=>texts.map(text=>({text,speaker:'unknown',expression:'idle'}));
 const sequence=(lines,after)=>say(lines,after);
 const farewell='Feel free to talk to Bristle or any of the other mentors here if you do become interested in combat!';
 const huntersWarning=[
  'Most creatures in Quadria will leave a pacifist alone.',
  'But not all of them. A few very dangerous creatures will come after you no matter what.',
  'If a creature is marked "Hunts pacifists", keep your distance!',
  farewell
 ];
 const alreadyPeaceful=()=>sequence(narrator(["And it looks like you've already chosen a peaceful path.",...huntersWarning]),leave);
 const threatLevels=()=>sequence(narrator([
  'Then there is some base information you should know about surviving here.',
  'Every living creature in Quadria has a Threat Level, even you!',
  "A creature's Threat Level determines how dangerous they are.",
  'If a creature has a lower Threat Level than you, you will probably take it down with ease',
  'If a creature has a Threat Level close to yours, the fight will be more even, but with good equipment and supplies, should not be too bad',
  "If a creature has a Threat Level higher than you, well, let's just say that will be a tough battle.",
  farewell
 ]),leave);
 const offerPacifist=()=>choose({speaker:'unknown',expression:'idle',text:"If you'd rather not fight at all, Pacifist mode might suit you. You won't attack, and most creatures won't attack you either. Shall I switch you to it?"},[
  ['Yes, make me a pacifist.',()=>{makePacifist();sequence(narrator(["Done! You're now in Pacifist mode. You can change it any time on the Combat page.",...huntersWarning]),leave);},'happy'],
  ["No, I'll keep my current mode.",threatLevels,'idle']
 ]);
 const teach=()=>pacifist()?sequence([
  bristle("Wait a second! I can't teach a woo-woo do-gooder how to FIGHT."),
  bristle('Go talk to the other tree huggers around here! They might talk nonsense with you!'),
  bristle('Come back if you ever grow a SPINE, SLIME! DISMISSED!')
 ],turnedAway):train();
 const offer=()=>choose(bristle('Now, should we learn how to make a soldier out of you or not??'),[
  ['Yes! Teach me!',teach,'happy'],
  ["Actually, no. I don't want to fight.",()=>{refuse();sequence([
   bristle('GREAT! First things first...'),
   bristle('Wait... no?','distraught'),bristle("You can't... how can... that...",'distraught'),bristle("I thought... I didn't... But...",'distraught'),
   ...narrator([
    'Oh dear. You seem to have broken Bristle',
    "You'll have to forgive him. He's been bathed in the flames of combat since he was just a little slime.",
    "I don't think he can comprehend a world without combat.",
    'Quadria is a world of choices! You can definitely choose not to fight for whatever reason you want.'
   ])
  ],()=>(pacifist()?alreadyPeaceful():offerPacifist()));},'frown']
 ]);
 if(refused)return choose(bristle("There can't... it's not... when...",'distraught'),[
  ["I'm just gonna go",leave,'concerned'],['I changed my mind, teach me!',teach,'happy']
 ]);
 if(returning)return offer();
 sequence([
  bristle('Welcome to combat training, maggot!'),bristle("No, that's not right. You're lower than a maggot!"),bristle("You're a SLIME!"),
  {speaker:'player',expression:'shocked',text:'...I am a slime.'},{speaker:'player',expression:'shocked',text:"We're both slimes, actually."},
  bristle('Enough with the backtalk, SLIME!'),bristle("This is life or death we're talking about here.")
 ],()=>choose(bristle('You better shape up before you end up as a PUDDLE on my FLOOR!'),[
  ['Why are you so angry?',()=>sequence([bristle('I am a combat specialist... made entirely out of UNFLAVORED GELATIN!'),bristle("WHY DO YOU THINK I'M ANGRY, SLIME?!")],offer)],
  ['Sir, yes, sir!',()=>sequence([bristle('FINALLY! Some respect!'),bristle('There might be hope for you yet!')],offer)]
 ]));
}
