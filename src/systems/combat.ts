/**
 * Stomp-vs-damage discrimination — PURE logic, no Phaser, so the decision
 * boundary is unit-testable.
 */

export interface StompQuery {
  /** Hero vertical velocity (px/s, + = down). */
  heroVelocityY: number;
  /** Hero body bottom edge (world Y, px). */
  heroBottom: number;
  /**
   * The Y the hero's feet must be at or above for the contact to count as a
   * stomp: an enemy's vertical midline, or a crate's top edge.
   */
  targetY: number;
  /** Tolerance (px). */
  epsilon: number;
}

/**
 * True when the contact is a **stomp**: the hero is descending AND its feet are
 * at/above the target line (within epsilon). Otherwise it is a side/under hit
 * (→ damage). Deterministic; no hidden state.
 */
export function isStomp(q: StompQuery): boolean {
  return q.heroVelocityY > 0 && q.heroBottom <= q.targetY + q.epsilon;
}
