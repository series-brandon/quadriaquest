import * as THREE from 'three';
import {WATER_WAVE_MAX_HEIGHT} from './water-motion.js';

// Commit once when the bite becomes a catch, independent of the optional flourish.
export function commitFishingCatch(action) {
  if (action.kind !== 'Fishing' || action.age < action.catchAt || action.rewarded) return false;
  action.rewarded = true;
  action.onCatch();
  return true;
}

export function fishingTargetHeight(settings) {
  return .015+(settings.enabled&&settings.waves?WATER_WAVE_MAX_HEIGHT*Math.abs(settings.waveStrength):0);
}

export function fishingHitTarget() {
  const hit = new THREE.Mesh(new THREE.PlaneGeometry(.85,.85),new THREE.MeshBasicMaterial({visible:false,side:THREE.DoubleSide}));
  hit.rotation.x = -Math.PI/2;
  hit.position.y = .01;
  return hit;
}
