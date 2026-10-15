import {PROPS,PROP_KINDS} from '../props.js';

// The world editor's catalogue (docs/TOWN.md, Sims-style editor): every prop by the room it suits and by
// what it is for, as in a Sims build/buy catalogue. A prop may suit several rooms and several functions;
// every prop has at least one of each (prop-catalogue.test.js).
const list=s=>s.split(/\s+/).filter(Boolean);
export const BY_ROOM={
 'Bedroom':list('bed doubleBed bunkBed cot crib wardrobe dresser chest trunk rug rugRound candleStand washstand sideTable painting pottedPlant chair armchair coatRack'),
 'Living room':list('armchair chair sideTable tableSmall tableRound bookshelf wallShelf fireplace hearthRug rug rugRound painting pottedPlant candleStand coatRack desk'),
 'Kitchen and dining':list('stove fireplace cupboard tableDining tableLong tableRound chair stool caskStand barrel sacks flourSacks broomBucket wallShelf washstand'),
 'Tavern':list('barCounter kegRack kegs caskStand stool bench tableRound tableLong chair fireplace hearthRug candleStand painting'),
 'Shop':list('shopCounter counterCorner displayTable breadShelf clothShelf apothecaryShelf produceCrates weaponRack armourStand shieldDisplay crates barrel sacks tailorDummy'),
 'Workshop':list('forge anvil quenchBarrel workbench toolRack sawhorse loom breadOven alchemyTable cauldron woodpile crates'),
 'Temple and study':list('pew shrine candleStand bookshelf desk painting statue knightStatue sarcophagus'),
 'Street and square':list('bench stoneBench fountain statue knightStatue noticeboard noticePillar lampPost streetLampDouble wallTorch signpost banner bunting flagpole archway bin treeGrate longPlanter planter hedge stall marketUmbrella produceStand well waterPump waterTrough hitchingRail'),
 'Garden and farm':list('flowerBed planter hedge bush berryBush flowerPatch tallGrass gazebo gardenArch birdbath pond cabbageRow wheatRow scarecrow rainBarrel hayBales woodpile cart wagon handcart sawhorse well'),
 'Harbour and coast':list('quay jetty mooringPost rowboat lighthouse shipwreck tidePools fishCounter fishRack crates barrel crateStack sackPile waterwheel'),
 'Wilds':list('rockSmall rockMedium rockLarge bush berryBush tallGrass flowerPatch fallenLog treeStump pond'),
 'Dungeon':list('dungeonEntrance dungeonTorch brazier bones cobweb brokenPillar rubble sarcophagus shackles gravestone chest'),
};
export const BY_FUNCTION={
 'Seating':list('bench chair stool armchair pew stoneBench'),
 'Beds':list('bed doubleBed bunkBed cot crib'),
 'Tables and counters':list('tableSmall tableRound tableLong tableDining desk sideTable displayTable workbench alchemyTable shopCounter counterCorner barCounter fishCounter washstand'),
 'Storage':list('bookshelf wallShelf wardrobe dresser chest trunk cupboard crates barrel sacks breadShelf toolRack apothecaryShelf clothShelf kegRack kegs crateStack sackPile flourSacks caskStand coatRack weaponRack armourStand shieldDisplay'),
 'Lighting':list('lampPost candleStand streetLampDouble wallTorch dungeonTorch brazier fireplace lighthouse'),
 'Cooking and crafting':list('fireplace stove breadOven forge anvil quenchBarrel cauldron loom tailorDummy sawhorse workbench alchemyTable'),
 'Decoration':list('rug rugRound hearthRug painting pottedPlant banner bunting flagpole statue knightStatue broomBucket shrine signpost noticeboard noticePillar'),
 'Plants':list('flowerBed planter treeGrate hedge longPlanter bush berryBush tallGrass flowerPatch cabbageRow wheatRow scarecrow pottedPlant'),
 'Water':list('fountain well waterTrough rainBarrel waterPump pond quay jetty mooringPost rowboat waterwheel tidePools birdbath'),
 'Market':list('stall marketUmbrella produceStand produceCrates fishRack shopCounter barCounter fishCounter'),
 'Yard and vehicles':list('cart wagon handcart hayBales woodpile hitchingRail bin'),
 'Structures':list('archway gazebo gardenArch dungeonEntrance brokenPillar lighthouse shipwreck'),
 'Rocks and wild':list('rockSmall rockMedium rockLarge fallenLog treeStump rubble bones gravestone cobweb shackles sarcophagus'),
};
export const ALL_PROPS=PROP_KINDS;
// Kinds named in a group that the prop sets don't have (a typo, or a prop removed).
export const unknownKinds=()=>[...Object.values(BY_ROOM),...Object.values(BY_FUNCTION)].flat().filter(k=>!PROPS[k]);
