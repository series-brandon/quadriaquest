import {createCityData,fillCity} from '../city-map.js';
import {BUILDINGS,GRAYBOX,STREETS,kitDescription} from './graybox-street.js';

// Kit street as city data (playground only; city Phases 4–5): the graybox layout built by the building
// kit, plus an annex to the east for elevation, stairs, retaining walls and the prop set, clear of the
// existing buildings. It is ordinary city data, so the city editor (Phase 6) opens it like any city.
// Annex (x 59–90):
//  - a connecting street from the east street, then a paved lower plaza (h 1) with the props: benches,
//    stalls, a well, a noticeboard, lamps, a statue, crates, barrels, sacks, a cart, a signpost, a banner;
//  - terrace A (one block up, h 2) along the north, reached by a 3-wide stair, with a cottage on it;
//  - terrace B (two blocks up, h 3) behind it, reached by a narrow 1-wide stair from terrace A;
//  - terrace C (two blocks up, h 3) to the south-west, reached by a 2-wide stair with a landing halfway;
//  - a garden to the south: flower beds, hedges, trees in grates, planters;
//  - Phase 7: a two-storey guild house on terrace A with a separate interior and a stairwell, and a
//    dungeon entrance in the garden down to a small crypt.
export const KIT_ANNEX={
 plaza:{x0:66,z0:28,x1:89,z1:38},terraceA:{x0:66,z0:16,x1:89,z1:27},terraceB:{x0:78,z0:16,x1:89,z1:21},terraceC:{x0:61,z0:41,x1:64,z1:46},landing:{x0:66,z0:42,x1:66,z1:45},
 garden:{x0:68,z0:40,x1:89,z1:50},
 stairs:[{x:70,z:29,dir:'n',length:2,width:3},{x:82,z:23,dir:'n',length:2,width:1},{x:68,z:44,dir:'w',length:2,width:2},{x:65,z:44,dir:'w',length:2,width:2}],
 // A two-storey guild house with a separate interior (Phase 7): its door leads into its own space,
 // with a stairwell up to the first floor.
 guildHouse:{x:70,z:17,desc:{name:'guild house',footprint:[5,4],storeys:2,roof:'hip',style:'stone',doors:[{edge:'south',at:2}],chimney:true,interior:'separate',seed:12,roofColor:'#3f6f8c'},
  interior:{floors:2,furniture:[{kind:'barrel',at:[3,0]},{kind:'crates',at:[4,0]},{kind:'sacks',at:[4,1]},{kind:'planter',at:[4,0],floor:1},{kind:'bench',at:[2,0],floor:1}]}},
 // A dungeon entrance in the garden, down to a small crypt (Phase 7).
 crypt:{entrance:{x:86,z:47},spec:{kind:'dungeon',name:'Old crypt',size:[12,9],exit:[5,7],furniture:[{kind:'barrel',at:[0,0]},{kind:'crates',at:[11,0]},{kind:'statue',at:[3,3]},{kind:'statue',at:[8,3]},{kind:'sacks',at:[0,8]}]}},
 cottage:{x:84,z:23,desc:{name:'terrace cottage',footprint:[3,3],storeys:1,roof:'gable',style:'stone',doors:[{edge:'south',at:1}],chimney:true,seed:41}},
};
export function kitStreetData(){
 const data=createCityData({id:'kit-street',name:'Kit street',size:[91,61],base:1,surface:'grass',style:'timber'});
 data.spawn=[...GRAYBOX.spawn];data.crystal=[...GRAYBOX.crystal];
 fillCity(data,GRAYBOX.plaza,{surface:'plaza'});
 for(const s of STREETS)fillCity(data,s,{surface:'cobble'});
 BUILDINGS.forEach((b,i)=>data.buildings.push({x:b.x0,z:b.z0,desc:kitDescription(b,i)}));
 // The square: the fountain, a bench facing it, and four lamps clear of every doorstep.
 data.props.push({kind:'fountain',x:GRAYBOX.fountain.x0,z:GRAYBOX.fountain.z0},{kind:'bench',x:29,z:27},...[[26,27],[34,27],[26,35],[34,35]].map(([x,z])=>({kind:'lampPost',x,z})));
 // The annex.
 const A=KIT_ANNEX;
 fillCity(data,{x0:59,z0:28,x1:65,z1:33},{surface:'cobble'});
 fillCity(data,A.plaza,{surface:'plaza'});
 fillCity(data,A.terraceA,{h:2,surface:'flagstone'});
 fillCity(data,A.terraceB,{h:3,surface:'stone'});
 fillCity(data,A.terraceC,{h:3,surface:'flagstone'});
 fillCity(data,A.landing,{h:2,surface:'stone'});
 fillCity(data,{x0:69,z0:39,x1:69,z1:50},{surface:'dirt'});fillCity(data,{x0:69,z0:46,x1:89,z1:46},{surface:'dirt'});
 data.stairs.push(...A.stairs.map(s=>({...s})));
 data.buildings.push({x:A.cottage.x,z:A.cottage.z,desc:{...A.cottage.desc}});
 data.buildings.push({x:A.guildHouse.x,z:A.guildHouse.z,desc:{...A.guildHouse.desc},interior:structuredClone(A.guildHouse.interior)});
 data.props.push({kind:'dungeonEntrance',x:A.crypt.entrance.x,z:A.crypt.entrance.z,link:'crypt'});data.interiors.crypt=structuredClone(A.crypt.spec);
 data.props.push(
  {kind:'bench',x:74,z:36},{kind:'bench',x:78,z:36},{kind:'statue',x:85,z:34},{kind:'noticeboard',x:68,z:33},{kind:'well',x:87,z:30},
  {kind:'lampPost',x:69,z:31},{kind:'lampPost',x:77,z:33},{kind:'lampPost',x:83,z:31},
  {kind:'stall',x:74,z:31},{kind:'stall',x:78,z:31},{kind:'crates',x:81,z:30},{kind:'barrel',x:82,z:30},{kind:'sacks',x:81,z:29},
  {kind:'cart',x:85,z:37},{kind:'signpost',x:66,z:30},{kind:'banner',x:89,z:28},
  {kind:'bench',x:74,z:24},{kind:'lampPost',x:76,z:24},{kind:'planter',x:68,z:20},{kind:'statue',x:84,z:18},{kind:'banner',x:80,z:17},
  {kind:'flowerBed',x:72,z:42},{kind:'flowerBed',x:76,z:42},...[70,71,72,73,74].map(x=>({kind:'hedge',x,z:48})),
  {kind:'treeGrate',x:80,z:44},{kind:'treeGrate',x:84,z:44},{kind:'planter',x:88,z:42},{kind:'bench',x:62,z:43,rotation:90});
 // Townsfolk (Phase 8): routines from places. Vendors at the stalls, sitters, shoppers, chatters,
 // strollers, two guards on patrol, and a few who pop indoors now and then.
 const guard={rightHand:'copperDagger',leftHand:'copperShield',head:'ironSkullcap'};
 data.townsfolk.push(
  {id:'pip',name:'Pip',look:{color:'#a4ce77'},home:[28,29],routine:[{do:'sit',weight:3},{do:'gaze',weight:1},{do:'stroll',weight:1}]},
  {id:'marla',name:'Marla',look:{color:'#e0a96d'},home:[74,29],routine:[{do:'vend',weight:6},{do:'stroll',weight:1}],line:'Stall opens once the coin’s minted!'},
  {id:'odo',name:'Odo',look:{color:'#c7b46a',loadout:{head:'minersCap'}},home:[78,29],routine:[{do:'vend',weight:6},{do:'stroll',weight:1}],line:'Best crates this side of the river.'},
  {id:'fen',name:'Fen',look:{color:'#9db8e3'},home:[72,35],routine:[{do:'browse',weight:3},{do:'sit',weight:1},{do:'drink',weight:1},{do:'stroll',weight:1}]},
  {id:'tamsin',name:'Tamsin',look:{color:'#d98fa6'},home:[32,36],routine:[{do:'gaze',weight:2},{do:'chat',weight:2},{do:'stroll',weight:2}]},
  {id:'bram',name:'Bram',look:{color:'#8fc9b8'},home:[27,33],routine:[{do:'chat',weight:2},{do:'stroll',weight:2},{do:'enter',weight:1}]},
  {id:'wren',name:'Wren',look:{color:'#b49ad6',loadout:{head:'fishersHat'}},home:[80,34],routine:[{do:'read',weight:1},{do:'browse',weight:2},{do:'stroll',weight:2}]},
  {id:'holt',name:'Guard Holt',look:{color:'#c85745',loadout:guard},home:[25,27],routine:[{do:'patrol',weight:1}],patrol:[[25,27],[35,27],[35,36],[25,36]],pace:1.3,line:'Keep the peace, citizen.'},
  {id:'ivy',name:'Guard Ivy',look:{color:'#c85745',loadout:guard},home:[61,30],routine:[{do:'patrol',weight:1}],patrol:[[40,31],[60,31],[70,33]],pace:1.3,line:'All quiet on the east street.'},
  {id:'nell',name:'Nell',look:{color:'#e3c07c'},home:[33,30],routine:[{do:'drink',weight:2},{do:'gaze',weight:1},{do:'sit',weight:1}]},
  {id:'corin',name:'Corin',look:{color:'#a4ce77',loadout:{head:'fishersHat'}},home:[76,38],routine:[{do:'sit',weight:2},{do:'stroll',weight:1}]},
  {id:'sable',name:'Sable',look:{color:'#9db8e3'},home:[84,33],routine:[{do:'gaze',weight:2},{do:'chat',weight:1},{do:'stroll',weight:1}]},
  {id:'pell',name:'Pell',look:{color:'#d98fa6'},home:[70,24],routine:[{do:'sit',weight:2},{do:'stroll',weight:2}]},
  {id:'dot',name:'Dot',look:{color:'#8fc9b8'},home:[64,31],routine:[{do:'stroll',weight:2},{do:'enter',weight:1}]});
 return data;
}
