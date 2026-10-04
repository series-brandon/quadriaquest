// Prefabs carry their movement policy; worlds must not infer it from actor type.
export function blocksMovement(entity) {
  return entity.group.userData.blocksMovement !== false;
}
export function setWorldOccupancy(entity, present) {
  // A pickup never changes terrain or another occupant's collision state.
  if (blocksMovement(entity)) entity.tile.blocked = present;
}
