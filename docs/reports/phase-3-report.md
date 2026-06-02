# Phase 3 Report — Level & World Systems

**Project:** Sky Islands (web-first 2D pixel-art platformer)
**Phase:** 3 — Level & World Systems
**Branch:** `feat/phase-3-world` (off `main`, containing merged Phases 0–2)
**Date:** 2026-06-02
**Outcome:** ✅ Complete — full quality gate green locally (typecheck · lint · format · 73 unit · 9 E2E · build).

---

## Executive Summary

Phase 3 makes the world **pure data**. A `LevelLoader` reads a Tiled `.tmj`
(ground / platforms / islands / one-way / decoration tile layers), wires Arcade
collision by tile property, and configures one-way platforms; an `ObjectSpawner`
instantiates **every** entity (player, stars, crates, snail/slime enemies,
checkpoints, goal) from the map's `objects` layer. The gameplay scene now contains
**zero hard-coded entity coordinates**. A four-layer `ParallaxBackground`
(sky → mountains → mid islands/clouds → foreground) scrolls seamlessly and re-fits
on resize, camera bounds + dead-zone are derived from the loaded map, and reaching
the `goal` fades to the next level (carrying score/lives across the transition).

All parsing/decision logic is **pure and unit-tested** (spawn parser, level
progression, camera derivation); Phaser entities and the scene only translate map
data into the existing Phase 1/2 behaviour, which is unchanged and still passes its
tests (regression-guarded by the Phase 1/2 E2E specs running on the new
data-driven scene). Adding a level is now data-only: drop a `.tmj` and add its key
to `levels.ts`.

Context: Phase 2 was merged to `main` (merge commit) and its CI verified green;
Phase 3 branched from it and the baseline gate was confirmed green first.

---

## Files Added / Changed

### Added — pure logic (Phaser-free, unit-tested)

| File                             | Responsibility                                                         |
| -------------------------------- | ---------------------------------------------------------------------- |
| `src/config/tiledConventions.ts` | Single source of truth for layer names, object types, property keys.   |
| `src/types/tiled.ts`             | Narrow TS shapes for the consumed `.tmj` (map/layers/object/property). |
| `src/config/levels.ts`           | Ordered `LEVEL_ORDER` + pure `nextLevel()` / `isLevelKey()`.           |
| `src/systems/levelParse.ts`      | Pure `parseSpawns()` (objects → typed spawns) + `mapPixelSize()`.      |
| `src/systems/cameraView.ts`      | Pure `deriveCameraView()` (bounds + viewport-fraction dead-zone).      |

### Added — runtime (Phaser)

| File                                     | Responsibility                                                                                                              |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `src/systems/LevelLoader.ts`             | Builds tile layers + collision from a `.tmj`; one-way top-face collision; returns layers/collisionLayers/spawns/pixel size. |
| `src/systems/ObjectSpawner.ts`           | Instantiates existing entity classes from parsed spawns (enemy branch on type).                                             |
| `src/systems/ParallaxBackground.ts`      | 4 `TileSprite` layers, generated placeholder textures, per-frame parallax, resize-safe.                                     |
| `public/assets/levels/level-01.tmj`      | Full demo level (5 tile layers + objects).                                                                                  |
| `public/assets/levels/level-02.tmj`      | Placeholder next level (proves data-only authoring).                                                                        |
| `public/assets/tilesets/world-tiles.png` | 6-tile shared tileset.                                                                                                      |
| `docs/level-authoring.md`                | Content authoring guide (conventions + how to add a level).                                                                 |

### Changed

