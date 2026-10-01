// Distance to the actual pond boundary, including concave corners.
export function shoreWeight(x,z,edges){
 let distance=Infinity;
 for(const [ax,az,bx,bz] of edges){
  const dx=bx-ax,dz=bz-az,t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz)));
  distance=Math.min(distance,Math.hypot(x-ax-t*dx,z-az-t*dz));
 }
 const t=Math.min(1,distance/.4);
 return t*t*(3-2*t);
}
export function waterWave(x,z,time){
 return .012*Math.sin(x*2.1+z*1.4-time*.8)+.006*Math.sin(z*2.7-x*.9+time*.55);
}
export function pondEdges(tiles){
 const occupied=new Set(tiles.map(t=>`${t.x},${t.z}`)),edges=[];
 for(const {x,z} of tiles){
  if(!occupied.has(`${x-1},${z}`))edges.push([x-.5,z-.5,x-.5,z+.5]);
  if(!occupied.has(`${x+1},${z}`))edges.push([x+.5,z-.5,x+.5,z+.5]);
  if(!occupied.has(`${x},${z-1}`))edges.push([x-.5,z-.5,x+.5,z-.5]);
  if(!occupied.has(`${x},${z+1}`))edges.push([x-.5,z+.5,x+.5,z+.5]);
 }
 return edges;
}
