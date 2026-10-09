export const WILLOWBANK={crystal:[3,3],reed:[5,4],bridgeStart:17,bridgeEnd:19,bridgeZ:9,pet:[21,9]};
export function makeWillowbankTiles(){
 const tiles=[];
 for(let z=1;z<=18;z++)for(let x=1;x<=24;x++){
  if((x<=2||x>=23)&&(z<=2||z>=17))continue;
  const island=x>=20&&x<=23&&z>=7&&z<=11;
  const water=x>=17&&!island||x>=14&&z>=14;
  const h=!water&&x>=8&&x<=13&&z<=12?(x>=9&&x<=12&&z<=5?2:1.5):1;
  tiles.push({x,z,h,water,blocked:water,buildable:!water});
 }
 return tiles;
}
