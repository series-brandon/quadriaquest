import * as THREE from 'three';

// Seeing into and past buildings (docs/CITY.md, Cutaway; simplified by the user, 2026-10-11). A building
// is "cut" when the player is inside it, or when it stands between the camera and the player: its roof
// and the upper part of its doors hide, and all its walls are drawn only up to one storey (CUT_HEIGHT
// above their base, the height of a single-storey wall), so you see over them. Whole buildings, never
// parts: no dithering, no stubs.
// Walls are cut per pixel in their baked material, which carries per vertex `cutOwner` = (building a,
// building b, base y): a wall between two buildings belongs to both. Roofs, chimneys, signs and door
// tops are separate objects that hide in JS. Clicks are unaffected: none of them is pickable.
export const CUT_HEIGHT=1.5;
export const MAX_CUT=16;
export const uniforms={uCutIds:{value:new Float32Array(MAX_CUT).fill(-1)},uCutCount:{value:0},uCutAll:{value:0}};

const VERTEX_HEAD='attribute vec3 cutOwner;\nvarying vec3 vCutOwner;\nvarying float vCutY;\n';
const FRAGMENT_HEAD=`uniform float uCutIds[${MAX_CUT}];uniform int uCutCount;uniform int uCutAll;varying vec3 vCutOwner;varying float vCutY;
bool ownerCut(){
 if(uCutAll==1)return vCutOwner.x>-.5||vCutOwner.y>-.5;
 for(int i=0;i<${MAX_CUT};i++){if(i>=uCutCount)break;if(abs(vCutOwner.x-uCutIds[i])<.5||abs(vCutOwner.y-uCutIds[i])<.5)return true;}
 return false;
}
bool cutAway(){return vCutY>vCutOwner.z+${(CUT_HEIGHT-.01).toFixed(2)}&&ownerCut();}
`;
// The same test in JS (the tests use it; keep in step with the shader). The cut sits just below the
// storey line, so the faces meeting there (a wall top, the next band's bottom) both go. all: force
// cutaway (every building is cut).
export function isCut(y,[a,b,base],cut,all=false){return y>base+CUT_HEIGHT-.01&&(all?a>=0||b>=0:cut.some(id=>Math.abs(a-id)<.5||Math.abs(b-id)<.5));}

// Patches a material whose geometry carries `cutOwner`. Works for the depth material too, so cut walls
// stop casting their upper shadow. Each material is patched once.
// section: the material draws the inside of cut walls only (see sectionMaterial).
export function applyCutaway(material,{section=false}={}){
 if(material.userData.cutaway)return material;material.userData.cutaway=true;material.userData.cutawaySection=section;
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,uniforms);
  shader.vertexShader=VERTEX_HEAD+shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\n vCutOwner=cutOwner;vCutY=(modelMatrix*vec4(transformed,1.0)).y;');
  shader.fragmentShader=FRAGMENT_HEAD+shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>\n if(cutAway()${section?'||!ownerCut()':''})discard;`);
 };
 material.customProgramCacheKey=()=>section?'cutaway-section':'cutaway';material.needsUpdate=true;
 return material;
}
// The cut face of walls. Walls are built from stacked boxes, so looking down into a cut wall shows the
// faces where those boxes meet, two at the same depth that flicker as the camera moves. Instead, the
// wall's inside (its back faces, drawn by a second mesh) is drawn flat, unlit and pulled slightly
// towards the camera, so it always wins: a cut wall shows one steady dark section. Only cut buildings
// draw it.
export function sectionMaterial(){
 const material=new THREE.MeshBasicMaterial({color:'#463830',side:THREE.BackSide,polygonOffset:true,polygonOffsetFactor:0,polygonOffsetUnits:-6});
 return applyCutaway(material,{section:true});
}

// Where buildings are, per map. A source belongs to a map's root object and supplies, on demand, each
// building's box ({x0,z0,x1,z1,base,top} in world units) and the objects that hide when it is cut
// ({object, owners}). Only sources whose root is shown take part, so maps may reuse building ids.
const sources=new Set();
export function registerCutSource(source){sources.add(source);return ()=>{sources.delete(source);for(const p of source.parts())p.object.visible=!p.object.userData.hiddenByMap;};}
const shown=object=>{for(let o=object;o;o=o.parent)if(!o.visible)return false;return true;};

// Does the segment from p to q pass through the box? (slab test)
export function segmentHitsBox(p,q,box){
 let t0=0,t1=1;
 for(const axis of ['x','y','z']){const d=q[axis]-p[axis],lo=box.min[axis],hi=box.max[axis];
  if(Math.abs(d)<1e-9){if(p[axis]<lo||p[axis]>hi)return false;continue;}
  let a=(lo-p[axis])/d,b=(hi-p[axis])/d;if(a>b)[a,b]=[b,a];t0=Math.max(t0,a);t1=Math.min(t1,b);if(t0>t1)return false;}
 return true;
}
// Which buildings are cut: the one the player is in, then any whose part above the cut height stands
// between the camera and the player (nearest first, at most MAX_CUT). `boxes`: [[id, box]].
export function cutBuildings({player,camera,building=-1,boxes}){
 const cut=building>=0?[building]:[],eye={x:player.x,y:player.y+.6,z:player.z},MARGIN=.4;
 const hits=[];
 for(const [id,b] of boxes){if(id===building||b.top<=b.base+CUT_HEIGHT+.01)continue;
  if(segmentHitsBox(eye,camera,{min:{x:b.x0-MARGIN,y:b.base+CUT_HEIGHT,z:b.z0-MARGIN},max:{x:b.x1+MARGIN,y:b.top,z:b.z1+MARGIN}}))hits.push({id,d:Math.hypot((b.x0+b.x1)/2-player.x,(b.z0+b.z1)/2-player.z)});}
 for(const {id} of hits.sort((x,y)=>x.d-y.d))if(cut.length<MAX_CUT&&!cut.includes(id))cut.push(id);
 return cut;
}
let lastCut=[],lastOn=true,lastForce=false;
// Per frame, after the camera is placed: the player's and camera's positions, and the building the
// player stands in (tile.building), if any. force: cut every building (playground, "force cutaway").
export function updateCutaway({player,camera,building=-1,on=true,force=false}){
 const active=[...sources].filter(s=>shown(s.root)),all=on&&force;
 const cut=all?[...new Set(active.flatMap(s=>[...s.boxes()].map(([id])=>id)))]:on?cutBuildings({player,camera,building:building??-1,boxes:active.flatMap(s=>[...s.boxes()])}):[];
 uniforms.uCutIds.value.fill(-1);if(!all)cut.forEach((id,i)=>{uniforms.uCutIds.value[i]=id;});uniforms.uCutCount.value=all?0:cut.length;uniforms.uCutAll.value=all?1:0;
 for(const s of active)for(const {object,owners} of s.parts())object.visible=!object.userData.hiddenByMap&&!owners.some(o=>cut.includes(o));
 lastCut=cut;lastOn=on;lastForce=all;
}
export const cutawayState=()=>({on:lastOn,force:lastForce,cut:[...lastCut]});
