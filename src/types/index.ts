/**
 * Shared TypeScript types for Sky Islands.
 *
 * Intentionally minimal in Phase 0. Later phases extend this with the typed
 * event contract (GameEvents + payload map), entity definitions, and save data.
 */

/** A 2D vector in world space (pixels). */
export interface Vec2 {
  x: number;
  y: number;
}
