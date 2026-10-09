import {GEAR} from '../equipment.js';
import {ITEMS} from '../items.js';

// Playground-only armor pieces for exercising the shared armor system. They use the production
// equipment, effectiveness, resistance, block and XP rules; real armor items await content design.
export const TEST_ARMOR={
 testLeatherCap:{slot:'head',name:'Test Leather Cap',armor:{class:'light',slot:'helm'},resistance:20,requirements:{'armor.light':1}},
 testLeatherVest:{slot:'chest',name:'Test Leather Vest',armor:{class:'light',slot:'chest'},resistance:40,requirements:{'armor.light':1}},
 testChainLeggings:{slot:'legs',name:'Test Chain Leggings (Medium 10)',armor:{class:'medium',slot:'legs'},resistance:60,requirements:{'armor.medium':10}},
 testPlateBoots:{slot:'feet',name:'Test Plate Boots (Heavy 20)',armor:{class:'heavy',slot:'feet'},resistance:80,requirements:{'armor.heavy':20}},
 testGloves:{slot:'hands',name:'Test Leather Gloves',armor:{class:'light',slot:'hands'},resistance:10,requirements:{'armor.light':1}},
 testCloak:{slot:'back',name:'Test Cloak',armor:{class:'light',slot:'back'},resistance:10,requirements:{'armor.light':1}},
 testWard:{slot:'ward',name:'Test Ward Charm',armor:{class:'light',slot:'ward'},resistance:10,requirements:{'armor.light':1}},
};
for(const [id,gear] of Object.entries(TEST_ARMOR)){
 GEAR[id]=gear;
 ITEMS[id]={name:gear.name,description:`Playground test armor · ${gear.armor.class[0].toUpperCase()+gear.armor.class.slice(1)} · ${gear.armor.slot} · +${gear.resistance} resistance${Object.values(gear.requirements)[0]>1?` · needs ${Object.entries(gear.requirements).map(([t,l])=>`${t.split('.')[1]} armor ${l}`).join(', ')}`:''}.`};
}
