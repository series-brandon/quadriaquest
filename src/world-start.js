import * as THREE from 'three';
import {createResourceEntity} from './resource-entities.js';
import {createTerrainBatch} from './terrain-batch.js';
import {makeFlowers,makeTerrainTile} from './world-models.js';
import {createGrassColors} from './grass-palette.js';
import {key} from './world.js';

// Placeholder for the open world's starting location: where players wake up after the tutorial
// (waking.js). A plain meadow with an Iter Crystal and shared resources; the real world replaces it,
// and only `WORLD_START` (the arrival crystal) needs to move. Players land beside the crystal.
export const WORLD_START={crystal:[10,8]};
export function makeWorldStartTiles(){
 const tiles=[];
 for(let z=1;z<=20;z++)for(let x=1;x<=20;x++){
  if((x<=2||x>=19)&&(z<=2||z>=19))continue;
  const h=x>=14&&z<=6?1.5:1;
  tiles.push({x,z,h,water:false,blocked:false,buildable:true});
 }
 return tiles;
}

export function createWorldStart(api){
 const group=new THREE.Group();group.visible=false;api.scene.add(group);
 const tiles=makeWorldStartTiles(),map=new Map(tiles.map(t=>[key(t.x,t.z),t]));
 const t=(x,z)=>map.get(key(x,z)),nodes=[];
 const grassMaterials=createGrassColors().map(color=>new THREE.MeshStandardMaterial({color,roughness:.9}));
 const crystal=api.crystals.add({tile:t(...WORLD_START.crystal),parent:group,destination:'world',label:'Use Iter Crystal'});
 const resource=(kind,x,z)=>{const node=api.resourceActions.add(createResourceEntity({kind,tile:t(x,z),parent:group,pickables:api.pickables,respawn:8}));nodes.push(node);return node;};
 for(const [x,z] of [[3,4],[5,15],[16,14],[17,9],[4,10],[13,17]])resource('tree',x,z);
 for(const [x,z] of [[15,3],[7,17]])resource('boulder',x,z);
 for(const [x,z,kind] of [[8,5,'sticks'],[12,14,'sticks'],[6,8,'stones'],[14,11,'stones']])resource(kind,x,z);
 createTerrainBatch({tiles,map,factory:tile=>makeTerrainTile(tile,map,grassMaterials[(tile.x*7+tile.z)%4]),parent:group,pickables:api.pickables,preserve:grassMaterials,roughness:.9,
  decorate(tile,model){if(!tile.blocked&&!nodes.some(n=>n.tile===tile)&&(tile.x*11+tile.z*5)%9===0){const flowers=makeFlowers();flowers.position.y=tile.h;model.add(flowers);}}});
 return {
  id:'world',name:'Quadria',description:'The open world',group,tiles:map,crystal,
  camera:{zoom:22,angle:Math.PI/4,elevation:THREE.MathUtils.degToRad(35.264)},
  arrival:()=>crystal.tile,
  reset(){api.resourceActions.resetWhere(node=>nodes.includes(node));},
 };
}
