/**
 * Player behaviour/animation state machine — PURE logic, no Phaser.
 *
 * The controller computes physical facts each frame (grounded, velocity, input)
 * and asks this function for the next state, so all transition logic is total and
 * unit-testable without a live scene.
 */

export type PlayerState = "idle" | "run" | "jump" | "fall" | "land";

export const ALL_PLAYER_STATES: readonly PlayerState[] = ["idle", "run", "jump", "fall", "land"];

export interface PlayerStateInputs {
  /** Hero is standing on a solid surface this frame. */
  grounded: boolean;
  /** Vertical velocity (px/s, + = down). */
  vy: number;
  /** Player is holding left/right this frame. */
  hasHorizontalInput: boolean;
  /** Absolute horizontal speed (px/s). */
  speedX: number;
  /** A jump impulse was actually applied THIS frame (controller already enforced single-jump). */
  jumpStarted: boolean;
  /** Speed below which grounded movement reads as idle rather than run. */
  runEpsilon: number;
}

/** Resolve the grounded resting state from horizontal motion/input. */
function groundedRest(i: PlayerStateInputs): PlayerState {
  return i.hasHorizontalInput || i.speedX > i.runEpsilon ? "run" : "idle";
}

/**
 * Pure transition function — total over all states/inputs.
 *
 * Single-jump is guaranteed upstream: `jumpStarted` is only true when the
 * controller permitted a jump (grounded or within coyote time), so an airborne
 * press without coyote can never re-enter the `jump` state.
 */
export function nextPlayerState(current: PlayerState, i: PlayerStateInputs): PlayerState {
  // A freshly-applied jump impulse always wins.
  if (i.jumpStarted) return "jump";

  if (i.grounded) {
    // Landing frame: was airborne and just touched down.
    if (current === "jump" || current === "fall") return "land";
    // `land` is transient — resolve to the resting state on the next frame.
    return groundedRest(i);
  }

  // Airborne: rising vs falling by the sign of vy (apex = vy crossing to >= 0).
  return i.vy < 0 ? "jump" : "fall";
}
