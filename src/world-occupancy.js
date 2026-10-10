// Prefabs carry their movement policy; worlds must not infer it from actor type.
// Solid objects (resources, stations, props, practice targets) block their tile. Living characters
// (every slime, creatures of any size, companions) never block movement: walkers may pass through
// them and only avoid *stopping* on someone (docs/CITY.md, Walk-through entities).
export function blocksMovement(entity) {
  return entity.group.userData.blocksMovement !== false;
}
// Mark a model as a living character: walk-through, never written into `tile.blocked`.
export function markCharacter(group) {
  group.userData.blocksMovement = false;
  return group;
}
export function setWorldOccupancy(entity, present) {
  // A pickup never changes terrain or another occupant's collision state.
  if (blocksMovement(entity)) entity.tile.blocked = present;
}
