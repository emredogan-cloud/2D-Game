# Phase 0 Report — Project Setup & Pre-production

**Project:** Sky Islands (web-first 2D pixel-art platformer)
**Phase:** 0 — Project Setup & Pre-production
**Branch:** `chore/phase-0-setup`
**Date:** 2026-05-31
**Outcome:** ✅ Complete — full quality gate green locally; scaffold ready for Phase 1.

---

## Executive Summary

Phase 0 stands up a reproducible, CI-first engineering foundation for the game
described in `GAME_REVERSE_ENGINEERING_ROADMAP_AND_EXECUTION_PROMPTS.md`. The
repository now boots a Vite + TypeScript (strict) + Phaser 3 application to a
visible placeholder canvas through a `Boot → Preload → Main` scene flow, behind a
complete quality gate: **typecheck, lint (zero warnings), Prettier check, Vitest
unit tests, Playwright E2E, and a production build**, all wired into a GitHub
Actions pipeline that runs on push and pull request.

Per the roadmap's hard constraint, **no gameplay was implemented** — there is no
hero controller, scoring, enemies, audio, HUD, or real level. Only the scaffold,
the single source-of-truth constants module, the Tiled pipeline, and the test
harness exist. Every later phase plugs into this known-good skeleton.

The full gate passes locally:

```
✓ typecheck   ✓ lint (--max-warnings=0)   ✓ format:check
✓ unit (6/6)  ✓ e2e (2/2)                 ✓ build
```

---

## Files Created

### Tooling / config (repo root)

| File                              | Responsibility                                                                                                                    |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `package.json`                    | Project manifest; pinned deps; all npm scripts (`dev/build/preview/typecheck/lint/format/format:check/test/test:watch/test:e2e`). |
| `package-lock.json`               | Exact dependency lock (enables `npm ci` reproducibility in CI).                                                                   |
| `tsconfig.json`                   | TypeScript `strict` + `noUnusedLocals/Parameters`, `noImplicitOverride`, `isolatedModules`, `moduleResolution: Bundler`.          |
| `vite.config.ts`                  | Vite config; `base: "./"` for relocatable static bundle; dev `:5173`, preview `:4173`, sourcemaps.                                |
| `index.html`                      | App entry; `#game` mount node; full-viewport dark styling.                                                                        |
| `eslint.config.js`                | ESLint 9 flat config (typescript-eslint recommended + eslint-config-prettier).                                                    |
| `.prettierrc` / `.prettierignore` | Prettier rules (printWidth 100) and ignores (data/binary/spec doc).                                                               |
| `vitest.config.ts`                | Vitest config — `jsdom` env, `tests/unit/**`.                                                                                     |
| `playwright.config.ts`            | Playwright config — `tests/e2e`, chromium, dev-server `webServer`.                                                                |
| `.gitignore`                      | Ignores `node_modules/dist/coverage/playwright-report/.claude` + analysis artifacts.                                              |
| `.github/workflows/ci.yml`        | CI: typecheck → lint → format:check → unit → playwright → build (Node 20, npm cache).                                             |

### Source (`src/`)

| File                                       | Responsibility                                                                                       |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `src/main.ts`                              | `Phaser.Game` bootstrap; HMR-safe (idempotent boot + dispose); exposes instance on `window` for E2E. |
| `src/config/constants.ts`                  | **Single source of truth** for all design values (`GAME` object, `as const`).                        |
| `src/config/GameConfig.ts`                 | Phaser `GameConfig` factory: `AUTO` renderer, `FIT`+centre scale, `pixelArt`, Arcade physics.        |
| `src/scenes/BootScene.ts`                  | Boot → starts Preload.                                                                               |
| `src/scenes/PreloadScene.ts`               | Loader + progress bar → starts Main.                                                                 |
| `src/scenes/MainScene.ts`                  | Phase 0 placeholder (coloured canvas + label + marker).                                              |
| `src/types/index.ts`                       | Shared types (minimal: `Vec2`).                                                                      |
| `src/{entities,systems,ui,utils}/.gitkeep` | Forward-looking empty dirs for Phases 1–4.                                                           |

### Tests / assets / docs

| Path                                             | Responsibility                                                    |
| ------------------------------------------------ | ----------------------------------------------------------------- |
| `tests/unit/constants.spec.ts`                   | Vitest — 6 real assertions on the constants module.               |
| `tests/e2e/smoke.spec.ts`                        | Playwright — canvas boots + non-zero size; game instance exposed. |
| `tiled/sky-islands.tiled-project`                | Tiled editor project.                                             |
| `tiled/tileset-placeholder.tsx`                  | Placeholder tileset (1× 32×32 tile).                              |
| `tiled/README.md`                                | Tiled export convention + layer naming.                           |
| `public/assets/tilemaps/level-placeholder.tmj`   | Empty placeholder map (`ground` + `objects` layers).              |
| `public/assets/tilesets/tileset-placeholder.png` | 32×32 placeholder tile image.                                     |
| `public/assets/{sprites,audio}/.gitkeep`         | Forward-looking asset dirs.                                       |
| `README.md`                                      | Stack, commands, architecture, Tiled convention, roadmap.         |
| `docs/reports/phase-0-report.md`                 | This report.                                                      |

