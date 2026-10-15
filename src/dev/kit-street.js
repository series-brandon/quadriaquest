import {createMapData,fillMap} from '../world-map.js';
import {USE_ICONS} from '../furnish.js';

// Kit street as map data (dev only; city Phases 4–7): a test street for the building kit and the city
// systems, used by tests and the perf scenarios (city-walk, city-crowd); not in the playground panel.
// To do (docs/HANDOFF.md, Open follow-ups): remove it or clean it up into a proper test bed.
// A 13 × 13 town square ringed by two- and three-storey buildings, a 5-wide avenue north to the castle,
// 3-wide streets, 2-wide alleys, small and medium houses, a terraced row sharing walls and locked shells,
// plus an annex to the east for elevation, stairs, retaining walls and the prop set.
// Annex (x 59–90):
//  - a connecting street from the east street, then a paved lower plaza (h 1) with the props: benches,
//    stalls, a well, a noticeboard, lamps, a statue, crates, barrels, sacks, a cart, a signpost, a banner;
//  - terrace A (one block up, h 2) along the north, reached by a 3-wide stair, with a cottage on it;
//  - terrace B (two blocks up, h 3) behind it, reached by a narrow 1-wide stair from terrace A;
//  - terrace C (two blocks up, h 3) to the south-west, reached by a 2-wide stair with a landing halfway;
//  - a garden to the south: flower beds, hedges, trees in grates, planters;
//  - Phase 7: a two-storey guild house on terrace A with a separate interior and a stairwell, and a
//    dungeon entrance in the garden down to a small crypt.
// The layout (from the city Phase 2 graybox, at the proposed scale). House: enterable ground floor.
// Shell: solid, locked door. Doors are 'x,z,side'.
export const GRAYBOX={W:60,H:60,spawn:[30,36],plaza:{x0:24,z0:25,x1:36,z1:37},fountain:{x0:29,z0:30,x1:31,z1:32},crystal:[30,34]};
// House: enterable ground floor (upper storeys are Phase 7). Shell: solid, locked door. Doors are 'x,z,side'.
export const BUILDINGS=[
 // Around the square.
 {name:'square north-west (3 storeys)',kind:'house',storeys:3,x0:24,z0:21,x1:27,z1:24,door:'25,24,s'},
 {name:'square north-east (3 storeys)',kind:'house',storeys:3,x0:33,z0:21,x1:36,z1:24,door:'35,24,s'},
 {name:'square west (2 storeys)',kind:'house',storeys:2,x0:20,z0:25,x1:23,z1:28,door:'23,26,e'},
 {name:'square west (3 storeys)',kind:'house',storeys:3,x0:20,z0:33,x1:23,z1:37,door:'23,35,e'},
 {name:'square east (3 storeys)',kind:'house',storeys:3,x0:37,z0:25,x1:40,z1:28,door:'37,26,w'},
 {name:'square east (2 storeys)',kind:'house',storeys:2,x0:37,z0:33,x1:40,z1:37,door:'37,35,w'},
 {name:'square south-west (2 storeys)',kind:'house',storeys:2,x0:24,z0:38,x1:28,z1:41,door:'26,38,n'},
 {name:'square south-east (3 storeys)',kind:'house',storeys:3,x0:32,z0:38,x1:36,z1:41,door:'34,38,n'},
 {name:'corner north-west (2 storeys)',kind:'house',storeys:2,x0:20,z0:21,x1:23,z1:24,door:'20,22,w'},
 {name:'corner north-east (2 storeys)',kind:'house',storeys:2,x0:37,z0:21,x1:40,z1:24,door:'40,22,e'},
 {name:'corner south-west (2 storeys)',kind:'house',storeys:2,x0:20,z0:38,x1:23,z1:41,door:'20,39,w'},
 {name:'corner south-east (2 storeys)',kind:'house',storeys:2,x0:37,z0:38,x1:40,z1:41,door:'40,40,e'},
 // Along the streets.
 {name:'small house',kind:'house',x0:4,z0:25,x1:6,z1:27,door:'5,27,s'},
 {name:'small house (4×4)',kind:'house',x0:9,z0:24,x1:12,z1:27,door:'10,27,s'},
 {name:'medium house (5×5)',kind:'house',x0:13,z0:23,x1:17,z1:27,door:'15,27,s'},
 {name:'medium house (7×6)',kind:'house',x0:4,z0:34,x1:10,z1:39,door:'7,34,n'},
 {name:'large hall (6×8, two storeys)',kind:'shell',storeys:2,x0:12,z0:34,x1:17,z1:41,door:'14,34,n'},
 {name:'small house',kind:'house',x0:45,z0:25,x1:47,z1:27,door:'46,27,s'},
 {name:'two-storey house (6×5)',kind:'shell',storeys:2,x0:50,z0:23,x1:55,z1:27,door:'52,27,s'},
 {name:'terraced house 1',kind:'house',x0:43,z0:34,x1:45,z1:37,door:'44,34,n'},
 {name:'terraced house 2',kind:'house',x0:46,z0:34,x1:48,z1:37,door:'47,34,n'},
 {name:'terraced house 3',kind:'house',x0:49,z0:34,x1:51,z1:37,door:'50,34,n'},
 {name:'medium house (6×6)',kind:'house',x0:54,z0:34,x1:59,z1:39,door:'56,34,n'},
 {name:'south house (3×3)',kind:'house',x0:24,z0:45,x1:26,z1:47,door:'26,46,e'},
 {name:'south house (6×5)',kind:'house',x0:33,z0:45,x1:38,z1:49,door:'33,47,w'},
 // The north terrace and the castle.
 {name:'terrace house (6×6)',kind:'house',x0:20,z0:12,x1:25,z1:17,door:'25,14,e'},
 {name:'terrace house (4×4)',kind:'house',x0:14,z0:13,x1:17,z1:16,door:'17,14,e'},
 {name:'guild hall (8×8, two storeys)',kind:'shell',storeys:2,x0:35,z0:11,x1:42,z1:18,door:'35,14,w'},
 // The keep in two wings meeting on the chunk line at x = 32 (a building fits inside one chunk; docs/WORLD.md).
 {name:'castle keep',kind:'shell',storeys:3,x0:24,z0:2,x1:31,z1:7,door:'30,7,s'},
 {name:'castle keep (east wing)',kind:'shell',storeys:3,x0:32,z0:2,x1:36,z1:7},
 {name:'castle tower',kind:'shell',storeys:4,x0:21,z0:1,x1:23,z1:3},
 {name:'castle tower',kind:'shell',storeys:4,x0:37,z0:1,x1:39,z1:3},
 {name:'castle tower',kind:'shell',storeys:4,x0:21,z0:6,x1:23,z1:8},
 {name:'castle tower',kind:'shell',storeys:4,x0:37,z0:6,x1:39,z1:8},
];
export const STREETS=[{x0:28,z0:9,x1:32,z1:24},{x0:2,z0:30,x1:23,z1:32},{x0:37,z0:30,x1:58,z1:32},{x0:29,z0:38,x1:31,z1:58},{x0:29,z0:8,x1:31,z1:8},{x0:2,z0:28,x1:23,z1:29},{x0:37,z0:28,x1:58,z1:29},{x0:2,z0:33,x1:23,z1:33},{x0:37,z0:33,x1:58,z1:33}];

