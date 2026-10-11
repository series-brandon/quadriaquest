import * as THREE from 'three';
import {cachedMergedMesh} from './merged-model.js';
import {W,B,S,C,COL} from './prop-parts.js';

// A marker floating over a townsfolk's head (jobs.js): 'offer', a gold "!" when they have a job for you;
// 'due', a parcel when you have something to hand them (a delivery, or a job that's ready). Unlit and
// still, like the other world markers; any character can carry one.
const PARTS={
 offer:()=>[W(COL.gold,B(.09,.26,.09),[0,.2,0]),W(COL.gold,S(.06,8,6),[0,0,0]),W('#8a6a24',B(.11,.03,.11),[0,.34,0])],
 due:()=>[W('#c9a878',B(.26,.2,.2),[0,.1,0]),W('#8a5b3c',B(.27,.03,.05),[0,.2,0]),W('#8a5b3c',B(.05,.21,.21),[0,.1,0]),W(COL.gold,C(.04,.04,.02,8),[0,.215,0])],
};
export const JOB_MARKERS=Object.keys(PARTS);
export function makeJobMarker(kind){const mesh=cachedMergedMesh('job-marker:'+kind,PARTS[kind]);const group=new THREE.Group();group.name='job-marker-'+kind;group.add(mesh);return group;}
