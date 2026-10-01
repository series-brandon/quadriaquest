// Completion depends on world state, never current inventory quantities.
export function practiceCleared(resources,trees){
  return resources.length>0&&trees.length>0&&resources.every(r=>r.collected)&&trees.every(t=>t.felled&&!t.group.visible);
}
