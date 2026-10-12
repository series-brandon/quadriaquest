import * as THREE from 'three';
import {cachedMergedMesh} from './merged-model.js';
import {W,B,C,S,COL} from './prop-parts.js';

// The loot pile's model (loot-piles.js; also in the model catalogue).
// A tied cloth sack with a few coins spilled beside it; the coins show only when the pile holds gold.
export function makeLootPile({gold=true}={}){
 const group=new THREE.Group();group.name='loot-pile';
 group.add(cachedMergedMesh('loot-pile:sack',()=>[W('#b89a6a',S(.2,10,8),[0,.16,0],[0,0,0],[1,.85,1]),W('#a5875a',C(.07,.1,.08,8),[0,.33,0]),W('#7a5a3a',C(.08,.08,.025,8),[0,.29,0]),W('#c9a878',B(.12,.02,.12),[.04,.36,.02],[0,.6,.3])]));
 const coins=cachedMergedMesh('loot-pile:coins',()=>[...[[.22,.02,.08],[.27,.035,.02],[.18,.02,-.06],[-.2,.02,.14]].map(([x,y,z],i)=>W(COL.gold,C(.055,.055,.02,10),[x,y,z],[i*.2,0,i*.15]))]);
 coins.name='loot-pile-coins';coins.visible=gold;group.add(coins);
 return group;
}

