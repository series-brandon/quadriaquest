// Per-frame rigs look up named parts repeatedly; cache hits so animation does not search the subtree every frame.
const caches=new WeakMap();
export function findPart(root,name){
 let cache=caches.get(root);if(!cache){cache=new Map();caches.set(root,cache);}
 let part=cache.get(name);if(part)return part;
 part=root.getObjectByName(name);if(part)cache.set(name,part);return part;
}
