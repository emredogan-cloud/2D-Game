# Phase 2 Report — Core Gameplay Systems

**Project:** Sky Islands (web-first 2D pixel-art platformer)
**Phase:** 2 — Core Gameplay Systems
**Branch:** `feat/phase-2-gameplay` (off `main`, which contains merged Phase 0 + Phase 1)
**Date:** 2026-06-02
**Outcome:** ✅ Complete — full quality gate green locally (typecheck · lint · format · 57 unit · 7 E2E · build).

---

## Executive Summary

Phase 2 turns the movement prototype into a **playable loop** on top of the
unchanged Phase 1 controller: collectible **stars** (+100 popup) feeding a score,
solid and breakable **crates**, patrolling **snail / slime** enemies with
**stomp-to-defeat vs side-contact damage**, **pit death**, **lives + checkpoint
respawn**, and **win / lose** state — all owned by a single `GameManager` and
wired through a typed `EventBus`.

The design is decoupled and test-first: all gameplay rules live in **pure,
Phaser-free logic** (`EventBus`, `GameManager`, the `isStomp` predicate, the
patrol decision) that is unit-tested headlessly; the Phaser entities and scene
only translate physics facts into those decisions. Phase 1 movement feel was not
touched (the only Player change is an additive, feel-preserving hurt/invuln hook),
and the Phase 1 E2E movement tests still pass as a regression guard.

