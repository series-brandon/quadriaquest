import {portalSpawn} from './portal-spawn.js';

// The transition never depends on a named map or on tutorial progress.
// A destination is an area id (you arrive by its crystal: area.arrival()) or a crystal place's id
// (crystal-places.js: you arrive by that crystal, in its area, which may be the one you're in).
export function createTravelSystem({areas,places=null,stop,blocked=()=>false,occupied=()=>false,fade=()=>{},failed=()=>{}}){
 let transition=null;
 const placeOf=id=>places?.get(id)||null;
 function landingFor(id){const place=placeOf(id),area=areas.get(place?place.area:id);if(!area)return null;
  if(place){place.prime?.();return portalSpawn(area.tiles,place.tile(),t=>occupied(t));}
  const crystal=area.arrival?.();return portalSpawn(area.tiles,crystal,t=>occupied(t));}
 function cancel(){const previous=transition;transition=null;fade(0);if(previous?.switched)areas.enter({arrival:false});}
 function request(destination,{source=null,onArrive}={}){
  const place=placeOf(destination),area=place?place.area:destination;
  if(transition||blocked()||(place?source?.place===destination:destination===areas.id)||source&&!source.available())return false;
  if(!landingFor(destination)){failed();return false;}
  stop();transition={destination,area,from:areas.id,source,onArrive,age:0,switched:false};fade(0);return true;
 }
 return {request,cancel,cancelFrom(source){if(transition?.source===source)cancel();},landingFor,
  get busy(){return !!transition;},get state(){return transition?{from:transition.from,to:transition.destination,switched:transition.switched,age:transition.age}:null;},
  update(dt){if(!transition)return;const current=transition;current.age+=dt;
   if(!current.switched&&current.age>=.8){
    const landing=landingFor(current.destination);
    if(areas.id!==current.from||!landing||current.source&&!current.source.available()){cancel();failed();return;}
    if(!areas.activate(current.area,{landing,announce:false})){cancel();failed();return;}
    current.switched=true;
   }
   if(current.age>=1.8){transition=null;fade(0);areas.enter({arrival:true});current.onArrive?.();}
   else fade(current.age<.8?current.age/.8:Math.max(0,1-(current.age-1)/.8));
  }
 };
}
