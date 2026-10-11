// Prefabs carry their movement policy; worlds must not infer it from actor type.
// Solid objects (resources, stations, props, practice targets) block their tile. Living characters
// (every slime, creatures of any size, companions) never block movement: they mark their tiles
// "occupied" instead (docs/CITY.md, Walk-through entities).
export function blocksMovement(entity) {
  return entity.group.userData.blocksMovement !== false;
}
export const isCharacter = entity => !!entity?.group?.userData.character;
// Mark a model as a living character: walk-through, never written into `tile.blocked`.
export function markCharacter(group) {
  group.userData.blocksMovement = false;
  group.userData.character = true;
  return group;
}
export function setWorldOccupancy(entity, present) {
  // A living character marks its tile occupied; a pickup never changes terrain or another occupant's
  // collision state; anything else solid blocks its tile.
  if (isCharacter(entity)) { if (present) occupancy.place(entity, [entity.tile]); else occupancy.remove(entity); }
  else if (blocksMovement(entity)) entity.tile.blocked = present;
}

// Occupied tiles, RuneScape-style. Routes treat an occupied tile as costly rather than blocked: walkers
// go around when the detour is short and pass through when it isn't (or there is no other way). A
// player's tile costs others far more, so NPCs almost never walk through a player. Owners are the
// characters themselves (player, companion, NPCs, creatures); tiles are the live tile objects of
// whichever map they stand in, so maps never mix.
export const OCCUPIED_COST = 5;
export const PLAYER_COST = 30;
export function createOccupancy() {
  const byTile = new Map(), byOwner = new Map();
  function remove(owner) {
    const cells = byOwner.get(owner); if (!cells) return;
    for (const t of cells) { const set = byTile.get(t); set?.delete(owner); if (set && !set.size) byTile.delete(t); }
    byOwner.delete(owner);
  }
  return {
    // owner.kind: 'player' for players; anything else is an NPC, creature or companion.
    place(owner, cells) {
      cells = cells.filter(Boolean);
      const old = byOwner.get(owner);
      if (old && old.length === cells.length && old.every((t, i) => t === cells[i])) return;
      remove(owner); if (!cells.length) return;
      byOwner.set(owner, cells);
      for (const t of cells) { if (!byTile.has(t)) byTile.set(t, new Set()); byTile.get(t).add(owner); }
    },
    remove,
    owners: tile => [...(byTile.get(tile) || [])],
    occupied: (tile, except = null) => { const set = byTile.get(tile); if (!set) return false; for (const o of set) if (o !== except) return true; return false; },
    // Extra route cost of stepping onto `tile` for `mover` (0 when nobody else stands there).
    cost(tile, mover = null) {
      const set = byTile.get(tile); if (!set) return 0;
      let cost = 0;
      for (const o of set) if (o !== mover) cost = Math.max(cost, o.kind === 'player' ? PLAYER_COST : OCCUPIED_COST);
      return cost;
    },
    cellsOf: owner => byOwner.get(owner) || [],
    clear() { byTile.clear(); byOwner.clear(); },
  };
}
// One shared map for the running game: characters in every area register here.
export const occupancy = createOccupancy();
