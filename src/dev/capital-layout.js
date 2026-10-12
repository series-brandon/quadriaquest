import {createCityData,fillCity} from '../city-map.js';
import {seeded} from '../building-kit.js';
import {USE_ICONS} from '../furnish.js';

// Gelton, the capital: its first layout (city Phase 9; docs/CITY.md, Streaming and the world). Dev only: it writes
// src/maps/capital.json (scripts/generate-capital.mjs), which the city editor then refines by hand. The
// layout follows the city design:
//  - 128 × 128 tiles (2 × 2 storage regions), flat streets with the castle on a terrace two blocks up,
//    reached by a 5-wide grand stair at the head of the main avenue;
//  - the town square at the centre holds the Iter Crystal where the player wakes, with the fountain,
//    the jobs noticeboard, benches and lamps; the castle is in view up the avenue;
//  - a 5-wide avenue north to the castle, a 3-wide avenue south, a main street east–west through the
//    square, 3-wide cross streets and 2-wide alleys;
//  - districts by style: timber west (the market), brick east (the craft quarter), stone south and on
//    the castle terrace; shops with signs and awnings on the main street; an inn and a guild hall with
//    separate interiors; the castle keep (separate, two floors inside) with four towers inside a
//    curtain wall; a market square of stalls; a park with the sewer entrance (a dungeon);
//  - townsfolk: vendors, shoppers, sitters, strollers, chatters and guards on patrol.
export const CAPITAL={size:128,square:{x0:57,z0:63,x1:71,z1:79},crystal:[64,74],spawn:[64,76],fountain:[63,68],
 terrace:{x0:28,z0:2,x1:99,z1:27},courtyard:{x0:44,z0:4,x1:84,z1:24},gate:[62,66],keep:{x:54,z:6,w:21,d:11},
 market:{x0:33,z0:48,x1:55,z1:69},park:{x0:66,z0:80,x1:71,z1:97},stair:{x:62,z:31,dir:'n',length:4,width:5}};
const STREETS=[{x0:62,z0:32,x1:66,z1:62},{x0:63,z0:80,x1:65,z1:123},{x0:4,z0:70,x1:56,z1:72},{x0:72,z0:70,x1:123,z1:72},
 {x0:30,z0:32,x1:32,z1:123},{x0:96,z0:32,x1:98,z1:123},{x0:4,z0:46,x1:123,z1:47},{x0:4,z0:98,x1:123,z1:100},{x0:4,z0:28,x1:123,z1:31}];
const BLOCKS=[[4,29,33,45],[33,61,33,45],[67,95,33,45],[99,123,33,45],[4,29,48,69],[72,95,48,69],[99,123,48,69],
 [4,29,73,97],[33,55,73,97],[72,95,73,97],[99,123,73,97],[4,29,101,123],[33,62,101,123],[66,95,101,123],[99,123,101,123]];
// Gateways in the city wall (the countryside's roads start here; countryside.js reads the same list).
export const CAPITAL_GATES=[{side:'west',from:70,to:72},{side:'east',from:70,to:72},{side:'south',from:63,to:65}];
// Shops by trade (Phase 10 furnishing); signs follow the trade.
const TRADES=['smithy','fishmonger','grocer','weaponsmith','armourer','apothecary','store','tavern','bakery','tailor','carpenter'];
// Shopkeepers who also ask for jobs (jobs.js GIVERS), by their shop's trade.
const WALL_THICKNESS=3;
const JOB_GIVERS={smithy:'smith',fishmonger:'fishmonger',bakery:'baker'};
const styleAt=(x,z)=>z>100?'stone':x<56?'timber':'brick';

