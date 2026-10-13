import {createCityData,fillCity} from '../city-map.js';
import {CHUNK} from '../world-grid.js';
import {seeded} from '../building-kit.js';
import {USE_ICONS} from '../furnish.js';

// Gelton, the capital: its first layout (city Phase 9; docs/CITY.md, Streaming and the world). Dev only: it writes
// src/maps/capital.json (scripts/generate-capital.mjs), which the city editor then refines by hand. The
// layout follows the city design:
//  - 160 × 160 tiles (5 × 5 chunks, in 2 × 2 regions), flat streets with the castle on a terrace two blocks up,
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
// Every building fits inside one 32 × 32 chunk (docs/WORLD.md, Design constraints), so the city's axis
// (the avenue, square and keep) runs down the middle of a chunk: x = 80, in the chunk from 64 to 95.
export const CAPITAL={size:160,axis:80,square:{x0:73,z0:79,x1:87,z1:95},crystal:[80,90],spawn:[80,92],fountain:[79,84],
 terrace:{x0:44,z0:2,x1:115,z1:43},courtyard:{x0:60,z0:4,x1:100,z1:40},gate:[78,82],keep:{x:70,z:6,w:21,d:11},
 market:{x0:49,z0:64,x1:71,z1:85},park:{x0:82,z0:96,x1:87,z1:113},stair:{x:78,z:47,dir:'n',length:4,width:5}};
const STREETS=[{x0:78,z0:48,x1:82,z1:78},{x0:79,z0:96,x1:81,z1:155},{x0:4,z0:86,x1:72,z1:88},{x0:88,z0:86,x1:155,z1:88},
 {x0:46,z0:48,x1:48,z1:155},{x0:112,z0:48,x1:114,z1:155},{x0:4,z0:62,x1:155,z1:63},{x0:4,z0:114,x1:155,z1:116},{x0:4,z0:44,x1:155,z1:47}];
const BLOCKS=[[4,45,49,61],[49,77,49,61],[83,111,49,61],[115,155,49,61],[4,45,64,85],[88,111,64,85],[115,155,64,85],
 [4,45,89,113],[49,71,89,113],[88,111,89,113],[115,155,89,113],[4,45,117,155],[49,78,117,155],[82,111,117,155],[115,155,117,155]];
// Gateways in the city wall (the countryside's roads start here; countryside.js reads the same list).
export const CAPITAL_GATES=[{side:'west',from:86,to:88},{side:'east',from:86,to:88},{side:'south',from:79,to:81}];
// Shops by trade (Phase 10 furnishing); signs follow the trade.
const TRADES=['smithy','fishmonger','grocer','weaponsmith','armourer','apothecary','store','tavern','bakery','tailor','carpenter'];
const WALL_THICKNESS=3;
const styleAt=(x,z)=>z>116?'stone':x<72?'timber':'brick';

