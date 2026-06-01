/**
 * Projectile-motion helpers — PURE, no Phaser. Used to derive and verify the
 * jump tuning (the 2-tile apex requirement) headlessly in unit tests.
 */

/**
 * Peak height (px) reached by an upward impulse under constant gravity.
 * `h = v² / (2g)` — sign of `jumpVelocity` is irrelevant (magnitude squared).
 */
export function apexHeightPx(jumpVelocity: number, gravityY: number): number {
  if (gravityY <= 0) return Number.POSITIVE_INFINITY;
  return (jumpVelocity * jumpVelocity) / (2 * gravityY);
}

/** Peak jump height expressed in tiles. */
export function apexHeightTiles(jumpVelocity: number, gravityY: number, tileSize: number): number {
  return apexHeightPx(jumpVelocity, gravityY) / tileSize;
}

/** Time (seconds) from takeoff to apex for an upward impulse under gravity. */
export function timeToApexSeconds(jumpVelocity: number, gravityY: number): number {
  if (gravityY <= 0) return Number.POSITIVE_INFINITY;
  return Math.abs(jumpVelocity) / gravityY;
}
