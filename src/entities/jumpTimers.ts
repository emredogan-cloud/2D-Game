/**
 * Coyote-time and jump-buffer timers — PURE logic, no Phaser.
 *
 * Semantics:
 *  - **Coyote**: reset to full whenever grounded; otherwise counts down. Lets a
 *    jump fire for a short window after walking off a ledge.
 *  - **Buffer**: set to full on a fresh jump press; otherwise counts down. Lets a
 *    press shortly before landing still trigger a jump on touchdown.
 *  - A jump may be consumed when BOTH timers are > 0 (recently grounded AND a
 *    recent press). The caller then zeroes BOTH so a single airborne press cannot
 *    trigger a second jump — this is what enforces single-jump.
 */

/** Reset to full while grounded, else decrement by elapsed ms (floored at 0). */
export function updateCoyote(
  remainingMs: number,
  grounded: boolean,
  deltaMs: number,
  coyoteMs: number,
): number {
  if (grounded) return coyoteMs;
  return Math.max(0, remainingMs - deltaMs);
}

/** Set to full on a fresh jump press, else decrement by elapsed ms (floored at 0). */
export function updateBuffer(
  remainingMs: number,
  jumpPressed: boolean,
  deltaMs: number,
  bufferMs: number,
): number {
  if (jumpPressed) return bufferMs;
  return Math.max(0, remainingMs - deltaMs);
}

/** A jump is available when a recent press (buffer) coincides with recent grounding (coyote). */
export function canConsumeJump(coyoteRemainingMs: number, bufferRemainingMs: number): boolean {
  return coyoteRemainingMs > 0 && bufferRemainingMs > 0;
}
