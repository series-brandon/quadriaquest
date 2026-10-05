// Areas provide content and narrative hooks; this runtime owns activation and routing.
export function createAreaRuntime({world,beforeSwitch=()=>{},placePlayer=()=>{},applyCamera=()=>{}}){
 const registry=new Map();let active=null,entered=false;
 function enter(options={}){if(!active||entered)return;entered=true;active.enter?.(options);}
 return {
  register(area){if(registry.has(area.id))throw Error('Duplicate area: '+area.id);registry.set(area.id,area);area.group.visible=false;return area;},
  get: id=>registry.get(id),get active(){return active;},get id(){return active?.id;},
  activate(id,{landing,announce=true,arrival=true}={}){
   const next=registry.get(id);if(!next)return false;
   if(landing&&next.tiles.get(`${landing.x},${landing.z}`)!==landing)return false;
   beforeSwitch();if(active){active.leave?.();active.group.visible=false;}
   world.clear();for(const [key,tile] of next.tiles)world.set(key,tile);
   active=next;entered=false;next.group.visible=true;
   if(landing)placePlayer(landing);if(next.camera)applyCamera(next.camera);
   if(announce)enter({arrival});return true;
  },
  enter,update:(...args)=>active?.update?.(...args),notify:(event,...args)=>active?.[event]?.(...args),
  cancel(){active?.cancel?.();},
  get busy(){return !!active?.busy;},get working(){return !!active?.working;},
  get canMove(){return !!active&&!active.busy&&active.canMove!==false;},
  get canOrbit(){return !!active&&active.canOrbit!==false&&!active.cameraFocus;},
  get cameraFocus(){return active?.cameraFocus||null;},get celebration(){return active?.celebration||null;},
  get expression(){return active?.expression||null;}
 };
}
