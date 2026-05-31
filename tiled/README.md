# Tiled Pipeline

Levels are authored in [Tiled](https://www.mapeditor.org/) and loaded at runtime
by Phaser's tilemap API. This folder holds the **editor sources**; exported maps
and tileset images that the game actually loads live under `public/assets/`.

## Conventions

- **Tile size:** `32 × 32` px — must match `GAME.TILE_SIZE` in `src/config/constants.ts`.
- **Orientation:** orthogonal, render order `right-down`.
- **Export format:** maps are exported as **`.tmj` (JSON)** to
  `public/assets/tilemaps/`. Tileset images go in `public/assets/tilesets/`.
  (JSON is what Phaser parses; never ship `.tmx` to the game.)
- **Layer naming (forward-looking, used from Phase 3):**
  - `ground` — solid terrain tile layer (collision on).
  - additional tile layers (e.g. `stone`, `decoration`) added per level.
  - `objects` — an **object layer** carrying entity placements (player start,
    stars, crates, enemies, checkpoints, goal) as typed objects with custom
    properties. Phase 3's `LevelLoader` + `EntityFactory` spawn from this layer.

## Files

- `sky-islands.tiled-project` — the Tiled project (open this in Tiled).
- `tileset-placeholder.tsx` — placeholder tileset referencing
  `../public/assets/tilesets/tileset-placeholder.png` (a single 32×32 tile).
- `../public/assets/tilemaps/level-placeholder.tmj` — empty placeholder map
  (one `ground` tile layer + one `objects` object layer). **Phase 0 only** — a
  real level is built in Phase 3.

## Workflow

1. Open `sky-islands.tiled-project` in Tiled.
2. Edit / create maps using the shared tileset and the layer naming above.
3. Export each map as `.tmj` into `public/assets/tilemaps/`.
4. Commit both the editor source and the exported `.tmj`.
