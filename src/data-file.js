// Shared type configuration files (src/data/*.json; docs/DESIGN.md, Resource and enemy configuration): written
// readably, one field per line and short number lists on one line, so hand edits and diffs stay easy. The
// dev server's save adds the final newline.
export function formatData(value){
 return JSON.stringify(value,null,1).replace(/\[\s*(-?[\d.]+(?:,\s*-?[\d.]+)*)\s*\]/g,(_,inner)=>`[${inner.split(',').map(s=>s.trim()).join(', ')}]`);
}
