// The world grid (docs/WORLD.md, Glossary): the names and sizes the client, the server, the editor and
// the checks all share. No DOM or three.js, so any of them can import it.
//   tile    1 × 1: movement, occupancy, interaction
//   chunk   CHUNK × CHUNK tiles: activity (client streaming and rendering, server interest, waking the
//           simulation near players)
//   region  REGION × REGION tiles (4 × 4 chunks): ownership and storage (map data, persistence, which
//           server process owns which part of the world)
//   world   WORLD × WORLD tiles: the whole grid; ids and positions are global
// Each size divides the next, so every region line is also a chunk line. Ids are "cx,cz" and "rx,rz".
export const CHUNK=32,REGION=128,WORLD=2048;
export const chunkOf=(x,z)=>[Math.floor(x/CHUNK),Math.floor(z/CHUNK)];
export const regionOf=(x,z)=>[Math.floor(x/REGION),Math.floor(z/REGION)];
export const chunkId=(x,z)=>chunkOf(x,z).join(',');
export const regionId=(x,z)=>regionOf(x,z).join(',');
// How far a tile is from a chunk, in tiles (Chebyshev; 0 inside it). Streaming keeps a shown chunk until
// the player is more than radius × CHUNK + BAND tiles from it: a band of hysteresis in tiles, so a step
// back over a chunk line doesn't reload it, without keeping a whole extra ring of 32-tile chunks.
export const BAND=8;
export const chunkGap=(cx,cz,x,z)=>Math.max(cx*CHUNK-x,x-(cx*CHUNK+CHUNK-1),cz*CHUNK-z,z-(cz*CHUNK+CHUNK-1),0);
// Whether a tile rectangle (inclusive corners) lies inside one chunk (and so inside one region).
export const withinChunk=(x0,z0,x1,z1)=>Math.floor(x0/CHUNK)===Math.floor(x1/CHUNK)&&Math.floor(z0/CHUNK)===Math.floor(z1/CHUNK);
