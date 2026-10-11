import {Group,LineSegments,BufferGeometry,Float32BufferAttribute,LineBasicMaterial} from 'three';
import {createEdgeFeatures} from '../doors.js';
import {key,edgeBetween} from '../world.js';

// Walls & doors test yard (docs/CITY.md, Phase 1). Placement only: the edges, the door entity and every
// rule (routes, sight, reach, bodies) are production code. A 3×3 room near the player: a door on the
// side facing the player, a window opposite, a low counter on one side and a fence on the other.
const COLORS={wall:[.85,.25,.2],window:[.3,.6,.95],fence:[.75,.55,.2],railing:[.75,.55,.2],low:[.4,.8,.4],door:[.95,.85,.2]};
export function createEdgeFixtures(api){
 let edges=null,root=null,anchor=null,door=null,center=null,overlay=null,overlayClock=0;
 const at=(x,z)=>api.world.get(key(x,z));
 // A 5×5 patch (room plus a ring around it) of existing, open, level ground.
 function spot(){
  const p=api.tile(),candidates=[...api.world.values()].filter(t=>Math.abs(t.x-p.x)+Math.abs(t.z-p.z)>=3).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z));
  for(const c of candidates){let ok=true;
   for(let dz=-2;dz<=2&&ok;dz++)for(let dx=-2;dx<=2&&ok;dx++){const t=at(c.x+dx,c.z+dz);ok=!!t&&!t.blocked&&!t.water&&t.h===c.h&&!t.edges&&!api.occupied(t);}
   if(ok)return c;}
  return null;
 }
 function clear(){api.stop();edges?.dispose();root?.removeFromParent();edges=root=anchor=door=center=null;}
 function spawn(){
  clear();api.clearUI();const c=spot();if(!c)return 'Needs an open, level 5×5 patch of ground near you.';
  root=new Group();api.scene.add(root);anchor=api.tile();center=c;edges=createEdgeFeatures({parent:root,pickables:api.pickables,tileAt:at});
  // Which side faces the player gets the door.
  const p=api.tile(),dx=p.x-c.x,dz=p.z-c.z,side=Math.abs(dx)>Math.abs(dz)?(dx>0?'e':'w'):(dz>0?'s':'n');
  const opposite={n:'s',s:'n',e:'w',w:'e'}[side],sides=['n','e','s','w'].filter(s=>s!==side&&s!==opposite);
  const kindFor=(s,middle)=>!middle?'wall':s===side?'door':s===opposite?'window':s===sides[0]?'low':'fence';
  for(let i=-1;i<=1;i++){
   const pairs={n:[at(c.x+i,c.z-1),at(c.x+i,c.z-2)],s:[at(c.x+i,c.z+1),at(c.x+i,c.z+2)],w:[at(c.x-1,c.z+i),at(c.x-2,c.z+i)],e:[at(c.x+1,c.z+i),at(c.x+2,c.z+i)]};
   for(const [s,[inside,outside]] of Object.entries(pairs)){const kind=kindFor(s,i===0),f=edges.add(inside,outside,kind);if(kind==='door')door=f;}
  }
  return 'Built a 3×3 room: a closed door facing you, a window opposite, a counter and a fence on the sides. Click the door to open it, then walk in; while it is closed nobody can path inside.';
 }
 function setOverlay(on){
  if(!on){overlay?.removeFromParent();overlay?.geometry.dispose();overlay?.material.dispose();overlay=null;return;}
  if(!overlay){overlay=new LineSegments(new BufferGeometry(),new LineBasicMaterial({vertexColors:true,depthTest:false}));overlay.renderOrder=999;overlay.frustumCulled=false;api.scene.add(overlay);overlayClock=0;}
 }
 function drawOverlay(){
  const p=api.tile(),pos=[],col=[];
  for(let z=p.z-10;z<=p.z+10;z++)for(let x=p.x-10;x<=p.x+10;x++){const t=at(x,z);if(!t?.edges)continue;
   for(const [side,f] of Object.entries(t.edges)){const o=side==='n'?at(x,z-1):at(x-1,z);if(!o||edgeBetween(t,o)!==f)continue;
    const color=f.kind==='door'&&f.locked?[.9,.1,.6]:COLORS[f.kind]||[1,1,1],y=Math.max(t.h,o.h)+.06;
    const [a,b]=side==='n'?[[x-.5,z-.5],[x+.5,z-.5]]:[[x-.5,z-.5],[x-.5,z+.5]];
    pos.push(a[0]-6,y,a[1]-6,b[0]-6,y,b[1]-6);col.push(...color,...color);}}
  overlay.geometry.setAttribute('position',new Float32BufferAttribute(pos,3));overlay.geometry.setAttribute('color',new Float32BufferAttribute(col,3));
 }
 return {clear,setOverlay,
  update(dt){if(root)root.visible=api.world.get(key(anchor.x,anchor.z))===anchor;if(overlay&&(overlayClock-=dt)<=0){overlayClock=.25;drawOverlay();}},
  run(action){
   if(action==='spawn')return spawn();
   if(action==='remove'){clear();return 'Removed the walls & doors yard.';}
   if(!door||!edges)return 'Build the yard first (in this map).';
   if(action==='inside'){api.moveTo(center);return door.open?'Walking into the room through the open door.':'The door is closed: no route inside until it is opened.';}
   if(action==='toggle'){door.setOpen(!door.open);return door.locked?'It is locked: unlock it first.':door.open?'Opened the door: routes, sight and reach pass through.':'Closed the door: it blocks like a wall.';}
   if(action==='lock'){door.setLocked(!door.locked);return door.locked?'Locked: routes can’t cross it; clicking it rattles ("It’s locked.").':'Unlocked.';}
   return 'Unknown action.';
  }};
}
