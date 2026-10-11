import * as THREE from 'three';

// Ground markers for tile-targeted enemy attacks (docs/COMBAT.md, Enemy attack commitment): from the
// commit point the locked tiles glow and fill toward impact, so the player can see where to stand.
// One marker set per attacker; any map, any attack that locks tiles.
const MAX_TILES=49;
export function createAttackTelegraphs(scene,{toPosition=t=>new THREE.Vector3(t.x-6,t.h,t.z-6)}={}){
 const sets=new Map(),geometry=new THREE.PlaneGeometry(.92,.92).rotateX(-Math.PI/2),matrix=new THREE.Matrix4();
 function create(){
  const material=new THREE.MeshBasicMaterial({color:'#e2452f',transparent:true,opacity:0,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});
  const mesh=new THREE.InstancedMesh(geometry,material,MAX_TILES);mesh.frustumCulled=false;mesh.renderOrder=2;mesh.count=0;scene.add(mesh);return {mesh,tiles:null};
 }
 return {
  // tiles: the locked tiles (null clears); progress: 0 at the commit point → 1 at impact.
  show(owner,tiles,progress=0){
   if(!tiles){const set=sets.get(owner);if(set){set.mesh.removeFromParent();set.mesh.material.dispose();sets.delete(owner);}return;}
   let set=sets.get(owner);if(!set){set=create();sets.set(owner,set);}
   if(set.tiles!==tiles){set.tiles=tiles;set.mesh.count=Math.min(MAX_TILES,tiles.length);
    tiles.slice(0,MAX_TILES).forEach((t,i)=>{const p=toPosition(t);matrix.makeTranslation(p.x,p.y+.03,p.z);set.mesh.setMatrixAt(i,matrix);});
    set.mesh.instanceMatrix.needsUpdate=true;}
   // Fills in as impact nears, with a quickening pulse in the last third.
   const pulse=progress>.66?.12*Math.sin(progress*40):0;
   set.mesh.material.opacity=.18+.42*progress+pulse;
  },
  get active(){return sets.size;},
  clear(){for(const owner of [...sets.keys()])this.show(owner,null);},
 };
}