// Each layout building as a building-kit description.
// Districts by style: timber around the square and west street, brick for the east (craft) street,
// stone for the castle quarter; the guild hall's roof colour marks it as public. Ring buildings facing
// the square are shops with awnings and signs. Shells (no interior) keep their locked doors.
// Shops on the square, by trade (Phase 10 furnishing); their signs follow the trade (furnish.js USE_ICONS).
const SHOP_USES=['smithy','fishmonger','grocer','weaponsmith','armourer','apothecary','bakery','tailor'];
const SIDE_NAMES={n:'north',e:'east',s:'south',w:'west'};
export function kitDescription(b,i){
 const w=b.x1-b.x0+1,d=b.z1-b.z0+1,doors=[];
 if(b.door){const [x,z,side]=b.door.split(','),edge=SIDE_NAMES[side];doors.push({edge,at:edge==='north'?x-b.x0:edge==='east'?z-b.z0:edge==='south'?b.x1-x:b.z1-z});}
 const ring=b.name.startsWith('square '),castle=b.name.startsWith('castle'),tower=b.name==='castle tower';
 const style=castle||b.name.startsWith('terrace')||b.name.startsWith('guild')?'stone':i>=17&&i<=22?'brick':'timber';
 const roof=tower?'cone':b.name.startsWith('castle keep')?'flat':b.kind==='shell'||(b.storeys||1)>=3?'hip':i%3===2?'hip':'gable';
 const trade=ring&&i%2===0?SHOP_USES[(i/2)%SHOP_USES.length]:null,shop=trade?{icon:USE_ICONS[trade]||'star',edge:doors[0].edge}:null;
 return {name:b.name,footprint:[w,d],storeys:b.storeys||1,roof,style,doors,windows:tower?'none':'auto',chimney:!castle&&b.kind==='house',
  sign:shop,awning:shop?'striped':null,interior:b.kind==='shell'?'none':'inPlace',use:trade||(b.kind==='shell'?'none':'home'),seed:i*7+3,roofColor:b.name.startsWith('guild')?'#7a4a8c':undefined};
}

