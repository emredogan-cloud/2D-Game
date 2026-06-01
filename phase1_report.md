# Phase 1 Report — Movement Prototype (Character Controller)

**Project:** Sky Islands (web-first 2D pixel-art platformer)
**Phase:** 1 — Movement Prototype
**Branch:** `feat/phase-1-movement` (off `main`, which contains the merged Phase 0)
**Date:** 2026-06-01
**Outcome:** ✅ Complete — full quality gate green locally (typecheck · lint · format · 30 unit tests · 5 E2E · build).

---

## Executive Summary

Phase 1 delivers the **game feel**: a hero character controller with an explicit
finite state machine (`idle / run / jump / fall / land`), arcade-physics movement
with acceleration, deceleration, momentum and strong air control, a single jump
tuned to a ~2.5-tile apex with **coyote-time** and **jump-buffering**, and a
smoothed dead-zone follow camera biased left-of-centre. The hero runs on a
hand-built **Tiled `.tmj`** test level (solid ground band, a 4-tile pit, two
2-tile blocks) loaded via Phaser's tilemap API, with pit-fall respawn and a
toggleable debug overlay.

All feel values live in the single source of truth `src/config/constants.ts`. The
pure controller logic (FSM, coyote/buffer timers, jump kinematics) is Phaser-free
and unit-tested headlessly; in-browser behaviour (run, jump, no-double-jump) is
verified by Playwright. No gameplay systems beyond movement were built — no stars,
score, enemies, GameManager, audio, or HUD (those are Phases 2–4).

