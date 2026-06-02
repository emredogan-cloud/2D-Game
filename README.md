# Sky Islands

A web-first **2D side-scrolling pixel-art platformer** with a painterly "floating
sky islands" theme. Run → jump across pits and floating islands → collect stars
(+100) → avoid enemies. Built to run in any modern browser.

> **Status: Phase 3 — Level & World Systems.** The world is now **fully
> data-driven**: levels load from Tiled `.tmj` (ground/platforms/islands/one-way/
> decoration + an object layer that spawns every entity), with a 4-layer parallax
> background, map-derived camera bounds, and goal→next-level flow carrying
> score/lives. `npm run dev`, then **Arrows/A,D** to move, **Space/W/Up** to jump,
> and the **backtick** key for the debug overlay. To add a level, see
> [`docs/level-authoring.md`](./docs/level-authoring.md). The roadmap lives in
> [`GAME_REVERSE_ENGINEERING_ROADMAP_AND_EXECUTION_PROMPTS.md`](./GAME_REVERSE_ENGINEERING_ROADMAP_AND_EXECUTION_PROMPTS.md);
> phase reports in [`docs/reports/`](./docs/reports/).

## Stack

| Concern       | Choice                                                    |
| ------------- | --------------------------------------------------------- |
| Engine        | [Phaser 3](https://phaser.io/) (Arcade physics)           |
| Language      | TypeScript (strict)                                       |
| Bundler / dev | [Vite](https://vite.dev/)                                 |
| Levels        | [Tiled](https://www.mapeditor.org/) `.tmj` (JSON)         |
| Unit tests    | [Vitest](https://vitest.dev/) (jsdom)                     |
| E2E tests     | [Playwright](https://playwright.dev/) (headless Chromium) |
| Lint / format | ESLint (flat config) + Prettier                           |
| CI            | GitHub Actions                                            |
| Delivery      | Static HTML5 bundle                                       |

## Prerequisites

- **Node.js ≥ 20.9** and npm.
- For E2E tests, install the Playwright browser once:
  ```bash
  npx playwright install chromium        # add --with-deps in CI / fresh Linux
  ```

## Commands

```bash
npm install          # install dependencies
npm run dev          # start the Vite dev server (http://localhost:5173)
npm run build        # typecheck + produce a static bundle in dist/
npm run preview      # serve the production build locally (http://localhost:4173)
npm test             # run unit tests (Vitest)
npm run test:e2e     # run E2E smoke tests (Playwright)
npm run typecheck    # tsc --noEmit (strict)
npm run lint         # eslint, zero warnings allowed
npm run format       # apply Prettier formatting
npm run format:check # verify Prettier formatting (used by CI)
```

The quality gate that CI enforces (and you should run before pushing):

```bash
npm run typecheck && npm run lint && npm run format:check && npm test && npm run build && npm run test:e2e
```

## Folder Architecture

```text
.
├── public/
│   └── assets/
│       ├── sprites/        # sprite atlases (Phase 5)
│       ├── audio/          # BGM + SFX (Phase 4)
│       ├── levels/         # Tiled .tmj levels (level-01, level-02, …)
│       ├── tilemaps/       # (Phase 0 placeholder map)
│       └── tilesets/       # tileset images (world-tiles.png)
├── src/
│   ├── main.ts             # Phaser.Game bootstrap (HMR-safe)
│   ├── config/
│   │   ├── GameConfig.ts    # Phaser GameConfig factory
│   │   └── constants.ts     # SINGLE source of truth for design values
│   ├── scenes/
│   │   ├── BootScene.ts      # → Preload
│   │   ├── PreloadScene.ts   # loader + progress bar → Movement
│   │   └── MovementScene.ts  # data-driven gameplay scene (loads .tmj, parallax, level flow)
│   ├── entities/           # Player, Star, Crate, Enemy/Snail/Slime, Checkpoint, Goal (+ pure logic)
│   ├── input/              # InputController (keyboard → abstract InputState)
│   ├── debug/              # DebugOverlay (backtick-toggled)
│   ├── systems/            # EventBus, GameManager, combat, LevelLoader, ObjectSpawner, ParallaxBackground, cameraView, levelParse
│   ├── ui/                 # (Phase 4+) HUD, pause overlay
│   ├── types/              # shared TypeScript types (incl. Tiled .tmj shapes)
│   └── utils/              # helpers (kinematics, …)
├── tests/
│   ├── unit/               # Vitest specs (pure logic/data)
│   └── e2e/                # Playwright specs (boots the real canvas)
├── tiled/                  # Tiled editor sources + export conventions
├── docs/reports/           # per-phase engineering reports
└── .github/workflows/ci.yml
```

### Tiled / level convention

Levels are authored in Tiled and **exported as `.tmj` (JSON)** to
`public/assets/levels/`; tile size is `32×32` (matches `GAME.TILE_SIZE`). The full
layer/object conventions and "how to add a level" are in
[`docs/level-authoring.md`](./docs/level-authoring.md).

### Design constants

All tunable values (gravity, speeds, jump, tile size, score) live in
[`src/config/constants.ts`](./src/config/constants.ts). Nothing else hard-codes
these numbers — game-feel is one diffable file.

## Roadmap

| Phase | Focus                                             |
| ----- | ------------------------------------------------- |
| 0     | Project setup & CI ✅                             |
| 1     | Movement prototype (character controller) ✅      |
| 2     | Core gameplay systems (stars, enemies, score) ✅  |
| **3** | Level & world systems (Tiled loader, parallax) ✅ |
| 4     | UI, HUD & audio                                   |
| 5     | Content, art integration & polish                 |
| 6     | Optimization, mobile & deployment                 |
