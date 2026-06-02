# Level Authoring Guide

Levels in Sky Islands are **pure data**: a Tiled `.tmj` map + the shared tileset
image. Adding or editing a level requires **no code changes** — only data and one
line in the level list.

The conventions below are the single source of truth, mirrored in
[`src/config/tiledConventions.ts`](../src/config/tiledConventions.ts). The
`LevelLoader` and `ObjectSpawner` read maps strictly by these names/properties.

---

## 1. Files & tooling

- **Editor:** [Tiled](https://www.mapeditor.org/).
- **Tileset image:** `public/assets/tilesets/world-tiles.png` — a 6-tile,
  `32×32` strip. The level `.tmj` files **embed** this tileset (with per-tile
  collision properties), so a map opens standalone in Tiled.
- **Levels live in:** `public/assets/levels/` and are exported as **`.tmj`
  (JSON)**. Tile size is **`32×32`** (must match `GAME.TILE_SIZE`).

The shared tileset (gid = firstgid 1 + tile id):

| gid | tile         | collision property |
| --- | ------------ | ------------------ |
| 1   | ground       | `collides: true`   |
| 2   | stone        | `collides: true`   |
| 3   | one-way      | `oneway: true`     |
| 4   | island       | `collides: true`   |
| 5   | tree (deco)  | — (visual only)    |
| 6   | water (deco) | — (visual only)    |

---

## 2. Layers (exact names, order back→front)

| Layer        | Type         | Purpose / collision                                               |
| ------------ | ------------ | ----------------------------------------------------------------- |
| `ground`     | tile layer   | Grass/dirt band; tiles with `collides` are solid.                 |
| `platforms`  | tile layer   | Stone stairs/towers; `collides` solid.                            |
| `islands`    | tile layer   | Floating island platforms; `collides` solid.                      |
| `oneway`     | tile layer   | One-way platforms — jump up through, land on top (top face only). |
| `decoration` | tile layer   | Trees/water/banners — **never** collide.                          |
| `objects`    | object layer | Entity placements (see §3).                                       |

`ground`, `platforms`, and `islands` get `setCollisionByProperty({ collides:
true })`. The `oneway` layer collides on its **top face only**.

---

## 3. Object layer (`objects`)

Place **point objects** and set each object's **Type** (a.k.a. Class) to one of:

| Object `type`  | Required properties             | Spawns                                              |
| -------------- | ------------------------------- | --------------------------------------------------- |
| `player_start` | —                               | The hero (exactly one).                             |
| `star`         | —                               | A +100 collectible.                                 |
| `crate`        | `breakable: bool` (optional)    | Solid crate; breakable variant breaks on top-stomp. |
| `enemy`        | `enemyType: "snail" \| "slime"` | A patrolling enemy (defaults to `snail`).           |
| `checkpoint`   | —                               | Updates the respawn point on overlap.               |
| `goal`         | —                               | Reaching it completes the level.                    |

Object `x`/`y` are the spawn point (use **point** objects). Unknown object types
are ignored by the parser.

---

## 4. Add a new level (no code)

1. Create/copy a `.tmj` in `public/assets/levels/` (e.g. `level-03.tmj`) using the
   layers and object conventions above. Easiest: open `level-01.tmj` in Tiled,
   "Save As", and edit.
2. Add its key to the ordered list in
   [`src/config/levels.ts`](../src/config/levels.ts):
   ```ts
   export const LEVEL_ORDER = ["level-01", "level-02", "level-03"] as const;
   ```
   The scene preloads every key in `LEVEL_ORDER` automatically, and reaching a
   level's `goal` advances to the next (the last level shows a "complete" stub).
3. That's it — no gameplay code changes.

---

## 5. Valid-level checklist

- [ ] Tile size is `32×32`; the embedded tileset points to `../tilesets/world-tiles.png`.
- [ ] Layers named exactly: `ground`, `platforms`, `islands`, `oneway`,
      `decoration`, `objects`.
- [ ] Solid tiles carry `collides: true`; one-way tiles carry `oneway: true`.
- [ ] Exactly one `player_start` and one `goal`.
- [ ] Each `enemy` has an `enemyType` of `snail` or `slime`.
- [ ] The key is added to `LEVEL_ORDER` in `src/config/levels.ts`.
- [ ] `npm run dev` loads it with no console errors; the camera respects the map
      bounds and parallax shows no gaps when the window is resized.
