// Mini biomes (docs/WORLD.md, Green spaces): a theme for a patch of green, the trees and flowers that
// belong together. Cities give each green area one (city-greens.js); any map can use them.
//   trees      tree species (tree-models.js), in proportion
//   flowers    ground-cover flower kinds (ground-cover.js)
//   extras     other ground cover that suits it
export const BIOMES={
 blossom:{name:'Blossom garden',trees:['cherry','cherry','cherry','oak'],flowers:['flowerPink','flowerPink','flowerWhite'],extras:['grass','shrub']},
 willow:{name:'Willow green',trees:['willow','willow','poplar'],flowers:['flowerPurple','flowerBlue','flowerBlue'],extras:['reeds','fern','grass']},
 autumn:{name:'Autumn grove',trees:['maple','maple','oak'],flowers:['flowerRed','flowerYellow'],extras:['mushrooms','grass','shrub']},
 poplar:{name:'Poplar copse',trees:['poplar','poplar','pine'],flowers:['flowerWhite','flowerYellow'],extras:['fern','grass']},
 meadow:{name:'Meadow',trees:['oak','oak','poplar'],flowers:['flowerWhite','flowerYellow','flowerPink','flowerPurple','flowerBlue','flowerRed'],extras:['grass','shrub']},
};
export const BIOME_NAMES=Object.keys(BIOMES);
