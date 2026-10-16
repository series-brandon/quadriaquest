// Lumberjack tiers (docs/DESIGN.md, Lumberjack). Every tree species is one tier, in src/data/trees.json (edited
// in the world editor's Types screen, or by hand): its name, the level it needs, its `effort` in seconds, how
// many seconds its stump takes to regrow, and its `drops` (the wood pieces it yields and how many, in the shared
// drop-table format, drops.js); optionally `xp`. A map placement may rarely override one tree
// (resource-rules.js). Chopping itself is the shared resource action (resource-actions.js); looks live in
// tree-models.js. Lowest tier first.
import TREES from './data/trees.json' with {type:'json'};
export {TREES};
// The live table as the file holds it (the Types screen saves this).
export function treesData(){return TREES;}
export const DEFAULT_TREE='poplar';
export const TREE_IDS=Object.keys(TREES);
export function treeOf(species){return TREES[species]||TREES[DEFAULT_TREE];}
export function treeEffort(species){return treeOf(species).effort;}
// The item a tree mainly yields (the first of its sure drops), for guidance and readouts.
export function treeWood(species){return treeOf(species).drops?.always?.[0]?.item??null;}
