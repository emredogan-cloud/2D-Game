/**
 * Sky Islands — single source of truth for design constants.
 *
 * Every tunable game value lives here so game-feel is one diffable file.
 * Values marked `TUNE IN PHASE 1` are starting points derived from the
 * reference footage (floaty momentum, ~2-tile jump) and will be calibrated
 * once the movement prototype exists. Nothing else in the codebase should
 * hard-code these numbers.
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

  // --- Physics (TUNE IN PHASE 1) ---
  /** Downward gravity acceleration in px/s². Positive = down. */
  GRAVITY_Y: 1400,

  // --- Hero movement (TUNE IN PHASE 1) ---
  /** Horizontal run top speed (px/s). */
  HERO_RUN_SPEED: 220,
  /** Ground acceleration toward top speed (px/s²). */
  HERO_ACCEL: 1600,
  /** Passive horizontal drag when no input (px/s²). */
  HERO_DRAG: 1200,
  /** Active deceleration when reversing/stopping (px/s²). */
  HERO_RUN_DECEL: 1800,
  /** Upward jump impulse (negative = up). */
  HERO_JUMP_VELOCITY: -560,
  /** Air-control authority multiplier vs ground (0..1). */
  HERO_AIR_CONTROL: 0.6,
  /** Grace window after leaving a ledge during which a jump still fires (ms). */
  HERO_COYOTE_MS: 90,
  /** Window before landing during which a jump press is buffered (ms). */
  HERO_JUMP_BUFFER_MS: 110,

  // --- Scoring (observed) ---
  /** Points awarded per star — observed "+100" popup in the reference clip. */
  STAR_SCORE_VALUE: 100,
} as const;

/** Compile-time type of the constants table. */
export type GameConstants = typeof GAME;
