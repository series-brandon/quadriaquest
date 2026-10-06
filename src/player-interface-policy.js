// Shared responsive behavior: only explicit dismissal hides a desktop page.
export function menuReaction(mobile,event){
 if(event==='dismiss'||event==='switch')return 'close';
 return mobile?'close':'compact';
}
export function minimapTiles(world,center,radius=8){
 return [...world.values()].filter(t=>Math.abs(t.x-center.x)<=radius&&Math.abs(t.z-center.z)<=radius);
}

// Keep all tabs reachable without horizontally scrolling the mobile navigation.
export function partitionMobileTabs(tabs){
 const preferred=new Set(['open-inventory','open-skills','open-crafting','open-combat-styles']);
 return {primary:tabs.filter(t=>preferred.has(t.id)),secondary:tabs.filter(t=>!preferred.has(t.id))};
}

// Fit whole device-pixel cells so CSS scaling cannot alternate gutter widths.
export function minimapGrid(width,dpr=1,radius=8){
 const cells=radius*2+1,size=Math.max(2,Math.floor(width*dpr/cells));
 return {cells,size,pixels:cells*size,width:cells*size/dpr,gap:Math.max(1,Math.round(dpr))};
}
export function minimapGroundItems(world,nodes,center,radius=8){
 return nodes.filter(n=>!n.depleted&&n.group.visible&&world.get(`${n.x},${n.z}`)===n.tile&&Math.abs(n.x-center.x)<=radius&&Math.abs(n.z-center.z)<=radius);
}
