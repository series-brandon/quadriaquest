import * as THREE from 'three';

// The mist wall (docs/TOWN.md, The mist wall): the world ends in a wall of mist all the way round, out over the
// sea too. It belongs to the world's edge, not to a map: the shared map builder puts one round a land map
// (world-map.js) and Gelton's countryside gets one round its land (main.js).
// A hard wall, like a fog gate (user, 2026-10-15: soft layers kept showing seams): one opaque surface standing
// on the edge, its mist swirling up and along it in the shader, a billowing top, and its foot below the floor so
// it never meets the ground in a line. One mesh, one draw; per frame only shared uniforms change. Where it stands
// between the camera and what the view looks at (you, by the south or east edge) it turns see-through, so it
// never hides you; past the draw distance it isn't drawn (it fades in as you near the edge).
// Nothing lies beyond it: a click past the edge says the mist is too thick (mistAt, main.js).
export const MIST_HEIGHT=18,MIST_COLOR='#f7f8f4',MIST_SHADE='#8a97a1';
const uniforms={uTime:{value:0},uColor:{value:new THREE.Color(MIST_COLOR)},uShade:{value:new THREE.Color(MIST_SHADE)},uFocusDistance:{value:30},uDetail:{value:1},uFocus:{value:new THREE.Vector3()},uRange:{value:1e4}};
let material=null;
function mistMaterial(){
 if(material)return material;
 material=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,side:THREE.DoubleSide,
  vertexShader:`attribute vec2 mist;varying vec2 vMist;varying vec3 vWorld;
void main(){vMist=mist;vec4 w=modelMatrix*vec4(position,1.0);vWorld=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
  fragmentShader:`uniform float uTime;uniform vec3 uColor;uniform vec3 uShade;uniform float uFocusDistance;uniform float uDetail;uniform vec3 uFocus;uniform float uRange;varying vec2 vMist;varying vec3 vWorld;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.0,a=.5;for(int i=0;i<4;i++){if(uDetail<.5&&i>1)break;v+=a*noise(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
void main(){
 float along=vMist.x,y=vMist.y,t=uTime;
 // Mist flowing up and along the wall: a warped field, so it swirls rather than scrolls.
 // Streaks run upward (the field is stretched tall) and drift along.
 vec2 q=vec2(along*.32,y*.13);
 // Low detail (the Low quality tiers): no warp, two octaves (2 noise lookups a pixel instead of 12).
 vec2 warp=uDetail<.5?vec2(sin(q.x*3.0+t*.6),cos(q.y*4.0-t*.5))*.25:vec2(fbm(q+vec2(t*.07,-t*.25)),fbm(q+vec2(5.2,1.3)-vec2(t*.05,t*.21)));
 float f=fbm(q*1.5+warp*2.2+vec2(-t*.04,-t*.45));
 float g=smoothstep(.28,.78,f);
 // Bright wisps where the flow folds over itself, flickering as they rise.
 float wisp=smoothstep(.62,.9,f)*(.55+.45*sin(along*1.1+f*12.0-t*2.2));
 vec3 col=mix(uShade,uColor,clamp(g*.9+y/${MIST_HEIGHT}.0*.2,0.0,1.0))+wisp*.22;
 // Solid up to its billowing top, which melts into the sky.
 float top=1.0-smoothstep(${MIST_HEIGHT-5}.0,${MIST_HEIGHT}.0,y+(f-.5)*6.0);
 // See-through where it stands between the camera and what the view looks at, so it never hides you.
 float ahead=distance(cameraPosition,vWorld)-uFocusDistance;
 // Not drawn past the draw distance (square, as chunks stream): it fades in as you near the edge.
 float away=max(abs(vWorld.x-uFocus.x),abs(vWorld.z-uFocus.z)),near=1.0-smoothstep(uRange-16.0,uRange,away);
 gl_FragColor=vec4(col,top*mix(.18,1.0,smoothstep(-6.0,3.0,ahead))*near);
 #include <colorspace_fragment>
}`});
 material.userData.shared=true;return material;
}
// Bounds in tiles, inclusive: the map's first and last tiles. base: how far below the floor its foot is.
export function createMistWall({x0,z0,x1,z1,parent,base=-2}){
 const group=new THREE.Group();group.name='mist-wall';parent.add(group);
 const positions=[],mist=[],index=[],h=MIST_HEIGHT-base;
 // Four sides on the map's edge lines (tile x, z sit at world x−6, z−6); `along` runs on round the corners, so
 // the swirl doesn't jump there.
 // A tenth of a tile outside the edge line: on it, the wall and the edge tiles' side faces shared one plane and
 // fought (user report, 2026-10-15).
 const OUT=.1,W=x1-x0+1+2*OUT,D=z1-z0+1+2*OUT,X0=x0-6.5-OUT,X1=x1-5.5+OUT,Z0=z0-6.5-OUT,Z1=z1-5.5+OUT;
 const sides=[[[X0,Z0],[X1,Z0],0],[[X1,Z0],[X1,Z1],W],[[X1,Z1],[X0,Z1],W+D],[[X0,Z1],[X0,Z0],2*W+D]];
 for(const [[ax,az],[bx,bz],start] of sides){const n=positions.length/3,len=Math.hypot(bx-ax,bz-az);
  for(const [x,z,a,y] of [[ax,az,start,0],[bx,bz,start+len,0],[bx,bz,start+len,1],[ax,az,start,1]]){positions.push(x,base+y*h,z);mist.push(a,base+y*h);}
  index.push(n,n+1,n+2,n,n+2,n+3);}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('mist',new THREE.Float32BufferAttribute(mist,2));geometry.setIndex(index);geometry.computeBoundingSphere();
 const mesh=new THREE.Mesh(geometry,mistMaterial());mesh.name='mist';mesh.renderOrder=2;group.add(mesh);
 const wall={group,bounds:{x0,z0,x1,z1},
  // Is a tile past the edge, into the mist?
  beyond:(x,z)=>x<x0||x>x1||z<z0||z>z1,
  dispose(){group.removeFromParent();for(const m of group.children)m.geometry.dispose();walls.delete(wall);}};
 walls.add(wall);return wall;
}
const walls=new Set();
const shown=object=>{for(let o=object;o;o=o.parent)if(!o.visible)return false;return true;};
// The shown mist wall a tile lies beyond (a click there: "The mist is too thick to go on"), or null.
export function mistAt(x,z){for(const w of walls)if(w.group.parent&&shown(w.group)&&w.beyond(x,z))return w;return null;}
// Per frame: the time (the drift) and how far the camera is from what it looks at (the thinning).
// detail: 1 full, 0 low (the Low quality tiers: half the noise, for fill-rate). focus: what the view
// looks at (world units); range: the draw distance from it (world units), past which the mist doesn't show.
export function updateMistWalls(time,focusDistance=30,detail=1,focus=null,range=1e4){uniforms.uTime.value=time;uniforms.uFocusDistance.value=focusDistance;uniforms.uDetail.value=detail;if(focus)uniforms.uFocus.value.copy(focus);uniforms.uRange.value=range;}