export function capitalData(){
 const C=CAPITAL,data=createCityData({id:'capital',name:'Gelton',size:[C.size,C.size],base:1,surface:'grass',style:'timber'}),random=seeded(91);
 data.spawn=[...C.spawn];data.crystal=[...C.crystal];
 for(const s of STREETS)fillCity(data,s,{surface:'cobble'});
 fillCity(data,C.square,{surface:'plaza'});fillCity(data,C.market,{surface:'plaza'});fillCity(data,C.park,{surface:'grass'});
 fillCity(data,C.terrace,{h:3,surface:'flagstone'});fillCity(data,C.courtyard,{surface:'stone'});
 data.stairs.push({...C.stair});
 // The castle: the keep (a separate interior), four towers, and a curtain wall with a gate.
 const {keep,courtyard:Y}=C,ring=[];
 data.buildings.push({x:keep.x,z:keep.z,desc:{name:'castle keep',footprint:[keep.w,keep.d],storeys:3,roof:'flat',style:'stone',doors:[{edge:'south',at:keep.w-1-(64-keep.x)}],windows:'auto',interior:'separate',use:'keep',seed:5},interior:{floors:2,furniture:[{kind:'banner',at:[2,0]},{kind:'banner',at:[18,0]},{kind:'statue',at:[10,2]},{kind:'bench',at:[4,4]},{kind:'bench',at:[15,4]}]}});
 for(const [x,z] of [[Y.x0,Y.z0],[Y.x1-2,Y.z0],[Y.x0,Y.z1-2],[Y.x1-2,Y.z1-2]])data.buildings.push({x,z,desc:{name:'castle tower',footprint:[3,3],storeys:4,roof:'cone',style:'stone',doors:[],windows:'none',interior:'none',seed:x+z}});
 for(let x=Y.x0;x<=Y.x1;x++){ring.push({a:[x,Y.z0],b:[x,Y.z0-1]});if(x<C.gate[0]||x>C.gate[1])ring.push({a:[x,Y.z1],b:[x,Y.z1+1]});}
 for(let z=Y.z0;z<=Y.z1;z++){ring.push({a:[Y.x0,z],b:[Y.x0-1,z]});ring.push({a:[Y.x1,z],b:[Y.x1+1,z]});}
 for(const e of ring)data.edges.push({...e,kind:'wall',options:{storeys:2,style:'stone'}});
 // City blocks: a row of buildings along each street side of a block, doors to the street, with
 // two-tile alleys every few buildings so backyards stay reachable.
 let shop=0,n=0;
 for(const [x0,x1,z0,z1] of BLOCKS){
  const depth=z1-z0+1>=18?6:5,rows=[{z:z0,edge:'north'},{z:z1-depth+1,edge:'south'}];
  const mainStreet=z1===69||z0===73,nearSquare=Math.abs((x0+x1)/2-64)<36&&(z1===69||z0===73||z1===45);
  for(const row of rows){let x=x0,run=0;
   while(x<=x1){const w=Math.min(4+Math.floor(random()*4),x1-x+1);if(w<4)break;
    // A row backing onto the city wall faces its block's yard instead (reached by the alleys), not a
    // door a tile from the wall.
    const nearWall=row.edge==='south'&&z1>=C.size-1-WALL_THICKNESS-2||row.edge==='north'&&z0<=WALL_THICKNESS+2,edge=nearWall?(row.edge==='south'?'north':'south'):row.edge;
    const storeys=nearSquare?2+(random()<.3?1:0):random()<.25?2:1,style=styleAt(x,row.z),at=edge==='north'?Math.floor(w/2):w-1-Math.floor(w/2);
    const isShop=mainStreet&&((row.edge==='south'&&z1===69)||(row.edge==='north'&&z0===73))&&random()<.7;
    const separate=n===14||n===41;
    data.buildings.push({x,z:row.z,desc:{name:separate?(n===14?'the Wandering Slime inn':'guild hall'):isShop?`shop ${++shop}`:`house ${n+1}`,footprint:[w,depth],storeys:separate?2:storeys,roof:storeys>1&&random()<.5?'hip':'gable',style,
     doors:[{edge,at}],chimney:random()<.6,sign:isShop?{icon:USE_ICONS[TRADES[shop%TRADES.length]]||'star',edge:row.edge}:null,awning:isShop?'striped':null,interior:separate?'separate':'inPlace',use:separate?(n===14?'inn':'guildHall'):isShop?TRADES[shop%TRADES.length]:'home',seed:n*13+7,roofColor:separate?'#7a4a8c':undefined},
     ...separate?{interior:{floors:2,furniture:[{kind:'barrel',at:[0,0]},{kind:'barrel',at:[1,0]},{kind:'bench',at:[2,2]},{kind:'crates',at:[w-1,0],floor:1}]}}:{}});
    n++;run++;x+=w;if(run>=3&&x+2<=x1){x+=2;run=0;}
   }}
  // Backyard greenery.
  if(depth===6)for(let x=x0+3;x<x1-2;x+=7)data.props.push({kind:'treeGrate',x,z:z0+depth+2});
 }
 // Tall shops shoulder to shoulder on the square (the liveliest place in the city), doors onto it.
 for(const [x,z,w,d,edge,icon,storeys] of [[57,55,5,8,'south','Culinary',3],[67,55,5,8,'south','quickRestore',3],[57,80,6,8,'north','hammers',2]])
  data.buildings.push({x,z,desc:{name:`square shop (${icon})`,footprint:[w,d],storeys,roof:'hip',style:'timber',doors:[{edge,at:Math.floor(w/2)}],chimney:true,sign:{icon,edge},awning:'striped',interior:'inPlace',use:{Culinary:'bakery',quickRestore:'apothecary',hammers:'smithy'}[icon],seed:x*3+z}});
 // The town square: fountain, crystal, noticeboard, benches, lamps.
 const S=C.square;
 data.props.push({kind:'fountain',x:C.fountain[0],z:C.fountain[1]},{kind:'noticeboard',x:60,z:75},{kind:'bench',x:66,z:66},{kind:'bench',x:60,z:66},
  ...[[S.x0,S.z0],[S.x1,S.z0],[S.x0,S.z1],[S.x1,S.z1]].map(([x,z])=>({kind:'lampPost',x,z})),{kind:'flowerBed',x:67,z:76},{kind:'flowerBed',x:59,z:78});
 // The avenue up to the castle: lamps along both edges; banners and statues at the stair head.
 for(let z=34;z<=60;z+=8)data.props.push({kind:'lampPost',x:62,z},{kind:'lampPost',x:66,z});
 data.props.push({kind:'statue',x:58,z:26},{kind:'statue',x:70,z:26},{kind:'banner',x:60,z:26},{kind:'banner',x:68,z:26});
 // The market square: three rows of stalls with aisles, crates and barrels at the edges.
 for(let j=0;j<3;j++)for(let i=0;i<3;i++)data.props.push({kind:'stall',x:36+i*7,z:51+j*6});
 data.props.push({kind:'crates',x:34,z:49},{kind:'barrel',x:35,z:49},{kind:'sacks',x:53,z:49},{kind:'cart',x:52,z:67},{kind:'well',x:44,z:68});
 // The park: trees, flower beds, a bench and the way down to the sewers.
 data.props.push({kind:'treeGrate',x:67,z:82},{kind:'treeGrate',x:70,z:88},{kind:'flowerBed',x:67,z:93},{kind:'bench',x:69,z:84,rotation:90},{kind:'dungeonEntrance',x:68,z:90,link:'sewers'});
 // Gather spots (shared resource entities, placed by the host; docs/WORLD.md): a couple of trees, fallen
 // sticks and loose rocks in the park, for the odd job without leaving town.
 data.resources=[{kind:'tree',species:'cherry',x:66,z:86},{kind:'tree',species:'willow',x:71,z:94},{kind:'sticks',x:67,z:87},{kind:'sticks',x:70,z:81},{kind:'stones',x:71,z:91},{kind:'stones',x:66,z:96}];
 data.interiors.sewers={kind:'dungeon',name:'The old sewers',size:[16,12],exit:[7,10],furniture:[{kind:'barrel',at:[0,0]},{kind:'crates',at:[15,0]},{kind:'statue',at:[4,4]},{kind:'statue',at:[11,4]},{kind:'sacks',at:[0,11]}]};
 data.props.push({kind:'well',x:46,z:110},{kind:'signpost',x:61,z:73},{kind:'lampPost',x:61,z:96},{kind:'lampPost',x:67,z:110});
 // Townsfolk: vendors at the market, guards on the avenue and the square, and townsfolk at large.
 const guard={rightHand:'copperDagger',leftHand:'copperShield',head:'ironSkullcap'},colors=['#a4ce77','#e0a96d','#9db8e3','#d98fa6','#c7b46a','#8fc9b8','#b49ad6','#e3c07c'];
 data.townsfolk.push(
  {id:'guard-avenue',name:'Guard Rowan',look:{color:'#c85745',loadout:guard},home:[64,34],routine:[{do:'patrol'}],patrol:[[64,34],[64,61]],pace:1.3,line:'The castle is open to all who mind their manners.'},
  {id:'guard-square',name:'Guard Tilly',look:{color:'#c85745',loadout:guard},home:[58,64],routine:[{do:'patrol'}],patrol:[[58,64],[70,64],[70,78],[58,78]],pace:1.3,line:'Welcome to Gelton.'},
  {id:'guard-gate',name:'Guard Barnaby',look:{color:'#c85745',loadout:guard},home:[61,26],routine:[{do:'patrol'}],patrol:[[61,26],[67,26]],pace:1.2,line:'The keep is through the gate.'},
  // Jobs (jobs.js): the post office clerk always has a delivery to someone in town.
  {id:'post-clerk',name:'Pim of the Post',giver:'post',look:{color:'#7fa6d8',loadout:{head:'fishersHat'}},home:[60,77],routine:[{do:'gaze',weight:2},{do:'read',weight:1},{do:'chat',weight:1}],pace:.8,line:'Letters and parcels, all over town.'},
  {id:'crier',name:'Old Hollis',look:{color:'#e3c07c',loadout:{head:'minersCap'}},home:[62,76],routine:[{do:'read',weight:2},{do:'gaze',weight:1},{do:'chat',weight:1}],line:'Jobs go up on the board here in the square.'});
 for(let i=0;i<3;i++)data.townsfolk.push({id:`vendor-${i}`,name:`Vendor ${i+1}`,look:{color:colors[i%8]},home:[37+(i%3)*7,50+Math.floor(i/3)*6],routine:[{do:'vend',weight:6},{do:'stroll',weight:1}]});
 const homes=[[60,69],[68,72],[59,73],[69,77],[64,66],[34,59],[50,66],[40,64],[64,90],[64,105],[20,71],[90,71],[110,71],[31,60],[97,60],[64,45],[64,55],[20,47],[100,47],[31,85],[97,85],[45,99],[85,99],[66,84],[69,95]];
 const routines=[[{do:'stroll',weight:3},{do:'sit',weight:2},{do:'gaze',weight:1},{do:'chat',weight:2}],[{do:'browse',weight:3},{do:'stroll',weight:2},{do:'drink',weight:1}],[{do:'read',weight:1},{do:'enter',weight:2},{do:'stroll',weight:2}],[{do:'stroll',weight:2},{do:'chat',weight:2},{do:'gaze',weight:1}]];
 homes.slice(0,10).forEach(([x,z],i)=>data.townsfolk.push({id:`folk-${i}`,name:['Ada','Bo','Cass','Dill','Effie','Finn','Gus','Hazel','Ira','Jun','Kit','Lark','Moss','Nim','Ollie','Pim','Quill','Rue','Sol','Tam','Uma','Vic','Wyn','Yew','Zed'][i],look:{color:colors[i%8],loadout:i%5===0?{head:'fishersHat'}:null},home:[x,z],routine:routines[i%routines.length],pace:.8+(i%5)*.1}));
 // Residents and shopkeepers (kept modest for the frame budget, user 2026-10-11): a keeper for every
 // other shop and a resident in every tenth house, living in or
 // minding their own building (through its door).
 const first=['Alder','Bryn','Coral','Dunstan','Elsie','Fenwick','Greer','Hob','Ivo','Juniper','Kell','Linnet','Mabry','Nettle','Orrin','Pearl','Quince','Rook','Sorrel','Thistle','Ulric','Vesper','Wick','Yarrow'];
 let r=0;
 data.buildings.forEach((b,i)=>{if(b.desc.interior!=='inPlace'||!b.desc.doors?.length)return;const shop=!!b.desc.sign;if(shop?i%2!==0:i%10!==0)return;
  data.townsfolk.push({id:`resident-${i}`,name:`${first[r%first.length]}${r>=first.length?' '+(Math.floor(r/first.length)+1):''}`,look:{color:colors[r%8],loadout:r%5===0?{head:'minersCap'}:null},house:i,...(shop&&JOB_GIVERS[b.desc.use]?{giver:JOB_GIVERS[b.desc.use]}:{}),
   routine:shop?[{do:'keep',weight:6},{do:'tend',weight:1},{do:'chat',weight:1}]:[{do:'home',weight:3},{do:'sleep',weight:1},{do:'cook',weight:1},{do:'sit',weight:2},{do:'tend',weight:2},{do:'stroll',weight:2},{do:'chat',weight:1}],line:shop?'Have a look at what I’ve got.':'Mind the step on your way in.'});r++;});
 // The city wall (city-walls.js; docs/WORLD.md): a castle curtain wall three tiles thick on the outer
 // ring, round towers at the corners and a gatehouse with double doors at each gateway, where the main
 // street leaves west and east and the avenue south into the countryside.
 data.walls={thickness:WALL_THICKNESS};
 // Two guards posted at every entrance, outside against the wall either side of the gateway, looking out
 // along the road (they stand on the countryside's land; buildCity's `outside`).
 const N=C.size-1;
 for(const g of CAPITAL_GATES){const facing={west:'w',east:'e',south:'s',north:'n'}[g.side];
  const spots=g.side==='west'?[[-1,g.from-1],[-1,g.to+1]]:g.side==='east'?[[N+1,g.from-1],[N+1,g.to+1]]:g.side==='south'?[[g.from-1,N+1],[g.to+1,N+1]]:[[g.from-1,-1],[g.to+1,-1]];
  spots.forEach(([x,z],i)=>data.townsfolk.push({id:`gate-${g.side}-${i}`,name:`Guard ${['Osric','Brann','Wilda','Torvin','Maud','Edric'][data.townsfolk.filter(t=>t.id?.startsWith('gate-')).length%6]}`,
   look:{color:'#c85745',loadout:{rightHand:'copperDagger',leftHand:'copperShield',head:'ironSkullcap'}},home:[x,z],routine:[{do:'post'}],facing,pace:1.1,line:'Safe travels. Mind the goblins in the hills.'}));}
 data.gates=CAPITAL_GATES.map(g=>({...g}));
 return data;
}
