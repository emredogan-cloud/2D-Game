/**
 * Sky Islands — single source of truth for design constants.
 *
 * Every tunable game value lives here so game-feel is one diffable file.
 * Nothing else in the codebase should hard-code these numbers.
 *
 * Phase 1 calibrated the movement/feel block below against the reference
 * footage (floaty momentum, ~2-tile jump apex, strong air control).
 */
export const GAME = {
  // --- Rendering / world ---
  /** Fixed internal resolution; the canvas scales (FIT) to the viewport. */
  GAME_WIDTH: 1280,
  GAME_HEIGHT: 720,
  /** Square tile size for the orthogonal tilemap (matches Tiled). */
  TILE_SIZE: 32,
  /** Background clear colour (deep dusk blue). */
  BG_COLOR: "#1b2a4a",

  // --- Physics ---
  /** Downward gravity acceleration in px/s². Positive = down. Moderate = floaty. */
  GRAVITY_Y: 1400,

  // --- Hero movement (calibrated in Phase 1) ---
  /** Horizontal run top speed (px/s). */
  HERO_RUN_SPEED: 220,
  /** Ground acceleration toward top speed (px/s²) — visible ramp-up, not instant. */
  HERO_ACCEL: 1600,
  /** Passive drag decelerating toward 0 when there is no input (px/s²). */
  HERO_DRAG: 1200,
  /** Extra brake added to accel when reversing direction (snappy turnaround, px/s²). */
  HERO_RUN_DECEL: 1800,
  /**
   * Upward jump impulse (negative = up). Derived for a ~2.5-tile apex so the hero
   * comfortably lands on a 2-tile (64 px) block:
   *   apex h = v² / (2·g);  v = √(2·g·h)
   *   h = 2.5 × TILE_SIZE = 80 px,  g = 1400  →  v ≈ 473  →  -475
   * Resulting apex = 475² / (2·1400) ≈ 80.6 px ≈ 2.52 tiles (clears 64 px + ~16 px margin).
   * Time-to-apex ≈ 0.34 s; full airtime ≈ 0.68 s → ~150 px (~4.7 tile) horizontal reach
   * at run speed (clears a 4-tile pit).
   */
  HERO_JUMP_VELOCITY: -475,
  /** Terminal fall speed cap (px/s) — keeps the floaty descent controlled. */
  HERO_MAX_FALL_SPEED: 760,
  /** Velocity retained when the jump key is released while rising (variable jump height). */
  HERO_JUMP_CUT_MULTIPLIER: 0.45,
  /** Air-control authority multiplier vs ground (0..1): steering works, momentum persists. */
  HERO_AIR_CONTROL: 0.6,
  /** Grace window after leaving a ledge during which a jump still fires (ms). */
  HERO_COYOTE_MS: 90,
  /** Window before landing during which a jump press is buffered (ms). */
  HERO_JUMP_BUFFER_MS: 110,

  // --- Hero body / sprite (placeholder; real art arrives in Phase 5) ---
  /** Placeholder sprite texture size (px). */
  HERO_SPRITE_WIDTH: 24,
  HERO_SPRITE_HEIGHT: 32,
  /** Arcade physics body size (px), inset from the sprite to avoid catching tile seams. */
  HERO_BODY_WIDTH: 20,
  HERO_BODY_HEIGHT: 30,
  /** Horizontal speed below which the hero is considered "idle" rather than "run" (px/s). */
  HERO_RUN_EPSILON: 8,

  // --- Camera (smoothed dead-zone follow, hero biased left-of-centre) ---
  /** Lerp factor 0..1 toward the follow target each frame (lower = smoother/laggier). */
  CAMERA_LERP: 0.12,
  /** Dead-zone the hero can move within before the camera scrolls (px). */
  CAMERA_DEADZONE_W: 220,
  CAMERA_DEADZONE_H: 160,
  /** Follow offset (px). Negative X biases the hero left-of-centre (more space ahead). */
  CAMERA_OFFSET_X: -180,
  CAMERA_OFFSET_Y: 48,

  // --- Scoring (observed) ---
  /** Points awarded per star — observed "+100" popup in the reference clip. */
  STAR_SCORE_VALUE: 100,
} as const;

/** Compile-time type of the constants table. */
export type GameConstants = typeof GAME;
