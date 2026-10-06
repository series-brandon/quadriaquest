// Cinderhold narrative only; training and dialogue presentation remain shared.
export function bristleIntroduction({say,choose,refuse,train,leave,refused=false}){
 const bristle=(text,expression='angry')=>({text,expression});
 const sequence=(lines,after)=>say(lines,after);
 const offer=()=>choose(bristle('Now, should we learn how to make a soldier out of you or not??'),[
  ['Yes! Teach me!',train,'happy'],
  ["Actually, no. I don't want to fight.",()=>{refuse();sequence([
   bristle('GREAT! First things first...'),
   bristle('Wait... no?','distraught'),bristle("You can't... how can... that...",'distraught'),bristle("I thought... I didn't... But...",'distraught'),
   ...[
    'Oh dear. You seem to have broken Bristle',
    "You'll have to forgive him. He's been bathed in the flames of combat since he was just a little slime.",
    "I don't think he can comprehend a world without combat.",
    'Quadria is a world of choices! You can definitely choose not to fight for whatever reason you want.',
    'But there is some base information you should know about surviving here.',
    'Every living creature in Quadria has a Threat Level, even you!',
    "A creature's Threat Level determines how dangerous they are.",
    'If a creature has a lower Threat Level than you, you will probably take it down with ease',
    'If a creature has a Threat Level close to yours, the fight will be more even, but with good equipment and supplies, should not be too bad',
    "If a creature has a Threat Level higher than you, well, let's just say that will be a tough battle.",
    'Feel free to talk to Bristle or any of the other mentors here if you do become interested in combat!'
   ].map(text=>({text,speaker:'unknown',expression:'idle'}))
  ],leave);},'frown']
 ]);
 if(refused)return choose(bristle("There can't... it's not... when...",'distraught'),[
  ["I'm just gonna go",leave,'concerned'],['I changed my mind, teach me!',train,'happy']
 ]);
 sequence([
  bristle('Welcome to combat training, maggot!'),bristle("No, that's not right. You're lower than a maggot!"),bristle("You're a SLIME!"),
  {speaker:'player',expression:'shocked',text:'...I am a slime.'},{speaker:'player',expression:'shocked',text:"We're both slimes, actually."},
  bristle('Enough with the backtalk, SLIME!'),bristle("This is life or death we're talking about here.")
 ],()=>choose(bristle('You better shape up before you end up as a PUDDLE on my FLOOR!'),[
  ['Why are you so angry?',()=>sequence([bristle('I am a combat specialist... made entirely out of UNFLAVORED GELATIN!'),bristle("WHY DO YOU THINK I'M ANGRY, SLIME?!")],offer)],
  ['Sir, yes, sir!',()=>sequence([bristle('FINALLY! Some respect!'),bristle('There might be hope for you yet!')],offer)]
 ]));
}
