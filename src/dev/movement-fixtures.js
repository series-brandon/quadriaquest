import {Group,LineSegments,BufferGeometry,Float32BufferAttribute,LineBasicMaterial} from 'three';
import {createEdgeFeatures} from '../doors.js';
import {key} from '../world.js';

// Movement test area (docs/PLAYGROUND.md, Movement). Placement and drawing only: the edges, door and
// every step rule are production code.
//   Corner yard: free-standing edge pieces near the player (a wall end, a fence, a window, a counter)
//   and a doorway (an open door between walls), to walk diagonally past their ends and corners.
//   Route overlay: the routes the player, the companion and creatures are about to walk.
const ROUTE_COLORS={player:[.3,.85,1],companion:[1,.75,.3],enemy:[1,.35,.35]};
export function createMovementFixtures(api){
 let edges=null,root=null,anchor=null,overlay=null,overlayClock=0;
 const at=(x,z)=>api.world.get(key(x,z));
 // A 7 × 4 patch of open, level ground within 12 tiles of the player.
 function spot(){
  const p=api.tile(),options=[];
  for(let dz=-12;dz<=12;dz++)for(let dx=-12;dx<=12;dx++){const c=at(p.x+dx,p.z+dz);if(c&&Math.max(Math.abs(dx),Math.abs(dz))>=4)options.push(c);}
  options.sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z));
  for(const c of options){let ok=true;
   for(let z=c.z-1;z<=c.z+2&&ok;z++)for(let x=c.x-3;x<=c.x+3&&ok;x++){const t=at(x,z);ok=!!t&&!t.blocked&&!t.water&&!t.stair&&t.h===c.h&&!t.edges&&!api.occupied(t);}
   if(ok)return c;}
  return null;
 }
 function clear(){edges?.dispose();root?.removeFromParent();edges=root=anchor=null;}
 function spawnYard(){
  clear();api.stop();api.clearUI();const c=spot();if(!c)return 'Needs an open, level 7×4 patch nearby.';
  root=new Group();api.scene.add(root);anchor=c;edges=createEdgeFeatures({parent:root,pickables:api.pickables,tileAt:at});
  // Row one: pieces with free ends (a two-tile wall, a fence, a window). Row two: a counter, and a
  // doorway (an open door between walls).
  const north=x=>[at(x,c.z),at(x,c.z-1)],south=x=>[at(x,c.z+1),at(x,c.z+2)];
  for(const x of [c.x-3,c.x-2])edges.add(...north(x),'wall');
  edges.add(...north(c.x),'fence');edges.add(...north(c.x+2),'window');edges.add(...south(c.x-3),'low');
  edges.add(...south(c.x-1),'wall');edges.add(...south(c.x+1),'wall');edges.add(...south(c.x),'door').setOpen(true,{quiet:true});
  return `Corner yard at ${c.x}, ${c.z}.`;
 }
 function setOverlay(on){
  if(!on){overlay?.removeFromParent();overlay?.geometry.dispose();overlay?.material.dispose();overlay=null;return;}
  if(!overlay){overlay=new LineSegments(new BufferGeometry(),new LineBasicMaterial({vertexColors:true,depthTest:false}));overlay.renderOrder=999;overlay.frustumCulled=false;api.scene.add(overlay);overlayClock=0;}
 }
 function drawOverlay(){
  const pos=[],col=[];
  for(const {kind,tiles} of api.routes())for(let i=1;i<tiles.length;i++){const a=tiles[i-1],b=tiles[i];if(!a||!b)continue;
   const color=ROUTE_COLORS[kind]||[1,1,1];pos.push(a.x-6,a.h+.08,a.z-6,b.x-6,b.h+.08,b.z-6);col.push(...color,...color);}
  overlay.geometry.setAttribute('position',new Float32BufferAttribute(pos,3));overlay.geometry.setAttribute('color',new Float32BufferAttribute(col,3));
 }
 return {clear,setOverlay,get overlay(){return !!overlay;},
  update(dt){if(root)root.visible=at(anchor.x,anchor.z)===anchor;if(overlay&&(overlayClock-=dt)<=0){overlayClock=.1;drawOverlay();}},
  run(action){
   if(action==='yard')return spawnYard();
   if(action==='remove'){clear();return 'Removed the corner yard.';}
   return 'Unknown action.';
  }};
}
