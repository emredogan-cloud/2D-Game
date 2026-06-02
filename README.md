# Sky Islands

A web-first **2D side-scrolling pixel-art platformer** with a painterly "floating
sky islands" theme. Run → jump across pits and floating islands → collect stars
(+100) → avoid enemies. Built to run in any modern browser.

> **Status: Phase 2 — Core Gameplay Systems.** On top of the Phase 1 controller:
> stars + score, solid/breakable crates, patrolling snail/slime enemies with
> stomp-vs-damage, pit death, lives + checkpoint respawn, and win/lose — owned by a
> `GameManager` and routed through a typed `EventBus`. `npm run dev`, then
> **Arrows/A,D** to move, **Space/W/Up** to jump, and the **backtick** key to toggle
> the debug overlay (state/score/lives). See the roadmap in
> [`GAME_REVERSE_ENGINEERING_ROADMAP_AND_EXECUTION_PROMPTS.md`](./GAME_REVERSE_ENGINEERING_ROADMAP_AND_EXECUTION_PROMPTS.md)
> and the phase reports in [`docs/reports/`](./docs/reports/).

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
│       ├── tilemaps/       # exported Tiled .tmj maps (loaded at runtime)
│       └── tilesets/       # tileset images
├── src/
│   ├── main.ts             # Phaser.Game bootstrap (HMR-safe)
│   ├── config/
│   │   ├── GameConfig.ts    # Phaser GameConfig factory
│   │   └── constants.ts     # SINGLE source of truth for design values
│   ├── scenes/
│   │   ├── BootScene.ts      # → Preload
│   │   ├── PreloadScene.ts   # loader + progress bar → Movement
│   │   └── MovementScene.ts  # gameplay scene: level, camera, stars/enemies/crates, respawn
│   ├── entities/           # Player, Star, Crate, Enemy/Snail/Slime, Checkpoint, Goal (+ pure logic)
│   ├── input/              # InputController (keyboard → abstract InputState)
│   ├── debug/              # DebugOverlay (backtick-toggled)
│   ├── systems/            # EventBus, GameManager, combat (AudioManager: Phase 4)
│   ├── ui/                 # (Phase 4+) HUD, pause overlay
│   ├── types/              # shared TypeScript types
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
`public/assets/tilemaps/`; tile size is `32×32` (matches `GAME.TILE_SIZE`). See
[`tiled/README.md`](./tiled/README.md) for layer naming and the export workflow.

### Design constants

All tunable values (gravity, speeds, jump, tile size, score) live in
[`src/config/constants.ts`](./src/config/constants.ts). Nothing else hard-codes
these numbers — game-feel is one diffable file.

## Roadmap

| Phase | Focus                                            |
| ----- | ------------------------------------------------ |
| 0     | Project setup & CI ✅                            |
| 1     | Movement prototype (character controller) ✅     |
| **2** | Core gameplay systems (stars, enemies, score) ✅ |
| 3     | Level & world systems (Tiled loader, parallax)   |
| 4     | UI, HUD & audio                                  |
| 5     | Content, art integration & polish                |
| 6     | Optimization, mobile & deployment                |