Context: `main` already contained Phase 0 + Phase 1 (PR #2 merged); Phase 2 was
branched from it and the baseline gate verified green before any new code.

---

## Files Added / Changed

### Added — pure logic (Phaser-free, unit-tested)

| File                          | Responsibility                                                                          |
| ----------------------------- | --------------------------------------------------------------------------------------- |
| `src/systems/EventBus.ts`     | Typed generic pub/sub (`on`/`off`/`emit`/`clear`) + `GameplayEventMap`.                 |
| `src/systems/GameManager.ts`  | Single source of run state (score/lives/checkpoint/status); reacts to and emits events. |
| `src/systems/combat.ts`       | `isStomp()` — pure stomp-vs-damage predicate.                                           |
| `src/entities/enemyPatrol.ts` | `nextPatrolDirection()` — pure wall/edge flip decision.                                 |
| `src/config/gameplay.ts`      | `GAMEPLAY` tuning (lives, bounce, invuln, knockback, enemy speeds, popup).              |

### Added — runtime (Phaser entities)

| File                                | Responsibility                                                                          |
| ----------------------------------- | --------------------------------------------------------------------------------------- |
| `src/entities/Star.ts`              | Collectible: overlap → `collect` event + rising/fading "+100" popup → destroy.          |
| `src/entities/Crate.ts`             | Solid stand-on platform; `breakable` variant breaks on top-stomp (emits `crateBreak`).  |
| `src/entities/Enemy.ts`             | Abstract patrol base (ground-probe edge detection + `nextPatrolDirection`); `defeat()`. |
| `src/entities/Snail.ts`, `Slime.ts` | Concrete enemies (per-type speed/texture/body).                                         |
| `src/entities/Checkpoint.ts`        | Activate-once trigger → `setCheckpoint`.                                                |
| `src/entities/Goal.ts`              | Trigger → win.                                                                          |
| `src/entities/placeholders.ts`      | Runtime placeholder-texture generators (rect, diamond).                                 |

### Changed

| File                          | Change                                                                                                                                                                                                                                                                 |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/entities/Player.ts`      | **Additive** `hurt()` + invuln blink + a brief control lockout so knockback rides; `resetTo` clears hurt state; `isInvulnerable` getter. Normal movement path unchanged.                                                                                               |
| `src/scenes/MovementScene.ts` | Now the gameplay scene: instantiates `EventBus`+`GameManager`, spawns entities from a typed `SPAWN` spec (Phase-3 seam), registers colliders/overlaps, routes death through `killHero → die`, win/lose stub text, extended dev test hook (`score`/`lives`/`runState`). |
| `playwright.config.ts`        | Cap local workers to 2 (many parallel headless WebGL canvases starved the GPU). CI stays serial.                                                                                                                                                                       |

### Added — tests

`tests/unit/eventBus.spec.ts` (7), `gameManager.spec.ts` (10), `combat.spec.ts`
(5), `enemyPatrol.spec.ts` (5); `tests/e2e/gameplay.spec.ts` (2). Total now **57
unit + 7 E2E**.

---

## Gameplay Architecture — EventBus + GameManager

**EventBus** (`src/systems/EventBus.ts`) is a tiny typed emitter, framework-agnostic
so it (and everything that depends on it) unit-tests without a running game.
`GameplayEventMap` strongly types every payload (`collect`, `score`, `hurt`,
`defeat`, `crateBreak`, `checkpoint`, `die`, `respawn`, `win`, `lose`). `on()`
returns an unsubscribe; `emit()` iterates a **snapshot** of handlers so a listener
may unsubscribe mid-dispatch. No stringly-typed events; emitters never assume a
listener exists.

**GameManager** (`src/systems/GameManager.ts`) is the **single source of run-state
truth** (`score`, `lives`, `checkpoint`, `status: playing|won|lost`) and is pure
logic — no Phaser references. It subscribes to the bus and owns the rules:

- `collect` → `addScore(value)` → emits `score`.
- `die` (pit/hazard) → `loseLife(respawn = true)` → emits `respawn` at the
  checkpoint (or `lose` at 0 lives).
- `hurt` (enemy side-contact) → `loseLife(respawn = false)` → knockback/invuln are
  the hero's; the run only ends at 0 lives.
- `win()` → status `won`, emits `win`. All transitions are ignored once the run is
  no longer `playing`.

The **scene** owns the Phaser objects and is the only place that touches the view:
it listens for `respawn` (reposition hero), `win`/`lose` (stub text). This keeps
entities decoupled — they emit/consume events and read run state, never reaching
into one another.

---

## Entity Design — stars / crates / enemies

- **Star** — Arcade sprite, gravity off, immovable. Overlap → `collect` (value =
  `GAME.STAR_SCORE_VALUE`, the canonical 100) + a "+100" text that tweens up and
  fades, then the star destroys. Idempotent (`collected` guard).
- **Crate** — immovable solid platform. The `breakable` variant (lighter tint) is
  solid until **stomped from above**, then breaks (emits `crateBreak`, destroys).
  Break FX/particles are deferred to Phase 5 per scope — an event is emitted now.
- **Enemy** (base) — walks at a config speed; flips at walls (`body.blocked`) and
  at **platform edges** (probe the ground layer one step ahead/below the leading
  foot; a missing tile while grounded = edge). The flip itself is the pure
  `nextPatrolDirection`. `defeat()` squashes, emits `defeat`, disables the body,
  and destroys. **Snail** (slow) and **Slime** (fast) set per-type speed/texture/body.
- **Checkpoint** — activate-once trigger → `GameManager.setCheckpoint`.
- **Goal** — trigger → `GameManager.win`.

Entities are spawned from a typed `SPAWN` spec in the scene with an explicit
`// TODO(phase-3): source from the Tiled objects layer` seam, so Phase 3 only swaps
the data source.

---

## Stomp Logic

The discrimination is a **pure predicate** (`src/systems/combat.ts`), unit-tested
at the boundary:

```ts
isStomp = heroVelocityY > 0 && heroBottom <= targetY + epsilon;
```

- **Stomp** (descending AND feet at/above the target line) → `enemy.defeat()` + the
  hero bounces (`STOMP_BOUNCE_VELOCITY`). For breakable crates the same test uses
  the crate's **top** as `targetY` → break + bounce.
- **Otherwise** (side/under) → **damage**: `player.hurt()` applies knockback away
  from the enemy + an invulnerability window, and emits `hurt` (→ lose one life)
  only if not already invulnerable.

**Why it is unambiguous:** the hero↔ground collider is registered _before_ the
hero↔enemy overlap, so on flat ground the hero's `velocity.y` is already resolved
to 0 by overlap time → `heroVelocityY > 0` is false → side contact is damage, never
a stomp. A real jump-on landing keeps `vy > 0` at overlap → stomp. The
`tests/e2e/gameplay.spec.ts` "side-contact damage" test exercises this end-to-end
(walking into a grounded snail costs exactly one life), and the `epsilon` boundary
is unit-tested.

The Player's hurt path is **feel-preserving**: a `HURT_LOCKOUT_MS` window suspends
the manual horizontal integration so the knockback velocity rides out, after which
normal control resumes unchanged; invulnerability blinks the sprite and blocks
further hits. When not hurt, `preUpdate` follows the identical Phase 1 path.

---

## Testing

- **Vitest (57 total):** EventBus (delivery, multi-listener, `off`, unsubscribe,
  no-listener no-op, unsubscribe-during-emit); GameManager (score accumulation,
  collect→score, die→respawn-at-checkpoint, hurt→life-without-respawn, checkpoint
  move, out-of-lives→lose, ignore-after-over, win, reset); `isStomp` boundary
  (rising / zero-vy / below-target / epsilon edge); `nextPatrolDirection` (walls,
  edge, wall-behind ignored); plus all Phase 1 specs (regression).
- **Playwright (7 total):** Phase 0 smoke (2); Phase 1 movement (3, regression);
  Phase 2 gameplay (2) — boots with **no console errors** and a star raises the
  score by exactly 100; walking into a grounded enemy costs **exactly one life**
  (side-contact damage) and the run stays `playing`. A dev-only
  `window.__SKY_ISLANDS_TEST__` hook exposes `score`/`lives`/`runState` (no pixel
  diffs).
- **Manual (`npm run dev`):** stars + "+100"; stomping an enemy bounces the hero;
  side contact knocks back + costs a life with an invuln blink; jumping onto a
  breakable crate breaks it; falling in the pit respawns at the checkpoint; reaching
  the goal shows the win stub; running out of lives shows the lose stub. No console
  errors; no stuck/ghost bodies after repeated deaths.

### How to test

```bash
npm run typecheck && npm run lint && npm run format:check && npm test && npm run build && npm run test:e2e
npm run dev   # Arrows/A,D move · Space/W/Up jump · ` debug overlay (state/score via hook)
```

---

## Validation Results

| Gate      | Command                | Result                             |
| --------- | ---------------------- | ---------------------------------- |
| Typecheck | `npm run typecheck`    | ✅ 0 errors (strict)               |
| Lint      | `npm run lint`         | ✅ 0 warnings (`--max-warnings=0`) |
| Format    | `npm run format:check` | ✅ clean                           |
| Unit      | `npm run test`         | ✅ **57/57** (8 files)             |
| E2E       | `npm run test:e2e`     | ✅ **7/7** (chromium)              |
| Build     | `npm run build`        | ✅ `dist/` emitted                 |

---

## Deviations

1. **Gameplay tuning lives in a new `src/config/gameplay.ts`** (the prompt's
   suggested `gameplay.ts`), while the star value still references the canonical
   `GAME.STAR_SCORE_VALUE` in `constants.ts` — no duplicated source of truth.
2. **Kept the scene named `MovementScene`** (it is the gameplay scene) rather than
   renaming to `GameScene`, to avoid churn and a risk of regressing the Phase 1
   flow/tests. The prompt explicitly permits "the existing Phase 1 scene". A rename
   is a cheap future cleanup.
3. **Breakable-crate FX deferred:** breaking emits a `crateBreak` event and removes
   the crate; particle FX is Phase 5 per the strict scope (no particles in Phase 2).
4. **Hazard tiles are a documented seam.** Pit death (death-plane) is the
   implemented hazard; a `// TODO(phase-3)` marks where authored hazard tiles route
   into the same `killHero()` funnel. (No hazard tiles exist on the test map yet.)
5. **Entities passed to colliders as plain arrays** rather than physics groups, to
   avoid a group re-enabling/resetting the bodies configured in entity constructors.
   Destroyed/disabled bodies are safely skipped by Arcade, and handlers guard
   (`isDefeated` / `collected`).
6. **Win/lose are stubs** (centered text + run-state) — no end screen (Phase 4 UI).
7. **Player gained a feel-preserving hurt path.** This is the one Player change; it
   is additive and inactive when not hurt (documented; movement E2E regression
   confirms unchanged feel).
8. **Local Playwright workers capped at 2** (WebGL contention); CI remains serial.

---

## Known Limitations

- **No on-screen HUD** for score/lives yet (only the debug overlay + test hook) —
  intentionally Phase 4. The minimal observed HUD (music/pause) and a score readout
  arrive then.
- **Single hand-placed test level**; full Tiled-object spawning + multiple levels
  are Phase 3.
- **Breakable crate is solid-until-stomped** (a simple, documented model) rather
  than bump-from-below.
- **Camera framing** remains best-effort/tunable (carried from Phase 1).
- **Bundle size** ~1.50 MB (~346 KB gzip), essentially Phaser — optimisation is
  Phase 6.
- **Placeholder art** (generated rectangles/diamond) — real sprites are Phase 5.

---

## Phase 3 Readiness

Phase 2 leaves clean seams for Phase 3 (Level & World Systems):

- **Spawning:** the typed `SPAWN` spec is marked `TODO(phase-3)` — Phase 3 swaps the
  source to the Tiled `objects` layer via an `EntityFactory`, no entity changes.
- **Events:** the `EventBus` already carries `collect`/`score`/`hurt`/`defeat`/`win`/
  `lose` — Phase 4 HUD and audio subscribe without touching gameplay.
- **State:** `GameManager` is the sole run-state owner and `reset()`-able — ready for
  multi-level flow and level-complete transitions.
- **Hazards/checkpoints:** the `killHero()` funnel and `Checkpoint` entity are in
  place for richer level hazards and progression.

**Recommended gate before Phase 3:** squash-merge `feat/phase-2-gameplay` to `main`
(CI green) — no tag (milestone deferred to Phase 3 per the roadmap).
