import {createCityData,fillCity} from '../city-map.js';
import {PROPS,PROP_CATEGORIES,propFootprint} from '../props.js';

// The prop gallery (playground only; city Phase 10): every prop in rows by category, on paving, with
// its interaction live (sit, sleep, cook, smith, open, read, drink…), and the edge pieces (a fence with a
// wooden gate, a low stone wall, an iron gate in a railing). Hover a prop for its name.
export function propGalleryData(){
 const rowsOf=Object.entries(PROP_CATEGORIES),data=createCityData({id:'prop-gallery',name:'Prop gallery',size:[64,14+rowsOf.length*12],surface:'plaza'});
 data.spawn=[4,4];let z=6;
 for(const [,kinds] of rowsOf){let x=3,rowDepth=0;
  // Props that only stand on water (a moored boat) aren't here: the gallery is paved; see them in the
  // model catalogue or place them on water in the editor.
  for(const kind of kinds.filter(k=>PROPS[k].water!=='only')){const [w,d]=propFootprint(kind,0);if(x+w>60){x=3;z+=rowDepth+3;rowDepth=0;}
   // Wall-mounted props need a wall behind them: a short stretch of wall on their north edge.
   if(PROPS[kind].mount==='wall')data.edges.push({a:[x,z],b:[x,z-1],kind:'wall'});
   data.props.push({kind,x,z,rotation:0,...kind==='chest'?{loot:{copperOre:2}}:{}});x+=w+2;rowDepth=Math.max(rowDepth,d);}
  fillCity(data,{x0:1,z0:z+rowDepth+1,x1:62,z1:z+rowDepth+1},{surface:'cobble'});z+=rowDepth+5;}
 // Edge pieces: a fence with a wooden gate, a low stone wall, and an iron gate in a railing line.
 for(let x=4;x<=10;x++)data.edges.push({a:[x,2],b:[x,1],kind:x===7?'door':'fence',...x===7?{options:{style:'fenceGate'}}:{}});
 for(let x=13;x<=18;x++)data.edges.push({a:[x,2],b:[x,1],kind:'low',options:{style:'stone'}});
 for(let x=21;x<=27;x++)data.edges.push({a:[x,2],b:[x,1],kind:x===24?'door':'railing',...x===24?{options:{style:'ironGate'}}:{}});
 return data;
}
