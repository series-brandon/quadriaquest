export const PETTING_DURATION=2.6;
export function createCompanionBehavior(random=Math.random){
 let idle=0,pet=0,scratch=0,delay=12+random()*12;
 return {
  reset(){idle=pet=scratch=0;delay=12+random()*12;},
  pet(){pet=PETTING_DURATION;scratch=0;},
  get petting(){return pet>0;},
  update(dt,moving){
   if(moving){idle=pet=scratch=0;delay=12+random()*12;return {motion:'Walk',sit:0};}
   idle+=dt;
   if(pet>0){const age=PETTING_DURATION-pet;pet=Math.max(0,pet-dt);return {motion:'Petting',age,sit:Math.min(1,Math.max(0,idle-4))};}
   if(idle>5){delay-=dt;if(delay<=0&&scratch===0)scratch=2.4;}
   if(scratch>0){const age=2.4-scratch;scratch=Math.max(0,scratch-dt);if(!scratch)delay=12+random()*12;return {motion:'Scratch',age,sit:1};}
   return {motion:idle>4?'Sit':'Idle',sit:Math.min(1,Math.max(0,idle-4))};
  }
 };
}