Note on context: the local workspace had been wiped between sessions; Phase 0 was
restored from `origin/main` (PR #1 had merged it). The restored Phase 0 baseline
was verified green before any Phase 1 work began.

---

## Files Added / Changed

### Added — pure logic (Phaser-free, unit-tested)

| File                                 | Responsibility                                                                                        |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `src/entities/PlayerStateMachine.ts` | `PlayerState` union + `nextPlayerState()` — total, pure FSM transition function.                      |
| `src/entities/jumpTimers.ts`         | `updateCoyote` / `updateBuffer` / `canConsumeJump` — pure timer logic; enforces single-jump.          |
| `src/utils/kinematics.ts`            | `apexHeightPx` / `apexHeightTiles` / `timeToApexSeconds` — projectile math for the 2-tile derivation. |

### Added — runtime (Phaser)

| File                                        | Responsibility                                                                                                                                                                               |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/entities/Player.ts`                    | `Player` (Arcade.Sprite): manual horizontal integration, gravity jump + variable height, coyote/buffer, FSM drive, flip, `resetTo`, read-only getters; generates a placeholder hero texture. |
| `src/input/InputController.ts`              | Keyboard → abstract `InputState` (Arrows/WASD/Space, edge-detected jump, backtick debug toggle).                                                                                             |
| `src/debug/DebugOverlay.ts`                 | Camera-fixed text overlay (state, grounded, velocity, coyote/buffer, fps); toggled with backtick.                                                                                            |
| `src/scenes/MovementScene.ts`               | Loads the Tiled level, wires tile collision + follow camera + world bounds, pit→respawn, dev-only `window.__SKY_ISLANDS_TEST__` hook.                                                        |
| `public/assets/tilemaps/test-movement.tmj`  | Hand-built test level (60×23 @ 32px): ground band, 4-tile pit, two 2-tile blocks, `spawn` object.                                                                                            |
| `public/assets/tilesets/movement-tiles.png` | 2-tile tileset (ground / stone).                                                                                                                                                             |

### Added — tests

`tests/unit/playerStateMachine.spec.ts` (10), `tests/unit/jumpKinematics.spec.ts`
(5), `tests/unit/coyoteJumpBuffer.spec.ts` (9), `tests/e2e/movement.spec.ts` (3).

### Changed / Removed

| File                                          | Change                                                                                                                                      |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/config/constants.ts`                     | Calibrated movement block (re-derived `HERO_JUMP_VELOCITY`); added max-fall, jump-cut, body/sprite size, run-epsilon, and camera constants. |
| `src/config/GameConfig.ts`                    | Scene list now `[Boot, Preload, Movement]`.                                                                                                 |
| `src/scenes/PreloadScene.ts`                  | Advances to `"Movement"` instead of `"Main"`.                                                                                               |
| `src/scenes/MainScene.ts`                     | **Removed** — Phase 0 placeholder, explicitly "replaced by the movement prototype".                                                         |
| `src/entities/.gitkeep`, `src/utils/.gitkeep` | Removed (dirs now hold real files).                                                                                                         |

---

## Player Architecture (FSM design)

The behaviour/animation state machine is a **pure function** so it is unit-testable
without a live scene:

```
nextPlayerState(current, { grounded, vy, hasHorizontalInput, speedX, jumpStarted, runEpsilon })
```

Transition rules (total over all states):

1. `jumpStarted` (a jump impulse was applied this frame) → **`jump`** — always wins.
2. **Grounded**: if `current ∈ {jump, fall}` → **`land`** (the touchdown frame);
   otherwise resolve the resting state — **`run`** if `hasHorizontalInput` or
   `speedX > runEpsilon`, else **`idle`**. (`land` is transient: it resolves to
   run/idle on the next frame.)
3. **Airborne**: `vy < 0` → **`jump`** (rising); `vy ≥ 0` → **`fall`** (apex/descent).

**Single-jump** is guaranteed _upstream_: `jumpStarted` is only set when the
controller could consume a jump (grounded or within coyote time), and consuming
zeroes both timers — so an airborne press without coyote can never re-enter `jump`.
The FSM itself stays a pure mapping of physical facts → state.

The controller (`Player.preUpdate`) integrates horizontal velocity **manually**
(chosen over `setAccelerationX`/`drag` for precise, deterministic feel):
accelerate toward `±RUN_SPEED` by `HERO_ACCEL`; add `HERO_RUN_DECEL` as a
turn-around brake when reversing; with no input, decay toward 0 by `HERO_DRAG`;
all horizontal forces scale by `HERO_AIR_CONTROL` while airborne. Vertical motion
is Arcade-gravity-driven; the jump sets `vy`, an early key-release multiplies the
rising `vy` by `HERO_JUMP_CUT_MULTIPLIER` (variable height), and `setMaxVelocity`
caps terminal fall.

---

## Movement Tuning (final values + rationale)

All in `src/config/constants.ts` (hot-tweakable; nothing hard-coded elsewhere):

| Constant                   | Value  | Why                                                        |
| -------------------------- | ------ | ---------------------------------------------------------- |
| `GRAVITY_Y`                | `1400` | Moderate → floaty-but-controlled descent (observed).       |
| `HERO_RUN_SPEED`           | `220`  | Moderate capped top speed (observed).                      |
| `HERO_ACCEL`               | `1600` | Visible ramp-up, not instant.                              |
| `HERO_RUN_DECEL`           | `1800` | Snappy turnaround brake when reversing.                    |
| `HERO_DRAG`                | `1200` | Passive friction to a stop when no input.                  |
| `HERO_JUMP_VELOCITY`       | `-475` | **Derived** — see below (~2.5-tile apex).                  |
| `HERO_MAX_FALL_SPEED`      | `760`  | Controlled terminal velocity.                              |
| `HERO_JUMP_CUT_MULTIPLIER` | `0.45` | Tap = short hop, hold = full jump (variable height).       |
| `HERO_AIR_CONTROL`         | `0.6`  | Strong mid-air steering with retained momentum (observed). |
| `HERO_COYOTE_MS`           | `90`   | Forgiving ledge-jump grace.                                |
| `HERO_JUMP_BUFFER_MS`      | `110`  | Forgiving early-press queue.                               |
| `HERO_RUN_EPSILON`         | `8`    | Idle/run threshold.                                        |

### 2-tile apex derivation

Peak jump height under constant gravity: `h = v² / (2g)` ⟹ `v = √(2·g·h)`.
Targeting a comfortable landing on a **2-tile (64 px) block**, aim apex ≈ 2.5 tiles
= 80 px:

```
v = √(2 · 1400 · 80) ≈ 473  →  HERO_JUMP_VELOCITY = -475
apex = 475² / (2·1400) ≈ 80.6 px ≈ 2.52 tiles   (clears 64 px with ~16 px margin)
time-to-apex ≈ 475/1400 ≈ 0.34 s ;  airtime ≈ 0.68 s
horizontal reach ≈ 220 px/s × 0.68 s ≈ 150 px ≈ 4.7 tiles  (clears the 4-tile pit)
```

`jumpKinematics.spec.ts` asserts the configured apex is `≥ 2` and `< 3.5` tiles and
exceeds 64 px, so the requirement is checked in CI, not eyeballed.

---

## Camera (dead-zone + smoothing design)

`MovementScene` configures a Phaser follow camera entirely from constants:

- `startFollow(player, roundPixels=true, lerpX, lerpY)` with `CAMERA_LERP = 0.12`
  — critically-damped-feeling smoothing; `roundPixels` prevents sub-pixel jitter on
  the pixel-art canvas.
- `setDeadzone(220, 160)` — the hero can move within a central box before the camera
  scrolls (reduces micro-corrections, kills jitter on small moves).
- `setFollowOffset(-180, 48)` — negative X biases the hero **left-of-centre** so more
  level is visible ahead in the run direction (matches the observed framing).
- `setBounds(0, 0, mapW, mapH)` — camera never scrolls past the level; combined with
  `world.setBounds` (bottom edge **open** so the hero can fall through pits).

Camera framing is "best-effort tunable" — the offset sign/magnitude were derived
from Phaser's follow math (hero screen-x = `width/2 + offsetX`) and are trivially
adjustable in one place; final visual sign-off belongs to the Phase 1 feel gate.

---

## Testing

- **Vitest (30 tests, all pure / Phaser-free):**
  - `playerStateMachine.spec.ts` — every transition incl. apex (`jump→fall`),
    touchdown (`fall→land`), `land→idle/run`, and **no-double-jump** (airborne with
    `jumpStarted=false` stays `jump`/`fall`); totality check.
  - `jumpKinematics.spec.ts` — derived apex `≥2`/`<3.5` tiles, `>64 px`, `h=v²/2g`,
    gravity guards.
  - `coyoteJumpBuffer.spec.ts` — coyote reset/decay, buffer set/decay, normal jump,
    coyote jump, buffered-press-on-landing, **no-double-jump after consume**, expired
    coyote.
- **Playwright (5 tests):** canvas boots + game instance exposed (smoke); holding
  right increases hero x; holding jump enters `jump` / rises (`vy<-10`); **mid-air
  second press does not re-launch** (vy stays positive). Uses a dev-only
  `window.__SKY_ISLANDS_TEST__` hook (gated on `import.meta.env.DEV`) — no pixel
  diffs.
- **Manual (dev/preview):** dev server serves the page + `test-movement.tmj` +
  `movement-tiles.png` (all HTTP 200); E2E exercises run/jump/fall/no-double-jump
  against the real canvas. Debug overlay toggles with backtick; pit fall past the
  death line respawns at the Tiled `spawn`.

### How to test

```bash
npm run typecheck && npm run lint && npm run format:check && npm test && npm run build && npm run test:e2e
npm run dev   # then: Arrows/A,D to move · Space/W/Up to jump · ` to toggle the debug overlay
```

---

## Validation

| Gate               | Command                | Result                              |
| ------------------ | ---------------------- | ----------------------------------- |
| Typecheck          | `npm run typecheck`    | ✅ 0 errors (strict)                |
| Lint               | `npm run lint`         | ✅ 0 warnings (`--max-warnings=0`)  |
| Format             | `npm run format:check` | ✅ clean                            |
| Unit               | `npm run test`         | ✅ **30/30** (4 files)              |
| E2E                | `npm run test:e2e`     | ✅ **5/5** (chromium)               |
| Build              | `npm run build`        | ✅ `dist/` emitted                  |
| Manual dev/preview | `npm run dev` / assets | ✅ HTTP 200; level + tileset served |

---

## Deviations

1. **Tuning lives in the existing `constants.ts`, not a new `PlayerTuning.ts`.** The
   Phase 1 prompt suggested `src/config/PlayerTuning.ts`, but it also mandates
   conforming to Phase 0's established structure and "do not invent a parallel
   structure". Phase 0 established `constants.ts` (`GAME`) as the single source of
   truth, so the feel surface was added there. Mapping is 1:1 (e.g. `runMaxSpeed →
HERO_RUN_SPEED`, `airAccelFactor → HERO_AIR_CONTROL`).
2. **Test level at `public/assets/tilemaps/test-movement.tmj`** (Phase 0's `tilemaps`
   dir), not the prompt's `public/assets/maps/`. Conforms to Phase 0's asset layout.
3. **Unit tests under `tests/unit/`, E2E under `tests/e2e/`** (Phase 0 convention),
   not the prompt's flat `tests/*.spec.ts` — matches the Vitest/Playwright `testDir`
   config established in Phase 0.
4. **`HERO_JUMP_VELOCITY` retuned `-560 → -475`.** Phase 0's value gave a ~3.5-tile
   apex; Phase 1 re-derived it for the observed "~2 tile" arc (these constants were
   explicitly flagged "TUNE IN PHASE 1").
5. **`MainScene` removed** and replaced by `MovementScene` in the scene flow — the
   Phase 0 placeholder was documented as "Phase 1 will replace this scene". The smoke
   tests are scene-key-agnostic, so this did not regress them.
6. **Small dev-only controls hint text** is drawn in the scene. This is a prototype
   aid, not the game HUD (HUD is Phase 4); it can be removed trivially.
7. **Repo was restored from the remote.** The local working tree had been cleared
   between sessions; the project was re-fetched from `origin` and Phase 0 verified
   green before starting.

---

## Known Limitations

- **Camera framing not visually signed-off.** The follow offset/dead-zone are
  derived and tunable but a human "feels-right" pass (the Phase 1 gate for Phase 2)
  is still recommended.
- **Bundle size** ~1.49 MB (~343 KB gzip), essentially all Phaser — Vite's >500 KB
  warning is expected; optimisation is Phase 6.
- **Placeholder art:** the hero is a generated rectangle with a facing marker; the
  tileset is two flat-colour tiles. Real art arrives in Phase 5.
- **Anti-tunnelling:** mitigated via `setMaxVelocity` (caps run and terminal-fall
  speeds within Arcade's safe per-step range); no tunnelling observed at current
  speeds. Revisit only if Phase 5 raises speeds substantially.
- **`land` is a 1-frame transient** (sufficient for SFX/anim hooks later); no
  dedicated landing-squash timing yet.

---

## Phase 2 Readiness

The controller is the vertical-slice foundation Phase 2 builds on. Seams left in
place:

- **Respawn** is isolated in `Player.resetTo()` and triggered by a death-Y in the
  scene — Phase 2 routes this through a `GameManager` (lives/death events).
- **Input** is abstracted behind `InputController`/`InputState` — Phase 4 touch
  controls plug into the same shape.
- **FSM** exposes `land` and clean state reads — ready for animation clips (Phase 5)
  and gameplay event hooks (Phase 2: `player:land`, `player:hurt`).
- The Tiled `objects` layer already carries a typed `spawn` object — Phase 2/3 extend
  it with stars, crates, enemies, checkpoints via an `EntityFactory`.

**Recommended gate before Phase 2:** a human plays the prototype and signs off that
the feel is right (do not build gameplay on a controller still being re-tuned), then
squash-merge `feat/phase-1-movement` and tag `v0.1-feel` / `v0.1.0-movement`.
