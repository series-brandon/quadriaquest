import * as THREE from 'three';

// The mist wall (docs/TOWN.md, The mist wall): the world ends in a tall, soft wall of white mist all the way
// round, out over the sea too. It belongs to the world's edge, not to a map: the shared map builder puts one
// round a land map (world-map.js) and Gelton's countryside gets one round its land (main.js).
// A few soft layers stand just outside the last tiles, all in one mesh (one draw; a wall round Gelton's
// countryside as 36 chunk-long pieces cost 36 draws and program switches, and culling them saved little). They drift in the shader (shared uniforms), so there's no per-frame work beyond setting those. Mist
// between the camera and what it looks at thins away, as the cutaway opens buildings.
// Nothing lies beyond it: a click past the edge says the mist is too thick (mistAt, main.js).
export const MIST_HEIGHT=15,MIST_COLOR='#fbfcf8',MIST_SHADE='#a7b3ba';
// Layers: [distance out from the edge (tiles), height (world units), opacity].
export const MIST_LAYERS=[[.7,9,.42],[1.9,12,.62],[3.4,MIST_HEIGHT,.9],[5.2,MIST_HEIGHT+2,1]];
const uniforms={uTime:{value:0},uColor:{value:new THREE.Color(MIST_COLOR)},uShade:{value:new THREE.Color(MIST_SHADE)},uFocusDistance:{value:30},uDetail:{value:1}};
let material=null;
function mistMaterial(){
 if(material)return material;
 material=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,side:THREE.DoubleSide,
  vertexShader:`attribute vec3 mist;varying vec3 vMist;varying float vAlong;varying vec3 vWorld;
void main(){vMist=mist;vec4 w=modelMatrix*vec4(position,1.0);vAlong=w.x+w.z;vWorld=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
  fragmentShader:`uniform float uTime;uniform vec3 uColor;uniform vec3 uShade;uniform float uFocusDistance;uniform float uDetail;varying vec3 vMist;varying float vAlong;varying vec3 vWorld;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
void main(){
 float v=vMist.y,layer=vMist.z,speed=.05+.03*layer;
 // Low detail (a slow device): only the two outer layers, and one noise lookup instead of three.
 if(uDetail<.5&&layer<1.5)discard;
 vec2 p=vec2(vAlong*.11+layer*7.3+uTime*speed,v*2.2-uTime*.04);
 float n=uDetail<.5?noise(p):noise(p)*.55+noise(p*2.3+3.1)*.3+noise(p*5.1-1.7)*.15;
 float body=pow(1.0-v,1.1)*(.45+.55*n);
 // The top billows: a soft, uneven edge rather than a straight line.
 body*=smoothstep(0.0,.3,(1.0-v)*1.3+n*.5-.25);
 // Shaded so it reads against a pale sky: cool grey-blue in its folds and low down, bright where it billows.
 vec3 col=mix(uShade,uColor,clamp(n*1.1+v*.55-.15,0.0,1.0));
 // Mist nearer the camera than what it looks at (you, by the edge) thins away, so it never hides you.
 float ahead=distance(cameraPosition,vWorld)-uFocusDistance;
 gl_FragColor=vec4(col,clamp(body*vMist.x,0.0,1.0)*smoothstep(-6.0,3.0,ahead));
 #include <colorspace_fragment>
}`});
 material.userData.shared=true;return material;
}
// Bounds in tiles, inclusive: the map's first and last tiles. base: the ground's height under the mist.
export function createMistWall({x0,z0,x1,z1,parent,base=-.5}){
 const group=new THREE.Group();group.name='mist-wall';parent.add(group);
 // Each side's layers run past its corners so the sides meet.
 const positions=[],mist=[],index=[];
 const sides=[{dir:[1,0],out:[0,-1],from:x0,to:x1,at:z0-.5},{dir:[1,0],out:[0,1],from:x0,to:x1,at:z1+.5},{dir:[0,1],out:[-1,0],from:z0,to:z1,at:x0-.5},{dir:[0,1],out:[1,0],from:z0,to:z1,at:x1+.5}];
 for(const s of sides){const a=s.from,b=s.to;
  MIST_LAYERS.forEach(([d,h,alpha],layer)=>{const lo=a-d-.5,hi=b+d+.5,n=positions.length/3;
   // Tile x, z sit at world x−6, z−6.
   const across=s.at+(s.out[0]+s.out[1])*d-6;
   for(const [t,y,v] of [[lo,0,0],[hi,0,0],[hi,h,1],[lo,h,1]]){if(s.dir[0])positions.push(t-6,base+y,across);else positions.push(across,base+y,t-6);mist.push(alpha,v,layer);}
   index.push(n,n+1,n+2,n,n+2,n+3);});}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('mist',new THREE.Float32BufferAttribute(mist,3));geometry.setIndex(index);geometry.computeBoundingSphere();
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
// detail: 1 full, 0 low (the Low quality tier: fewer layers and less noise, for fill-rate).
export function updateMistWalls(time,focusDistance=30,detail=1){uniforms.uTime.value=time;uniforms.uFocusDistance.value=focusDistance;uniforms.uDetail.value=detail;}
