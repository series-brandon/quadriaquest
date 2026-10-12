import * as THREE from 'three';
import {makeSlime} from './slime-model.js';
import {createSlimeActor} from './slime-presentation.js';
import {moveMotion} from './slime-motion.js';

// Guards walking a city wall's walkway (city-walls.js `walkways`), for flavour: each paces its stretch
// tile by tile with the shared slime motion, pauses at the ends to look out over the wall, and turns
// back. They aren't townsfolk (the walkway isn't part of the walkable map): no routes, no talking. Far
// ones (beyond `range` tiles from the player) are hidden and skip their updates.
export const GUARD_LOOK={color:'#c85745',loadout:{rightHand:'copperDagger',leftHand:'copperShield',head:'ironSkullcap'}};
const WALK=.6;
// hiddenAt(x, z): scene position → whether the wall under it is cut down (they hide then).
// A long walkway is shared out: one guard per `beat` tiles, each pacing its own stretch.
// shownAt(x, z): tile → whether the map shows it (city streaming); they hide where it doesn't.
export function createWallSentries({walkways,parent,look=GUARD_LOOK,minLength=8,beat=40,range=40,offset=6,random=Math.random,hiddenAt=()=>false,shownAt=()=>true}){
 const sentries=[],stretches=[];
 for(const walk of walkways){const n=Math.ceil((walk.to-walk.from+1)/beat),len=(walk.to-walk.from+1)/n;for(let i=0;i<n;i++)stretches.push({...walk,from:walk.from+Math.round(i*len),to:walk.from+Math.round((i+1)*len)-1});}
 for(const w of stretches){
  if(w.to-w.from<minLength)continue;
  const rig=makeSlime(look.color),actor=createSlimeActor(rig,{loadout:look.loadout,idleRate:.9});
  const body=new THREE.Group();body.name='wall-sentry';body.add(rig.group);parent.add(body);
  const point=i=>w.horizontal?{x:i,z:w.fixed,h:w.y}:{x:w.fixed,z:i,h:w.y};
  const s={walkway:w,body,actor,at:w.from+Math.floor(random()*(w.to-w.from+1)),dir:random()<.5?-1:1,step:null,pause:random()*3,facing:0};
  body.position.set(point(s.at).x-offset,w.y,point(s.at).z-offset);
  s.point=point;sentries.push(s);
 }
 // Looking out over the wall: the outward side's facing angle.
 const outwardAngle=w=>w.horizontal?(w.outward>0?0:Math.PI):(w.outward>0?Math.PI/2:-Math.PI/2);
 return {
  sentries,
  update(dt,time,player){
   for(const s of sentries){
    const p=s.body.position,far=player&&Math.hypot(p.x+offset-player.x,p.z+offset-player.z)>range;
    // Far guards leave the scene graph (hidden objects still cost a matrix update every frame).
    if(far){if(s.body.parent)s.body.removeFromParent();continue;}
    if(!s.body.parent)parent.add(s.body);
    s.body.visible=!hiddenAt(p.x,p.z)&&shownAt(Math.round(p.x+offset),Math.round(p.z+offset));
    const w=s.walkway;
    if(!s.step){
     if(s.pause>0){s.pause-=dt;}
     else{const next=s.at+s.dir;if(next<w.from||next>w.to){s.dir=-s.dir;s.pause=3+random()*3;s.facing=outwardAngle(w);}
      else{s.step={from:s.point(s.at),to:s.point(next),age:0};s.facing=Math.atan2(s.step.to.x-s.step.from.x,s.step.to.z-s.step.from.z);}}
    }
    let pose=null;
    if(s.step){s.step.age+=dt*WALK;const m=moveMotion(s.step.age,s.step.from,s.step.to);pose=m.pose;
     p.set(THREE.MathUtils.lerp(s.step.from.x,s.step.to.x,m.distance)-offset,w.y,THREE.MathUtils.lerp(s.step.from.z,s.step.to.z,m.distance)-offset);
     if(s.step.age>=m.duration){s.at+=s.dir;s.step=null;}}
    s.body.rotation.y+=Math.atan2(Math.sin(s.facing-s.body.rotation.y),Math.cos(s.facing-s.body.rotation.y))*(1-Math.exp(-dt*8));
    s.actor.update(dt,time,{expression:'idle',pose,lean:true});
   }
  },
  dispose(){for(const s of sentries)s.body.removeFromParent();sentries.length=0;},
 };
}
