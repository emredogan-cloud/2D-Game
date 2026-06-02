import { GAME } from "./constants";

/**
 * Phase 2 gameplay tuning — the single source for gameplay numbers. (Movement
 * feel stays in `constants.ts`; the canonical star value also lives there as
 * `GAME.STAR_SCORE_VALUE` and is mirrored here.)
 */
export const GAMEPLAY = {
  /** Points awarded per star (mirrors the observed "+100"). */
  SCORE_PER_STAR: GAME.STAR_SCORE_VALUE,
  /** Lives at the start of a run. */
  STARTING_LIVES: 3,

  /** Upward velocity given to the hero after a successful stomp (px/s, negative = up). */
  STOMP_BOUNCE_VELOCITY: -360,
  /** Tolerance (px) for the "hero feet are above the target" stomp test. */
  STOMP_EPSILON: 8,

  /** Invulnerability window after taking damage (ms). */
  HURT_INVULN_MS: 1200,
  /** Control lockout after damage so knockback is not instantly cancelled (ms). */
  HURT_LOCKOUT_MS: 250,
  /** Knockback applied on damage (px/s). */
  HURT_KNOCKBACK_X: 170,
  HURT_KNOCKBACK_Y: -260,

  /** Enemy patrol speeds (px/s). */
  SNAIL_SPEED: 36,
  SLIME_SPEED: 64,

  /** Floating "+100" popup motion. */
  POPUP_RISE_PX: 34,
  POPUP_MS: 650,
} as const;

export type GameplayConfig = typeof GAMEPLAY;
