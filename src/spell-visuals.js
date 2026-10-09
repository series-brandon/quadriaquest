import * as THREE from 'three';

// Shared spell looks. One entry supplies both the energy gathered between the hands while casting
// (`charge`) and the thrown projectile (`projectile`), so a spell always throws what it gathered.
// A spell picks its look with `visual`, otherwise by its first element, otherwise the default.
// `animate(group, time, intensity)` is optional per-frame motion (e.g. water drips, fire flicker and smoke);
// intensity is 0–1 (high while energy is unstable, low once it settles).
// To add a look (e.g. water: blue with drips; fire: red/orange/yellow with a little smoke), add an entry
// here and give the spell `visual` or matching `elements`; the cast orb, projectile and model viewer follow.
// Energy (Energy Strike, and the default look): light yellow.
function energyOrb(){const g=new THREE.Group();g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(.10,1),new THREE.MeshBasicMaterial({color:'#fff1a0'})));return g;}
export const SPELL_VISUALS={
 energy:{name:'Energy',charge:energyOrb,projectile:energyOrb,animate(group,time,intensity=1){group.rotation.set(time*2.3,time*3.1,0);group.scale.multiplyScalar(1+.06*Math.sin(time*18)*intensity);}},
};
export const DEFAULT_SPELL_VISUAL='energy';
export function spellVisualKey(spell){
 const key=spell?.visual||Object.keys(spell?.elements||{})[0];
 return SPELL_VISUALS[key]?key:DEFAULT_SPELL_VISUAL;
}
export const spellVisual=spell=>SPELL_VISUALS[spellVisualKey(spell)];