| File                                            | Change                                                                                                                                                                                                                      |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/scenes/MovementScene.ts`                   | Rewritten data-driven: `init(levelKey)`, preload levels, parallax, `loadLevel` + `spawnEntities`, map-derived camera, goal→next-level flow, run-state persistence, extended test hook. **Zero literal entity coordinates.** |
| `src/entities/Enemy.ts`, `Snail.ts`, `Slime.ts` | Edge-probe now scans an **array** of collision layers (ground/platforms/islands) — behaviour identical, just multi-layer aware.                                                                                             |
| `src/systems/GameManager.ts`                    | **Additive** optional `initial` seed (score/lives) for cross-level carry. Phase 2 tests unchanged.                                                                                                                          |
| `playwright.config.ts`                          | E2E runs serially (`workers: 1`) — heavy Phase 3 scenes starve the GPU under parallel headless WebGL.                                                                                                                       |

### Removed

`public/assets/tilemaps/test-movement.tmj`, `public/assets/tilesets/movement-tiles.png`
— the Phase 1 hand-made test map/tileset, superseded by the data-driven levels.

### Added — tests

`tests/unit/levels.spec.ts` (5), `levelParse.spec.ts` (9), `cameraView.spec.ts` (3);
`tests/e2e/world.spec.ts` (2). Totals now **73 unit + 9 E2E**.

---

## Level Pipeline (LevelLoader + ObjectSpawner + conventions)

- **Conventions** (`tiledConventions.ts`) name the layers (`ground`, `platforms`,
  `islands`, `oneway`, `decoration`, `objects`), object types (`player_start`,
  `star`, `crate`, `enemy`, `checkpoint`, `goal`), and property keys (`collides`,
  `oneway`, `enemyType`, `breakable`). Everything references these — nothing is
  stringly-typed at call sites.
- **Parsing is pure** (`levelParse.ts`): `parseSpawns(objects)` groups a Tiled
  object array into typed spawns (branching enemies on `enemyType`, defaulting to
  snail; reading `breakable`). It runs headlessly in unit tests against a fixture,
  and at runtime consumes Phaser's `getObjectLayer().objects` (structurally
  compatible) — one parser, two callers.
- **LevelLoader** (Phaser) builds each tile layer by convention, applies
  `setCollisionByProperty({ collides: true })` to the solid layers, configures the
  one-way layer, and returns `{ map, layers, collisionLayers, onewayLayer, spawns,
widthPx, heightPx }`.
- **ObjectSpawner** maps parsed spawns to the **existing** Phase 1/2 entity
  constructors (no gameplay logic duplicated); enemies receive the collision layers
  for their edge-probe patrol.

The scene asks the loader/spawner for everything; it places no entity by hand
(verified by grep and by the `world.spec` data-count assertions).

---

## One-Way Platforms

The `oneway` tile layer uses `setCollisionByProperty({ oneway: true })`, then each
such tile is set to collide on its **top face only** (`tile.setCollision(false,
false, true, false)`). Arcade then lets the hero **jump up through** the platform
(no collision on the way up) and **land on top** when descending — the standard,
deterministic Phaser one-way technique, with no per-frame process callback needed.

---

## ParallaxBackground

Four layers, each a viewport-filling `TileSprite` pinned to the camera
(`scrollFactor 0`) whose `tilePositionX = camera.scrollX * factor` produces
seamless horizontal parallax:

| Layer              | Scroll factor | Texture (placeholder, generated at runtime)       |
| ------------------ | ------------- | ------------------------------------------------- |
| sky                | 0.05          | canvas linear gradient (warm gold → blue)         |
| mountains          | 0.25          | 128px-period triangle silhouettes (tile-seamless) |
| mid islands/clouds | 0.5           | soft clouds + far island silhouette               |
| foreground         | 0.8           | near hill band                                    |

On `Scale.RESIZE` every layer is re-fit to the viewport, so there are no gaps at
any aspect ratio (16:9 or narrow/tall); layers render at negative depth, behind the
tilemap and entities. Real painterly art replaces these textures in Phase 5.

---

## Camera & Level Flow

- **Camera** bounds + dead-zone come from the pure `deriveCameraView(mapW, mapH,
viewW, viewH)` (dead-zone = 30%×40% of the viewport) — no map-specific magic
  numbers. Phase 1 follow lerp and left-of-centre follow-offset are preserved.
- **Level flow:** the `goal` overlap calls `GameManager.win()` → the scene fades
  out and `scene.restart({ levelKey: nextLevel(current) })`. The last level shows a
  graceful "ALL LEVELS COMPLETE" stub (full end UI is Phase 4). `LEVEL_ORDER` drives
  preloading and progression.

## Run-State Persistence

`scene.restart` rebuilds the scene (and a fresh `EventBus`/`GameManager`, avoiding
stale listeners), so score/lives are persisted in the **scene registry** on level
complete and seeded into the new `GameManager` via its additive `initial` option.
The `world.spec` E2E verifies a star collected on level-01 (score 100) carries into
level-02.

---

## Testing

- **Vitest (73):** `parseSpawns` (grouping, enemy/breakable properties, unknown
  types ignored, empty input), `mapPixelSize`, `nextLevel`/`isLevelKey`,
  `deriveCameraView`, plus all Phase 1/2 specs unchanged (regression).
- **Playwright (9):** Phase 0 smoke (2); Phase 1 movement (3) + Phase 2 gameplay
  (2) — now running on the **data-driven** level-01 (regression that behaviour is
  unchanged); Phase 3 world (2): level-01 loads **8 stars / 3 enemies** from data
  with **no console errors**, and reaching the goal advances to **level-02** (2
  stars / 1 enemy) with score preserved.
- **Manual (`npm run dev`):** run level-01 — jump up through the one-way ledge and
  land on it; collect stars (+100); stomp/❤ take damage from snail & slime; fall in
  a pit → checkpoint respawn; reach the goal → level-02 loads; resize the window →
  parallax stays gap-free.

### How to test

```bash
npm run typecheck && npm run lint && npm run format:check && npm test && npm run build && npm run test:e2e
npm run dev   # Arrows/A,D move · Space/W/Up jump · ` debug
```

---

## Validation Results

| Gate      | Command                | Result                        |
| --------- | ---------------------- | ----------------------------- |
| Typecheck | `npm run typecheck`    | ✅ 0 errors (strict)          |
| Lint      | `npm run lint`         | ✅ 0 warnings                 |
| Format    | `npm run format:check` | ✅ clean                      |
| Unit      | `npm run test`         | ✅ **73/73** (11 files)       |
| E2E       | `npm run test:e2e`     | ✅ **9/9** (chromium, serial) |
| Build     | `npm run build`        | ✅ `dist/` emitted            |

---

## Deviations

1. **Scene name kept as `MovementScene`** (it is the gameplay scene) rather than
   renaming to `GameScene` — avoids churn/regression risk across config + the test
   hook; the roadmap permits using the existing scene. Cheap future rename.
2. **Levels embed the tileset** (with per-tile collision properties) inside each
   `.tmj`, rather than referencing an external `.tsx`. This makes a level
   self-contained and Phaser-loadable, and still opens standalone in Tiled.
3. **Parallax textures are generated at runtime** (canvas gradient + graphics
   shapes), not authored art — real art is Phase 5. The mountains/foreground tile
   on a 128px period (seamless); clouds repeat every 512px (acceptable placeholder).
4. **Enemy edge-probe became multi-layer** (array of collision layers) to support
   enemies on ground/platforms/islands. The pure patrol decision is unchanged
   (single layer == array of one), so Phase 2 patrol tests are unaffected.
5. **`GameManager` gained an additive `initial` seed** for cross-level persistence;
   default behaviour (and Phase 2 tests) are unchanged.
6. **E2E now runs serially** (`workers: 1`) — the heavier Phase 3 scenes flaked
   under parallel headless WebGL; CI was already serial.
7. **Goal trigger uses a dev test hook** (`completeLevel()`) for the deterministic
   E2E transition test rather than driving the hero across the whole level (which
   would be flaky); manual play reaches the goal normally.

---

## Known Limitations

- **Placeholder parallax/tilesets** (flat-colour tiles, generated backdrops) —
  painterly art is Phase 5.
- **Two levels** (one full + one placeholder); the pipeline supports any number.
- **No on-screen HUD** (score/lives still via debug overlay + hook); HUD is Phase 4.
- **One-way drop-through** (down to fall through) is not implemented — only
  up-through + land-on-top (sufficient and unambiguous).
- **Bundle size** ~1.5 MB (~346 KB gzip), essentially Phaser — Phase 6.
- The scene retains a single `{x:100,y:100}` fallback if a map omits
  `player_start` (a safety default, not level content).

---

## Phase 4 Readiness

The world is now fully data-driven and the event backbone is in place for UI/audio:

- **HUD/audio (Phase 4)** subscribe to the existing `EventBus` (`collect`/`score`/
  `hurt`/`defeat`/`win`/`lose`) — no gameplay changes needed. `GameManager` already
  exposes `score`/`lives`/`status` for a readout, and a pause overlay can freeze the
  scene.
- **Touch controls (Phase 4)** plug into the existing `InputController`/`InputState`
  abstraction.
- **Content/art (Phase 5)** swaps `world-tiles.png` + parallax textures for real
  art and adds levels via `.tmj` only — the pipeline is frozen.

**Recommended gate before Phase 4:** merge `feat/phase-3-world` to `main` (CI
green) and tag `v0.3-content-loop` (per the roadmap) — the second playable
milestone: a complete data-driven level playable start→finish on placeholder art.
