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