export const KIT_ANNEX={
 plaza:{x0:66,z0:28,x1:89,z1:38},terraceA:{x0:66,z0:16,x1:89,z1:27},terraceB:{x0:78,z0:16,x1:89,z1:21},terraceC:{x0:61,z0:41,x1:64,z1:46},landing:{x0:66,z0:42,x1:66,z1:45},
 garden:{x0:68,z0:40,x1:89,z1:50},
 stairs:[{x:70,z:29,dir:'n',length:2,width:3},{x:82,z:23,dir:'n',length:2,width:1},{x:68,z:44,dir:'w',length:2,width:2},{x:65,z:44,dir:'w',length:2,width:2}],
 // A two-storey guild house with a separate interior (Phase 7): its door leads into its own space,
 // with a stairwell up to the first floor.
 guildHouse:{x:70,z:17,desc:{name:'guild house',footprint:[5,4],storeys:2,roof:'hip',style:'stone',doors:[{edge:'south',at:2}],chimney:true,interior:'separate',use:'guildHall',seed:12,roofColor:'#3f6f8c'},
  interior:{floors:2,furniture:[{kind:'barrel',at:[3,0]},{kind:'crates',at:[4,0]},{kind:'sacks',at:[4,1]},{kind:'planter',at:[4,0],floor:1},{kind:'bench',at:[2,0],floor:1}]}},
 // A dungeon entrance in the garden, down to a small crypt (Phase 7).
 crypt:{entrance:{x:86,z:47},spec:{kind:'dungeon',name:'Old crypt',size:[12,9],exit:[5,7],furniture:[{kind:'barrel',at:[0,0]},{kind:'crates',at:[11,0]},{kind:'statue',at:[3,3]},{kind:'statue',at:[8,3]},{kind:'sacks',at:[0,8]}]}},
 cottage:{x:84,z:23,desc:{name:'terrace cottage',footprint:[3,3],storeys:1,roof:'gable',style:'stone',doors:[{edge:'south',at:1}],chimney:true,seed:41}},
};
export function kitStreetData(){
 const data=createMapData({id:'kit-street',name:'Kit street',size:[91,61],base:1,surface:'grass',style:'timber'});
 data.spawn=[...GRAYBOX.spawn];data.crystal=[...GRAYBOX.crystal];
 fillMap(data,GRAYBOX.plaza,{surface:'plaza'});
 for(const s of STREETS)fillMap(data,s,{surface:'cobble'});
 BUILDINGS.forEach((b,i)=>data.buildings.push({x:b.x0,z:b.z0,desc:kitDescription(b,i)}));
 // The square: the fountain, a bench facing it, and four lamps clear of every doorstep.
 data.props.push({kind:'fountain',x:GRAYBOX.fountain.x0,z:GRAYBOX.fountain.z0},{kind:'bench',x:29,z:27},...[[26,27],[34,27],[26,35],[34,35]].map(([x,z])=>({kind:'lampPost',x,z})));
 // The annex.
 const A=KIT_ANNEX;
 fillMap(data,{x0:59,z0:28,x1:65,z1:33},{surface:'cobble'});
 fillMap(data,A.plaza,{surface:'plaza'});
 fillMap(data,A.terraceA,{h:2,surface:'flagstone'});
 fillMap(data,A.terraceB,{h:3,surface:'stone'});
 fillMap(data,A.terraceC,{h:3,surface:'flagstone'});
 fillMap(data,A.landing,{h:2,surface:'stone'});
 fillMap(data,{x0:69,z0:39,x1:69,z1:50},{surface:'dirt'});fillMap(data,{x0:69,z0:46,x1:89,z1:46},{surface:'dirt'});
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
 // Phase 10 edge pieces: a fenced pen with a wooden gate in the garden, a low stone wall along the
 // plaza's south edge, and an iron gate at the top of the narrow stair.
 const pen={x0:76,z0:49,x1:80,z1:50},edge=(a,b,kind,options)=>data.edges.push({a,b,kind,...options?{options}:{}});
 for(let x=pen.x0;x<=pen.x1;x++){edge([x,pen.z0],[x,pen.z0-1],x===78?'door':'fence',x===78?{style:'fenceGate'}:undefined);edge([x,pen.z1],[x,pen.z1+1],'fence');}
 for(let z=pen.z0;z<=pen.z1;z++){edge([pen.x0,z],[pen.x0-1,z],'fence');edge([pen.x1,z],[pen.x1+1,z],'fence');}
 for(let x=80;x<=88;x++)edge([x,38],[x,39],'low',{style:'stone'});
 edge([82,21],[82,22],'door',{style:'ironGate'});
 data.props.push({kind:'hayBales',x:79,z:50},{kind:'waterTrough',x:76,z:50},{kind:'treeStump',x:80,z:49});
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
  {id:'holt',name:'Guard Holt',look:{color:'#c85745',loadout:guard},home:[25,27],routine:[{do:'patrol',weight:1}],patrol:[[25,27],[35,27],[35,36],[25,36]],pace:1.3,line:'Keep the peace, citizen.'},
  {id:'ivy',name:'Guard Ivy',look:{color:'#c85745',loadout:guard},home:[61,30],routine:[{do:'patrol',weight:1}],patrol:[[40,31],[60,31],[70,33]],pace:1.3,line:'All quiet on the east street.'},
  {id:'nell',name:'Nell',look:{color:'#e3c07c'},home:[33,30],routine:[{do:'drink',weight:2},{do:'gaze',weight:1},{do:'sit',weight:1}]},
  {id:'pell',name:'Pell',look:{color:'#d98fa6'},home:[70,24],routine:[{do:'sit',weight:2},{do:'stroll',weight:2}]},
  {id:'dot',name:'Dot',look:{color:'#8fc9b8'},home:[64,31],routine:[{do:'stroll',weight:2},{do:'enter',weight:1}]});
 // Residents and shopkeepers (live in or mind a building of their own, through its door).
 const names=['Abel','Briony','Cob','Della','Ewan','Fay','Gil','Hester','Isla','Jory','Kester','Lottie','Merrick','Nan'],colors=['#a4ce77','#e0a96d','#9db8e3','#d98fa6','#c7b46a','#8fc9b8','#b49ad6','#e3c07c'];
 let n=0;
 data.buildings.forEach((b,i)=>{if(b.desc.interior!=='inPlace'||!b.desc.doors?.length||n>=6)return;
  const shop=!!b.desc.sign,resident=shop||i%2===1;if(!resident)return;
  data.townsfolk.push({id:`resident-${i}`,name:names[n],look:{color:colors[n%colors.length],loadout:n%4===0?{head:'minersCap'}:null},house:i,
   routine:shop?[{do:'keep',weight:6},{do:'tend',weight:1},{do:'chat',weight:1}]:[{do:'home',weight:3},{do:'sleep',weight:1},{do:'cook',weight:1},{do:'sit',weight:2},{do:'tend',weight:2},{do:'stroll',weight:2},{do:'chat',weight:1}],
   line:shop?'Come in, come in! Stock’s coming soon.':'Home sweet home.'});n++;});
 return data;
}