export function capitalData(){
 const C=CAPITAL,data=createCityData({id:'capital',name:'Gelton',size:[C.size,C.size],base:1,surface:'grass',style:'timber'}),random=seeded(91);
 data.spawn=[...C.spawn];data.crystal=[...C.crystal];
 for(const s of STREETS)fillCity(data,s,{surface:'cobble'});
 fillCity(data,C.square,{surface:'plaza'});fillCity(data,C.market,{surface:'plaza'});fillCity(data,C.park,{surface:'grass'});
 fillCity(data,C.terrace,{h:3,surface:'flagstone'});fillCity(data,C.courtyard,{surface:'stone'});
 data.stairs.push({...C.stair});
 // The castle: the keep (a separate interior), four towers, and a curtain wall with a gate.
 const {keep,courtyard:Y}=C,ring=[];
 data.buildings.push({x:keep.x,z:keep.z,desc:{name:'castle keep',footprint:[keep.w,keep.d],storeys:3,roof:'flat',style:'stone',doors:[{edge:'south',at:keep.w-1-(C.axis-keep.x)}],windows:'auto',interior:'separate',use:'keep',seed:5},interior:{floors:2,furniture:[{kind:'banner',at:[2,0]},{kind:'banner',at:[18,0]},{kind:'statue',at:[10,2]},{kind:'bench',at:[4,4]},{kind:'bench',at:[15,4]}]}});
 for(const [x,z] of [[Y.x0,Y.z0],[Y.x1-2,Y.z0],[Y.x0,Y.z1-2],[Y.x1-2,Y.z1-2]])data.buildings.push({x,z,desc:{name:'castle tower',footprint:[3,3],storeys:4,roof:'cone',style:'stone',doors:[],windows:'none',interior:'none',seed:x+z}});
 for(let x=Y.x0;x<=Y.x1;x++){ring.push({a:[x,Y.z0],b:[x,Y.z0-1]});if(x<C.gate[0]||x>C.gate[1])ring.push({a:[x,Y.z1],b:[x,Y.z1+1]});}
 for(let z=Y.z0;z<=Y.z1;z++){ring.push({a:[Y.x0,z],b:[Y.x0-1,z]});ring.push({a:[Y.x1,z],b:[Y.x1+1,z]});}
 for(const e of ring)data.edges.push({...e,kind:'wall',options:{storeys:2,style:'stone'}});
 // City blocks: a row of buildings along each street side of a block, doors to the street, with
 // two-tile alleys every few buildings so backyards stay reachable.
 let shop=0,n=0;
 for(const [x0,x1,z0,z1] of BLOCKS){
  const depth=z1-z0+1>=18?6:5,rows=[{z:z0,edge:'north'},{z:z1-depth+1,edge:'south'}];
  const mainStreet=z1===85||z0===89,nearSquare=Math.abs((x0+x1)/2-C.axis)<36&&(z1===85||z0===89||z1===61);
  for(const row of rows){let x=x0,run=0;
   while(x<=x1){let w=Math.min(4+Math.floor(random()*4),x1-x+1);if(w<4)break;
    // A building stops at the next chunk line; a sliver too narrow for one stays open (an extra alley).
    const line=(Math.floor(x/CHUNK)+1)*CHUNK;if(x+w>line){if(line-x<4){x=line;run=0;continue;}w=line-x;}
    // A row backing onto the city wall faces its block's yard instead (reached by the alleys), not a
    // door a tile from the wall.
    const nearWall=row.edge==='south'&&z1>=C.size-1-WALL_THICKNESS-2||row.edge==='north'&&z0<=WALL_THICKNESS+2,edge=nearWall?(row.edge==='south'?'north':'south'):row.edge;
    const storeys=nearSquare?2+(random()<.3?1:0):random()<.25?2:1,style=styleAt(x,row.z),at=edge==='north'?Math.floor(w/2):w-1-Math.floor(w/2);
    const isShop=mainStreet&&((row.edge==='south'&&z1===85)||(row.edge==='north'&&z0===89))&&random()<.7;
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
 for(const [x,z,w,d,edge,icon,storeys] of [[73,71,5,8,'south','Culinary',3],[83,71,5,8,'south','quickRestore',3],[73,96,6,8,'north','hammers',2]])
  data.buildings.push({x,z,desc:{name:`square shop (${icon})`,footprint:[w,d],storeys,roof:'hip',style:'timber',doors:[{edge,at:Math.floor(w/2)}],chimney:true,sign:{icon,edge},awning:'striped',interior:'inPlace',use:{Culinary:'bakery',quickRestore:'apothecary',hammers:'smithy'}[icon],seed:x*3+z}});
 // The town square: fountain, crystal, noticeboard, benches, lamps.
 const S=C.square;
 data.props.push({kind:'fountain',x:C.fountain[0],z:C.fountain[1]},{kind:'noticeboard',x:76,z:91},{kind:'bench',x:82,z:82},{kind:'bench',x:76,z:82},
  ...[[S.x0,S.z0],[S.x1,S.z0],[S.x0,S.z1],[S.x1,S.z1]].map(([x,z])=>({kind:'lampPost',x,z})),{kind:'flowerBed',x:83,z:92},{kind:'flowerBed',x:75,z:94});
 // The avenue up to the castle: lamps along both edges; banners and statues at the stair head.
 for(let z=50;z<=76;z+=8)data.props.push({kind:'lampPost',x:78,z},{kind:'lampPost',x:82,z});
 data.props.push({kind:'statue',x:74,z:42},{kind:'statue',x:86,z:42},{kind:'banner',x:76,z:42},{kind:'banner',x:84,z:42});
 // The market square: three rows of stalls with aisles, crates and barrels at the edges.
 for(let j=0;j<3;j++)for(let i=0;i<3;i++)data.props.push({kind:'stall',x:52+i*7,z:67+j*6});
 data.props.push({kind:'crates',x:50,z:65},{kind:'barrel',x:51,z:65},{kind:'sacks',x:69,z:65},{kind:'cart',x:68,z:83},{kind:'well',x:60,z:84});
 // The park: trees, flower beds, a bench and the way down to the sewers.
 data.props.push({kind:'treeGrate',x:83,z:98},{kind:'treeGrate',x:86,z:104},{kind:'flowerBed',x:83,z:109},{kind:'bench',x:85,z:100,rotation:90},{kind:'dungeonEntrance',x:84,z:106,link:'sewers'});
 // Gather spots (shared resource entities, placed by the host; docs/WORLD.md): a couple of trees, fallen
 // sticks and loose rocks in the park, for the odd job without leaving town.
 data.resources=[{kind:'tree',species:'cherry',x:82,z:102},{kind:'tree',species:'willow',x:87,z:110},{kind:'sticks',x:83,z:103},{kind:'sticks',x:86,z:97},{kind:'stones',x:87,z:107},{kind:'stones',x:82,z:112}];
 data.interiors.sewers={kind:'dungeon',name:'The old sewers',size:[16,12],exit:[7,10],furniture:[{kind:'barrel',at:[0,0]},{kind:'crates',at:[15,0]},{kind:'statue',at:[4,4]},{kind:'statue',at:[11,4]},{kind:'sacks',at:[0,11]}]};
 data.props.push({kind:'well',x:62,z:126},{kind:'signpost',x:77,z:89},{kind:'lampPost',x:77,z:112},{kind:'lampPost',x:83,z:126});
 // The post office: the shop nearest the town square, run by Pim of the Post from behind its counter.
 const post=data.buildings.map((b,i)=>({b,i})).filter(({b})=>b.desc.sign&&b.desc.interior==='inPlace').sort((p,q)=>Math.hypot(p.b.x-C.axis,p.b.z-88)-Math.hypot(q.b.x-C.axis,q.b.z-88))[0];
 Object.assign(post.b.desc,{name:'Post office',use:'postOffice',sign:{...post.b.desc.sign,icon:USE_ICONS.postOffice}});
 // Townsfolk: vendors at the market, guards on the avenue and the square, and townsfolk at large.
 const guard={rightHand:'copperDagger',leftHand:'copperShield',head:'ironSkullcap'},colors=['#a4ce77','#e0a96d','#9db8e3','#d98fa6','#c7b46a','#8fc9b8','#b49ad6','#e3c07c'];
 data.townsfolk.push(
  {id:'guard-avenue',name:'Guard Rowan',look:{color:'#c85745',loadout:guard},home:[80,50],routine:[{do:'patrol'}],patrol:[[80,50],[80,77]],pace:1.3,line:'The castle is open to all who mind their manners.'},
  {id:'guard-square',name:'Guard Tilly',look:{color:'#c85745',loadout:guard},home:[74,80],routine:[{do:'patrol'}],patrol:[[74,80],[86,80],[86,94],[74,94]],pace:1.3,line:'Welcome to Gelton.'},
  {id:'guard-gate',name:'Guard Barnaby',look:{color:'#c85745',loadout:guard},home:[77,42],routine:[{do:'patrol'}],patrol:[[77,42],[83,42]],pace:1.2,line:'The keep is through the gate.'},
  // Jobs (jobs.js): the post office clerk always has a delivery to someone in town.
  {id:'post-clerk',name:'Pim of the Post',giver:'post',look:{color:'#7fa6d8',loadout:{head:'fishersHat'}},house:post.i,routine:[{do:'keep',weight:8},{do:'tend',weight:1}],pace:.8,line:'Letters and parcels, all over town.'},
  {id:'crier',name:'Old Hollis',look:{color:'#e3c07c',loadout:{head:'minersCap'}},home:[78,92],routine:[{do:'read',weight:2},{do:'gaze',weight:1},{do:'chat',weight:1}],line:'Jobs go up on the board here in the square.'});
 for(let i=0;i<3;i++)data.townsfolk.push({id:`vendor-${i}`,name:`Vendor ${i+1}`,look:{color:colors[i%8]},home:[53+(i%3)*7,66+Math.floor(i/3)*6],routine:[{do:'vend',weight:6},{do:'stroll',weight:1}]});
 const homes=[[76,85],[84,88],[75,89],[85,93],[80,82],[50,75],[66,82],[56,80],[80,106],[80,121],[36,87],[106,87],[126,87],[47,76],[113,76],[80,61],[80,71],[36,63],[116,63],[47,101],[113,101],[61,115],[101,115],[82,100],[85,111]];
 const routines=[[{do:'stroll',weight:3},{do:'sit',weight:2},{do:'gaze',weight:1},{do:'chat',weight:2}],[{do:'browse',weight:3},{do:'stroll',weight:2},{do:'drink',weight:1}],[{do:'read',weight:1},{do:'enter',weight:2},{do:'stroll',weight:2}],[{do:'stroll',weight:2},{do:'chat',weight:2},{do:'gaze',weight:1}]];
 homes.slice(0,10).forEach(([x,z],i)=>data.townsfolk.push({id:`folk-${i}`,name:['Ada','Bo','Cass','Dill','Effie','Finn','Gus','Hazel','Ira','Jun','Kit','Lark','Moss','Nim','Ollie','Pim','Quill','Rue','Sol','Tam','Uma','Vic','Wyn','Yew','Zed'][i],look:{color:colors[i%8],loadout:i%5===0?{head:'fishersHat'}:null},home:[x,z],routine:routines[i%routines.length],pace:.8+(i%5)*.1}));
 // Residents and shopkeepers (kept modest for the frame budget, user 2026-10-11): a keeper for every
 // other shop and a resident in every tenth house, living in or
 // minding their own building (through its door).
 const first=['Alder','Bryn','Coral','Dunstan','Elsie','Fenwick','Greer','Hob','Ivo','Juniper','Kell','Linnet','Mabry','Nettle','Orrin','Pearl','Quince','Rook','Sorrel','Thistle','Ulric','Vesper','Wick','Yarrow'];
 let r=0;
 data.buildings.forEach((b,i)=>{if(b.desc.interior!=='inPlace'||!b.desc.doors?.length||b.desc.use==='postOffice')return;const shop=!!b.desc.sign;if(shop?i%2!==0:i%10!==0)return;
  data.townsfolk.push({id:`resident-${i}`,name:`${first[r%first.length]}${r>=first.length?' '+(Math.floor(r/first.length)+1):''}`,look:{color:colors[r%8],loadout:r%5===0?{head:'minersCap'}:null},house:i,
   routine:shop?[{do:'keep',weight:6},{do:'tend',weight:1},{do:'chat',weight:1}]:[{do:'home',weight:3},{do:'sleep',weight:1},{do:'cook',weight:1},{do:'sit',weight:2},{do:'tend',weight:2},{do:'stroll',weight:2},{do:'chat',weight:1}],line:shop?'Have a look at what I’ve got.':'Mind the step on your way in.'});r++;});
 // The city wall (city-walls.js; docs/WORLD.md): a castle curtain wall three tiles thick on the outer
 // ring, round towers at the corners and a gatehouse with double doors at each gateway, where the main
 // street leaves west and east and the avenue south into the countryside.
 data.walls={thickness:WALL_THICKNESS};
 // Green spaces as mini biomes (city-greens.js): each patch of grass gets a theme.
 data.greens={seed:7};
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
