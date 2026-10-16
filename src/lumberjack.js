// Lumberjack tiers (docs/DESIGN.md, Lumberjack). Every tree species is one tier: the level it needs, the
// wood pieces it yields and how much effort felling it takes. Chopping itself is the shared resource
// action (resource-actions.js); looks live in tree-models.js. Lowest tier first.
export const TREE_EFFORT={tiny:4,small:6,medium:9,large:13};
export const TREES={
 poplar:{name:'Poplar Tree',wood:'poplarWood',woodName:'Poplar Wood Pieces',level:1,effort:'tiny',value:4,description:'Light, pale wood from a Poplar Tree. The everyday crafting wood.'},
 asla:{name:'Asla Tree',wood:'aslaWood',woodName:'Asla Wood Pieces',level:10,effort:'small',value:6,description:'Feather-light wood from an Asla Tree. Soft and easy to shape.'},
 pine:{name:'Pine Tree',wood:'pineWood',woodName:'Pine Wood Pieces',level:20,effort:'small',value:8,description:'Resinous wood from a Pine Tree. Cheap and plentiful.'},
 oak:{name:'Oak Tree',wood:'oakWood',woodName:'Oak Wood Pieces',level:30,effort:'small',value:11,description:'Strong, dependable wood from an Oak Tree.'},
 willow:{name:'Willow Tree',wood:'willowWood',woodName:'Willow Wood Pieces',level:40,effort:'medium',value:15,description:'Supple wood from a Willow Tree. It bends before it breaks.'},
 maple:{name:'Maple Tree',wood:'mapleWood',woodName:'Maple Wood Pieces',level:50,effort:'medium',value:20,description:'Hard, fine-grained wood from a Maple Tree.'},
 walnut:{name:'Walnut Tree',wood:'walnutWood',woodName:'Walnut Wood Pieces',level:60,effort:'medium',value:26,description:'Dark, handsome wood from a Walnut Tree.'},
 ironwood:{name:'Ironwood Tree',wood:'ironwood',woodName:'Ironwood Pieces',level:70,effort:'large',value:33,description:'Wood from an Ironwood Tree, heavy as stone.'},
 mungil:{name:'Mungil Tree',wood:'mungilWood',woodName:'Mungil Wood Pieces',level:80,effort:'large',value:42,description:'Oily, very dense wood from a Mungil Tree. It sinks in water.'},
 cherry:{name:'Cherry Blossom Tree',wood:'cherryWood',woodName:'Cherry Wood Pieces',level:90,effort:'large',value:52,description:'Rosy wood from a Cherry Blossom Tree. Prized by fine crafters.'},
};
export const DEFAULT_TREE='poplar';
export const TREE_IDS=Object.keys(TREES);
export const WOODS=TREE_IDS.map(id=>TREES[id].wood);
export function treeOf(species){return TREES[species]||TREES[DEFAULT_TREE];}
export function treeEffort(species){return TREE_EFFORT[treeOf(species).effort];}
