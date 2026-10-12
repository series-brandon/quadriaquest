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
  const byTile = new Map(), byOwner = new Map(), arrived = new Map();
  let order = 0;
  function detach(owner) {
    const cells = byOwner.get(owner); if (!cells) return;
    for (const t of cells) { const set = byTile.get(t); set?.delete(owner); if (set && !set.size) byTile.delete(t); }
    byOwner.delete(owner);
  }
  const forget = (owner, cells) => { for (const t of cells) { const m = arrived.get(t); m?.delete(owner); if (m && !m.size) arrived.delete(t); } };
  function remove(owner) { forget(owner, byOwner.get(owner) || []); detach(owner); }
  return {
    // owner.kind: 'player' for players; anything else is an NPC, creature or companion.
    place(owner, cells) {
      cells = cells.filter(Boolean);
      const old = byOwner.get(owner);
      if (old && old.length === cells.length && old.every((t, i) => t === cells[i])) return;
      const before = new Set(old || []);
      detach(owner); forget(owner, [...before].filter(t => !cells.includes(t))); if (!cells.length) return;
      byOwner.set(owner, cells);
      for (const t of cells) {
        if (!byTile.has(t)) byTile.set(t, new Set()); byTile.get(t).add(owner);
        // Arrival order per tile (who is drawn on top, `top`): staying put keeps your place.
        if (!before.has(t) || !arrived.get(t)?.has(owner)) { if (!arrived.has(t)) arrived.set(t, new Map()); arrived.get(t).set(owner, ++order); }
      }
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
    // Who is drawn on a shared tile (user rule, 2026-10-11): when two or more characters are STOPPED
    // on a tile, only the last to arrive shows; a stopped player always shows. Anyone moving
    // (owner.moving) neither hides nor is hidden: walking through a tile never hides anyone.
    // covered(owner): it is stopped and another stopped character is drawn on its tile.
    // player: false leaves the player out (an enemy is never hidden under the player mid-fight).
    top(tile, {player = true} = {}) {
      const set = byTile.get(tile); if (!set) return null;
      let best = null, rank = -1;
      for (const o of set) { if (o.moving || !player && o.kind === 'player') continue; const r = o.kind === 'player' ? Infinity : arrived.get(tile)?.get(o) ?? 0; if (r > rank) { rank = r; best = o; } }
      return best;
    },
    covered(owner, tile, options) { if (owner.moving) return false; const top = this.top(tile, options); return !!top && top !== owner; },
    clear() { byTile.clear(); byOwner.clear(); arrived.clear(); },
  };
}
// One shared map for the running game: characters in every area register here.
export const occupancy = createOccupancy();