---

## Architecture Decisions

1. **Exact-pinned, Node-20-safe dependency set.** Versions are pinned exactly and
   the lockfile committed so CI's `npm ci` is the canonical "installs clean" check.
   - **Phaser `3.90.0`** — the latest **3.x** line (the roadmap mandates "Phaser 3
     (3.80+)"; Phaser 4.1.0 is the overall `latest` tag but was deliberately **not**
     used).
   - **Vite `6.4.2` + Vitest `3.2.4`** chosen over the newest majors (Vite 8 /
     Vitest 4) because Vite 7/8 raise the Node floor to `^20.19 || >=22.12`, which
     risks the **Node 20** CI runner; Vite 6 supports `^18 || ^20 || >=22`.
   - **TypeScript `5.9.3`** — `typescript-eslint@8.60` supports `<6.1.0`; 5.9 is the
     most battle-tested with the current ESLint/Vite ecosystem.
   - ESLint `9.39.4`, typescript-eslint `8.60.0`, Prettier `3.8.3`, jsdom `26.1.0`,
     `@types/node` `20.19.41`, `@playwright/test` `1.60.0`.
2. **Single source of truth for design values** (`src/config/constants.ts`). The
   `GAME` object carries the Phase 0 prompt's keys **plus** the roadmap's canonical
   tuning surface (`HERO_RUN_DECEL`, `HERO_COYOTE_MS`, `HERO_JUMP_BUFFER_MS`) so
   Phase 1 inherits the full feel surface. No magic numbers live elsewhere.
3. **Renderer/scale/physics** chosen to match the observed game and target: `AUTO`
   (WebGL→Canvas), `Scale.FIT` + `CENTER_BOTH` (responsive letterbox for mobile web),
   `pixelArt: true` (crisp pixel scaling), Arcade physics (AABB gravity — the only
   physics this rectilinear game needs).
4. **Assets under `public/assets/`** (not root `assets/`). Vite serves `public/`
   verbatim at `/` and copies it into `dist/`, so runtime URLs and the build "just
   work". The Phase 0 prompt explicitly permits this provided it is documented (it
   is, here and in the README). Tiled **editor sources** live in `tiled/`; **exported**
   `.tmj`/tileset images live in `public/assets/`.
5. **Phaser kept out of the jsdom unit environment.** Unit tests cover pure
   logic/data only; browser/WebGL behaviour is verified by Playwright. This avoids
   the well-known WebGL-in-jsdom fragility called out as a Phase 0 risk.
6. **HMR-safe bootstrap.** `main.ts` boots once (guarded on a `window` handle) and
   disposes the instance on hot update, preventing stacked canvases during dev.
7. **ESLint flat config with the (non-type-checked) recommended preset.** Fast,
   requires no `parserOptions.project`, and does not enable core `no-undef` (TS
   already handles it), so browser/test globals lint cleanly at `--max-warnings=0`.

---

## CI/CD

`.github/workflows/ci.yml`, triggered on **push** and **pull_request**, with
`concurrency` cancellation of superseded runs:

| Step       | Command                                                |
| ---------- | ------------------------------------------------------ |
| Checkout   | `actions/checkout@v4`                                  |
| Node       | `actions/setup-node@v4` (Node **20**, `cache: npm`)    |
| Install    | `npm ci`                                               |
| Typecheck  | `npm run typecheck`                                    |
| Lint       | `npm run lint` (`--max-warnings=0`)                    |
| Format     | `npm run format:check`                                 |
| Unit       | `npm run test` (Vitest)                                |
| Browsers   | `npx playwright install --with-deps chromium`          |
| E2E        | `npm run test:e2e` (Playwright)                        |
| Build      | `npm run build`                                        |
| On failure | upload `playwright-report/` artifact (7-day retention) |

Any red step fails the pipeline. The dependency cache keys off the lockfile.

---

## Testing

- **Unit (Vitest, jsdom):** `tests/unit/constants.spec.ts` — 6 assertions on real
  invariants: `TILE_SIZE > 0`, `STAR_SCORE_VALUE === 100`, `HERO_JUMP_VELOCITY < 0`,
  `GRAVITY_Y > 0`, sane resolution, air-control within `0..1`.
- **E2E (Playwright, headless Chromium):** `tests/e2e/smoke.spec.ts` — (1) the game
  boots and the `#game canvas` is visible with non-zero dimensions; (2) the Phaser
  game instance is exposed on `window` (proves real boot, not just DOM).
