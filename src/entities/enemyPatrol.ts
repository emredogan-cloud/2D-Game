/**
 * Enemy patrol direction logic — PURE, no Phaser. The enemy computes physical
 * facts (walls, platform edge) and asks for the next direction.
 */

export type PatrolDirection = 1 | -1;

export interface PatrolContext {
  /** Blocked by a wall on the left. */
  blockedLeft: boolean;
  /** Blocked by a wall on the right. */
  blockedRight: boolean;
  /** No ground ahead in the current direction (a platform edge). */
  edgeAhead: boolean;
}

/** Flip direction at a wall or a platform edge; otherwise keep going. Deterministic. */
export function nextPatrolDirection(dir: PatrolDirection, ctx: PatrolContext): PatrolDirection {
  if (dir < 0 && (ctx.blockedLeft || ctx.edgeAhead)) return 1;
  if (dir > 0 && (ctx.blockedRight || ctx.edgeAhead)) return -1;
  return dir;
}
