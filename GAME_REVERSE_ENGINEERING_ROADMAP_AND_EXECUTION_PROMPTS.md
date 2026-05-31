# Game Reverse-Engineering, Roadmap & Execution Prompts

> **Source artifact:** `Game_example.webm` (23.5 s · 1853×966 · VP8 · ~29.25 fps · no audio track)
> **Analysis date:** 2026-05-31 · **Method:** frame-by-frame forensic inspection (overview @3 fps, full-res @1 fps, zoom crops, jump-arc burst @12 fps)
> **Subject:** a 2D side-scrolling pixel-art platformer with a painterly "floating sky-islands" theme.
> **Target stack chosen for the rebuild:** Phaser 3 + TypeScript + Vite + Tiled + Howler.js → static HTML5 (web-first).

This document is written as an internal studio production package: a forensic teardown of the footage, a technical architecture, a phased production roadmap, a copy-paste **Claude Code CLI master prompt for every phase**, and an objective final verdict.

---

## Table of Contents
1. [Part 1 — Video Forensic Analysis](#part-1--video-forensic-analysis)
2. [Part 2 — Technical Reverse Engineering & Architecture](#part-2--technical-reverse-engineering--architecture)
3. [Part 3 — Production Roadmap](#part-3--production-roadmap)
4. [Part 4 — Claude CLI Execution Prompts (per phase)](#part-4--claude-cli-execution-prompts)
5. [Part 5 — Final Verdict](#part-5--final-verdict)
6. [Appendix — Method & Evidence](#appendix--method--evidence)

**Phase overview**

| # | Phase | Branch |
|---|-------|--------|
| 0 | Project Setup & Pre-production | `chore/phase-0-setup` |
| 1 | Movement Prototype (Character Controller) | `feat/phase-1-movement` |
| 2 | Core Gameplay Systems | `feat/phase-2-gameplay` |
| 3 | Level & World Systems | `feat/phase-3-world` |
| 4 | UI, HUD & Audio | `feat/phase-4-ui-audio` |
| 5 | Content, Art Integration & Polish | `feat/phase-5-content-polish` |
| 6 | Optimization, Mobile & Deployment | `feat/phase-6-optimize-deploy` |

---

## Part 1 — Video Forensic Analysis

**Provenance & method.** The source asset is `Game_example.webm` — a 23.53s, 1853×966, VP8-encoded, ~29.25 fps (117/4) clip with **no audio track** (video-only; confirmed via container probe). It was analysed frame-by-frame: full-frame samples across the runtime plus magnified crops of the hero, HUD, stone blocks, the wooden crate, and a ~31-frame jump burst. The clip is a **browser gameplay capture**: a Japanese screen-capture utility (toolbar reading "オプション"=Options, "取り込む"=Capture) briefly overlays the bottom edge and is **not part of the game**; a desktop mouse cursor is also visible drifting in-frame, confirming a windowed/browser context. The clip is embedded in an X/Twitter post with a Turkish caption referencing "Opus 4.8", strongly implying an **AI-assisted / AI-generated game demo** (inferred). All verdicts below are grounded in those frames; anything beyond direct observation is explicitly marked **(inferred)**.

### A. Genre + Core Loop

**Genre verdict:** a 2D side-scrolling **collect-a-thon platformer** in the Super Mario Bros. / Celeste lineage, dressed in a MapleStory-style "floating sky islands" fantasy skin. The grammar is unambiguous from the frames — grass-topped ground band with pits, discrete floating platforms, parabolic jumps, walking enemies, and arc-shaped collectible clusters.

**Core loop (observed):**

| Beat | Observed evidence | Loop function |
|---|---|---|
| Run rightward | Level scrolls L→R, hero held near center / left-of-center | Traversal / pacing |
| Jump pits & gaps | Clean parabola over ground gaps and onto islands (jump burst) | Risk / skill gate |
| Collect stars | Orange 4-point stars in arcs/clusters, each spawning a floating "+100" popup | Reward / score |
| Use blocks as platforms | Stone-block stairs/towers and a floating wooden X-crate stood on | Vertical routing |
| Pass enemies | Snails and slimes/turtles on ground and islands | Obstacle / threat |

**Player objective:** **traversal + score maximisation via star collection.** No goal flag, end screen, exit door, or victory state appears anywhere in 23.5s — the recorded segment loops a similar island layout, reading as either a short demo level or back-and-forth traversal of one authored stretch.

**Win/fail conditions (inferred):** No death, respawn, or game-over was captured. From genre convention: **fail = falling into a pit or contacting an undefeated enemy**; **win = reaching a level-end marker** (not yet built). The presence of pits + walking enemies + a score popup but **no visible life/score/timer HUD** suggests fail-state and scoring exist in logic but are not yet surfaced to the player — a classic early-prototype tell (inferred).

**Session structure & replayability (inferred):** Currently a single continuous traversal loop with no scoring readout, so session length is unbounded and replay motivation is weak. The "+100" popups are the seed of a score economy; the obvious productionisation is **per-run star total + high-score / star-count completion (e.g. "12/15 stars")** to convert aimless traversal into a replayable, optimisable run.

### B. Camera + Perspective

**2D vs 2.5D verdict: pure 2D side-scroller.** Despite painterly depth in the backdrop, all gameplay collision and motion occur on a single XY plane — no perspective shear, no Z-axis movement, no rotation. The depth is **purely pictorial**, achieved through parallax layering, not a 2.5D camera.

**Follow behaviour:** horizontal-follow camera that keeps the hero **near screen-center, biased slightly left-of-center**, giving more visible space ahead in the direction of travel (good readability for a right-running platformer). Vertical position stays locked to a **ground band** — across the jump burst the hero rises well up the frame while the camera barely tracks vertically, so the world has little vertical scroll and the camera is effectively a **horizontally-driven, vertically-clamped follow**.

**Smoothing:** motion is smooth with **no jitter, no snapping, no per-frame stutter** between scroll updates — consistent with a **lerped/damped follow (Vector lerp or critically-damped spring toward a target offset)** (inferred from the smoothness; exact algorithm not observable).

**Dead-zone:** a horizontal dead-zone is plausible but not provable at this resolution — the hero's screen-X stays roughly stable during steady running, which is consistent with either a tight lerp or a center dead-zone (inferred). Vertically, behaviour reads as a **hard clamp / large dead-zone**, since jumps don't move the camera up.

**Boundaries:** no top/bottom letterboxing of the world is observed; the floating-island layer and ground both sit within frame, implying the camera's vertical range is authored to the ground band. Left/right world bounds are not reached in-clip (inferred to exist at level extremities).

### C. Character System

**Sprite:** ~24–32 px adventurer — teal/green cap-or-hood, orange/brown hair, satchel/backpack. Clearly readable silhouette at gameplay zoom.

**Observed animation states:** `run` (legs cycling during ground travel), `jump/rise` (body tucked, ascending), `fall/descend` (descending toward platforms), and `land` (return to ground band). **Idle is inferred** (not captured — hero is in near-constant motion).

**Movement feel:** **floaty with notable air control and visible momentum.** The hero shows run **acceleration and deceleration** (a ramp-up/ramp-down rather than instant top speed) and can clearly steer mid-air. This is a deliberately forgiving, "modern platformer" feel rather than crisp Mario-style snappiness.

**Jump arc:** a **clean symmetric parabola clearing ≈2 tiles in height**, confirmed across the jump burst (apex sits roughly two tiles above takeoff, with comparable rise and fall durations). The smooth arc and floaty descent indicate **moderate gravity with a relatively high jump impulse**.

**Double-jump:** **NOT confirmed.** No second mid-air impulse or re-rise was captured. Safe read is **single jump + generous air control**; a double-jump would need a second airborne velocity spike that does not appear (inferred-absent).

**Inferred tuning targets** (for reproduction, derived from the observed feel — not measured values):

| Parameter | Qualitative read |
|---|---|
| Gravity | Moderate (floaty, slow-ish fall) |
| Jump impulse | High enough for ~2-tile apex |
| Ground accel/decel | Smooth ramps, not instant |
| Air control | Strong (clear mid-air steering) |
| Max run speed | Moderate; capped |

**State-machine transitions (inferred):** `idle ⇄ run` driven by horizontal input; `run/idle → rise` on jump press while grounded; `rise → fall` at apex (vy crosses zero); `fall → land → idle/run` on ground contact. **Coyote time and jump-buffering are plausible** given the forgiving feel but cannot be confirmed from the clip (inferred).

### D. Physics

**Style verdict: tile-based AABB / arcade physics**, not a true rigidbody/impulse simulator. Tiles show square grid borders; collision behaves as **axis-aligned solid blocking** — the hero stands cleanly on grass tiles, stone blocks, and the wooden crate, with no sliding, tipping, or rotational dynamics.

**Collision model (inferred):** a single **rectangular collider on the hero** resolved against a tile grid via standard swept-AABB or per-axis penetration resolution. No partial-overlap wobble or physics-engine "settling" is visible, which argues **against** a general 2D physics engine (Box2D/Matter) and **for** a hand-rolled tilemap collider (inferred).

**Ground checks (inferred):** a downward ground probe (raycast or a thin foot-sensor box) gates the grounded state and jump availability — standard for this style; not directly observable but consistent with the clean landings.

**Solids observed:** grass-topped ground band (continuous, with pits), grey cobblestone blocks stacked 2–3 high into stairs/towers, and the wooden X-crate — **all act as solid stand-on surfaces.** Whether platforms are one-way (jump-through from below) cannot be determined; the stone stacks read as **full solids** (inferred).

**Slopes:** **none observed.** Geometry is entirely rectilinear — flat tops and vertical faces only. A reproduction should not implement slope physics for the observed content.

**Platform snapping:** landings resolve cleanly to tile tops with no inter-penetration, consistent with per-axis collision resolution snapping the collider to the surface (inferred).

**Jump-arc behaviour:** ballistic — constant downward gravity acceleration produces the symmetric parabola; horizontal velocity persists through the arc (air control modulates it), matching the observed clearances over gaps.

### E. Level Structure

**Tilemap/grid usage:** a **modular square tile grid**, visible directly in the cobblestone-block crop (clear cell borders with dark/purple grout). The world is composed of repeated tile units rather than bespoke geometry, making it a natural fit for a **Tiled (.tmx) tilemap or equivalent grid editor** (inferred toolchain).

**Composition layers within the play space:**

- **Ground band:** grass-topped dirt/soil tiles in a continuous horizontal strip, punctuated by **gaps/pits** the hero must jump.
- **Stone structures:** grey cobblestone blocks stacked into **2–3-high stairs and towers**, used for vertical routing onto higher ground/islands.
- **Floating grassy islands:** elevated platforms (grass tops, trees, pouring waterfalls) sitting above the ground band, reachable as discrete jump targets.
- **Crate:** at least one wooden X-crate floating as a mid-air stand-on/route block.

**Layout authoring:** placements are **hand-placed/modular** (deliberate stair shapes, island spacing tuned to jump distance), not procedurally noisy. The recorded segment **repeats a similar island layout**, indicating either a short looping demo level or reuse of an authored chunk.

**Chunk / progression possibilities (inferred):** the modular, repeating layout lends itself to **chunk-based level streaming** — authored 1–2-screen segments stitched into longer levels. Current build shows **no progression gating, checkpoints, or level transitions**; difficulty ramp and a level-end marker are unbuilt (inferred).

### F. Environment

**Parallax stack (back→front, observed):**

| Layer | Content | Scroll speed (inferred) |
|---|---|---|
| 0 — Sky | Warm gradient, golden-to-blue | Static / near-static |
| 1 — Far | Distant blue mountains | Very slow |
| 2 — Mid | Floating islands, autumn-pink + green trees, clouds | Slow |
| 3 — Play | Foreground terrain, gameplay solids | 1:1 (camera) |

The **multi-layer parallax is strong and a defining feature** — distinct layers track at clearly different rates as the camera pans, producing real pictorial depth. Clouds and the mid-ground island layer drift slower than the play layer.

**Floating islands & water:** islands carry trees and **animated-feel waterfalls pouring off their undersides** — a strong candidate for sprite-sheet or shader-scrolled water animation (inferred). **Decorative red banners with white X-marks on poles** appear on/near structures (purely cosmetic).

**Lighting & post-processing (inferred):** a **warm golden-hour key with soft atmospheric haze** unifies the palette; the depth fade on distant mountains reads as **baked-in atmospheric perspective in the art** rather than a runtime fog shader. The capture also shows faint horizontal banding (a recording/codec artifact, **not** a game effect). Any bloom/vignette is likely painted into the assets, not a post-process pass (inferred).

### G. Interactable Objects

| Object | Observed properties | Behaviour (observed / inferred) |
|---|---|---|
| **Orange 4-point star** | Appears in arcs/clusters; spawns a floating **"+100"** popup on collect | Collectible, +100 score. Collision-trigger pickup; popup is a spawned UI/world-space text (observed) |
| **Wooden crate** | Purple core, wooden X-brace frame; floats as a block | Stood on as a solid platform (observed); **breakable/bump-block is inferred** from genre and the "destructible" framing |
| **Grey stone block** | Cobblestone, dark/purple grout, gridded | Solid static platform; stacked into stairs/towers (observed) |
| **Red X-banner** | On poles | Decorative only (observed) |

**Trigger / spawn logic (inferred):** stars are most likely **placed instances** read from the tilemap/object layer (their tidy arc arrangement implies hand-authored placement, not runtime spawning). The "+100" popup is a transient spawned entity tweened upward and faded (inferred). No respawning collectibles, moving platforms, switches, or scripted triggers were observed.

### H. UI / HUD

**Extremely minimal — only two controls, top-right:**

- **Music toggle (♪)** — purple rounded-square button with a white eighth-note glyph.
- **Pause (II)** — purple rounded-square button with two white vertical bars.

Both are confirmed in the magnified HUD crop: consistent **purple, soft-shadowed, rounded-square** styling forming a cohesive button set, anchored to the **top-right safe corner**.

**Notably absent:** no score counter, no star/coin tally, no life/health indicator, no timer, no level name, no minimap. The "+100" popups exist but feed **no visible running total** — a clear gap between the scoring logic and its presentation.

**UX read:** the large, finger-sized rounded buttons in a screen corner are a **mobile-friendly / touch-first design** choice (inferred), and the overall minimalism keeps the painterly art unobstructed. For production this HUD needs, at minimum, a **score/star readout** and (if a fail-state ships) a **lives/health element** to close the loop.

### I. Audio System

> The clip is **video-only with no audio track** — every statement here is **inferred** from the visible Music (♪) button and genre convention.

- **Music:** the ♪ toggle implies a **looping background music track** with a player-facing on/off control — minimum requirement is one seamless ambient/fantasy loop matching the warm sky-island mood.
- **SFX categories (inferred):** jump, land, **star-collect** (paired with the +100 popup), **crate-break/bump**, enemy-defeat/stomp, and possibly footstep run loop.
- **Audio-manager needs (inferred):** a small manager handling (a) one music channel with the toggle's mute/unmute state persisted, (b) pooled one-shot SFX channels to avoid clipping on rapid star pickups, and (c) a master/music/SFX volume split. The visible toggle covers only music mute; **no separate SFX or master control is exposed** in the HUD.
- **Volume handling (inferred):** the single ♪ button suggests a binary music mute rather than a slider — a fuller settings panel would be a production addition.

### J. Art Direction

**Style:** **high-detail, painterly pixel art** — denser shading and softer gradients than classic low-color pixel art, closer to the modern "HD-pixel / MapleStory" school. Tiles, foliage, and water carry fine internal detail rather than flat blocks.

**Palette:** a cohesive **warm fantasy palette** — lush greens and teals (foliage, the hero's cap), **autumn-pink** tree canopies, **golden** atmospheric light, and soft **blue** sky and distant mountains. The hero's teal/orange reads cleanly against the warm-green backdrop, aiding gameplay legibility.

**Asset cohesion:** strong. Ground, stone, islands, crates, collectibles, and HUD share one consistent rendering language and lighting direction (warm key from upper-screen). The **purple HUD buttons** are the one element in a different family — a deliberate UI/world separation rather than an inconsistency.

**Animation density:** the hero has a clear multi-frame run cycle plus distinct rise/fall/land poses; the environment reads as **animated (waterfalls, foliage/cloud drift)**, giving a living world rather than static plates (waterfall/foliage motion inferred from the painterly "animated feel" and parallax).

**Visual identity:** a **cohesive, atmospheric "floating sky-islands" fantasy** — dense decoration, warm golden light, layered depth. The look is the demo's strongest asset and the clearest thing to preserve and systematise (consistent tile palettes, shared lighting, an animated-prop library) as the game scales beyond the looping demo segment.

---

The directory contains only the source video and extracted frames — no game code exists yet. This confirms the task is a forward-looking architecture document grounded in the OBSERVED FACTS. I have everything I need to write Part 2.

## Part 2 — Technical Reverse Engineering & Architecture

This section reverse-engineers the systems implied by the footage and proposes a concrete, opinionated architecture. The clip shows only the *running result*; nothing about the original engine is observable, so the original-tech attribution is **inferred**. What *is* ground truth is that the artifact runs in a browser, was captured with a screen-capture utility over a web page, and is plausibly AI-assisted (the "Opus 4.8" caption). That provenance — **browser-run, solo/AI-assisted, no proprietary binary scene files** — is the spine of every decision below.

### Engine Recommendation

The footage is genre-archetypal (tile grid, AABB jump arcs, parallax, star pickups), so it could be rebuilt in any mainstream engine. The differentiator is not "can it render this game" — all four can — but **"can a CLI-driven AI agent author, edit, test, and ship it headlessly,"** because that matches both the capture context and the implied workflow.

| Criterion | Unity | Godot 4 | **Phaser 3** | Unreal 5 |
|---|---|---|---|---|
| 2D pixel-art fit | Good (2D is bolted onto a 3D core; needs Pixel Perfect package, point filtering setup) | Excellent (true 2D node tree, CanvasItem, pixel snap) | **Excellent** (2D-native, `pixelArt: true` flag, integer scaling) | Poor (3D-first; Paper2D is second-class, heavyweight) |
| Asset / tilemap workflow | TilemapRenderer + external Tiled import via plugins | Built-in TileMap editor + Tiled import | **Native Tiled `.tmj`/JSON loader** in tilemap API; matches "Tiled-authored modular grid" exactly | Manual; no first-class 2D tilemap pipeline |
| Physics | PhysX 2D (Box2D-derived), heavy for arcade needs | Godot Physics 2D / Box2D | **Arcade Physics** — AABB only, zero-config, exactly the observed model | Chaos — massive overkill |
| Mobile / web readiness | WebGL export is large (multi-MB WASM, slow cold start) | Web export improving but heavy WASM, audio/threading caveats | **First-class** — ships as a small JS/WebGL bundle, runs in any browser tab (this is literally what the footage is) | Web export effectively impractical for this scope |
| Performance (this scope) | Far more than needed; GC/JIT overhead | Strong | **More than sufficient** — 2D sprite batching + parallax at 60fps trivially | Wildly over-spec |
| Tooling / iteration | Rich GUI editor; binary `.unity`/`.prefab` scenes | Good GUI editor; `.tscn` is text but editor-centric | **Pure TS files + Vite HMR** — sub-second reloads, no editor required | Heavy editor, long build/cook times |
| CLI / AI-agent friendliness (text-based, headless-testable) | Weak — binary scene/prefab/meta files, GUID soup, editor-bound, hard to diff/headless-test | Moderate — `.tscn`/`.gd` are text/diffable, but headless workflow is awkward and editor-coupled | **Best — 100% plain TypeScript; an agent edits files, `vitest` runs logic headless, Playwright drives the real canvas in headless Chromium; everything diffs cleanly** | Worst — C++/Blueprint binary assets, enormous, not agent-authorable |

**Decision: Phaser 3 (3.80+) + TypeScript (strict) + Vite.**

The justification is decisive on three grounds, each tied to ground truth:

1. **It matches what was actually recorded.** The artifact is a *browser-run* game over a web page. Phaser's native target is the browser via WebGL/Canvas — there is zero impedance mismatch, no WASM cold-start tax, no export pipeline to fight. Rebuilding in Phaser reproduces the observed delivery medium directly.
2. **It matches the AI-assisted-solo-dev provenance.** Every artifact in a Phaser project is a plain text file an agent can read, write, and diff: scenes are TS classes, config is TS objects, levels are JSON (`.tmj`). There are no opaque binary `.unity`/`.uasset` blobs, no editor-only state, no GUID remapping. An agent edits `Player.ts`, Vite hot-reloads, `vitest` checks the jump-curve math, and Playwright boots the canvas headless to confirm it still renders. Unity/Unreal break this loop because their source of truth lives inside a GUI editor and binary files.
3. **It matches the game's technical shape exactly.** The observed model — square tile grid, AABB collisions, gravity + parabolic single jump, solid crates/stone, parallax backgrounds, star pickups, two HUD buttons — is the *canonical* Phaser Arcade + Tilemap feature set. There is nothing in the footage that needs a heavier engine.

**When I would choose otherwise:** Pick **Godot 4** if the roadmap pivots to a native desktop/console release or wants a built-in visual scene editor for a non-coding designer (its `.tscn` text format keeps it reasonably agent-friendly, and its 2D node model is genuinely excellent). Pick **Unity** only if the business case demands its mature mobile-monetization SDK ecosystem and large hiring pool, accepting the binary-asset / editor-bound friction. **Unreal is the wrong tool** for a 2D pixel platformer at any scope here.

### Probable Architecture

The architecture centers on a **central `GameManager` (singleton service) plus a global `EventBus`**, with Phaser `Scene`s as the composition root. Rationale: Phaser scenes are naturally siloed (each has its own display list, cameras, and update loop), so cross-cutting concerns (score, settings, audio, pause) need a place to live *outside* any single scene, and systems need to communicate without holding hard references to each other. A pub/sub `EventBus` decouples emitters from listeners (the HUD doesn't need to know who awards score; the player doesn't need to know who plays the jump SFX), which keeps each system independently unit-testable — directly serving the headless-test requirement.

> Phaser already ships a global `game.events` emitter and per-scene `events`. We wrap our own typed `EventBus` over an `EventEmitter` so events are strongly typed and mockable in Vitest, rather than scattering raw string events. (inferred design choice)

| System | Responsibility | Key classes / interfaces | How it talks to others |
|---|---|---|---|
| **Input** | Normalize keyboard (arrows/WASD/space) and on-screen touch into an abstract intent (`InputState { left, right, jumpPressed, jumpHeld }`). Decouples raw keys from controller logic so touch + keyboard share one path (the two HUD buttons + mobile-friendly UI imply touch support). | `InputManager`, `InputState` | Polled by `PlayerController` each `update`; never reads physics directly. |
| **Character controller** | Translate `InputState` into velocity/acceleration on the player body: run accel/decel + momentum (observed "floaty air control"), parabolic jump with variable height (jump-cut on release), ground/coyote/jump-buffer timing. **Single jump only** (double-jump not confirmed). Drives the animation state machine. | `PlayerController` (composes a Phaser `Arcade.Sprite`), `PlayerConfig` (tuning), `PlayerStateMachine` | Reads `InputManager`; writes `body.velocity`; emits `player:jump`, `player:land`, `player:hurt` to `EventBus`; queries collision flags from the physics body. |
| **Physics layer (Arcade)** | AABB world: gravity, solid tilemap collision, one-way/solid platforms (stone blocks, crates as stand-on), overlap detection for stars/enemies/pits. Exactly the observed rectilinear model — **no slopes needed.** | Phaser `Arcade.World`, collision groups: `solids`, `oneWay`, `collectibles`, `enemies`, `hazards` | Configured by `LevelLoader` (which tiles collide); fires `collide`/`overlap` callbacks that the relevant system handles (e.g. `StarPickup.onOverlap → EventBus.emit('score:add', 100)`). |
| **Camera system** | Smoothed horizontal follow keeping hero left-of-center (observed lerped, jitter-free follow), clamped to level bounds, minimal vertical travel within the ground band. Drives parallax scroll factors. | `CameraController`, layer `scrollFactor` config | Calls `camera.startFollow(player, true, lerpX, lerpY)`; reads level bounds from `LevelLoader`. |
| **Level system (Tiled loader)** | Load `.tmj`, build tile layers (ground, stone, decoration), instantiate parallax background layers (sky → mountains → islands/clouds → terrain), spawn entities from a Tiled object layer (player start, stars, crates, snails, slimes, banners, waterfalls). | `LevelLoader`, `ParallaxBackground`, `EntityFactory`, `LevelDef` | Reads `.tmj` from cache; asks `EntityFactory` to build objects from data; hands collision layers to physics and bounds to the camera. |
| **UI system** | The minimal HUD: top-right music (♪) and pause (II) buttons; pause overlay; (inferred) score readout even though none was visible in-clip — likely off-screen/disabled in the demo. Mobile-friendly hit targets. | `HudScene` (runs *parallel* to the gameplay scene), `Button`, `Toggle` | Listens to `score:add`, `game:pause`; emits `ui:togglePause`, `ui:toggleMusic`. Lives in its own scene so it survives gameplay restarts. |
| **Audio system** | Looping BGM (implied by the ♪ toggle) + SFX (jump/land/collect/crate-break/enemy-defeat — all inferred from genre). Honors mute setting. | `AudioManager` (thin wrapper over Howler.js *or* Phaser Sound) | Pure `EventBus` subscriber: maps gameplay events → sounds. No system calls it directly, so audio can be stubbed in tests. |
| **Save / settings** | Persist music/SFX/mute, best score, last level. Tiny footprint → `localStorage`. | `SaveManager`, `Settings`, `SaveData` | Read at boot by `GameManager`; written on settings change / level complete. Serializes JSON. |
| **Game manager** | The cross-scene brain: owns run state (score, current level, paused), wires the `EventBus`, orchestrates scene transitions, holds `Settings`. Singleton injected at boot. | `GameManager` (singleton), `RunState` | Subscribes to `score:add`, `player:death`, `level:complete`; commands `SceneManager`; reads/writes `SaveManager`. |
| **Scene management** | Boot → Preload → Menu → Game (+ parallel Hud) → GameOver/LevelComplete. Phaser's `SceneManager` with explicit start/launch/stop. | `BootScene`, `PreloadScene`, `MenuScene`, `GameScene`, `HudScene`, `GameOverScene` | Driven by `GameManager` via `scene.start/launch`. `HudScene` is `launch`ed (parallel), not `start`ed (replace). |
| **Event system / bus** | Typed global pub/sub decoupling all systems. | `EventBus` (typed `EventEmitter` wrapper), `GameEvents` enum, typed payload map | Used by everyone; the integration backbone. |
| **Animation state machine** | Map player physical state → animation clip: `idle / run / rise / fall / land`. Pure function of velocity + grounded flag (matches observed run/jump/fall/land states). | `PlayerStateMachine`, `AnimState` enum | Fed each frame by `PlayerController`; calls `sprite.play()`; emits `anim:land` for SFX hooks. Fully unit-testable as a pure transition function. |

### Data & Config

The project is **data-driven by default** so an agent (or designer) tunes behavior by editing data, not logic:

- **Tuning constants** live in one TS file (`src/config/tuning.ts`) as typed objects — `gravityY`, `runSpeed`, `runAccel`, `airControl`, `jumpVelocity`, `jumpCutMultiplier`, `coyoteMs`, `jumpBufferMs`, `starValue: 100` (observed), tile size, parallax factors. Single source of truth for the "floaty momentum" feel; the entire game-feel is one diffable file.
- **Levels are Tiled `.tmj`/JSON** in `public/assets/tilemaps/`, loaded via Phaser's tilemap API. The observed layout is hand-placed and modular — exactly Tiled's wheelhouse. Object layers carry entity placements + per-instance properties.
- **Entity definitions are data** (`src/data/entities.ts`): each entity type (star, crate, snail, slime, banner, waterfall) declared as a record — sprite key, animation, collision group, behavior tag, score value. `EntityFactory` reads these to spawn from Tiled object layers, so adding an enemy is a data edit, not a new class hierarchy.

### Suggested Folder Architecture

```text
.
├── public/
│   └── assets/
│       ├── sprites/         # atlases + JSON frame data (hero, enemies, FX)
│       ├── tilemaps/        # Tiled .tmj level files + tileset PNGs
│       └── audio/           # BGM loop + SFX (jump/land/collect/break/defeat)
├── src/
│   ├── main.ts              # Phaser.Game bootstrap + scale config
│   ├── config/
│   │   ├── gameConfig.ts    # Phaser GameConfig (renderer, scale mode, physics)
│   │   └── tuning.ts        # ALL game-feel constants (single source of truth)
│   ├── scenes/
│   │   ├── BootScene.ts     # minimal: kick off preload
│   │   ├── PreloadScene.ts  # load atlases/tilemaps/audio; show loader bar
│   │   ├── MenuScene.ts     # title / start
│   │   ├── GameScene.ts     # the gameplay scene (composition root for systems)
│   │   ├── HudScene.ts      # parallel UI overlay (♪ + II buttons, score)
│   │   └── GameOverScene.ts # death / level-complete
│   ├── objects/             # gameplay entities (Phaser GameObjects)
│   │   ├── Player.ts        # Arcade.Sprite + PlayerController + state machine
│   │   ├── Star.ts          # +100 collectible
│   │   ├── Crate.ts         # breakable/stand-on block
│   │   ├── enemies/         # Snail.ts, Slime.ts (shared base)
│   │   └── decor/           # Banner.ts, Waterfall.ts
│   ├── systems/             # cross-cutting, scene-agnostic services
│   │   ├── InputManager.ts
│   │   ├── CameraController.ts
│   │   ├── LevelLoader.ts   # + ParallaxBackground, EntityFactory
│   │   ├── AudioManager.ts
│   │   ├── SaveManager.ts
│   │   ├── GameManager.ts   # singleton run-state + orchestration
│   │   └── EventBus.ts      # typed pub/sub backbone
│   ├── data/
│   │   ├── entities.ts      # data-driven entity definitions
│   │   └── levels.ts        # level manifest (order, tmj keys)
│   ├── animation/
│   │   ├── PlayerStateMachine.ts
│   │   └── animKeys.ts      # animation key constants
│   └── types/
│       └── events.ts        # GameEvents enum + typed payload map
├── tests/
│   ├── unit/                # Vitest: state machine, controller math, scoring
│   └── e2e/                 # Playwright: boot canvas headless, smoke flow
├── index.html
├── vite.config.ts
├── tsconfig.json            # strict: true
├── .eslintrc / .prettierrc
└── .github/workflows/ci.yml # typecheck + vitest + playwright + build
```

| Folder | Role (one line) |
|---|---|
| `public/assets/{sprites,audio,tilemaps}` | Static runtime assets served verbatim by Vite; the only "binary" content, kept out of `src`. |
| `src/config/` | All tuning + Phaser config isolated so game-feel and engine setup are edited without touching logic. |
| `src/scenes/` | Phaser scenes = the app's screens and composition roots; `HudScene` runs parallel to `GameScene`. |
| `src/objects/` | Concrete `GameObject` entities seen on screen (hero, stars, crates, enemies, decor). |
| `src/systems/` | Reusable, scene-agnostic services wired via the `EventBus`/`GameManager`. |
| `src/data/` | Pure data: entity defs + level manifest, enabling content changes without code. |
| `src/animation/` | The pure-function animation state machine, kept separate for trivial unit testing. |
| `src/types/` | Shared types, especially the typed event contract. |
| `tests/` | Vitest unit (headless logic) + Playwright E2E (headless canvas) — the agent's verification loop. |

### Key Technical Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Update timestep | **Fixed-step Arcade physics (`fps: 60`)**, render decoupled | Deterministic jump arcs and momentum across machines; makes the observed "floaty" feel reproducible and the controller math unit-testable. |
| Tile size | **32×32 px** | Hero is ~24–32px and clears ≈2 tiles per jump (observed); 32px is the clean power-of-two fit for the visible grid and the painterly tileset. |
| Physics engine | **Arcade (AABB only)** | World is rectilinear with no slopes (observed); Arcade gives gravity + box collision + overlaps with zero overhead — Matter.js would be needless complexity. |
| Atlas strategy | **Packed texture atlases (TexturePacker → multiatlas JSON)** per logical group (hero, enemies, tileset, FX) | Minimizes draw calls and HTTP requests for fast browser cold-start; one atlas per concern keeps diffs and reloads cheap. |
| Save medium | **`localStorage`** (JSON via `SaveManager`) | Tiny payload (settings + best score); zero backend, works on any static host — matches a browser-run, solo-dev delivery target. |
| Scale mode | **`Scale.FIT` + `autoCenter`, fixed internal resolution, integer/pixel-perfect zoom** with `pixelArt: true` | Mobile-friendly responsive letterboxing (implied by the clean two-button mobile UI) while preserving crisp pixel art via point filtering and integer scaling. |
| Audio backend | **Thin `AudioManager` over Howler.js** | Robust cross-browser WebAudio + autoplay-unlock handling (the ♪ toggle implies BGM); the wrapper lets tests stub audio entirely. |
| Renderer | **`AUTO` (WebGL with Canvas fallback)** | Matches the browser-run footage; WebGL batches the parallax + sprite load at 60fps with a graceful degrade path. |

> Note on the directory state: the working tree currently contains only `Game_example.webm` and extracted `frames/` — no game source exists yet, confirming this is a from-scratch rebuild architecture rather than a port of existing code. Relevant artifact path: `/home/emre/Downloads/Game/Game_example.webm`.

---

## Part 3 — Production Roadmap

> **Philosophy.** Build a *vertical slice first*: a single, ugly-but-correct level you can actually play (move → jump → collect → die → respawn) before any real art lands. **Never break a working build** — every phase ends green (typecheck + test + build), and `main` is always demoable. Make every system **data-driven before content** — entities, levels, and tuning live in data (Tiled `.tmj`, constants files, atlases) so that adding content is editing data, not code.

### Overview

| Phase | Title | Core outcome | Complexity | Depends on |
|------:|-------|--------------|:----------:|-----------|
| 0 | Project Setup & Pre-production | Booting Phaser canvas, full toolchain + CI, folder architecture | M | — |
| 1 | Movement Prototype | Tunable hero controller + follow camera on a test map (the *feel* slice) | L | 0 |
| 2 | Core Gameplay Systems | Stars/score, crates, enemies, stomp, pit-death, respawn, GameManager | L | 1 |
| 3 | Level & World Systems | Fully data-driven level pipeline: Tiled load, parallax, spawns, level flow | L | 1, 2 |
| 4 | UI, HUD & Audio | Two-button HUD, pause overlay, AudioManager, touch controls | M | 2, 3 |
| 5 | Content, Art Integration & Polish | Real pixel art wired in, showcase level(s), juice/feel pass | XL | 3, 4 |
| 6 | Optimization, Mobile & Deployment | 60 fps budget, responsive scaling, shipped static build | L | 5 |

**Playable milestone tags:** `v0.1-feel` after Phase 1, `v0.3-content-loop` after Phase 3, `v0.5-showcase` after Phase 5, `v1.0` after Phase 6.

---

### Phase 0 — Project Setup & Pre-production

**Objective.** Stand up a reproducible Vite + TypeScript (strict) + Phaser 3 project that boots to a coloured canvas, with the full quality gate (lint, format, unit, E2E, CI) and the folder architecture in place — so every later phase plugs into a known-good skeleton and never re-litigates tooling.

**Deliverables.**
- Git repo with `.gitignore` (node_modules, dist, coverage, Playwright artifacts, `.env`); `package.json` with pinned versions of Phaser 3.80+, Vite, TypeScript.
- Vite + TS scaffold that boots to a single coloured canvas via a `Boot → Preload → Title/Game` scene skeleton (empty scenes wired into `Phaser.Game` config with Arcade Physics enabled, `scale: { mode: FIT }` stubbed).
- ESLint + Prettier configured and reconciled (no rule conflicts), with `npm run lint` / `npm run format`.
- Vitest configured with one trivial passing unit test; Playwright configured with one smoke test that loads the dev/preview server and asserts a `<canvas>` is present (headless Chromium).
- GitHub Actions CI: `typecheck → lint → test (vitest) → e2e (playwright) → build`, caching `node_modules`, failing the pipeline on any red step.
- Folder architecture created and documented: `src/scenes`, `src/entities`, `src/systems`, `src/config` (constants), `src/types`, `assets/` (sprites/audio/tiled), `tests/`.
- `src/config/constants.ts` stubbed with the canonical tuning surface: `GRAVITY`, `TILE_SIZE`, `RUN_MAX_SPEED`, `RUN_ACCEL`, `RUN_DECEL`, `JUMP_VELOCITY`, `COYOTE_MS`, `JUMP_BUFFER_MS` — all exported, typed, single-source-of-truth.
- Tiled project file + an empty placeholder tileset (correct tile size, named layers) committed so Phase 1/3 load real data, not invented JSON.
- `README.md` with exact `dev` / `build` / `preview` / `test` / `e2e` / `lint` commands.

**Dependencies.** None (root phase).

**Technical risks.**
- *Toolchain/version drift (Phaser + Vite + TS).* → Pin exact versions in `package.json`, commit the lockfile, and let CI be the canonical "does it install clean" check.
- *Headless canvas testing fragility (WebGL in CI).* → Force Phaser to `CANVAS` or `AUTO`-with-software fallback in the test env, and have Playwright assert DOM presence rather than pixel output at this stage.
- *Over-engineering before gameplay exists.* → Hard cap: no entity/system code in Phase 0 beyond empty stubs; scaffold only.

**Success criteria (acceptance).**
- `npm run dev` serves a window showing a non-black Phaser canvas.
- `npm run build` emits a static bundle in `dist/` that `npm run preview` serves and that loads the same canvas.
- `npm test`, `npm run e2e`, and the full CI pipeline all pass green on a clean clone.
- Repository folder tree matches the documented architecture exactly.

**Estimated complexity.** **M** (~1 unit of relative effort; mostly config, low logic risk but high "death by a thousand cuts" potential).

**Git branching strategy.** Branch `chore/phase-0-setup` off `main`. Single squash-merge PR once CI is green on the branch. No milestone tag (no gameplay yet) — but this is the commit that makes `main` permanently buildable.

---

### Phase 1 — Movement Prototype (Character Controller)

**Objective.** Nail the *feel* — the single most important and least art-dependent thing in a platformer. Deliver a hero controller (idle/run/jump/fall/land) with arcade physics, momentum, air control, coyote-time and jump-buffer, plus a smoothed dead-zone follow camera, on a hand-built test tilemap. This is the vertical-slice foundation; everything else hangs off a controller that already feels right.

**Deliverables.**
- `Player` entity with an explicit finite state machine: `idle → run → jump → fall → land` (and back), with guarded transitions (e.g. `land` only from a grounded fall).
- Arcade-physics body sized to the sprite; `RUN_ACCEL`/`RUN_DECEL` toward `RUN_MAX_SPEED` (the observed visible accel/decel and "floaty" momentum), gravity + parabolic jump clearing ~2 tiles (matches observed arc).
- **Coyote-time** (jump allowed for N ms after leaving a ledge) and **jump-buffer** (jump press queued for N ms before landing) — both driven by `COYOTE_MS` / `JUMP_BUFFER_MS`.
- Air control with momentum (observed notable air control); single jump only — *double-jump intentionally NOT implemented* (not confirmed in footage).
- Placeholder rectangle/dummy sprite with horizontal flip on direction change.
- A small hand-built test level loaded **from Tiled `.tmj`** (not hard-coded): solid ground band, one pit, one 2-high block to jump — exercises the full move set.
- Smoothed `lerp` follow camera with a dead-zone, hero kept near centre/left-of-centre (matches observed framing); no jitter.
- Debug overlay (toggle key) showing velocity, grounded flag, current state, coyote/buffer timers.
- Vitest unit tests over the FSM transition table; Playwright smoke test asserting input → horizontal displacement and a jump producing vertical displacement.

**Dependencies.** Phase 0 (scaffold, constants file, Tiled placeholder).

**Technical risks.**
- *Tuning "game feel" without final art.* → Centralise every constant in `constants.ts` and make them hot-tweakable via the debug overlay; lock numbers against the observed floaty arc.
- *Physics tunnelling at high speed.* → Keep `RUN_MAX_SPEED` within Arcade's safe step, cap delta, enable tile-collision processing each step.
- *Camera jitter.* → Use Phaser's built-in lerp follow + dead-zone, round to integer pixels only at render, never mutate camera mid-physics-step.
- *Coyote/buffer correctness.* → Drive both off timestamps, not frame counts; cover edge cases (buffer + coyote overlapping) in unit tests.

**Success criteria (acceptance).**
- Hero runs, clears the 2-tile block, falls into the pit and is handled (respawn/reset), and lands cleanly with the correct state transition.
- Camera follows smoothly with a dead-zone and visible no jitter.
- All feel constants are centralised and changeable without touching logic.
- FSM unit tests pass; E2E smoke confirms input → movement.

**Estimated complexity.** **L** (~2 units; high *iteration* cost — feel is found by tweaking, not typing).

**Git branching strategy.** Branch `feat/phase-1-movement` off `main`. Squash-merge PR after CI green. **Tag `v0.1-feel`** on `main` post-merge — the first playable milestone (a controllable hero in a test box). *Gate for Phase 2: feel is signed off (someone plays it and it feels right) — do not build gameplay on a controller still being re-tuned.*

---

### Phase 2 — Core Gameplay Systems

**Objective.** Turn movement into a *loop*: stars + score, crates as solid/breakable platforms, patrolling snail/slime enemies with stomp-to-defeat and side-contact damage, pit/hazard death, lives + checkpoint respawn, all owned by a single `GameManager`. After this phase the demo is genuinely playable end-to-end on placeholder art.

**Deliverables.**
- `Star` collectible: overlap → `+score`, floating `+100` text (matches observed popup), collect-SFX hook (no audio yet — event only); appears in arcs/clusters as observed.
- `GameManager` as the **single source of run state** (score, lives, current checkpoint), data-driven and decoupled from rendering.
- `Crate`: solid stand-on platform variant + breakable variant (breaks on stomp/bump, emits a particle event).
- `Enemy` base + `Snail` + `Slime` with patrol AI (walk, edge/wall turn-around on ground and islands).
- **Stomp-to-defeat** (hero bounces on top) vs **side-contact damage** (costs a life) — resolved by contact direction/velocity, *we implement stomp* (the inferred Mario-style read).
- Hazard/pit → death; **lives + respawn at last checkpoint**; respawn fully cleans up transient state (velocity, animation, invuln window).
- A lightweight **event bus** for gameplay events (`collect`, `hurt`, `defeat`, `die`) so HUD/audio in Phase 4 subscribe without coupling.
- Win/lose **state stubs** (reach-goal / out-of-lives) — wired but not yet visualised.
- Vitest coverage of scoring, lives/respawn, and stomp-vs-damage resolution logic.

**Dependencies.** Phase 1 (controller + test map). Can begin in parallel with Phase 3 once the Phase 1 controller is frozen (see branching).

**Technical risks.**
- *Collision/overlap ordering bugs (stomp vs damage misfires).* → Resolve by relative position + downward velocity in a single deterministic handler; unit-test the decision boundary.
- *Respawn state cleanup leaks.* → Route all respawns through one `GameManager.respawn()` that resets body, FSM, and timers; assert clean state in tests.
- *Event-bus over-coupling.* → Typed event payloads only; emitters never assume a listener exists; no gameplay logic lives in listeners.

**Success criteria (acceptance).**
- Collecting a star raises score and shows the `+100` popup.
- Stomping an enemy defeats it and bounces the hero; side contact costs exactly one life.
- Falling into a pit kills the hero and respawns at the last checkpoint with clean state.
- `GameManager` is the sole owner of run state; logic is unit-tested; **no regression** to Phase 1 movement (re-run Phase 1 tests).

**Estimated complexity.** **L** (~2 units; collision-resolution correctness is the hard part).

**Git branching strategy.** Branch `feat/phase-2-gameplay` off `main`. Squash-merge after CI green. No tag (milestone deferred to Phase 3). *If behind: cut breakable crates (ship solid-only), cut Slime (ship Snail only), keep lives/respawn + stars — those are the loop.*

---

### Phase 3 — Level & World Systems

**Objective.** Make levels pure data. Build the `LevelLoader` that reads a Tiled `.tmj` (terrain, platforms, one-way platforms, collision), spawns every entity from an object layer, drives multi-layer parallax, assembles floating islands, sets camera world bounds, and handles level/checkpoint/level-complete flow. The acceptance bar: a full level loads with **zero hard-coded entities**.

**Deliverables.**
- `LevelLoader` reading a Tiled `.tmj`: ground layer, platform layer, one-way platform layer, collision data; documented Tiled property conventions (e.g. `oneWay`, `solid`, `breakable`).
- Object-layer-driven spawning: player start, stars, crates, enemies, checkpoints, goal — all instantiated from map objects, not code.
- `ParallaxBackground` system with distinct scroll factors matching the observed back→front stack: **sky gradient → distant blue mountains → mid-ground floating islands + trees + clouds → foreground terrain** (waterfalls on islands).
- Floating-island platform assembly as elevated standable platforms above the ground band (observed).
- Camera world bounds + dead-zone tuned to map dimensions (no over-scroll past level edges).
- Level-complete (reach goal) → fade → next-level transition; checkpoint integration with Phase 2 respawn.
- A **content authoring guide**: step-by-step "how to make a level in Tiled" (layer naming, property conventions, object types) so non-coders/AI can add levels.

**Dependencies.** Phases 1 (camera, tilemap collision) and 2 (entities to spawn, checkpoint/respawn, GameManager).

**Technical risks.**
- *Tiled property convention drift.* → Freeze conventions in the authoring guide + a TS type/validator that throws on malformed maps in dev.
- *Parallax seams/scaling across aspect ratios.* → Use tile-sprites with seamless wrap and lock to integer scroll offsets; test at 16:9 and a phone aspect.
- *Tilemap collision edge cases (corners, one-way platforms).* → Use Arcade tile collision with explicit one-way (`checkCollision.down`) handling; add fixtures for corner/one-way cases.
- *Large-map performance.* → Cull off-screen tiles/objects (full pooling deferred to Phase 6); keep object counts data-bounded.

**Success criteria (acceptance).**
- A full demo level loads entirely from `.tmj` data — no hard-coded entities anywhere.
- Parallax scrolls convincingly with no visible seams.
- Camera respects world bounds (no over-scroll).
- Reaching the goal fades and loads the next level.
- Adding/editing a level requires editing only a `.tmj`, not code (verified by adding a second trivial level).

**Estimated complexity.** **L** (~2.5 units; the data pipeline is the project's backbone).

**Git branching strategy.** Branch `feat/phase-3-world` off `main`. Squash-merge after CI green. **Tag `v0.3-content-loop`** on `main` post-merge — the second playable milestone: a complete data-driven level you can play start→finish on placeholder art. *Gate for Phase 5: the level pipeline must be frozen before real art/content goes in.* *If behind: ship single-level flow (defer next-level transition), keep the loader + parallax + spawns.*

---

### Phase 4 — UI, HUD & Audio

**Objective.** Implement exactly the observed minimal HUD (Music ♪ + Pause II, top-right purple rounded squares), a true world-freezing pause overlay, an `AudioManager` (looping BGM + SFX bus) with persisted mute, and touch controls for mobile — all subscribing to the Phase 2 event bus.

**Deliverables.**
- HUD scene rendered **above** gameplay: Music toggle (♪) and Pause (II) buttons in the top-right, matching the observed two-button purple layout.
- Pause overlay (resume / restart / options) that **fully freezes** physics and timers and resumes cleanly.
- `AudioManager` (Howler.js behind a thin interface): looping BGM, SFX bus wired to `jump / land / collect / crate / defeat / hurt` events; master + music + sfx volumes; **mute persisted to `localStorage`**.
- Music button toggles BGM; Pause button opens the overlay.
- Responsive on-screen touch controls (left / right / jump) shown **only on touch devices**, positioned to not block the play area.
- Optional score readout kept **off-HUD by default** (configurable) to preserve the clean observed two-button HUD.

**Dependencies.** Phase 2 (event bus emits the audio/score events) and Phase 3 (a real level to pause/play over).

**Technical risks.**
- *Browser audio autoplay policy.* → Initialise/unlock the audio context on the first user gesture (tap/keypress); never auto-start BGM before interaction.
- *Pause must truly halt physics & timers.* → Pause the physics world and all scene timers (not just stop rendering); add an E2E assertion that positions don't change while paused.
- *Touch ergonomics / view blocking.* → Anchor controls to screen corners with safe-area insets; auto-hide on non-touch devices.
- *HUD scaling across resolutions.* → Render HUD in a scale-managed UI scene with relative anchoring, tested at multiple resolutions.

**Success criteria (acceptance).**
- Music button mutes/unmutes and the choice **persists across reload**.
- Pause overlay fully freezes the world and resumes correctly (verified: no state advances while paused).
- SFX fire on the correct events.
- HUD matches the observed two-button top-right layout and scales correctly.
- Touch controls drive the hero on a phone / emulated touch device.

**Estimated complexity.** **M** (~1.5 units; mostly integration + browser-quirk handling).

**Git branching strategy.** Branch `feat/phase-4-ui-audio` off `main`. Squash-merge after CI green. No tag. *Parallelisable:* HUD/touch (front-end) and AudioManager (systems) are independent and can be split across two contributors/agents, integrating at the event bus. *If behind: ship Music + Pause + persisted mute and touch controls; defer the options sub-panel and BGM mixing — the pause-freeze correctness is non-negotiable.*

---

### Phase 5 — Content, Art Integration & Polish

**Objective.** Replace every placeholder with real painterly pixel art (hero atlases, tilesets, props, layered parallax), build the full showcase level that reads like the reference clip plus 1–2 more, and add the juice — particles, screen shake, hit-stop, transitions — finishing with a feel/tuning pass against the real art. This is where the game stops being a prototype.

**Deliverables.**
- Hero **texture atlases** (idle / run / jump / fall / land) wired to the Phase 1 state machine, with animation events (footstep dust, land impact).
- Tileset + **autotiling rules in Tiled** for the grass-topped dirt and cobblestone stone (matches observed modular tiles).
- Sprites + animations for star, crate (X-brace, purple core), snail, slime, red X-banner, animated waterfall.
- Layered parallax art for the observed back→front stack (sky / mountains / islands + autumn-pink & green trees + clouds / foreground).
- Particle FX: star sparkle, crate splinters, run/land dust, enemy-defeat puff.
- **Screen shake + hit-stop** on impactful events (stomp, crate break, hurt); styled floating `+100` text.
- Level intro/outro + fade transitions.
- **One fully decorated showcase level matching the video**, plus 1–2 additional complete levels.
- A feel/tuning pass on movement + camera **with the real art in** (sprite sizes change collision/feel perception).

**Dependencies.** Phases 3 (level pipeline + parallax slots) and 4 (HUD/audio hooks for juice events).

**Technical risks.**
- *Asset pipeline / atlas tooling.* → Standardise on TexturePacker-style atlas JSON + a documented import step; automate atlas regeneration.
- *Animation-event timing (dust/land).* → Drive FX off animation frame events, not fixed delays; verify against the actual clip framing.
- *Over-juicing hurting readability.* → Budget juice (shake amplitude, hit-stop ms) and review against the calm, readable reference feel; make intensities constants.
- *Scope creep on level count.* → Hard cap at showcase + 2; the showcase is the only must-ship.
- *Sourcing cohesive art.* → Lock a single art source/style early; reject off-palette assets against the defined warm fantasy palette.

**Success criteria (acceptance).**
- The showcase level visually reads like the reference clip (parallax sky-islands, painterly tiles, star arcs, crates, snails).
- Hero animations transition correctly with movement state.
- FX/juice present but readable (not obscuring gameplay).
- **≥2 complete levels** playable start→finish.
- Stable framerate with full art in (pre-optimisation baseline measured).

**Estimated complexity.** **XL** (~3.5 units; the largest phase — art integration + content authoring + a tuning pass).

**Git branching strategy.** Branch `feat/phase-5-content-polish` off `main`. Given size, allow **short-lived sub-branches off the feature branch** (e.g. `feat/phase-5-content-polish/hero-anims`, `/parallax-art`, `/juice`) squash-merging *into* the feature branch, then one squash-merge PR to `main`. **Tag `v0.5-showcase`** on `main` post-merge — the showcase-quality playable milestone. *If behind: ship the one showcase level + hero anims + tileset + parallax; cut the extra levels and trim juice to dust + `+100` styling.*

---

### Phase 6 — Optimization, Mobile & Deployment

**Objective.** Hit a 60 fps budget on desktop and a mid-range phone, make the build responsive across aspect ratios (the observed ~16:9 plus phone portrait/landscape), harden persistence, and ship a deployable static build with a one-command production deploy — optionally wrapped for mobile via Capacitor.

**Deliverables.**
- Performance pass: atlas packing audit, **object pooling** (stars, particles, enemies, `+100` texts), off-screen entity/tile **culling**, draw-call + texture-count audit.
- **Responsive scale manager**: FIT/letterbox across aspect ratios including ~16:9 and phone portrait/landscape; safe-area handling for touch HUD.
- Asset **preloading + loading screen** (progress bar in Preload scene).
- Build optimisation: minify, tree-shake, content-hashed assets, gzip/brotli compression.
- Save/settings **persistence audit** (mute, volumes, progress) — verified across reloads.
- Cross-browser + mobile **QA matrix** (Chrome/Firefox/Safari desktop; iOS Safari + Android Chrome).
- **Static deploy** (Vercel / itch.io) with a CI deploy step on tagged release.
- *Optional* Capacitor wrapper for Android/iOS.
- Release checklist + final report.

**Dependencies.** Phase 5 (full content/art is what gets optimised, scaled, and shipped).

**Technical risks.**
- *Mobile fill-rate (parallax/particles on low-end GPUs).* → Profile on a real mid-range phone; gate particle density and parallax layer count behind a quality setting if needed.
- *Audio/touch quirks on iOS Safari.* → Test the audio-unlock-on-gesture path and touch controls specifically on iOS Safari early in the phase.
- *Aspect-ratio scaling artifacts.* → Letterbox rather than stretch; pin integer-friendly scaling for pixel art to avoid shimmer.
- *Bundle size.* → Enforce a size budget in CI; audit largest assets; ship compressed.
- *Capacitor complexity (if attempted).* → Treat as strictly optional/stretch; web build must ship independently and first.

**Success criteria (acceptance).**
- Sustains the **60 fps target** on desktop and a mid-range phone with the full showcase level.
- Bundle within the defined budget; assets hashed and compressed.
- Runs correctly across the target browser + mobile-web matrix.
- **One-command production build deploys** as a working static site.
- Release checklist completed and documented.

**Estimated complexity.** **L** (~2.5 units; profiling + cross-device QA dominate; XL only if Capacitor is pursued).

**Git branching strategy.** Branch `feat/phase-6-optimize-deploy` off `main`. Squash-merge after CI green (CI now also runs the deploy step on tag). **Tag `v1.0`** on `main` post-merge — the shipped release milestone; the deploy pipeline publishes from this tag. *If behind: ship the web build with pooling + responsive FIT + loading screen + persisted settings; defer Capacitor and the lowest-priority browsers in the QA matrix to a post-1.0 follow-up.*

---

## Part 4 — Claude CLI Execution Prompts

Each phase below has a **directly copy-pasteable master prompt** for Claude Code. Run them in order; each inherits a working, tested build from the previous one and must not break it. Every prompt is wrapped in a `~~~` block — copy everything between the tilde fences into Claude Code.

### Phase 0 — Project Setup & Pre-production

*This is the first phase — run it on a fresh, empty repository to bootstrap the entire project.*

~~~
**Role**
You are a senior game-infrastructure engineer setting up the foundation for a web-first 2D platformer. You own the toolchain, repo hygiene, CI, the asset/Tiled pipeline, and the bootable engine skeleton. Your bias is toward correctness, reproducibility, and a clean, minimal base that later phases extend without rework — NOT toward gameplay (no gameplay yet).

**Context**
- The game: a 2D side-scrolling platformer (Super Mario / Celeste lineage) with painterly pixel art and a "floating sky islands" fantasy theme; core loop is run → jump across pits/islands → collect stars (+100) → avoid enemies. (This phase ships ZERO gameplay — only the scaffold.)
- Exact stack (do not substitute): Phaser 3 (3.80+) with Arcade Physics, TypeScript (strict), Vite as bundler/dev server, Tiled (.tmj/JSON) for levels, Howler.js (or Phaser Sound) behind an AudioManager later, Vitest (unit) + Playwright (E2E) for tests, ESLint + Prettier, GitHub Actions for CI, static HTML5 delivery.
- Repo state you inherit: this is Phase 0 and the FIRST phase. Assume an empty or near-empty working directory (`/home/emre/Downloads/Game`) with no prior code. There is no previous phase to preserve. Everything you create here becomes the contract every later phase (1: movement, 2: gameplay systems, 3: level/world, 4: UI/HUD/audio, 5: content/art, 6: optimization/deploy) builds on — so the folder architecture, constants file, scene skeleton, and test harness must be forward-looking but minimal.

**Objectives**
- Initialize a Git repo with a correct Node/TS/Phaser `.gitignore`.
- Scaffold a Vite + TypeScript (strict) + Phaser 3 project that boots to a visible coloured canvas with a Boot → Preload → a placeholder Scene flow.
- Configure ESLint + Prettier (clean, zero warnings).
- Configure Vitest (one trivial passing unit test) and Playwright (one trivial passing E2E smoke test that loads the running canvas).
- Add GitHub Actions CI running typecheck + lint + unit tests + Playwright + build.
- Create the full forward-looking folder architecture used by later phases.
- Add a single source-of-truth design-constants file (gravity, tile size, speeds, etc.) — stubbed values only.
- Stand up the Tiled pipeline: a Tiled project file + an empty/placeholder tileset and an empty placeholder map, plus the loader convention (do not build a real level — that is Phase 3).
- Write a README with run/build/test commands.

**Constraints**
- Hard rule: do NOT implement gameplay, the hero controller, enemies, scoring, real levels, audio, or HUD — those belong to Phases 1–6. Build only the scaffold.
- TypeScript must be `strict: true` and the project must typecheck with zero errors; ESLint must pass with zero warnings; Prettier formatting must be applied.
- Stay strictly within the chosen stack — no alternative engines, bundlers, or test runners.
- Design values live in ONE constants module; nothing magic-numbered elsewhere. Prefer data-driven (Tiled/JSON, constants) over hard-coded.
- Match the folder architecture defined below exactly so later phases find what they expect.
- Small, frequent, conventional commits. Work fully autonomously — make sensible, documented decisions; do NOT ask for clarification.
- Pin/record exact dependency versions in `package.json` (mitigate Phaser/Vite/TS version drift). Do not over-engineer — no premature systems, no abstractions without a current consumer.

**Implementation Steps**
1. **Repo + ignore.** Run `git init` (default branch `main`). Create `.gitignore` covering `node_modules`, `dist`, `coverage`, `.vite`, `playwright-report`, `test-results`, `*.local`, `.DS_Store`, editor folders. Initial commit.
2. **Scaffold Vite + TS + Phaser.** Create `package.json` (name `sky-islands`, `"type": "module"`, `"private": true`). Install pinned deps: `phaser@^3.80.0`; devDeps: `vite`, `typescript`, `vitest`, `@playwright/test`, `eslint`, `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin`, `eslint-config-prettier`, `prettier`, `jsdom`, `@types/node`. Record resolved versions. Add scripts:
   - `"dev": "vite"`, `"build": "tsc --noEmit && vite build"`, `"preview": "vite preview"`,
   - `"typecheck": "tsc --noEmit"`, `"lint": "eslint . --max-warnings=0"`, `"format": "prettier --write ."`, `"format:check": "prettier --check ."`,
   - `"test": "vitest run"`, `"test:watch": "vitest"`, `"test:e2e": "playwright test"`.
3. **TS config.** `tsconfig.json` with `strict: true`, `target: "ES2020"`, `module: "ESNext"`, `moduleResolution: "Bundler"`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `isolatedModules`, `skipLibCheck: true`, `types: ["vite/client"]`. Include `src`, `tests`. Add a separate `tsconfig.node.json` if needed for config files.
4. **Vite config.** `vite.config.ts` with `base: "./"` (so the static bundle works from any host/itch.io), `build.outDir: "dist"`, `server.port: 5173`. Keep it minimal; no plugins required yet.
5. **HTML entry.** `index.html` at repo root: a `<div id="game">` mount node and `<script type="module" src="/src/main.ts">`. Add minimal CSS to remove body margin and set a dark background.
6. **Folder architecture** — create exactly this tree under `src/` (use `.gitkeep` in dirs that are otherwise empty so they commit):
   ```
   src/
     main.ts                 # Phaser.Game bootstrap
     config/
       GameConfig.ts         # Phaser.Types.Core.GameConfig factory
       constants.ts          # SINGLE source of truth for design values
     scenes/
       BootScene.ts          # sets up scaling, hands off to Preload
       PreloadScene.ts       # loads (currently nothing real) → starts MainScene
       MainScene.ts          # placeholder: clears to a colour, draws a label
     entities/.gitkeep       # (Phase 1+: Hero, enemies)
     systems/.gitkeep        # (Phase 2+: GameManager, ScoreSystem, AudioManager)
     ui/.gitkeep             # (Phase 4+: HUD, pause overlay)
     types/index.ts          # shared TS types (start minimal)
     utils/.gitkeep          # (helpers)
   assets/
     tilemaps/.gitkeep       # (Phase 3: .tmj maps)
     tilesets/.gitkeep       # (placeholder tileset image lives here)
     sprites/.gitkeep
     audio/.gitkeep
   tests/
     unit/                   # Vitest specs
     e2e/                    # Playwright specs
   tiled/                    # Tiled editor project + sources
   docs/
     reports/                # phase reports land here
   ```
   Place `assets/` and `index.html` so Vite serves them; if you prefer assets under `public/`, document the choice in the README and keep paths consistent.
7. **Design constants** — `src/config/constants.ts`: export a single `const GAME = { ... } as const` (or grouped exports) with STUBBED, clearly-commented values matching observed feel, to be tuned in Phase 1: e.g. `TILE_SIZE: 32`, `GAME_WIDTH: 1280`, `GAME_HEIGHT: 720`, `GRAVITY_Y: 1400`, `HERO_RUN_SPEED: 220`, `HERO_ACCEL: 1600`, `HERO_DRAG: 1200`, `HERO_JUMP_VELOCITY: -560`, `HERO_AIR_CONTROL: 0.6`, `STAR_SCORE_VALUE: 100`, `BG_COLOR: "#1b2a4a"`. Mark them `// TUNE IN PHASE 1` where relevant. Nothing else in the codebase should hard-code these numbers.
8. **GameConfig factory** — `src/config/GameConfig.ts`: export a function returning a `Phaser.Types.Core.GameConfig` using constants: `type: Phaser.AUTO`, `parent: "game"`, `backgroundColor: GAME.BG_COLOR`, `scale: { mode: Phaser.Scale.FIT, autoCenter: CENTER_BOTH, width: GAME_WIDTH, height: GAME_HEIGHT }`, `pixelArt: true`, `physics: { default: "arcade", arcade: { gravity: { x: 0, y: GAME.GRAVITY_Y }, debug: false } }`, `render: { antialias: false }`, and `scene: [BootScene, PreloadScene, MainScene]`.
9. **main.ts** — instantiate `new Phaser.Game(createGameConfig())`. Export the game instance (or a `bootGame()` function) so tests can introspect if useful. Guard against double-boot during HMR.
10. **Scenes.**
    - `BootScene`: key `"Boot"`; in `create()` configure any global scale/input defaults and `this.scene.start("Preload")`.
    - `PreloadScene`: key `"Preload"`; `preload()` may load nothing yet (or a placeholder tileset image to prove the pipeline) and show a simple loading rect/text driven by `this.load.on("progress", ...)`; on `create()` → `this.scene.start("Main")`.
    - `MainScene`: key `"Main"`; `create()` sets `this.cameras.main.setBackgroundColor(GAME.BG_COLOR)` and draws a centered text label like `"Sky Islands — Phase 0 Scaffold"` plus a small coloured rectangle, so `npm run dev` shows an unmistakable, intentional canvas. Add a brief `// Phase 1 will replace this with the movement prototype` comment.
11. **Tiled pipeline.** In `tiled/`, create a Tiled project file `sky-islands.tiled-project` (JSON), a placeholder tileset `tileset-placeholder.tsx` (or `.tsj`) referencing a placeholder tile image, and an empty/near-empty map `level-placeholder.tmj` (small dimensions, one empty layer + one object layer named e.g. `objects`). Put the matching placeholder tileset PNG in `assets/tilesets/`. Add a one-paragraph `tiled/README.md` documenting the export convention (export maps as `.tmj` JSON, tile size = `TILE_SIZE`, layer naming, where exported maps go). Do NOT build a real level (Phase 3).
12. **ESLint + Prettier.** Add `eslint.config.js` (flat config) extending `@typescript-eslint` recommended + `eslint-config-prettier`, ignoring `dist`, `node_modules`, `playwright-report`, `coverage`. Add `.prettierrc` (e.g. `singleQuote: false`, `semi: true`, `printWidth: 100`) and `.prettierignore`. Run `npm run format` then ensure `npm run lint` is clean.
13. **Vitest.** Add `vitest.config.ts` (environment `jsdom`, `globals: true`, include `tests/unit/**/*.spec.ts`). Write `tests/unit/constants.spec.ts` — a trivial-but-real assertion, e.g. `expect(GAME.TILE_SIZE).toBeGreaterThan(0)` and `expect(GAME.STAR_SCORE_VALUE).toBe(100)`. (Avoid importing Phaser into jsdom unit tests in this phase.)
14. **Playwright.** Add `playwright.config.ts` with a `webServer` that runs `npm run dev` (or builds + previews) and `baseURL` `http://localhost:5173`, project `chromium`. Write `tests/e2e/smoke.spec.ts` that navigates to `/`, waits for a `canvas` element to be attached/visible, and asserts the canvas has non-zero size — proving the game boots. Install browsers via `npx playwright install --with-deps chromium` and document it.
15. **CI.** Add `.github/workflows/ci.yml` triggered on push + PR: Node 20, `npm ci`, then `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run test`, install Playwright browsers, `npm run test:e2e`, and `npm run build`. Cache npm. Upload the Playwright report as an artifact on failure.
16. **README.** Write `README.md`: project one-liner, the stack, prerequisites (Node 20+), and the exact commands: `npm install`, `npm run dev`, `npm run build`, `npm run preview`, `npm test`, `npm run test:e2e`, `npm run lint`, `npm run format`. Document the folder architecture and the Tiled export convention. Note the phase roadmap (0–6) briefly.
17. **Final validation.** Run, in order: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run test`, `npm run build`, and `npm run test:e2e`. Everything must be green. Manually start `npm run dev` once to confirm the canvas renders the placeholder scene.

**Verification Checklist**
- [ ] `npm run dev` boots and shows a visible Phaser canvas with the Phase 0 placeholder scene (coloured background + label), Boot → Preload → Main flow works.
- [ ] `npm run build` produces a static bundle in `dist/` (and `tsc --noEmit` passes as part of it).
- [ ] `npm run typecheck` passes with zero errors; `strict: true` is enabled.
- [ ] `npm run lint` passes with `--max-warnings=0`; `npm run format:check` is clean.
- [ ] `npm test` (Vitest) passes with at least one real assertion.
- [ ] `npm run test:e2e` (Playwright) passes — canvas present and non-zero sized.
- [ ] GitHub Actions CI workflow exists and runs typecheck + lint + format:check + unit + e2e + build.
- [ ] Folder architecture matches the tree above exactly (including `.gitkeep`s and `docs/reports/`).
- [ ] `src/config/constants.ts` is the single source of design values; no magic numbers elsewhere.
- [ ] Tiled project + placeholder tileset + placeholder `.tmj` map exist under `tiled/` and `assets/`, with the export convention documented.
- [ ] README documents all run/build/test commands and the architecture.

**Testing Expectations**
- Unit (Vitest): at least `tests/unit/constants.spec.ts` asserting real invariants on the constants module (e.g. `TILE_SIZE > 0`, `STAR_SCORE_VALUE === 100`, jump velocity is negative). Keep Phaser out of jsdom for now.
- E2E (Playwright): `tests/e2e/smoke.spec.ts` loads `/`, waits for the `canvas`, and asserts non-zero dimensions (the game actually boots in a real browser).
- Manual: run `npm run dev` and visually confirm the placeholder MainScene renders (coloured canvas + label) and scales to the window (FIT mode).
- Gate: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run test`, and `npm run test:e2e` must ALL pass locally before opening the PR; CI must reproduce them green.

**Git Expectations**
- Work on `main` only for the very first repo-init commit, then immediately create and switch to branch `chore/phase-0-setup` for all scaffold work.
- Commit frequently with Conventional Commit messages, e.g. `chore: init repo and gitignore`, `build: add vite + ts + phaser scaffold`, `ci: add github actions pipeline`, `test: add vitest and playwright smoke tests`, `docs: add README and tiled pipeline notes`.
- When everything is green, open a PR from `chore/phase-0-setup` → `main` (use the `gh` CLI) summarizing the scaffold; squash-merge once CI is green.
- Tag a milestone `v0.0.0-scaffold` after merge (this is the foundational, non-playable milestone).

**Expected Outputs / Deliverables**
- A bootable repo: Vite + TS(strict) + Phaser 3 scaffold rendering a placeholder canvas, with the full folder architecture, constants module, GameConfig factory, and Boot/Preload/Main scene skeleton.
- Working tooling: ESLint + Prettier clean; Vitest + Playwright each with one passing test; GitHub Actions CI green.
- Tiled pipeline artifacts: `tiled/` project + placeholder tileset + placeholder `.tmj` map + `assets/tilesets/` placeholder PNG, with documented export convention.
- `README.md` with all commands and architecture.
- A phase report at `docs/reports/phase-0-report.md` summarizing: what was built, key decisions (e.g. pinned versions, assets-location choice, Phaser-out-of-jsdom rationale), exact resolved dependency versions, how to run/test, and any deviations from this prompt.

Implement this entire phase autonomously. Work step-by-step, validate after each step, commit frequently, do not break earlier phases (there are none yet — so do not regress your own scaffold), and produce the phase report. Do not ask for clarification — make sensible, documented decisions.
~~~

---

### Phase 1 — Movement Prototype (Character Controller)

*Run after Phase 0 (Project Setup & Pre-production) is merged and green — the repo must already build, typecheck, lint, and serve an empty Phaser canvas.*

~~~text
**Role**
You are a senior gameplay engineer specialising in 2D platformer "game feel" and Phaser 3 + TypeScript. You own the hero character controller and follow camera for a web-first side-scroller. You write strict, tested, data-driven TypeScript and work fully autonomously.

**Context**
The game is a 2D side-scrolling platformer (Super Mario / Celeste lineage, painterly sky-islands theme): the hero runs rightward, jumps across pits and between platforms, with floaty-but-controllable movement and a smoothed follow camera. This phase builds ONLY the movement prototype — no stars, enemies, crates, HUD, or real art yet (those are Phases 2–5).

Exact stack (do not deviate): Phaser 3 (3.80+) with Arcade Physics, TypeScript (strict), Vite dev server/bundler, Tiled (.tmj/JSON) tilemaps loaded via Phaser's tilemap API, Vitest (unit/logic), Playwright (E2E smoke of the running canvas), ESLint + Prettier, GitHub Actions CI (typecheck + test + build).

State of the repo you inherit from Phase 0 (must keep working — do NOT regress):
- A runnable Vite + TS + Phaser project that boots an empty game canvas.
- Established folder architecture (typically `src/` with scenes, a game config/entry like `src/main.ts`, `public/assets/` for static assets, `tests/` for Vitest, `e2e/` for Playwright). INSPECT the actual repo first and conform to whatever Phase 0 established — do NOT invent a parallel structure.
- Working scripts: `npm run dev`, `npm run build`, `npm run typecheck`, `npm run lint`, `npm run test`, and the Playwright E2E command. CI is green on `main`.
Before writing any code, read the existing files (`package.json`, `tsconfig.json`, `vite.config.*`, `src/**`, any Phase 0 scene, the README, and `docs/` if present) to learn the exact conventions, paths, and the Phaser game config (resolution, physics setup, scene registration).

**Objectives**
- Implement a `Player` entity backed by an Arcade Physics body with a finite state machine: `idle / run / jump / fall / land`.
- Run movement with acceleration, deceleration, and a max speed (momentum + visible accel/decel), plus air control with reduced authority.
- Gravity + a parabolic jump tuned to clear ~2 tiles in height, with **coyote time** and **jump buffering**.
- A single, centralised, hot-tweakable tuning-constants module for all feel values.
- A placeholder rectangle/dummy sprite that flips horizontally with facing direction.
- A small hand-built test level authored in Tiled (.tmj JSON): a continuous solid ground band, at least one pit/gap, and a 2-tile-high block to jump onto — loaded via Phaser's tilemap API with tile-based collision.
- A smoothed lerp follow camera with a dead-zone, plus camera bounds matching the test map.
- Pit handling: falling below the world / into the pit respawns the hero at a spawn point.
- A debug overlay (velocity, state, grounded flag, coyote/buffer timers) toggled by a key.

**Constraints**
- Do NOT break existing Phase 0 systems, scenes, scripts, or tests. The empty-canvas boot path and CI must stay green.
- Keep TypeScript in `strict` mode with zero type errors; keep ESLint/Prettier clean (no disabling rules to dodge work).
- Stay strictly within the chosen stack. No new engines, no physics plugins, no state-machine libraries — hand-roll a small FSM in TS. Adding a dev dependency is allowed only if clearly justified in the report; prefer zero new deps.
- Data-driven over hard-coded: ALL feel/tuning values live in one constants module; the level is authored in Tiled JSON, not hand-built in code. Do not bake magic numbers into the controller body.
- Match the established folder architecture from Phase 0. Do not restructure prior work.
- Small, frequent, conventional commits. Validate after each step.
- Work autonomously. Do NOT ask for clarification — make sensible, documented decisions and record them in the phase report.

**Implementation Steps**
1. **Branch + recon.** Create and switch to `feat/phase-1-movement` off the latest `main`. Read the Phase 0 code to confirm exact paths, the Phaser game config (canvas size, pixelArt/roundPixels, physics default, scene list), and naming conventions. Note them in the report.
2. **Tuning constants.** Create a single source of truth, e.g. `src/config/PlayerTuning.ts`, exporting a typed `PlayerTuning` object: `runMaxSpeed`, `runAccel`, `runDecel`, `airAccelFactor` (air-control multiplier), `gravityY`, `jumpVelocity` (derive so apex ≈ 2 tiles given tile size and gravity — document the kinematics `v = sqrt(2 * g * h)` in a comment), `maxFallSpeed`, `coyoteTimeMs`, `jumpBufferMs`, `bodyWidth`, `bodyHeight`. Keep tile size in a shared world-constants module (reuse Phase 0's if it exists). Use `as const`/readonly typing so values are statically checked but trivially editable in one place.
3. **State machine.** Create `src/entities/PlayerStateMachine.ts` (or co-locate per Phase 0 conventions): a minimal typed FSM with `PlayerState = 'idle' | 'run' | 'jump' | 'fall' | 'land'`, an `enter/update/canTransition` contract, and pure transition logic that is unit-testable WITHOUT a live Phaser scene (take grounded/velocity/input as plain inputs). Keep all transition decisions in pure functions so Vitest can exercise them headlessly.
4. **Player entity.** Create `src/entities/Player.ts` extending `Phaser.Physics.Arcade.Sprite` (or a `GameObjects.Rectangle` wrapped with an arcade body if no texture exists — prefer a small generated placeholder texture so flip works). In its constructor: enable an arcade body, set `setCollideWorldBounds` appropriately, set body size from tuning, and `setMaxVelocity`. Implement `preUpdate(time, delta)` to: read input, apply run accel/decel toward max speed (horizontal `setAccelerationX` or manual velocity integration — pick one and be consistent), apply reduced authority while airborne via `airAccelFactor`, clamp fall speed to `maxFallSpeed`, run jump logic (coyote + buffer), drive the FSM from grounded/velocity/input, and flip the sprite via `setFlipX` based on facing. Expose read-only getters for `state`, `velocity`, `isGrounded`, `coyoteRemaining`, `bufferRemaining` for the debug overlay and tests.
5. **Input.** Create `src/input/InputController.ts` (or reuse Phase 0 input if present) wrapping Phaser keyboard: left/right (Arrow + A/D), jump (Space + Up/W) as an edge-detected "jump pressed this frame" plus "held", and a debug-toggle key (e.g. backtick `` ` `` or F1). Centralise key codes so they are remappable later (Phase 4 touch controls will plug into the same abstraction).
6. **Coyote time + jump buffer.** In the controller: when the body leaves the ground without jumping, start a coyote timer (`coyoteTimeMs`) during which a jump is still allowed. When jump is pressed while airborne, record it in a buffer timer (`jumpBufferMs`) so a press shortly before landing still triggers a jump on touchdown. Decrement both by `delta` each frame. Document the exact precedence in code comments.
7. **Test tilemap (Tiled).** Author `public/assets/maps/test-movement.tmj` (orthogonal, tile size matching world constants, e.g. 16 or 32) with: a `ground` tile layer forming a continuous band with at least one pit/gap, a 2-tile-high solid block to jump onto, and an `objects` object layer containing a `spawn` point. Add a minimal placeholder tileset image under `public/assets/tilesets/` (a simple solid/grid tile is fine) and reference it from the map. Keep the map small (e.g. ~40x20 tiles). If Phase 0 defined an asset-loading convention, follow it.
8. **Movement scene.** Create `src/scenes/MovementScene.ts` (register it in the game config / scene list per Phase 0 conventions, ideally behind an explicit scene key so the empty-canvas boot is not broken — make it the active gameplay scene). In `preload`: load the tilemap JSON + tileset image. In `create`: build the tilemap, create the ground layer, `setCollisionByExclusion`/`setCollisionByProperty` for solids, read the `spawn` point, instantiate `Player`, add `this.physics.add.collider(player, groundLayer)`, set `physics.world.bounds` and `cameras.main.setBounds` to the map size. Configure the follow camera: `cameras.main.startFollow(player, true, lerpX, lerpY)` with a `setDeadzone(...)` and `setLerp(...)` tuned so the hero sits near screen-center/left-of-center with smoothed, jitter-free follow.
9. **Anti-tunnelling.** Mitigate high-speed tunnelling: cap horizontal speed and `maxFallSpeed` sanely, and prefer Arcade settings that reduce pass-through (reasonable body size, `physics.world` with adequate `fps`/`setBoundsCollision`). Document the trade-off; if tunnelling persists at max speed, note it as a known limitation for the polish phase.
10. **Pit / respawn.** Detect falling below the world bounds (or below a death-Y derived from the map) and respawn the hero at the `spawn` point with zeroed velocity and reset FSM. Keep this generic enough that Phase 2 can later route it through a `GameManager` (leave a clear comment / seam, but do NOT build the GameManager now).
11. **Debug overlay.** Create `src/debug/DebugOverlay.ts`: a Phaser text object (fixed to camera via `setScrollFactor(0)`) showing state, `vx`/`vy`, grounded, coyote/buffer remaining, and FPS. Toggle visibility with the debug key. Default off (or behind a build flag) so it doesn't ship as the default view, but is trivially enabled.
12. **Wire-up + manual pass.** Run `npm run dev`, verify the loop end-to-end, then tighten the tuning constants until the feel is floaty-but-controllable per the reference (clean ~2-tile parabola, visible accel/decel, forgiving coyote/buffer). Commit the final tuned constants separately so the tuning pass is reviewable.

**Verification Checklist**
- [ ] Hero idles, runs (with visible accel/decel + momentum), jumps, falls, and lands — FSM transitions match observed state in the debug overlay.
- [ ] Jump apex clears a 2-tile-high block from flat ground (derived from tuning, not eyeballed magic numbers).
- [ ] Coyote time lets the hero jump for a short window after walking off a ledge; jump buffer triggers a jump if pressed just before landing.
- [ ] Air control works with reduced authority vs ground; max speed and max fall speed are enforced.
- [ ] Falling into the pit / below world bounds respawns the hero at the Tiled `spawn` point with reset state.
- [ ] Camera follows smoothly with a dead-zone and no jitter; camera + world bounds match the map (no scrolling past edges).
- [ ] Sprite flips to face movement direction.
- [ ] All feel constants live in one module and visibly change behaviour when edited (hot-tweakable).
- [ ] Debug overlay toggles on/off with the bound key and reports live values.
- [ ] `npm run typecheck`, `npm run lint`, `npm run build`, and the full test suite all pass; Phase 0 empty-canvas boot still works.

**Testing Expectations**
- **Vitest (unit/logic):** Add `tests/playerStateMachine.spec.ts` covering ALL transitions as pure functions — idle→run on horizontal input; run→jump on jump-with-grounded; jump→fall at apex (vy crosses zero / downward); fall→land on ground contact; land→idle/run resolution; no double-jump (jump ignored while airborne unless coyote is active). Add `tests/jumpKinematics.spec.ts` asserting the derived `jumpVelocity` yields an apex ≥ 2 tiles for the configured gravity (the `v=sqrt(2gh)` relationship). Add `tests/coyoteJumpBuffer.spec.ts` exercising the coyote/buffer timer logic with simulated `delta` steps (allow jump within window, deny after expiry; buffered press fires on landing). Keep all of these free of a live Phaser scene by testing pure functions/helpers.
- **Playwright (E2E smoke):** Add/extend `e2e/movement.spec.ts` to load the game, wait for the canvas, send keyboard input (ArrowRight, then Space) and assert observable movement — e.g. expose a tiny `window.__game` test hook (player x/state) guarded so it only attaches in dev/test, and assert x increases after holding right and that a jump changes state to `jump`. Confirm input→movement without relying on pixel diffs.
- **Manual via `npm run dev`:** Walk the checklist above — run, jump onto the 2-tile block, walk off a ledge to feel coyote time, buffer a jump into a landing, fall into the pit to confirm respawn, and watch the camera. Toggle the debug overlay and sanity-check the live values.
- **Gate:** typecheck + lint + test (unit and E2E) + build must ALL pass locally and in CI before the PR is considered green.

**Git Expectations**
- Work on branch `feat/phase-1-movement` (created off latest `main`).
- Commit frequently with Conventional Commits, e.g. `feat(player): arcade body + run accel/decel`, `feat(player): coyote time + jump buffer`, `feat(level): Tiled test-movement map`, `feat(camera): smoothed dead-zone follow`, `test(player): FSM + kinematics + coyote/buffer specs`, `feat(debug): velocity/state overlay`, `chore(tuning): tuned feel pass`.
- When the branch is green (typecheck/lint/test/build all pass, CI green), open a PR to `main` with a summary of what was built and the verification checklist, then squash-merge.
- This is the first playable milestone (a controllable hero): after merge, tag it, e.g. `git tag -a v0.1.0-movement -m "Phase 1: movement prototype playable"` and push the tag.

**Expected Outputs / Deliverables**
When done, the following must exist and work:
- `src/config/PlayerTuning.ts` (centralised feel constants) and shared world/tile constants.
- `src/entities/Player.ts`, `src/entities/PlayerStateMachine.ts`.
- `src/input/InputController.ts`.
- `src/scenes/MovementScene.ts` (registered in the game config).
- `src/debug/DebugOverlay.ts`.
- `public/assets/maps/test-movement.tmj` + placeholder tileset image under `public/assets/tilesets/`.
- Tests: `tests/playerStateMachine.spec.ts`, `tests/jumpKinematics.spec.ts`, `tests/coyoteJumpBuffer.spec.ts`, and `e2e/movement.spec.ts`.
- A short report at `docs/reports/phase-1-report.md` summarising: what was built (files + responsibilities), key decisions (FSM design, accel-vs-velocity integration choice, final tuning values and the 2-tile kinematics derivation, coyote/buffer values, camera lerp/dead-zone values), exactly how to test (commands + manual steps + debug-overlay key), any deviations from this prompt or known limitations (e.g. residual tunnelling at max speed), and explicit seams left for Phases 2–3 (GameManager-routed respawn, object spawning, parallax).

Implement this entire phase autonomously. Work step-by-step, validate after each step, commit frequently, do not break earlier phases, and produce the phase report. Do not ask for clarification — make sensible, documented decisions and record them in the report.
~~~

---

### Phase 2 — Core Gameplay Systems

*Run after Phase 1 (Movement Prototype) is merged to main and CI is green.*

~~~
**Role**
You are a senior gameplay engineer specializing in 2D platformers built on Phaser 3 + TypeScript. You write strict, well-tested, data-driven code and you work autonomously without asking for clarification — you make sensible, documented decisions and keep the build green at every step.

**Context**
- The game is a 2D side-scrolling platformer (Super Mario / Celeste lineage), painterly pixel-art, "floating sky islands" fantasy theme. Core loop: run right → jump across pits/islands → collect orange star clusters (each shows a floating "+100") → traverse crates/stone blocks → pass snails and slimes. HUD is intentionally minimal.
- Stack (do NOT deviate): Phaser 3 (3.80+) with **Arcade Physics**, TypeScript (strict), Vite dev/build, Tiled (.tmj/JSON) tilemaps via Phaser's tilemap API, Howler.js or Phaser Sound behind a thin AudioManager, Vitest (unit) + Playwright (E2E), ESLint + Prettier, GitHub Actions CI.
- Repo inherited from Phase 0 + Phase 1 — **this already exists and MUST keep working**:
  - A runnable Vite + TS + Phaser project with CI (typecheck + lint + test + build).
  - A working hero **character controller** (run/jump/fall/idle/land) with arcade physics, momentum, air control, tunable feel constants, and a smoothed (lerped) follow camera, running on a hand-made test tilemap.
  - An established folder architecture (likely `src/` with `scenes/`, `objects/` or `entities/`, `config/` or `constants/`, plus `tests/`). **Discover the actual structure first by reading the repo — match it; do NOT invent a parallel layout.**
- You are adding gameplay systems ON TOP of movement. You must NOT touch tuning of Phase 1 movement feel except where strictly required to wire in damage/respawn, and you must keep all Phase 1 tests passing.

**Objectives**
- Add a **GameManager** as the single source of truth for run state (score, lives, current checkpoint, win/lose state).
- Add a lightweight **typed event bus** for gameplay events: `collect`, `hurt`, `defeat`, `die`, `respawn`, `win`, `lose`.
- Add **Star** collectibles: overlap → `+score` (default 100), spawn a floating "+100" text that rises and fades, fire a `collect` event with an SFX hook.
- Add **Crate**: solid stand-on platform; a breakable variant that breaks on stomp/bump and emits particles.
- Add an **Enemy base class** + **Snail** + **Slime** with patrol AI (walk, flip at edges/walls).
- Implement **stomp-to-defeat** (hero bounces) vs **side-contact damage** (hero loses a life), with correct, unambiguous collision/overlap ordering.
- Add **hazard tiles / pit death**: falling below the world or touching a hazard kills the hero.
- Add **lives + respawn** with **checkpoint** respawn points.
- Add **win/lose state stubs**: reach a goal marker → win; out of lives → lose.
- Unit-test all pure logic; keep Phase 1 movement untouched and regression-free.

**Constraints**
- HARD: Do NOT break existing Phase 1 systems or tests. Movement feel constants are off-limits unless wiring damage/respawn demands it (and then document why).
- Keep TypeScript **strict** (no `any`, no non-null `!` abuse, no `@ts-ignore`); keep **ESLint + Prettier** clean.
- Stay strictly within the chosen stack. No new engines, no new physics system, no heavyweight state libs — the event bus and GameManager are hand-rolled, lightweight TS.
- **Data-driven over hard-coded**: score-per-star, lives count, enemy speeds, stomp bounce velocity, invuln duration, etc. live in a typed config/constants module — no magic numbers scattered in entity code.
- Respawn must fully reset transient state (velocity, invuln flags, animation) — no lingering ghosts or stuck physics bodies.
- Avoid tight coupling: entities emit/consume events through the bus and read run state from GameManager; they do not reach into each other directly.
- Work autonomously. Make small, frequent commits. Match the established folder architecture exactly.

**Implementation Steps** (numbered, ordered — validate after each)
1. **Recon.** Read the repo to learn the real structure: `package.json` scripts, `tsconfig`, ESLint config, `src/` layout, the Phase 1 scene + hero class, the constants/config module, and existing tests. Note the exact paths and naming conventions you must follow. Do not proceed until you understand how the hero, scene, and tilemap are wired.
2. **Branch.** `git checkout -b feat/phase-2-gameplay` from up-to-date `main`.
3. **Gameplay config.** Create/extend a typed config module (e.g. `src/config/gameplay.ts` — match existing naming) with constants: `SCORE_PER_STAR = 100`, `STARTING_LIVES = 3`, `STOMP_BOUNCE_VELOCITY`, `HURT_INVULN_MS`, `HURT_KNOCKBACK`, `ENEMY_SPEED` (per type), `PIT_DEATH_Y` / "death plane" offset. Export typed interfaces (`EnemyConfig`, etc.).
4. **Event bus.** Create `src/systems/EventBus.ts`: a small typed emitter. Define a `GameplayEvents` map type (`collect: { value: number; x: number; y: number }`, `hurt: {}`, `defeat: { enemy: string; x: number; y: number }`, `die: {}`, `respawn: {}`, `win: {}`, `lose: {}`) and a strongly-typed `on/off/emit`. Either wrap Phaser's `EventEmitter` or implement a tiny generic one — keep it framework-agnostic so it is unit-testable without a running game.
5. **GameManager.** Create `src/systems/GameManager.ts` owning run state: `score`, `lives`, `checkpoint: {x,y}`, `state: 'playing'|'won'|'lost'`. Methods: `addScore(n)`, `loseLife()` (decrements; emits `lose`/sets `state='lost'` at 0), `setCheckpoint(x,y)`, `reset()`. It subscribes to the EventBus (`collect`→addScore, `die`→loseLife+respawn flow). Keep it **pure-logic where possible** (no direct Phaser scene refs in the score/lives math) so it unit-tests cleanly; pass the scene or callbacks in where needed.
6. **Star collectible.** Create `src/entities/Star.ts` (match folder name) extending `Phaser.Physics.Arcade.Sprite` (or Image with arcade body), body immovable, gravity off. On overlap with hero: emit `collect {value: SCORE_PER_STAR, x, y}`, spawn a floating "+100" `Phaser.GameObjects.Text` that tweens up ~30px and fades over ~600ms then destroys, then disable+destroy the star. Provide a placeholder texture if real art is absent (generate a simple colored shape/texture key) — real art arrives in Phase 5.
7. **Crate.** Create `src/entities/Crate.ts`: arcade body, `immovable`, solid (hero collides and can stand on it). Add a `breakable` flag (data-driven): when broken (stomped from above or bumped per design — document the chosen trigger), emit particles via a `Phaser.GameObjects.Particles` emitter and destroy the crate. Non-breakable crates are permanent platforms.
8. **Enemy base + types.** Create `src/entities/Enemy.ts` (abstract base) with patrol AI: horizontal velocity from config, `flipX` and reverse direction at walls / platform edges (edge detection via a small look-ahead ray or `body.blocked`/ground-probe). Add `src/entities/Snail.ts` and `src/entities/Slime.ts` extending it with per-type speed/texture from config. Expose a `defeat()` method that plays a squash tween, emits `defeat`, and destroys/disables the body.
9. **Stomp vs damage (the critical ordering).** In the gameplay scene, register hero↔enemy as a **physics overlap** (not a blocking collider) and resolve in the callback:
   - Stomp if the hero is descending AND hero bottom is above the enemy's vertical midline (e.g. `hero.body.velocity.y > 0 && hero.body.bottom <= enemy.body.center.y + epsilon`). Then: call `enemy.defeat()`, set hero `velocity.y = STOMP_BOUNCE_VELOCITY` (a bounce), emit `defeat`.
   - Otherwise it is **side/under contact** → hero takes damage: only if not currently invulnerable, emit `hurt`, apply knockback, start `HURT_INVULN_MS` invuln (blink tween + ignore further hits), and `loseLife()` via GameManager. Document the epsilon/threshold choice in a code comment and the report.
10. **Hazards / pit death.** Add a "death plane" check: in scene `update`, if `hero.y > worldDeathY` (from config / map bounds) → emit `die`. Support hazard tiles too: tiles flagged (Tiled property `hazard: true`) on collision → emit `die`. Keep a single `killHero()` path that all death sources funnel into.
11. **Lives / respawn / checkpoint.** On `die`: GameManager `loseLife()`; if lives remain, run a `respawnHero()` that fully resets the hero (reposition to `checkpoint`, zero velocity, clear invuln, reset animation/state, re-enable body) and emits `respawn`. Add a `Checkpoint` entity or a checkpoint trigger zone that calls `GameManager.setCheckpoint(x,y)` on overlap. If lives hit 0 → `state='lost'`, emit `lose`.
12. **Win stub.** Add a `Goal` marker/trigger zone (entity or object): hero overlap → `GameManager.state='won'`, emit `win`. No full end screen needed this phase (UI is Phase 4) — a console log / temporary text overlay is acceptable and clearly marked TODO for Phase 4.
13. **Wire into the gameplay scene.** In the existing Phase 1 scene (or a clearly-named gameplay scene if the architecture separates them), instantiate GameManager + EventBus, create groups for stars/crates/enemies/checkpoints, hand-place a few of each on the existing test tilemap for now (object-from-map spawning is Phase 3 — leave a clearly marked TODO referencing Phase 3), and register all colliders/overlaps. Keep Phase 1 movement code intact.
14. **Data-driven spawn seam.** Even though full Tiled object spawning is Phase 3, define the spawn data as a typed array/factory now (so Phase 3 only swaps the source from inline array → map objects). Mark the seam with a `// TODO(phase-3): source from Tiled object layer` comment.
15. **Cleanup pass.** Ensure no orphaned timers/tweens/emitters survive respawn or destroy; remove debug logging behind a `DEBUG` flag; run lint/format.

**Verification Checklist** (maps to Success criteria)
- [ ] Collecting a star increases `GameManager.score` by 100 and shows a rising/fading "+100" popup.
- [ ] Stomping an enemy (descending onto it) defeats the enemy AND bounces the hero upward.
- [ ] Side/under contact with an enemy costs exactly one life (once, respecting invuln) and applies knockback.
- [ ] Falling into a pit / below the death plane kills the hero and respawns at the last checkpoint.
- [ ] Reaching a checkpoint updates the respawn point; reaching the goal sets `state='won'` and emits `win`.
- [ ] Running out of lives sets `state='lost'` and emits `lose`.
- [ ] Crates are solid stand-on platforms; the breakable variant breaks with particles on the documented trigger.
- [ ] GameManager is the single source of run-state truth; entities communicate via the EventBus, not direct references.
- [ ] Phase 1 movement feel and camera are unchanged; all Phase 1 tests still pass.
- [ ] `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` all pass clean.

**Testing Expectations**
- **Vitest (unit):**
  - `GameManager`: `addScore` accumulates; `loseLife` decrements and transitions to `lost` at 0; `setCheckpoint`/`reset` behave; `collect` event raises score; multiple `die` events end the run correctly.
  - `EventBus`: typed `on`/`emit`/`off` deliver correct payloads, support multiple listeners, and `off` actually detaches.
  - Pure stomp-vs-damage decision: extract the "is this a stomp?" predicate into a pure function (taking velocity + bounding-box numbers) and unit-test the boundary/epsilon cases, both stomp and side-hit.
  - Enemy patrol direction-flip logic (extract the pure decision where feasible).
- **Playwright (E2E smoke):** boot the game canvas, confirm it renders without console errors, and (if a debug hook/`window` test API is exposed) assert score increments after a scripted star overlap or that the scene reaches `playing` state. Keep it a lightweight smoke test; do not make it flaky.
- **Manual via `npm run dev`:** verify all ten checklist behaviors by hand on the test map. Confirm no console errors and no stuck/ghost bodies after several deaths and respawns.
- All of typecheck + lint + unit + build MUST pass before opening the PR.

**Git Expectations**
- Work on branch `feat/phase-2-gameplay` (created from current `main`).
- Make **small, frequent commits** using Conventional Commits, e.g. `feat(gameplay): add typed EventBus`, `feat(gameplay): GameManager run-state`, `feat(entities): Star collectible with +100 popup`, `feat(entities): Enemy base + Snail + Slime patrol`, `feat(gameplay): stomp vs damage resolution`, `feat(gameplay): pit death + checkpoint respawn`, `test(gameplay): GameManager + EventBus + stomp predicate`.
- When everything is green, open a PR to `main` with a clear summary and the verification checklist; squash-merge once CI passes.
- This is a playable gameplay milestone — after merge, tag it (e.g. `v0.2.0-gameplay`).

**Expected Outputs / Deliverables**
- New files (matching the repo's actual conventions): `src/systems/EventBus.ts`, `src/systems/GameManager.ts`, `src/config/gameplay.ts` (or extension of existing config), `src/entities/Star.ts`, `src/entities/Crate.ts`, `src/entities/Enemy.ts`, `src/entities/Snail.ts`, `src/entities/Slime.ts`, plus a `Checkpoint`/`Goal` trigger (entity or zone helper).
- Updated gameplay scene wiring stars/crates/enemies/checkpoints/goal + colliders/overlaps, with Phase 3 spawn seam TODOs.
- New tests under the existing test folder for GameManager, EventBus, the stomp predicate, and patrol logic; an updated/added Playwright smoke test.
- A report file **`docs/reports/phase-2-report.md`** summarising: what was built; key decisions (stomp-vs-avoid → stomp; breakable-crate trigger; stomp epsilon/threshold; event-bus design; respawn cleanup strategy); how to test (commands + manual steps); and any deviations from this plan with rationale.

Implement this entire phase autonomously. Work step-by-step, validate after each step, commit frequently, do not break earlier phases, and produce the phase report. Do not ask for clarification — make sensible, documented decisions.
~~~

---

### Phase 3 — Level & World Systems

*Run after Phase 2 is merged and green (stars/score, crates, enemies, hit/respawn, GameManager all in place).*

~~~text
**Role**
You are a senior Phaser 3 / TypeScript gameplay engineer specialising in data-driven level pipelines, tilemaps, and 2D camera/parallax systems. You work autonomously, in small verified increments, and you never break already-shipped systems.

**Context**
- The game is a 2D side-scrolling platformer (Super Mario / Celeste lineage) with painterly pixel art and a "floating sky islands" fantasy theme. Core loop: run right, jump across pits and between floating islands, collect orange +100 star clusters, traverse stone-block stairs and wooden crates, avoid/stomp snail & slime enemies. Browser-run, web-first.
- Stack (do NOT deviate): Phaser 3 (3.80+) with Arcade Physics, TypeScript (strict), Vite dev server/bundler, Tiled (.tmj/JSON) tilemaps loaded via Phaser's tilemap API, Howler.js or Phaser Sound behind an AudioManager, Vitest (unit) + Playwright (E2E smoke), ESLint + Prettier, GitHub Actions CI.
- Repo state you INHERIT (must keep working — do NOT rewrite or regress):
  - Phase 0: Vite+TS+Phaser scaffold, an empty runnable game canvas, CI (typecheck+test+build), asset/Tiled pipeline conventions, established folder architecture (e.g. `src/scenes/`, `src/entities/`, `src/systems/`, `src/config/`, `public/assets/`). Inspect the actual structure before writing; conform to it.
  - Phase 1: Hero controller (`Player` entity) — run/jump/fall/idle/land, arcade physics with momentum + air control, tunable feel constants, and a smoothed (lerped) follow camera, currently running on a HAND-MADE test tilemap.
  - Phase 2: Core gameplay systems — `Star` (+100, score popup), `Crate` (stand-on / breakable), enemies (`Snail`, `Slime`/turtle) with stomp/avoid, pit-death + hazard, hero hit/respawn, and a `GameManager` owning run state (score, lives, current-level). These entities currently get spawned by hand-coded test setup.
- Your job in Phase 3 is to make the world DATA-DRIVEN: the level must come entirely from a Tiled `.tmj` file (no hard-coded entities), with proper parallax, floating islands, camera bounds, and a level→next-level flow. You will REWIRE the existing entities to be spawned from the map's object layer, but you must NOT change their gameplay behaviour or break their existing tests.

**Objectives**
- A `LevelLoader` system that loads a Tiled `.tmj`, builds tile layers (ground, platforms, one-way platforms), and wires Arcade collision per layer (including one-way / drop-through platforms).
- The Tiled OBJECT layer drives ALL spawns: `player_start`, `star`, `crate`, `enemy` (snail/slime via a type/property), `checkpoint`, and `goal`. Zero hard-coded entity placement remains in the gameplay scene.
- A `ParallaxBackground` system with at least 4 distinct scroll layers (sky gradient → distant mountains → mid floating-islands+trees+clouds → foreground), each with its own scrollFactor, tiled/seamless horizontally, scaling correctly across aspect ratios.
- Floating-island elevated platforms assembled from map data (tile layer and/or object-driven), standable, with waterfall/tree decoration support hooks.
- Camera world bounds + a tuned dead-zone derived from the loaded map dimensions (not magic numbers).
- Checkpoint capture (updates GameManager respawn point) and a `goal` that triggers `level-complete → next-level` transition; a small ordered level list so reaching the goal advances levels (and loops/ends gracefully at the last one).
- A content authoring guide documenting the Tiled property conventions so a new level needs only a new `.tmj`.

**Constraints**
- Do NOT break any existing system or test. Phase 1 movement/camera feel and Phase 2 gameplay (scoring, stomp, crate break, respawn, GameManager state) must behave identically — you are changing HOW entities are spawned and where the world comes from, not WHAT they do.
- TypeScript stays strict (no `any` leakage, no `// @ts-ignore` to paper over types). ESLint + Prettier must stay clean.
- Stay strictly within the chosen stack. No new engine, no new map format, no heavyweight new deps. A small JSON/TS schema helper is fine; a tiny tilemap-collision helper is fine.
- DATA-DRIVEN over hard-coded: a level is a `.tmj` + its tileset images. Adding/editing a level must require editing only data + assets, never gameplay code. Property names live in ONE typed constants module.
- Match the established folder architecture and naming you observe in the repo. Do not invent a parallel structure.
- Work autonomously and in small frequent commits. Ask nothing — make sensible, documented decisions and record deviations in the report.

**Implementation Steps** (ordered; validate + commit after each meaningful step)
1. **Orient.** Read the existing repo: scene flow, `Player`/`Star`/`Crate`/`Snail`/`Slime`/`GameManager` signatures, current test-tilemap setup, folder layout, asset path conventions, and the existing test/CI scripts. Note exactly how entities are currently constructed (constructor args, groups, physics setup) so you can preserve them.
2. **Tiled conventions module.** Create `src/config/tiledConventions.ts` exporting typed constants for layer names (`ground`, `platforms`, `oneway`, `islands`, `decoration`, `objects`) and object types/properties (`player_start`, `star`, `crate`, `enemy` with an `enemyType` ∈ {`snail`,`slime`} property, `checkpoint`, `goal`) plus collision property keys (e.g. `collides`, `oneway`). This is the single source of truth referenced everywhere.
3. **TMJ typing.** Add minimal TypeScript interfaces for the Tiled JSON shape you actually consume (`TmjMap`, `TmjTileLayer`, `TmjObjectLayer`, `TmjObject`, custom property bag) in `src/types/tiled.ts`. Keep it tight to what you read — do not model the whole Tiled schema.
4. **Author a real demo `.tmj`.** Create `public/assets/levels/level-01.tmj` (and a placeholder `level-02.tmj`) using the conventions above: a `ground` grass/dirt band with gaps/pits, `platforms` (stone stairs/towers), an `oneway` layer for drop-through platforms, an `islands` layer (floating grassy platforms), a `decoration` layer (trees/banners/waterfall markers), and an `objects` layer placing `player_start`, several `star` clusters, `crate`s, `snail`/`slime` enemies, at least one `checkpoint`, and a `goal`. Use placeholder/existing Phase-0 tileset art; real art is Phase 5. Register the tileset + map in the loader/preload following existing preload conventions.
5. **LevelLoader system.** Create `src/systems/LevelLoader.ts`:
   - `load(scene, mapKey)`: creates the `Phaser.Tilemaps.Tilemap`, adds tilesets, builds each tile layer by convention, sets `collisionByProperty({ collides: true })` on `ground`/`platforms`/`islands`, and configures the `oneway` layer for one-way collision (use `setCollisionByProperty`/`tile.collideDown` semantics or a `collideUp`-only callback so the hero can jump up through and land on top — implement drop-through cleanly, e.g. via `setTileIndexCallback`/process callback that only collides when the player is moving downward and above the tile top).
   - Returns a structured result: `{ map, layers, collisionLayers, spawns }` where `spawns` is the parsed object list grouped by type.
   - Compute and return map pixel `width`/`height` for camera bounds.
6. **Object spawning.** Create `src/systems/ObjectSpawner.ts` (or extend LevelLoader) that, given the parsed `objects` layer, instantiates the EXISTING entity classes via their EXISTING constructors/groups: positions the `Player` at `player_start`, populates the stars group, crate group, enemy group (branch on `enemyType`), registers checkpoints, and the goal trigger. Reuse the Phase-2 groups/colliders — do not duplicate gameplay logic. Remove all hard-coded entity placement from the gameplay scene; the scene now asks LevelLoader/ObjectSpawner for everything.
7. **ParallaxBackground system.** Create `src/systems/ParallaxBackground.ts`:
   - Builds ≥4 layers as `TileSprite`s (or scrollFactor-driven images) parented to the scene, each with a distinct `scrollFactor` (e.g. sky ~0.0–0.1, mountains ~0.25, mid islands/clouds ~0.5, foreground ~0.85).
   - Horizontally seamless (TileSprite `tilePositionX` driven by `camera.scrollX * (1 - scrollFactor)` or via scrollFactor) and full-height; on `scene.scale.on('resize')` it re-fits so there are NO seams or gaps on different aspect ratios. Pin to the camera, render below gameplay layers (set depth).
   - Accept layer config (texture key + scrollFactor + optional vertical anchor) so layers are data-described, not magic-numbered inline.
8. **Camera bounds + dead-zone.** In the gameplay scene, after load, call `this.cameras.main.setBounds(0, 0, map.widthPx, map.heightPx)` and `startFollow(player, true, lerpX, lerpY)` preserving Phase-1 lerp values, then `setDeadzone(...)` sized as a fraction of the viewport (derive from `scale.width/height`, keep hero left-of-centre as observed). Do not hard-code map-specific pixel bounds.
9. **Checkpoint + goal flow.** Wire `checkpoint` overlap → `GameManager.setRespawnPoint(x,y)` (extend GameManager only additively if a setter doesn't exist). Wire `goal` overlap → emit a `level-complete` event; the scene fades out and restarts itself with the next map key from an ordered level list in `src/config/levels.ts` (`['level-01','level-02', ...]`). At the final level, show a graceful end (loop to first or a simple "complete" state) — keep it minimal; full UI is Phase 4/5. Ensure score/lives persist across the transition via GameManager.
10. **Wire it into the scene.** Refactor the existing gameplay scene to: preload the `.tmj` + tilesets, build parallax, call `LevelLoader.load` + `ObjectSpawner`, set up colliders between player/enemies/stars/crates and the collision layers using the existing Phase-2 collision setup, set camera bounds/deadzone, and start. The scene must contain ZERO literal entity coordinates.
11. **Authoring guide.** Write `docs/level-authoring.md`: how to open/edit a level in Tiled, the exact layer names, the object types and required custom properties (with a table), tileset setup, the `collides`/`oneway` property meaning, how to add a new level (drop `.tmj` in `public/assets/levels/`, add key to `levels.ts`, add to preload), and a checklist for a valid level.
12. **Self-review pass.** Confirm no `any`, no dead test-spawn code, no magic map numbers, parallax has no seams at 16:9 and a tall/narrow viewport, and one-way platforms allow up-pass + down-land.

**Verification Checklist** (must all be true)
- [ ] The full demo level loads ENTIRELY from `level-01.tmj` — grep the gameplay scene confirms zero hard-coded entity coordinates/spawns.
- [ ] Player, stars, crates, enemies (snail+slime), checkpoint(s), and goal all originate from the Tiled object layer.
- [ ] Ground/platforms/islands collide; the `oneway` layer lets the hero jump up through and land on top, and (sensibly) drop through if implemented.
- [ ] Parallax scrolls convincingly with ≥4 layers, NO seams, correct at 16:9 AND at a narrow/tall viewport (resize test).
- [ ] Camera respects world bounds (cannot scroll past map edges) and the dead-zone keeps the hero left-of-centre; Phase-1 follow feel is preserved.
- [ ] Reaching the `goal` triggers level-complete and loads the next level from `levels.ts`; score/lives persist; last-level case is handled gracefully.
- [ ] Checkpoint overlap updates the respawn point and a subsequent death respawns there.
- [ ] Adding/editing a level required editing only `.tmj` + assets + the `levels.ts` list — no gameplay-logic changes.
- [ ] All Phase 1 & Phase 2 behaviour and tests still pass unchanged.

**Testing Expectations**
- Vitest (unit/logic, pure where possible):
  - `LevelLoader`/parser: given a fixture `.tmj` object, it groups spawns by type correctly, parses custom properties (`enemyType`, `collides`, `oneway`), and computes map pixel dimensions. Mock/stub Phaser where the parsing logic can be isolated; keep tilemap-building thin so the PARSING is testable headlessly.
  - `levels.ts` progression helper: `nextLevel(current)` returns the right key and handles the last-level case.
  - Camera dead-zone/bounds derivation helper: given map + viewport sizes, returns expected bounds and deadzone rectangle.
  - All existing Phase 1/2 unit tests continue to pass with no modification (run them).
- Playwright (E2E smoke against the running canvas):
  - Boot the game, assert the canvas renders and no console errors; assert (via an exposed debug hook or game registry) that the level loaded the expected number of stars/enemies from data.
  - Optionally drive the hero to the goal (or set state) and assert a level-complete/next-level transition fired.
- Manual checks via `npm run dev`: run the demo level end to end — jump through a one-way platform and land on it; ride the dead-zone; collect stars (+100 still works); stomp a snail and a slime; die in a pit and confirm checkpoint respawn; reach the goal and confirm next-level load; resize the browser window and confirm no parallax seams.
- Hard gate: `npm run typecheck`, `npm run lint`, and `npm run test` (and `npm run build`) must ALL pass before opening the PR. If the repo exposes these under different script names, use the ones defined in `package.json`.

**Git Expectations**
- Create and work on branch `feat/phase-3-world` off the up-to-date main.
- Commit frequently with Conventional Commits, e.g. `feat(world): add LevelLoader for Tiled .tmj`, `feat(world): data-driven object spawning`, `feat(world): multi-layer parallax background`, `feat(world): camera bounds + deadzone from map`, `feat(world): checkpoint + goal level flow`, `docs(world): level authoring guide`, `test(world): level parser + progression unit tests`.
- Keep CI green on each push (typecheck + test + build).
- When everything is green and the verification checklist passes, open a PR to main with a clear summary (what became data-driven, parallax/camera/flow, how to author a level) and squash-merge it.
- This phase is a notable milestone (the game is now fully data-driven): after merge, tag it (e.g. `v0.3.0-world` or per the repo's tagging convention).

**Expected Outputs / Deliverables**
- `src/systems/LevelLoader.ts`, `src/systems/ObjectSpawner.ts` (or a documented merged form), `src/systems/ParallaxBackground.ts`.
- `src/config/tiledConventions.ts`, `src/config/levels.ts`, `src/types/tiled.ts`.
- `public/assets/levels/level-01.tmj` (full demo) + `public/assets/levels/level-02.tmj` (placeholder next level) + any tileset registration.
- Refactored gameplay scene with zero hard-coded entities; additive-only changes to `GameManager` for respawn point.
- New Vitest specs for the parser, level progression, and camera-derivation helpers; new Playwright smoke for data-loaded level + transition.
- `docs/level-authoring.md` content authoring guide.
- A short report at `docs/reports/phase-3-report.md` summarising: what was built, key decisions (one-way platform technique, parallax scroll-factor choices, spawn-mapping approach), how to test it (commands + manual steps), and any deviations from this plan (with rationale).

Implement this entire phase autonomously. Work step-by-step, validate after each step, commit frequently, do not break earlier phases, and produce the phase report. Do not ask for clarification — make sensible, documented decisions.
~~~

---

### Phase 4 — UI, HUD & Audio

*Run after Phase 3 (Level & World Systems) is merged and green.*

~~~
**Role**
You are a senior Phaser 3 / TypeScript game engineer joining an established codebase. You implement UI/HUD, audio architecture, and input layers for a web-first 2D platformer. You work autonomously, write strict TypeScript, keep tests and lint green, and ship in small, reviewable commits.

**Context**
- The game: a 2D side-scrolling fantasy platformer ("floating sky islands", painterly pixel art). The hero runs/jumps across islands collecting +100 stars, past snails/slimes. Observed HUD is deliberately minimal: ONLY two purple rounded-square buttons in the top-right — a Music-note toggle (♪) and a Pause button (two vertical bars "II"). No on-screen score/lives/timer was visible. No audio existed in the capture; the ♪ button implies looping BGM.
- Stack (do NOT deviate): Phaser 3 (3.80+) with Arcade Physics, TypeScript (strict), Vite, Tiled (.tmj) tilemaps, Howler.js behind a thin AudioManager, Vitest (unit) + Playwright (E2E), ESLint + Prettier, GitHub Actions CI. Delivery is a static HTML5 bundle.
- Repo state you inherit (must keep working — do NOT regress):
  - Phase 0: Vite+TS+Phaser scaffold, CI (typecheck + test + build), asset/Tiled pipeline, runnable canvas.
  - Phase 1: hero controller (run/jump/fall/idle/land) with arcade physics, momentum, air control, smoothed follow camera.
  - Phase 2: stars + score, wooden crates, enemies (snail/slime) with stomp/avoid, hazards/pit death, hero hit/respawn, and a `GameManager` owning run state. Score and hit/defeat/collect events already flow through this layer.
  - Phase 3: data-driven Tiled level loading, multi-layer parallax, floating islands, camera bounds, object spawning from map, level/checkpoint flow.
  - There is an existing Scene that runs gameplay (likely `GameScene` / `PlayScene`). Discover the exact name, the `GameManager`, and any existing event emitter (Phaser `EventEmitter` / scene events / an event bus) BEFORE writing code — reuse them, do not invent parallel state. Inspect `src/` and any `events`/`constants`/`config` modules first.

**Objectives**
- Add a dedicated, always-on-top **HUD scene** rendering exactly two top-right purple rounded-square buttons: Music toggle (♪) and Pause (II), matching the observed layout and scaling cleanly across resolutions.
- Add a **Pause overlay** (Resume / Restart / Options) that truly freezes the world (physics + timers + tweens + animations) and resumes cleanly.
- Add an **AudioManager** built on Howler.js: looping BGM + an SFX bus (jump, land, collect, crate, defeat, hurt), master/music/sfx volume, and a mute flag persisted to `localStorage`, all started on first user gesture (autoplay-safe).
- Wire SFX to the gameplay events already emitted in Phases 1–2 (jump, land, star collect, crate break, enemy defeat, hero hurt) — listen to existing events, do not modify gameplay logic to "call audio" inline beyond emitting events that already exist.
- Add **responsive on-screen touch controls** (left / right / jump) shown on touch devices only, driving the same input the keyboard does — without blocking the gameplay view.
- Keep an **optional score readout OFF the HUD by default** (config flag) to match the clean observed HUD.

**Constraints**
- Hard rule: do NOT break any existing system or test from Phases 0–3. Gameplay, scoring, camera, level loading, and respawn must behave exactly as before.
- TypeScript stays strict; zero `any` without a justified, commented reason. `npm run lint` and `npm run typecheck` must pass clean.
- Stay strictly within the chosen stack. No new heavy deps beyond Howler.js (already chosen). No UI framework, no DOM-overlay UI library — HUD is Phaser, touch buttons are Phaser GameObjects (or a thin DOM layer only if already established by Phase 0; prefer Phaser).
- Data-driven over hard-coded: HUD layout offsets, button size, volumes, and feature flags (e.g. `showScoreOnHud`) live in a typed config/constants module, not magic numbers scattered in code.
- Match the established folder architecture (e.g. `src/scenes`, `src/systems` or `src/managers`, `src/config`, `src/types`, `src/ui`). Discover the convention first and follow it; do not introduce a competing structure.
- Audio must be gesture-initiated (browser autoplay policy). Never `play()` BGM before the first pointer/key/touch interaction.
- Pause must HALT — not just hide. No physics steps, tweens, timers, or sprite animations advance while paused.
- Touch controls must not be visible or capture input on non-touch devices, and must not occlude the hero or critical play area.
- Work fully autonomously: make sensible, documented decisions; do NOT ask for clarification. Commit frequently.

**Implementation Steps**
1. **Recon.** List `src/`, read the gameplay scene, `GameManager`, existing event mechanism, config/constants, and the Phaser game config (`scale` mode, `parent`, scene registration order). Confirm how Phase 0 registers scenes and how the `Scale Manager` is configured. Note the exact event names already emitted for jump/land/collect/crate/defeat/hurt; if some are missing, add a thin emit at the existing call sites (emit only — keep all gameplay logic intact).
2. **Config & types.** Create/extend `src/config/uiConfig.ts` (or follow existing config dir) exporting a typed `UI_CONFIG`: button size, top-right margin, gap, button corner radius, purple fill/hover colors, depth values, and `showScoreOnHud: boolean` (default `false`). Create `src/config/audioConfig.ts` with `AUDIO_CONFIG`: asset keys/paths, default master/music/sfx volumes, BGM loop flag, and per-SFX volume. Add a typed `SfxKey` union and `AudioSettings` type in `src/types/`.
3. **AudioManager.** Create `src/managers/AudioManager.ts` (or `src/systems/AudioManager.ts` per convention) wrapping Howler:
   - Singleton/instance owned by the game (attach to registry or a service locator already used). Lazy-init: construct Howl instances for BGM (`loop: true`) and each SFX.
   - API: `init()` (idempotent), `unlock()` (call on first gesture; `Howler.ctx.resume()` + start BGM if not muted), `playSfx(key: SfxKey)`, `playBgm()`, `stopBgm()`, `setMusicMuted(b)`, `isMusicMuted()`, `setMasterVolume`, `setMusicVolume`, `setSfxVolume`.
   - Persist `{ musicMuted, masterVolume, musicVolume, sfxVolume }` to `localStorage` under a versioned key (e.g. `game.audio.v1`); load on `init()` with safe parsing and defaults.
   - Respect autoplay policy: never start BGM until `unlock()` has fired.
4. **Audio assets.** Add small placeholder audio files under `public/audio/` (or the established asset dir) — short royalty-free/synth placeholders or silent stubs if real SFX are deferred to Phase 5 — and register their paths in `audioConfig`. Document in the report that final audio lands in Phase 5; ensure missing files degrade gracefully (Howler `onloaderror` logged, no crash).
5. **Event → SFX wiring.** In a single subscriber (e.g. inside `AudioManager.bindGameEvents(emitter)` or a small `src/systems/AudioBindings.ts`), subscribe to the existing gameplay events and call `playSfx(...)` for: hero jump, land, star collect, crate break, enemy defeat, hero hurt. Centralize here — do not scatter `playSfx` calls across gameplay classes.
6. **HUD scene.** Create `src/scenes/HudScene.ts`, launched in parallel with the gameplay scene (`this.scene.launch('HudScene')` from the gameplay scene's `create`, or via a Boot/registration step), running ABOVE gameplay (`scene.bringToTop` / high depth). It must:
   - Draw two purple rounded-square buttons top-right using `UI_CONFIG` (Graphics or a generated rounded-rect texture). Left button = Music (♪), right button = Pause (II), or match observed order precisely (music-note then pause). Use vector/Graphics glyphs (♪ as a Text/Graphics, II as two rounded bars) so no art dependency.
   - Anchor to the top-right using the Scale Manager so positions hold across resolutions; recompute on `scale.on('resize')`.
   - Music button: toggles `AudioManager.setMusicMuted`, updates its visual state (e.g. a slash/dim when muted), and persists.
   - Pause button: launches/raises the Pause overlay and pauses the gameplay scene.
   - Optionally render a score readout only when `UI_CONFIG.showScoreOnHud === true`, subscribing to the existing score event; default hidden.
7. **Pause overlay.** Create `src/scenes/PauseScene.ts` (or a HUD-managed overlay) that:
   - On open: `this.scene.pause('<GameSceneKey>')` (halts that scene's update/physics/tweens/timers) and dims the screen with a semi-transparent rect; the HUD/overlay scene stays interactive.
   - Buttons: **Resume** (`scene.resume` gameplay, close overlay), **Restart** (restart gameplay scene + reset `GameManager` run state through its existing API — do not duplicate reset logic), **Options** (toggle music/sfx mute or a simple volume control wired to `AudioManager`).
   - Verify that pausing the gameplay scene genuinely stops Arcade physics and animations; if any timers live elsewhere, pause them too. Keyboard `Esc`/`P` and the Pause button both open/close it.
8. **First-gesture unlock.** On the very first `pointerdown` / `keydown` / `touchstart` (registered once in Boot or the HUD/gameplay scene), call `AudioManager.unlock()`. Ensure BGM only starts here, respecting the persisted mute flag.
9. **Touch controls.** Create `src/ui/TouchControls.ts` (Phaser GameObjects, in the HUD scene or its own input scene):
   - Detect touch capability (`this.sys.game.device.input.touch` or pointer/`'ontouchstart'`); render only on touch devices.
   - Left/Right buttons bottom-left, Jump button bottom-right, semi-transparent, sized for thumbs, anchored via Scale Manager, never overlapping the two top-right HUD buttons or the central play area.
   - Drive the SAME input path as keyboard: set the shared input state the hero controller already reads (discover whether Phase 1 uses an `InputManager`/virtual input; if so feed it; if it reads cursors directly, introduce a minimal input abstraction the hero already polls and route both keyboard and touch through it — without changing hero movement feel).
   - Support multi-touch (hold a direction + jump simultaneously); release clears state.
10. **Scene wiring & depth.** Ensure scene registration order and `depth`/`bringToTop` make HUD + overlay render above gameplay and parallax, and that resizing keeps everything anchored. Confirm pause overlay sits above HUD buttons or that HUD remains usable as designed.
11. **Lint/format/typecheck** after each major step; fix immediately.

**Verification Checklist**
- [ ] Two purple rounded-square buttons render top-right (Music ♪ then Pause II), matching the observed layout, and stay anchored/scaled across window resizes and aspect ratios.
- [ ] Music button mutes/unmutes BGM; the muted choice **persists across a full page reload** (localStorage).
- [ ] BGM does NOT play before a user gesture; it starts only after first interaction and respects the persisted mute state.
- [ ] Pause overlay fully freezes the world: no physics movement, no enemy motion, no tweens/timers/animations advance; Resume restores exactly; Restart resets the run via `GameManager`; Options adjusts audio.
- [ ] `Esc`/`P` and the Pause button both toggle pause identically.
- [ ] SFX fire on the correct events: jump, land, star collect, crate break, enemy defeat, hero hurt — and only those.
- [ ] Touch controls appear ONLY on touch/emulated-touch devices, drive the hero (left/right/jump, multi-touch), and do not occlude the hero or the top-right HUD.
- [ ] Score readout is OFF the HUD by default (`showScoreOnHud=false`) and can be flipped on via config.
- [ ] All Phase 0–3 behavior unchanged; `npm run typecheck`, `npm run lint`, `npm run test`, and `npm run build` all pass.

**Testing Expectations**
- **Vitest (unit/logic):**
  - `AudioManager`: mute toggling, localStorage persistence round-trip (mock `localStorage`), volume setters clamp to [0,1], `unlock()` idempotency, `playSfx` no-op when assets fail to load. Mock Howler so tests don't touch real WebAudio.
  - Audio settings serialization/deserialization with corrupt/missing localStorage → safe defaults.
  - HUD layout math (top-right anchor given a viewport size) as a pure function so it's unit-testable.
  - Touch-input → virtual-input mapping (pressing the touch Jump sets the same input flag keyboard would).
- **Playwright (E2E, headless canvas):**
  - Boot the dev build, dispatch a click to unlock audio, assert the game canvas runs and HUD buttons are present (via exposed test hook on `window` reporting HUD/audio state — add a minimal `window.__GAME_TEST__` debug surface gated behind dev/test, not shipped to prod).
  - Click Pause → assert game scene reports paused; click Resume → reports running.
  - Toggle Music → reload page → assert mute state restored from localStorage.
  - Emulate a touch viewport → assert touch controls exist; desktop viewport → assert they don't.
- **Manual (`npm run dev`):** verify the two buttons visually match the observed top-right layout; resize the window and confirm anchoring; pause/resume/restart; toggle music and reload; open Chrome DevTools device emulation to confirm touch controls and multi-touch.
- Requirement: `typecheck`, `lint`, and the full `test` suite must pass locally and in CI before opening the PR.

**Git Expectations**
- Create and work on branch `feat/phase-4-ui-audio` (branch from up-to-date `main`).
- Commit frequently with Conventional Commits, e.g. `feat(audio): AudioManager with Howler + persisted mute`, `feat(hud): top-right music/pause buttons`, `feat(ui): pause overlay freezing gameplay`, `feat(input): on-screen touch controls`, `test(audio): persistence + mute unit tests`, `chore(config): UI/audio config + types`.
- Keep each commit green (typecheck + lint + affected tests).
- When the full suite + build are green in CI, open a PR `feat/phase-4-ui-audio` → `main` with a summary and the verification checklist, then squash-merge.
- This phase delivers a player-facing milestone (controls + audio + pause): after merge, tag `v0.4.0-ui-audio`.

**Expected Outputs / Deliverables**
- New/modified files (paths adapt to discovered conventions):
  - `src/scenes/HudScene.ts`, `src/scenes/PauseScene.ts`
  - `src/managers/AudioManager.ts` (+ `src/systems/AudioBindings.ts` if used)
  - `src/ui/TouchControls.ts`
  - `src/config/uiConfig.ts`, `src/config/audioConfig.ts`
  - `src/types/` audio/input types (`SfxKey`, `AudioSettings`, virtual input)
  - `public/audio/` placeholder audio assets registered in config
  - Scene registration / Boot updates to launch HUD and wire the first-gesture unlock
  - Vitest specs for AudioManager, settings persistence, HUD layout math, touch→input mapping; Playwright specs for HUD/pause/persistence/touch
- A short report at `docs/reports/phase-4-report.md` summarising: what was built, key decisions (HUD as separate scene, audio gesture-unlock strategy, virtual-input abstraction, pause-freeze approach), how to test (commands + manual steps), placeholder-audio note (real audio in Phase 5), and any deviations from this prompt with rationale.

Implement this entire phase autonomously. Work step-by-step, validate after each step, commit frequently, do not break earlier phases, and produce the phase report. Do not ask for clarification — make sensible, documented decisions.
~~~

---

### Phase 5 — Content, Art Integration & Polish

*Run after Phase 4 (UI, HUD & Audio) is merged and green.*

~~~
**Role**
You are a senior Phaser 3 / TypeScript game engineer and technical artist embedded in a small AI-assisted studio. You own the "content and feel" milestone: wiring real pixel art into the existing systems, authoring the showcase level(s) in Tiled, and adding readable juice (particles, screen shake, hit-stop, transitions). You work autonomously, in small validated steps, and you never regress earlier phases.

**Context**
- Game: a 2D side-scrolling platformer (Super Mario / Celeste lineage), painterly pixel art, "floating sky islands" fantasy theme. Core loop: run right → jump across pits and between floating islands → collect orange 4-point star clusters (each shows a floating "+100" popup) → traverse stone-block stairs and wooden crates → stomp/avoid snails and slimes. Strong multi-layer parallax (sky gradient → distant blue mountains → mid-ground islands/trees/clouds → foreground terrain), waterfalls off islands, decorative red X-banners, warm golden light. HUD is minimal: only a Music (♪) toggle and a Pause (II) button, top-right. Reference clip is browser-run, ~29fps, no audio track.
- Stack (do not deviate): Phaser 3 (3.80+) with Arcade Physics, TypeScript (strict), Vite, Tiled (.tmj/JSON tilemaps) via Phaser's tilemap API, Howler.js or Phaser Sound behind an AudioManager, Vitest (unit) + Playwright (E2E), ESLint + Prettier, GitHub Actions CI, static HTML5 delivery.
- Repo state you inherit (must keep working): Phases 0–4 are merged. That means you ALREADY have: a scaffolded Vite+TS+Phaser project with CI and an asset/Tiled pipeline (Phase 0); a tunable hero controller with a state machine for idle/run/jump/fall/land, momentum, air control, and a smoothed lerp follow camera (Phase 1); core gameplay systems — stars+score, breakable/standable crates, snail+slime enemies with stomp/avoid, pit death + hit/respawn, and a `GameManager` owning run state (Phase 2); a data-driven level pipeline — Tiled map loading, multi-layer parallax, floating islands, camera bounds, object spawning from map, and level/checkpoint flow (Phase 3); the minimal HUD (♪ + II), pause overlay, `AudioManager` with persisted mute, and mobile touch controls (Phase 4). Before writing code, READ the existing source to learn the actual class names, file paths, scene keys, animation-key conventions, the hero state machine API, the level/object-spawning contract, and the parallax layer config. Adapt to what you find; the names below are expected conventions, not licence to rewrite existing systems.
- This phase is about replacing placeholders with real art and adding feel. It does NOT introduce new gameplay mechanics, and it does NOT do final perf/mobile/deploy work (that is Phase 6).

**Objectives**
- Replace all placeholder graphics with cohesive, real pixel art: hero atlas (idle/run/jump/fall/land), tileset(s), props (stars, crates, stone blocks, red X-banners), enemies (snail, slime), waterfalls, and layered parallax background art.
- Wire the hero texture atlas + animations to the EXISTING hero state machine so animations transition correctly with movement, including animation events (footstep dust on run frames, land dust on land).
- Add particle FX: star-collect sparkle, crate-splinter burst, run/land dust, enemy-defeat puff — present but readable, never obscuring the hero or hazards.
- Add screen shake + brief hit-stop on impactful events (enemy stomp, crate break, hard land, hero hit), tuned subtly.
- Style the floating "+100" score popup (font, color, motion, fade) to match the reference look.
- Add level intro/outro and fade transitions between scenes/levels.
- Author one fully decorated showcase level that reads like the reference clip, plus 1–2 more complete levels, all data-driven via Tiled.
- Do a feel/tuning pass on movement + camera now that real art is in, keeping a stable framerate.

**Constraints (hard rules)**
- Do NOT break existing systems or tests. All Phase 0–4 behaviour and passing tests must remain green. If you must change a public method/contract, update all call sites and tests in the same commit and note it in the report.
- Keep TypeScript `strict` with zero type errors and ESLint/Prettier clean. No `any` unless justified with a comment.
- Stay strictly within the chosen stack. No new engine, no new physics, no heavy new runtime deps. Particles, shake, and tweens use Phaser's built-in APIs. A small, well-justified dev-only tool (e.g. an atlas packer) is allowed if added to devDependencies and documented.
- Data-driven over hard-coded: level content lives in Tiled `.tmj` + tileset JSON/atlases under the established assets dir; tuning values live in the existing config/constants module, not scattered as magic numbers. Animation definitions belong in a central animation-registry, not inline in scenes.
- Match the established folder architecture and naming. Discover it first; do not invent a parallel structure.
- Juice must not hurt readability: cap particle counts, keep shake amplitude/duration small, and keep hit-stop ≤ ~80ms. Provide a single place to globally scale/disable FX (an FX config flag).
- Respect prior systems: the HUD stays minimal (♪ + II only — do NOT add a visible score/lives/timer HUD in this phase); audio goes through the existing `AudioManager`; new SFX hooks (star, crate, stomp, land, hit) call existing AudioManager methods (add methods if missing, behind the same interface).
- Work autonomously. Ask nothing. Make sensible, documented decisions and record them in the report.
- Small, frequent, conventional commits.

**Implementation Steps** (numbered, ordered — validate after each)
1. **Branch + baseline.** `git checkout main`, pull, then `git checkout -b feat/phase-5-content-polish`. Run `npm ci`, then `npm run typecheck && npm run lint && npm test && npm run build` to confirm a green inherited baseline. Record the baseline in your notes. Then READ the repo: locate the hero class + state machine, the animation conventions, the AudioManager interface, the level/Tiled loading code, the parallax layer config, the GameManager, and the config/constants module. Write down the actual paths/keys you will integrate with.
2. **Asset acquisition & licensing.** Source or generate cohesive painterly sky-islands pixel art (hero, tiles, props, enemies, parallax, waterfalls). Prefer CC0/permissive sets (e.g. Kenney-style) or AI-generated sprites you produce; record every asset's source + licence in `assets/CREDITS.md`. Normalise to the project's tile size (discover it; commonly 16 or 32 px). Place raw art under the established assets dir (e.g. `assets/art/...`) and packed atlases under the loaded-assets dir.
3. **Atlas + load pipeline.** Pack the hero frames (idle/run/jump/fall/land) into a texture atlas (`hero.png` + `hero.json`, Phaser/JSONHash or JSONArray format). If a packer is needed, add a dev-only script (e.g. `scripts/pack-atlas.*` wired to an `npm run assets` script) and document it. Update the preloader/boot scene to load the atlas, tileset images, prop/enemy atlases, parallax layers, and waterfall frames using the EXISTING asset-manifest/preload pattern — do not bypass it.
4. **Central animation registry.** Create/extend a single animation registry (e.g. `src/anims/AnimationRegistry.ts` or the existing equivalent) that defines all `this.anims.create(...)` calls (hero idle/run/jump/fall/land; enemy walk/defeat; star idle/collect; crate idle/break; waterfall loop; banner sway). Call it once at boot. Reuse the hero state machine's existing animation-key names so no state-machine logic changes — only the frames/atlas behind the keys change.
5. **Hero animation wiring + events.** Point the hero state machine's animation keys at the new atlas. Add Phaser animation frame events (`anim.on('animationupdate'...)` or per-frame callbacks) so specific run frames emit a footstep-dust event and the land state emits a land-dust event. Ensure transitions (idle↔run↔jump↔fall↔land) still match the controller's existing state changes; do not alter movement physics yet.
6. **Tileset + autotiling in Tiled.** Build the grass-topped dirt ground tileset and grey cobblestone (dark/purple grout) stone tileset as Tiled tilesets with terrain/autotiling (Wang/terrain sets) so ground bands, stone stairs (2–3 high), and towers autotile cleanly. Export tileset JSON/atlas into the assets dir. Confirm the existing tilemap loader renders them via the same layer pipeline.
7. **Prop, enemy, waterfall, banner sprites.** Replace placeholder star, crate, stone-block, red X-banner, snail, slime, and waterfall graphics with the new art, wiring each to its animation-registry keys. Keep each object's EXISTING gameplay component/spawn-from-map contract intact (stars still +100 and emit the popup; crates still break/stand; enemies still stomp/avoid; banners stay decorative; waterfalls are decorative/animated). Add the waterfall as an animated sprite or tiled flow on island edges.
8. **Layered parallax art.** Swap parallax placeholders for real layered art in back→front order: sky gradient → distant blue mountains → mid-ground floating islands + trees (autumn-pink + green) + clouds → foreground terrain. Feed these into the EXISTING parallax config (scroll factors per layer); add gentle drift/animation (slow cloud scroll, subtle foliage/water motion) only if it stays performant. Add the warm golden atmospheric tint via a lightweight overlay or layer tint, not a heavy postFX.
9. **Particle FX system.** Add a thin `src/fx/ParticleManager.ts` (or extend an existing effects helper) exposing `starSparkle(x,y)`, `crateSplinters(x,y)`, `dust(x,y, kind: 'run'|'land')`, `defeatPuff(x,y)`. Use Phaser 3.60+ particle emitters with capped `quantity`/`lifespan`. Hook these into: star collect, crate break, hero run-frame + land events (step 5), and enemy defeat. Gate all of it behind an `FX_ENABLED` / `fxScale` flag in the config/constants module.
10. **Screen shake + hit-stop.** Add `src/fx/ScreenFx.ts` (or extend ScreenFx/CameraFx) with `shake(intensity, durationMs)` (wrapping `camera.shake`) and `hitStop(durationMs)` (briefly set `physics.world.isPaused`/timescale or a manual freeze, ≤ ~80ms, then resume — be careful not to deadlock the game loop or tweens). Trigger small shake + hit-stop on: enemy stomp, crate break, hard land (only above a fall-speed threshold), and hero hit. All amplitudes/durations come from config; respect the FX flag.
11. **"+100" popup styling.** Restyle the existing score popup: a crisp bitmap/pixel-friendly font, warm/white outline color, rise-and-fade tween (~600–800ms), slight scale-in. Keep it pooled if the existing system pools it; do not let it block input or overlap the HUD.
12. **Scene transitions.** Add reusable fade transitions: a `fadeOut`/`fadeIn` helper (e.g. `src/scenes/transitions.ts` or extend the scene-flow util) using `camera.fadeOut/fadeIn`. Add a short level intro (level name/title card fade-in then out) and an outro (fade-out → next level or results) wired into the EXISTING level/checkpoint flow — do not invent a new scene manager if one exists.
13. **Showcase level authoring.** Author `assets/levels/level-01.tmj` (the showcase) to read like the reference clip: continuous grass ground band with pits, stone stairs/towers, floating grassy islands with trees + waterfalls, star arcs/clusters over jumps, crates as platforms/breakables, snails + slimes on ground and islands, decorative red X-banners, multi-layer parallax. Use object layers for spawns matching the Phase 3 spawn contract. Set proper camera/world bounds.
14. **Additional levels.** Author `level-02.tmj` and (scope-permitting) `level-03.tmj` as complete, beatable levels reusing the same tilesets/objects with varied layouts (more verticality / more islands). Register them in the existing level list/flow so the outro of one leads into the next. Keep level count to 2–3 total — do not scope-creep beyond 3.
15. **Feel/tuning pass.** With real art in, retune (in the config/constants module only): hero accel/decel/air-control, jump height/gravity to keep the ~2-tile parabola, camera lerp + deadzone/offset so the hero sits center/left-of-center, and FX intensities. Verify a clean ~29–60fps locally with all art and FX active (full optimization is Phase 6, but flag any obvious frame drops in the report).
16. **Cleanup.** Remove now-unused placeholder assets and dead code paths. Ensure no orphaned imports. Re-run the full gate.

**Verification Checklist** (maps to Success criteria — every item must be tickable)
- [ ] Showcase `level-01` visually reads like the reference clip: layered parallax sky-islands, painterly grass/stone tiles, star arcs, stand-on/breakable crates, snails + slimes, waterfalls, red X-banners, warm light.
- [ ] Hero animations (idle/run/jump/fall/land) play from the real atlas and transition correctly with the existing state machine — no wrong-state frames, no stuck animations.
- [ ] Run/land emit footstep + land dust at the right frames; star/crate/stomp emit their FX.
- [ ] Particles, screen shake, and hit-stop are present but readable; hero and hazards never get obscured; hit-stop ≤ ~80ms; everything respects the global FX flag (disabling it removes all juice cleanly).
- [ ] "+100" popups are restyled, rise-and-fade correctly, and never overlap the HUD.
- [ ] Level intro/outro + fade transitions work; finishing a level leads to the next.
- [ ] ≥ 2 levels are complete and beatable start → finish via Tiled data (no hard-coded level geometry).
- [ ] HUD remains minimal (♪ + II only); audio still works through the AudioManager with new SFX hooks; mute persists.
- [ ] Stable framerate locally with all art + FX active; no obvious GC stutter from particles.
- [ ] `npm run typecheck && npm run lint && npm test && npm run build` all pass; all Phase 0–4 tests still green.

**Testing Expectations**
- Unit (Vitest): test the animation registry produces the expected animation keys/frame configs; test the FX config flag gates particles/shake (e.g. with `FX_ENABLED=false`, FX helpers no-op); test `hitStop` resumes physics within the configured window and never leaves the world paused; test the "+100" popup tween config/duration; test any new AudioManager SFX methods are callable and respect mute. Keep these logic/headless — mock Phaser objects where needed, following the existing test patterns.
- E2E (Playwright): extend the canvas smoke test to boot the game, load `level-01`, and assert the canvas renders without console errors; assert a fade transition occurs on level start; if a debug/score hook is exposed, assert collecting a star increments score (do not add a visible HUD just to test). Keep tests deterministic (seeded/forced state where possible).
- Manual via `npm run dev`: play `level-01` start→finish — confirm parallax, animations, FX, shake/hit-stop, popups, transitions, and that level-02 loads after. Toggle the FX flag off and confirm juice disappears cleanly. Toggle ♪ mute and confirm it persists across reload.
- Gate: `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` must all pass before opening the PR.

**Git Expectations**
- Work on `feat/phase-5-content-polish`. Do not commit to `main`.
- Commit frequently with conventional-commit messages, e.g. `feat(anim): central animation registry + hero atlas wiring`, `feat(fx): particle manager (sparkle/dust/splinters/puff)`, `feat(fx): screen shake + hit-stop`, `feat(level): showcase level-01 (sky-islands)`, `feat(level): level-02 + scene transitions`, `chore(assets): add CC0 sky-islands art + CREDITS`, `refactor(tune): feel pass after art integration`.
- Keep each commit green where practical (typecheck/lint at minimum).
- When the full gate is green, open a PR to `main` with a summary, screenshots/GIFs of the showcase level if capturable, and the verification checklist. Squash-merge when green.
- This is a playable content milestone: after merge, tag it (e.g. `v0.5.0-content`) and note it in the report.

**Expected Outputs / Deliverables**
- Real pixel art integrated: hero atlas (`hero.png`/`hero.json`), grass + stone tilesets, prop/enemy atlases, parallax layers, waterfall frames — all loaded via the existing preload pipeline; `assets/CREDITS.md` with sources + licences.
- Central animation registry wired to the existing hero state machine and all animated objects.
- `ParticleManager` and `ScreenFx` (particles, shake, hit-stop) gated by a global FX config flag; restyled "+100" popup.
- Scene fade transitions + level intro/outro wired into the existing level flow.
- `assets/levels/level-01.tmj` (showcase) plus `level-02.tmj` (and optionally `level-03.tmj`), registered in the level flow, fully beatable.
- A feel/tuning pass committed in the config/constants module.
- New Vitest + Playwright tests; full gate green.
- A report at `docs/reports/phase-5-report.md` summarising: what was built, the art sources/licences and atlas pipeline, key tuning/FX decisions and final values, how to test (commands + manual steps), any public-API changes with call-site updates, deviations from this plan, and known issues / perf flags to address in Phase 6.

Implement this entire phase autonomously. Work step-by-step, validate after each step, commit frequently, do not break earlier phases, and produce the phase report. Do not ask for clarification — make sensible, documented decisions.
~~~

---

### Phase 6 — Optimization, Mobile & Deployment

*Run after Phase 5 is merged and green — this is the final, ship-it phase that turns the fully-polished playable level into a production-deployed static web build.*

~~~text
**Role**
You are a senior performance-and-release engineer for a small AI-assisted game studio. You specialise in WebGL/Canvas performance profiling, responsive HTML5 game scaling, mobile-web QA, and static-site CI/CD delivery. You write strict, lint-clean TypeScript and you treat performance budgets and release checklists as hard contracts, not aspirations.

**Context**
The game is a 2D side-scrolling platformer (Super Mario / Celeste lineage) with painterly pixel-art "floating sky islands": the hero runs right, jumps across pits and floating islands, collects orange +100 star clusters, and passes snails/slimes; HUD is minimal (top-right Music ♪ toggle + Pause II). It is browser-run.

Exact stack (do NOT deviate): Phaser 3 (3.80+) with Arcade Physics, TypeScript (strict), Vite bundler/dev server, Tiled (.tmj/JSON) tilemaps via Phaser's tilemap API, Howler.js (or Phaser Sound) behind an AudioManager, Vitest (unit) + Playwright (E2E/canvas smoke), ESLint + Prettier, GitHub Actions CI. Delivery is a static HTML5 bundle.

Repo state you inherit (Phases 0–5 are DONE, merged, green — do NOT redo or break them):
- Phase 0: Vite+TS+Phaser scaffold, tooling, CI (typecheck + test + build), asset/Tiled pipeline, runnable canvas.
- Phase 1: hero controller (run/jump/fall/idle/land), arcade physics with momentum + air control, smoothed follow camera.
- Phase 2: stars+score, wooden crates, snail/slime enemies (stomp/avoid), pit death, hit/respawn, a `GameManager` owning run state.
- Phase 3: data-driven level pipeline — Tiled map loading, multi-layer parallax background, floating islands, camera bounds, object spawning from map, level/checkpoint flow.
- Phase 4: minimal HUD (Music ♪ + Pause II), pause overlay, `AudioManager` (looping BGM + SFX, persisted mute), mobile touch controls.
- Phase 5: real pixel-art integrated (hero anims, tilesets, props, parallax), full playable level(s), juice/feel polish (particles, screen shake, transitions, tuning).

Before writing any code, run the project and read the existing source tree to learn the ACTUAL folder architecture, class names, manager singletons, asset locations, and the Phaser `Scale` / `Game` config already in place. Match what exists exactly. Everything below must integrate with the real code, not a guessed structure.

**Objectives**
- Hit and continuously verify a performance budget: sustained 60 fps on desktop and on a mid-range phone (emulated) playing the full level, with a bounded draw-call / texture / bundle profile.
- Pack textures into atlases; pool stars, particles, enemies and any other churning objects; cull off-screen entities; audit and reduce draw calls and texture binds.
- Make the game responsive: a robust Scale Manager config (FIT + letterbox) that looks correct across the observed ~16:9 desktop ratio and phone portrait AND landscape, with no scaling/art artifacts and correctly mapped input.
- Add a proper preloading + loading screen covering all atlases/audio/maps.
- Optimise the production build: minify, tree-shake, content-hash assets, emit gzip + brotli, and split/trim vendor chunks.
- Audit save/settings persistence (mute, best score, checkpoint/progress) so it round-trips reliably and degrades gracefully when storage is unavailable.
- Produce a cross-browser + mobile QA matrix and run automated smoke checks against it.
- Ship a one-command production static build that deploys to a static host (Vercel and/or itch.io) via a CI deploy step.
- Optionally add a Capacitor wrapper for Android/iOS (guarded behind its own npm script; do not let it block the web release).
- Complete a documented release checklist and a final phase report.

**Constraints**
- Do NOT break any existing system, scene, manager, or test. All Phase 0–5 behaviour must remain identical (gameplay feel, scoring, audio, HUD, touch controls, level flow).
- Keep TypeScript in `strict` mode with zero errors; keep ESLint + Prettier clean (no new warnings).
- Stay strictly within the chosen stack. No new engine, no React, no alternative bundler. New runtime deps limited to what this phase genuinely needs (e.g. a texture-packer dev tool, optional `vite-plugin-compression`, optional `@capacitor/*`). Prefer dev-deps and build-time tooling over runtime bloat.
- Data-driven over hard-coded: performance budgets, QA matrix, and scale settings live in config/constants files or docs, not scattered magic numbers.
- Object pools and culling must be behaviour-preserving — no gameplay regressions (a pooled star/enemy must behave exactly like a freshly-created one).
- Small, frequent commits with conventional-commit messages. Match the established folder architecture and naming conventions exactly.
- Work fully autonomously. Make sensible, documented decisions; do NOT pause to ask questions.

**Implementation Steps**
1. **Branch + baseline.** Create and switch to `feat/phase-6-optimize-deploy` off the latest `main`. Run `npm install`, then `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, and `npm run dev` to confirm a green inherited baseline. Record the baseline production bundle size (`dist` byte size + per-chunk breakdown) — you will compare against it.
2. **Performance instrumentation.** Add a dev-only perf overlay/utility (e.g. `src/debug/PerfMonitor.ts`) that, when enabled via a query param or `import.meta.env.DEV` flag, displays FPS, frame time, active GameObject count, and (via `this.game.renderer`) draw-call / texture-bind counts. Wire it so it is fully stripped/no-op in production. Use it to capture a "before" profile on the full level.
3. **Define the budget (data-driven).** Create `docs/perf-budget.md` and a small `src/config/PerfBudget.ts` (or extend the existing constants module) defining the hard targets: target 60 fps (≤16.6 ms frame), max simultaneous draw calls, max texture memory, and a JS bundle size ceiling (gzipped). Reference these numbers in tests and the report.
4. **Texture atlases.** Add a texture-packing step (e.g. `free-tex-packer-cli` or `@texture-packer` style tool as a dev dependency, or an npm script). Pack hero anims, props, stars, enemies, and UI into one or a few atlases (`.png` + `.json`) under the existing assets dir. Update the Preloader to load atlases instead of loose frames, and update sprite/animation creation to reference atlas frame names. Verify animations are pixel-identical. Add an npm script `pack:atlas` and document it.
5. **Object pooling.** Introduce/extend a generic pool (e.g. `src/systems/ObjectPool.ts` or a Phaser `Group` with `maxSize` + `createCallback`) for the high-churn entities: star collectibles, score `+100` popups, all particle emitters, enemy projectiles/respawns, and crate-break debris. Convert spawn/despawn sites to `get()`/`kill()`/`setActive(false).setVisible(false)` instead of `new`/`destroy`. Ensure pooled objects fully reset their state (physics body, tween, alpha, frame) on reuse. Add a Vitest unit test proving reuse and state reset.
6. **Culling.** Ensure off-screen entities stop updating/rendering: enable `cullPadding` / `setVisible` gating driven by the camera world view, deactivate physics on far entities, and rely on Phaser's built-in culling for tilemap layers (`skipCull` off, set layer cull padding). Confirm via the perf overlay that active-object count drops sharply when entities leave the viewport.
7. **Draw-call / texture audit.** Using the perf overlay, reduce texture binds: confirm parallax/background and tiles share atlases/tilesets, batch same-texture sprites, and avoid per-frame texture swaps. Document the before/after draw-call and texture-bind numbers in the report.
8. **Responsive Scale Manager.** Update the Phaser `Game` config `scale` block (in the existing game bootstrap file) to `mode: Phaser.Scale.FIT`, `autoCenter: Phaser.Scale.CENTER_BOTH`, with a fixed design resolution (use the observed ~16:9, e.g. 1280x720 or the existing design size) and letterboxing. Handle `resize`/`orientationchange`: re-layout the HUD (Music ♪ + Pause II stay pinned top-right) and touch controls for BOTH portrait and landscape. Verify input coordinates map correctly after scaling (pointer hit areas on HUD/touch buttons). Put scale/design constants in `src/config/` (data-driven), not inline.
9. **Loading screen.** In the existing Preloader/Boot scene, add a visible loading screen (progress bar + game title/logo) driven by Phaser's `load` progress events (`this.load.on('progress'|'complete')`) covering all atlases, audio, and Tiled maps. Ensure first meaningful paint happens before heavy assets finish, and that the loading screen scales correctly under the new Scale config.
10. **Build optimisation.** Tune `vite.config.ts`: ensure production minification (esbuild/terser), tree-shaking, content-hashed asset filenames, and sensible `build.rollupOptions.output.manualChunks` to split the Phaser vendor chunk. Add gzip + brotli emission (e.g. `vite-plugin-compression` as a dev dep) and set `base` correctly for the chosen host (relative base for itch.io zip hosting). Re-measure bundle size vs the baseline and assert it is within the budget from step 3.
11. **Save/settings persistence audit.** Review the existing persistence (mute from Phase 4, plus best score / checkpoint / progress). Centralise it behind a `src/systems/SaveManager.ts` (or audit the existing one): namespaced `localStorage` keys, schema version, safe JSON parse with try/catch, and graceful degradation (in-memory fallback) when `localStorage` is unavailable (private mode / iOS quirks). Add a Vitest test for round-trip + corrupted-data recovery.
12. **Mobile hardening.** Address iOS Safari quirks: unlock/resume the WebAudio context on first touch/pointer (verify the AudioManager does this; add if missing), prevent default touch scrolling/zoom on the canvas (`touch-action: none`, viewport meta `user-scalable=no`), and confirm touch controls work in both orientations. Cap device pixel ratio for fill-rate on low-end GPUs (e.g. clamp `resolution`/DPR) and provide a low-quality toggle that reduces particle counts / parallax layers if fps drops (data-driven thresholds).
13. **QA matrix.** Create `docs/qa-matrix.md` listing target browsers (Chrome, Firefox, Safari/desktop, Edge) and mobile targets (iOS Safari, Android Chrome) with pass/fail columns for: boot, full-level playthrough, audio toggle + resume, pause, touch controls, scaling in portrait+landscape, persistence. Note which were verified automatically (Playwright/emulated) vs manual/inferred.
14. **CI deploy step.** Extend `.github/workflows/` so that on push to `main` (or on tag) the pipeline runs typecheck + lint + test + build and then deploys the static `dist` to the chosen host. For Vercel, add a deploy job (e.g. using the Vercel CLI/action with project + token secrets referenced but not committed) and/or produce an itch.io-ready zip artifact (`butler push` step or uploaded artifact). Document required secrets in the report; do NOT commit any secret values.
15. **Optional Capacitor wrapper.** Behind isolated npm scripts (`cap:add`, `cap:sync`, `cap:android`, `cap:ios`) and an optional `capacitor.config.ts`, scaffold a Capacitor wrapper pointing at the static build, without making it part of the default web build or CI gate. If platform SDK builds aren't possible in this environment, scaffold + document the exact steps and mark them as not-fully-verified. This step must never block the web release.
16. **Release checklist.** Create `docs/release-checklist.md`: a tickable list covering version bump, all tests green, budget met, QA matrix complete, build reproducible, deploy succeeds, assets cache-busted, no console errors, audio/touch verified on mobile, and rollback note.

**Verification Checklist**
- [ ] `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` all pass with zero errors/new warnings.
- [ ] Perf overlay shows sustained ~60 fps (≥58 fps avg, ≤16.6 ms frame) on desktop playing the full level; active-object count drops when entities leave the viewport (culling proven).
- [ ] Mid-range phone (emulated/CPU-throttled in DevTools or Playwright) holds the fps target through a full-level playthrough; DPR is clamped on mobile.
- [ ] Draw-call and texture-bind counts measurably reduced vs the recorded baseline (numbers in the report); textures consolidated into atlas(es).
- [ ] All churning entities (stars, +100 popups, particles, enemies, debris) are pooled, not `new`/`destroy` per spawn, with proven state reset.
- [ ] Game renders correctly with FIT/letterbox at ~16:9, phone portrait, and phone landscape; HUD pinned top-right and touch controls usable in both orientations; pointer input maps correctly after scaling.
- [ ] Loading screen with progress bar covers all assets and scales correctly.
- [ ] Production bundle is minified, tree-shaken, content-hashed, gzip+brotli emitted, vendor chunk split, and within the documented size budget.
- [ ] Save/settings (mute, best score, checkpoint/progress) round-trip across reloads and degrade gracefully without `localStorage`.
- [ ] iOS audio context resumes on first interaction; canvas touch-action prevents scroll/zoom.
- [ ] One-command production build (`npm run build`) produces a working static `dist` that loads and plays when served locally.
- [ ] CI deploys the static build to the chosen host on merge/tag (or produces the deploy artifact); required secrets documented, none committed.
- [ ] QA matrix and release checklist are filled in; `docs/reports/phase-6-report.md` exists.

**Testing Expectations**
- Vitest (unit/logic): pool reuse + full state-reset test; `SaveManager` round-trip + corrupted/missing-data recovery + no-`localStorage` fallback test; a guard test asserting the configured bundle/budget constants exist and are sane. Do not regress existing Phase 0–5 unit tests.
- Playwright (E2E/canvas smoke): boot-to-playable smoke that asserts the canvas mounts and no console errors; a scaling smoke that loads the page at three viewports (1280x720, a portrait phone e.g. 390x844, a landscape phone e.g. 844x390) and asserts the canvas fills/letterboxes without overflow; an interaction smoke that toggles Music + Pause via the HUD buttons; optionally a CPU-throttled run sampling fps. Keep existing E2E green.
- Manual checks via `npm run dev`: play the full level watching the perf overlay; rotate the browser/devtools device emulator between portrait and landscape; toggle mute and reload to confirm persistence; verify loading screen on a throttled network; serve the production `dist` (e.g. `npm run preview`) and confirm it plays identically.
- Hard gate: typecheck + lint + all tests must pass locally and in CI before the PR is considered green.

**Git Expectations**
- Work on branch `feat/phase-6-optimize-deploy` (created from latest `main`).
- Commit frequently with conventional-commit messages (e.g. `perf: pack hero+props into texture atlas`, `feat: FIT scale manager with portrait/landscape HUD relayout`, `perf: pool stars and +100 popups`, `build: emit brotli+gzip and split vendor chunk`, `ci: add static deploy job`, `docs: add perf budget, qa matrix, release checklist`).
- When everything is green (typecheck + lint + tests + build + E2E), open a PR to `main` summarising the perf before/after, scaling, and deploy story, then squash-merge.
- This is the final shippable milestone: after merge, tag a release (e.g. `v1.0.0`) and note the deployed URL / artifact in the report.

**Expected Outputs / Deliverables**
- A green branch + merged PR delivering: texture atlas(es) + `pack:atlas` script; object pooling + culling; dev-only perf overlay; responsive FIT/letterbox Scale config with portrait+landscape HUD/touch relayout; loading screen; optimised Vite build (minify/tree-shake/hash/gzip+brotli/manualChunks); audited `SaveManager`; iOS/mobile hardening (audio resume, touch-action, DPR clamp, low-quality toggle); CI deploy step; optional Capacitor scaffold behind isolated scripts.
- Docs: `docs/perf-budget.md`, `docs/qa-matrix.md`, `docs/release-checklist.md`, and `src/config/PerfBudget.ts` (+ scale/design constants in `src/config/`).
- New tests: Vitest pool/save/budget tests + Playwright boot/scaling/interaction smoke tests, all green in CI.
- A working production `dist` that deploys as a static site, plus a documented deployed URL or downloadable itch.io artifact.
- `docs/reports/phase-6-report.md` summarising: what was built, the before/after perf numbers (fps, draw calls, bundle size) against the budget, the scaling/responsive approach, the deploy pipeline and required secrets, Capacitor status, the completed QA matrix + release checklist, and any deviations or known limitations.

Implement this entire phase autonomously. Work step-by-step, validate after each step, commit frequently, do not break earlier phases, and produce the phase report. Do not ask for clarification — make sensible, documented decisions.
~~~

---

## Part 5 — Final Verdict

This is a sober, build-it-for-real assessment of the game in `Game_example.webm` against the chosen Phaser 3 / TypeScript / Vite stack and the 7 canonical phases. The clip shows a 23.5s vertical slice; the verdict below treats it as the *appeal spec* and judges what it actually costs to reproduce and ship.

### 1. Difficulty Assessment

The honest truth about a 2D platformer is that the *engineering* is mostly solved problem-space — Phaser hands you tilemaps, AABB collision, and parallax for free. The hard parts are the ones that don't show up in a feature checklist: feel, art, and the long tail of "it works on my machine but stutters on a phone." Ranked by deceptive difficulty:

| Subsystem | Raw difficulty | Why it's harder/easier than it looks |
|---|---|---|
| **Game feel / character controller** (Phase 1) | **Deceptively HARD** | The clip's movement reads "floaty with notable air control and momentum" — that is *the* signature of the game and it is the single hardest thing to nail. It is not a feature you "implement"; it's 50-100 iterations on ~12 tuned constants (gravity, jump velocity, accel, decel, air-accel, max-fall, coyote-time, jump-buffer, apex-hang). Arcade Physics gives you a body; it does not give you Celeste-grade feel. This is where most clones die. |
| **Multi-layer parallax** (Phase 3/5) | **Deceptively MEDIUM-HARD** | The mechanic (scrollFactor < 1 per layer) is trivial — a junior can wire it in an hour. What is hard is making it *look like the clip*: 4-5 layers (sky → mountains → islands/trees/clouds → foreground) that tile seamlessly, with animated waterfalls and foliage, at the right scroll ratios so depth reads correctly. The difficulty is 90% art/tuning, 10% code. Seam artifacts and "wallpaper" repetition are the usual failure. |
| **Tiled pipeline** (Phase 0/3) | **MEDIUM** (front-loaded) | Phaser's Tiled JSON loader is mature, but the pipeline is fiddly: tileset GIDs, embedded vs external tilesets, object layers for spawns, collision via custom tile properties, and keeping the `.tmj` export settings consistent. Painful the *first* time, mechanical forever after. Get it wrong early and you rebuild levels twice. |
| **Mobile performance** (Phase 6) | **Deceptively HARD** | The art direction ("high-detail painterly pixel art, dense decoration, animated water/foliage, soft haze") is a fill-rate and texture-memory trap on mobile GPUs. Big parallax layers + many animated sprites + overdraw from haze/transparency is exactly what tanks frame-rate on a mid-range Android phone. Looks fine on a desktop dev machine; chugs in the field. Texture atlasing, layer culling, and resolution capping are non-negotiable and easy to defer until too late. |
| **Enemies (stomp/avoid)** (Phase 2) | **EASY-MEDIUM** | Patrol AI + stomp-detection (hero falling AND overlapping top of enemy) is a well-trodden ~1-day problem. The only subtlety is the stomp-vs-damage discrimination (velocity.y > 0 and feet above enemy mid-line). |
| **Stars + score + popups** (Phase 2) | **EASY** | Overlap → destroy → increment → tween a "+100" label. A few hours. |
| **Breakable crates** (Phase 2) | **EASY-MEDIUM** | Stand-on is free; "breakable" needs a hit-test + particle/swap. Cheap. |
| **HUD (♪ + II) + pause** (Phase 4) | **EASY** | Two buttons and a pause overlay. The *minimal* HUD observed is a gift — almost nothing to build. |
| **AudioManager + persisted mute** (Phase 4) | **EASY-MEDIUM** | Howler/Phaser Sound + localStorage flag. The only gotcha is the browser autoplay-unlock-on-first-input dance. |
| **Camera follow** (Phase 1) | **EASY** | Phaser's `startFollow` with lerp + `setBounds` is one line each. The smoothed follow in the clip is literally a built-in. |
| **Touch controls** (Phase 4/6) | **MEDIUM** | Virtual D-pad/jump is easy to draw, annoying to make *feel good* (dead-zones, multi-touch, jump-while-moving). Adds feel-tuning load on top of Phase 1. |

**One-line summary:** every box on the feature list is checkable in days; the *quality bar the clip sets* lives almost entirely in three deceptively hard places — feel, parallax-as-art, and mobile fill-rate.

### 2. Solo-Dev Feasibility

**Yes — this is realistically a one-(AI-assisted)-developer project, and arguably a textbook one for the chosen stack.** The deliberate decision to use Phaser/TS/Vite (all plain text files, no proprietary binary scene format) is the correct call precisely because it lets an AI agent read, edit, run, and headlessly test the whole project — something Unity/Godot binary scenes fight against. The code surface area for a single-level platformer is genuinely small.

**Skills required (code side):**
- Solid TypeScript and the Phaser 3 scene/object lifecycle.
- Comfort with arcade physics tuning and *game-feel intuition* — this is the rare skill; it's learnable but iteration-heavy.
- Tiled authoring (a half-day skill).
- Basic CI/build/deploy hygiene (the stack's Vitest/Playwright/GH-Actions/Vercel choices are all standard).

**Where it stops being feasible: art.** This is the unambiguous bottleneck. The clip is *not* generic placeholder pixel art — it is "high-detail painterly pixel art" with a cohesive MapleStory/sky-islands identity, animated waterfalls, autumn foliage, multi-layer parallax backplates, and a fully-animated hero (run/jump/rise/fall/land, ~24-32px). Producing that to the observed quality is a *specialist artist's* months of work, and AI codegen does not solve it:
- Code AI writes the controller in an afternoon. Asset-generation AI does **not** reliably produce *consistent, animation-frame-coherent, tileable* pixel art across an entire matching set (hero frames + tileset + props + 5 parallax layers in one art language). It produces pretty one-offs that don't cohere.
- A solo dev who is *not* a pixel artist will either spend 2-4x the code budget fighting art, or the game will look like a downgraded clone of the clip.

**Verdict:** Code-feasible solo with high confidence. **Art-feasible only if you (a) are also a competent pixel artist, (b) buy/license a matching asset pack, or (c) accept a visibly lower art ceiling.** The clip's *appeal is 60% art direction* — so "feasible" on code alone undersells the real risk.

### 3. Estimated Build Time

Estimates are in **person-days**, full-time-equivalent. "Experienced solo dev" = competent Phaser/TS dev, *not* a pixel artist (art sourced/bought). "AI-assisted solo dev" = same human, pairing aggressively with a coding agent for boilerplate, tests, and refactors. Two scopes:
- **MVP** = core-mechanics vertical slice (one short level, placeholder/single bought asset pack, desktop-web).
- **Polished** = the full shippable thing approximating the clip (real cohesive art, mobile, juice, CI/deploy).

| Phase | Experienced solo (MVP → Polished) | AI-assisted solo (MVP → Polished) | Notes |
|---|---|---|---|
| 0 — Setup & pre-production | 1 → 2 | 0.5 → 1 | AI scaffolds Vite/TS/Phaser/CI fast; mechanical work. |
| 1 — Movement prototype (feel) | 3 → 6 | 2 → 5 | **Iteration-bound, not code-bound.** AI writes the controller in hours; *tuning feel* is human-in-the-loop and barely accelerated. The long pole of the MVP. |
| 2 — Core gameplay systems | 3 → 6 | 1.5 → 4 | Stars/enemies/crates/respawn — AI excels here. |
| 3 — Level & world systems | 3 → 7 | 2 → 5 | Tiled pipeline + parallax wiring + spawning; level *design* time scales with content. |
| 4 — UI/HUD & audio + touch | 2 → 5 | 1 → 3 | Minimal HUD is cheap; touch-control feel and audio-unlock eat the polished budget. |
| 5 — Content, art integration & polish | 4 → 18+ | 3 → 16+ | **Dominated by art**, which AI barely helps with. Range explodes based on art sourcing. |
| 6 — Optimization, mobile & deploy | 2 → 7 | 1.5 → 5 | Mobile fill-rate hardening is the deceptive cost. Web deploy is trivial. |
| **TOTAL** | **~18 → ~51 days** | **~12 → ~39 days** | |

**Bottom-line numbers:**
- **Core-mechanics MVP (desktop, bought/placeholder art):** AI-assisted solo **≈ 2-3 weeks**; experienced solo **≈ 3.5-4 weeks**.
- **Polished, shippable, mobile-ready, clip-quality art:** **≈ 8-10 weeks AI-assisted, 10-12+ weeks** experienced solo — and the upper bound is **entirely** governed by where the art comes from. If you must produce bespoke art to match the clip, add **4-12 weeks** of dedicated art work that none of these code estimates capture.

AI assistance compresses roughly the *code* 30-40% but compresses *feel-tuning* and *art* very little — so its leverage shrinks exactly as you push toward "polished."

### 4. Major Technical Risks

Ranked by expected pain (likelihood × impact):

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| 1 | **Art is the hidden critical path.** Cohesive painterly pixel-art + hero anims + 5 parallax layers cannot be AI-generated to the clip's quality; bespoke art balloons the timeline. | **High** | **High** | Decide art strategy *in Phase 0*, not Phase 5. Buy a single cohesive licensed pack (e.g. itch.io sky-island/fantasy platformer kit) and design the game *around what the pack contains*. Treat custom art as a stretch goal. |
| 2 | **Game feel never reaches the clip's "floaty-but-controlled" target** and the game feels mushy or twitchy. | **High** | **High** | Expose all controller constants in a live debug panel (dat.GUI/Tweakpane) from day 1. Hard-cap feel iteration to a timebox. Reference-tune against the clip frame-by-frame (jump clears ~2 tiles, clean parabola). |
| 3 | **Mobile performance collapse** from overdraw (haze + transparency) and large parallax/atlas textures on mid-range Android. | **Medium-High** | **High** | Set a frame budget and test on a *real cheap phone* by Phase 3, not Phase 6. Atlas all sprites, cap render resolution, cull off-screen layers, avoid full-screen alpha haze on mobile (use a cheaper tint). |
| 4 | **Scope creep beyond the clip** (double-jump, slopes, more enemy types, multiple biomes) inflating everything. | **Medium-High** | **Medium** | Freeze MVP scope to *exactly what the clip shows* (see §5). Double-jump and slopes are explicitly **not** observed — do not add them. |
| 5 | **Tiled pipeline rework** — collision/spawn conventions chosen badly, forcing every level to be rebuilt. | **Medium** | **Medium** | Lock tile-property and object-layer conventions in Phase 0 with one throwaway test map before authoring real content. |
| 6 | **Browser audio autoplay-unlock** ships broken (BGM silent until a tap, mute state not persisted). | **Medium** | **Low-Med** | Standard "unlock on first user gesture" pattern in AudioManager; Playwright smoke test for the mute toggle + localStorage. |
| 7 | **Touch controls feel bad** (the only HUD is desktop-friendly; mobile needs added input). | **Medium** | **Medium** | Prototype virtual controls early if mobile is a real target; otherwise ship desktop-web first and treat mobile as Phase 6+. |
| 8 | **Capacitor mobile-wrap rabbit hole** (signing, store policies, WebView quirks) consuming time for little return. | **Low-Med** | **Medium** | Keep Capacitor strictly optional/post-launch. Web build is the product; native wrap is a distribution experiment, not a milestone. |

### 5. Recommended MVP Scope

The clip's appeal is a tight feedback triangle: **responsive jumping across pits → collecting +100 stars → a gorgeous scrolling sky-island world.** The MVP must capture *all three* in one short level and nothing more.

**INCLUDE (the vertical slice):**
- **One hero controller** with the floaty/air-control/momentum feel — run, idle, jump/rise, fall, land. *(Phase 1 — this is the heart of the MVP and gets the most iteration.)*
- **One short hand-built Tiled level** (~30-60s of play) with grass-ground band + pits, stone stair/block platforms, 2-3 floating islands. *(Phase 3)*
- **Smoothed follow camera + camera bounds.** *(Phase 1/3)*
- **Star collectibles with +100 popup and a score variable** (score can live only in GameManager — the clip shows no on-screen counter, so you may even omit the HUD number). *(Phase 2)*
- **One enemy type** (snail) with patrol + stomp + pit/hit death + respawn-at-checkpoint. *(Phase 2)*
- **Multi-layer parallax** (even if static art) — this is what makes it *look* like the clip and is non-negotiable for the appeal. *(Phase 3/5)*
- **Minimal HUD exactly as observed:** ♪ toggle + II pause, pause overlay, BGM loop + 3-4 SFX with persisted mute. *(Phase 4)*
- **One cohesive bought/borrowed art set** so the slice doesn't look like programmer art. *(Phase 5, sourced early per §4.)*

**EXCLUDE from MVP (defer or cut):**
- Double-jump, slopes (neither observed — adding them is scope invention).
- Breakable-crate *destruction* (ship crates as stand-on solids only; breaking is juice).
- Second enemy type, multiple levels, biomes, boss, goal-flag/end-screen (none clearly observed).
- Mobile/touch + Capacitor (desktop-web first).
- Particles, screen-shake, transitions beyond the bare minimum.
- Animated waterfalls/foliage as *real* animation (static or a cheap 2-frame loop is enough for MVP).

**MVP phase coverage:** 0 (full) → 1 (full, feel-focused) → 2 (subset: stars + one enemy + respawn) → 3 (one level + parallax) → 4 (HUD + audio only) → 5 (one bought art set, no custom polish) → 6 (web deploy only, no mobile). That is the smallest thing that still *reads as the clip*.

### 6. What to Simplify First if Resources Are Limited

An ordered cut-list — cut from the top until the budget fits. Each cut is paired with its honest gameplay/appeal cost.

| Order | Cut | Gameplay / appeal impact |
|---|---|---|
| 1 | **Drop Capacitor / native mobile entirely; ship web-only.** | **None to the game.** Pure distribution change. Always cut first. |
| 2 | **Buy/borrow a cohesive art pack instead of making custom art.** | **Low-Medium.** You lose perfect fidelity to *this exact* clip's look, but keep the painterly sky-island vibe and save weeks. Highest ROI cut. |
| 3 | **Drop breakable crates → crates are stand-on solids only.** | **Very low.** Crates still function as platforms (the observed primary use). You lose a minor break-for-particles moment. |
| 4 | **Single level, no checkpoint flow** (one screen-spanning level, respawn at start). | **Low.** The clip is a short demo loop anyway; one good level fully captures the appeal. |
| 5 | **Static parallax** (no animated waterfalls/foliage; layers scroll but don't self-animate). | **Low-Medium.** The depth/scroll effect — the part that sells "sky islands" — survives. You lose the "living world" shimmer, which is polish, not core. |
| 6 | **One enemy type only (snail), stomp + avoid, no slime.** | **Low.** Enemy *interaction* was never explicitly shown in the clip; a single patrolling stompable enemy fully delivers the threat layer. |
| 7 | **No score HUD number** (keep score internal; show only the +100 popups). | **Very low.** The clip itself shows no counter — popups alone communicate reward. |
| 8 | **Cut SFX to jump + collect only; keep BGM + mute.** | **Low-Medium.** Audio is inferred anyway. BGM + two SFX keep the loop satisfying; land/break/defeat SFX are nice-to-have. |
| 9 | **Defer juice** (screen-shake, particles, fancy transitions). | **Medium *if over-cut*.** Some juice (collect sparkle, jump squash) is cheap and disproportionately raises perceived quality — cut last, and only fully if truly out of time. |

**Do NOT cut, ever:** the character-controller feel (Phase 1) and *some* form of multi-layer parallax (Phase 3/5). Those two are *the* appeal of the clip — strip everything else before you touch them.

---

**Bottom line:** This is a well-scoped, genuinely shippable project for one AI-assisted developer, and the Phaser 3 / TypeScript / Vite stack is the right, defensible choice for both the browser-run target and an agent-driven workflow. The *code* is low-risk and AI-accelerable — a core-mechanics MVP is a realistic 2-3 week effort. The real project is not the code; it is two things AI barely helps with: **dialing in the floaty-but-precise game feel**, and **sourcing cohesive painterly pixel art**. Get the art strategy decided in Phase 0 (buy a pack), timebox feel-tuning with a live debug panel, test mobile performance on a real cheap phone long before Phase 6, and freeze scope to *exactly what the clip shows*. Do that, and a polished, deployable web build is an honest **8-10 week** solo effort. Treat art as an afterthought, and it becomes a 5-month one.

---

## Appendix — Method & Evidence

**How this analysis was produced**
- The clip was decoded with `ffprobe`/`ffmpeg`: 23.526 s, 1853×966, VP8, ~29.25 fps (117/4), single video stream, **no audio track** (so all audio notes are inferred).
- Frames were extracted at three densities: an **overview** set (3 fps, ~71 frames) for scene/loop structure, **full-resolution** frames (1 fps) for art and HUD detail, and a **12 fps burst** across a single jump to read the jump arc and air control. Targeted **nearest-neighbour zoom crops** were used to read the HUD buttons (♪ music toggle + II pause), the wooden X-crate, and the bottom overlay.
- The bottom-screen toolbar visible in some frames ("オプション" / "取り込む") was identified as a **Japanese screen-capture utility**, not part of the game.
- Provenance: the clip is embedded in an X/Twitter post whose Turkish caption references **"Opus 4.8"**, indicating an AI-assisted/AI-generated demo — which is why the roadmap optimises for an AI-assisted solo developer shipping to the web.

**Confidence notes**
- High confidence: genre, 2D side-scroller, parallax sky-islands theme, tile-based world, star collectibles (+100), wooden crates, snail/slime enemies, minimal two-button HUD, painterly pixel-art direction.
- Inferred (flagged throughout): exact jump tuning, double-jump (treated as single-jump), enemy interaction model (treated as Mario-style stomp), all audio, win/lose conditions, and session length.

_Forensic frames are retained under `frames/` (overview, full, burst) as supporting evidence and may be deleted once this document is reviewed._