- **Manual:** `npm run dev` serves HTTP 200 and transforms `src/main.ts` (HMR client
  injected); `npm run build` → `npm run preview` serves HTTP 200 with the hashed
  bundle (`assets/index-*.js`) referenced and the `#game` mount present.

---

## Validation Results

All commands run locally on Node v24.13.1 (CI pins Node 20); every step passed.

| Gate             | Command                | Result                                                         |
| ---------------- | ---------------------- | -------------------------------------------------------------- |
| Typecheck        | `npm run typecheck`    | ✅ pass — 0 errors (strict)                                    |
| Lint             | `npm run lint`         | ✅ pass — 0 warnings (`--max-warnings=0`)                      |
| Format           | `npm run format:check` | ✅ pass — all files Prettier-clean                             |
| Unit tests       | `npm run test`         | ✅ pass — **6/6** (1 file)                                     |
| E2E tests        | `npm run test:e2e`     | ✅ pass — **2/2** (chromium)                                   |
| Production build | `npm run build`        | ✅ pass — `dist/` emitted (`index.html` + `assets/index-*.js`) |
| Manual dev       | `npm run dev`          | ✅ HTTP 200, TS transformed                                    |
| Manual preview   | `npm run preview`      | ✅ HTTP 200, built bundle served                               |

Resolved versions (from lockfile): phaser `3.90.0`, vite `6.4.2`, typescript
`5.9.3`, vitest `3.2.4`, @playwright/test `1.60.0`, eslint `9.39.4`,
typescript-eslint `8.60.0`, prettier `3.8.3`, jsdom `26.1.0`, @types/node
`20.19.41`, eslint-config-prettier `10.1.8`. `npm audit`: **0 vulnerabilities**.

---

## Deviations

1. **Repo already initialised.** The working directory was already a Git repo on
   `main` (one commit) with remote `origin → github.com/emredogan-cloud/2D-Game.git`.
   The roadmap's `git init` step was therefore skipped; work proceeded on a new
   `chore/phase-0-setup` branch off `main`, as specified.
2. **`gh` CLI is not installed.** The roadmap suggests opening a PR via `gh`. The PR
   was **not** opened programmatically and **no merge to `main`** was performed (also
   per the explicit instruction). The branch is committed and pushed; open the PR via
   the GitHub UI: `chore/phase-0-setup → main`.
3. **CI not observed green on GitHub from this environment.** Every CI step passes
   identically locally, and the workflow runs automatically on push. The remote run
   result could not be observed here (no `gh`/API token available).
4. **Assets under `public/assets/`** rather than root `assets/` (Vite static-serving;
   explicitly permitted by the Phase 0 prompt — documented in the README).
5. **Latest majors intentionally avoided** (Phaser 4 / Vite 8 / Vitest 4 / TS 6) in
   favour of a Node-20-safe, mutually-compatible set — see Architecture Decision 1.
6. **Large analysis artifacts git-ignored.** `Game_example.webm` (~37 MB) and the
   extracted `frames/` are reverse-engineering inputs, not game source, so they are
   excluded from the repo to keep it small. The roadmap spec document itself is
   versioned at the repo root.
7. **Slightly more tests than the minimum** (6 unit assertions + 2 E2E tests instead
   of one each) — all provide real value and remain minimal.

---

## Known Limitations

- **Bundle size:** the production bundle is ~1.48 MB (~341 KB gzip), almost entirely
  Phaser, triggering Vite's >500 KB chunk warning (non-fatal). Code-splitting /
  optimisation is explicitly Phase 6 scope.
- **Placeholder Tiled assets:** the tileset is a single solid 32×32 tile and the map
  is empty (one `ground` + one `objects` layer). A real tileset/level is Phase 3/5.
- **E2E asserts presence, not pixels** (canvas + game instance), per the Phase 0
  CI-fragility mitigation.
- **No gameplay** by design — movement begins in Phase 1.

---

## Next Recommended Step — Phase 1 Readiness

The repository is a known-good, CI-enforced skeleton: ✅ green quality gate, ✅
strict TS, ✅ Tiled pipeline, ✅ single constants source, ✅ scene flow. **It is ready
for Phase 1 (Movement Prototype).**

Recommended sequence:

1. Merge `chore/phase-0-setup → main` (open the PR; let CI run green on GitHub).
2. Branch `feat/phase-1-movement` off the updated `main`.
3. Execute the Phase 1 prompt: hero state machine (idle/run/jump/fall/land), Arcade
   body with accel/decel + air control, parabolic jump (~2 tiles) with coyote-time +
   jump-buffer, a hand-built Tiled test level, and a smoothed dead-zone follow camera
   — tuning the constants already stubbed in `src/config/constants.ts`.

No blockers carry forward from Phase 0.
