/**
 * Ordered level list + progression helper. Adding a level = drop a `.tmj` in
 * `public/assets/levels/`, add its key here, and it is loaded/preloaded by key.
 */

export const LEVEL_ORDER = ["level-01", "level-02"] as const;

export type LevelKey = (typeof LEVEL_ORDER)[number];

export const FIRST_LEVEL: LevelKey = LEVEL_ORDER[0];

/** The next level key after `current`, or `null` if it is the last (or unknown). */
export function nextLevel(current: string): LevelKey | null {
  const index = (LEVEL_ORDER as readonly string[]).indexOf(current);
  if (index < 0 || index + 1 >= LEVEL_ORDER.length) return null;
  return LEVEL_ORDER[index + 1];
}

/** Type guard for a known level key. */
export function isLevelKey(value: string): value is LevelKey {
  return (LEVEL_ORDER as readonly string[]).includes(value);
}
