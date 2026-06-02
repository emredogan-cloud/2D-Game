/**
 * Single source of truth for Tiled map conventions — layer names, object types,
 * and custom property keys. Referenced by the loader, spawner, and the level
 * authoring guide so a new level needs only a `.tmj`, never code changes.
 */

/** Tile-layer and object-layer names (must match the `.tmj`). */
export const LAYERS = {
  GROUND: "ground",
  PLATFORMS: "platforms",
  ONEWAY: "oneway",
  ISLANDS: "islands",
  DECORATION: "decoration",
  OBJECTS: "objects",
} as const;

/** Per-tile custom properties used for collision. */
export const TILE_PROPS = {
  /** Solid collision on all sides. */
  COLLIDES: "collides",
  /** One-way (jump up through, land on top). */
  ONEWAY: "oneway",
} as const;

/** Object `type` values placed on the `objects` layer. */
export const OBJECT_TYPES = {
  PLAYER_START: "player_start",
  STAR: "star",
  CRATE: "crate",
  ENEMY: "enemy",
  CHECKPOINT: "checkpoint",
  GOAL: "goal",
} as const;

/** Per-object custom property keys. */
export const OBJECT_PROPS = {
  /** On an `enemy` object: which enemy to spawn. */
  ENEMY_TYPE: "enemyType",
  /** On a `crate` object: whether it is breakable. */
  BREAKABLE: "breakable",
} as const;

export const ENEMY_TYPES = {
  SNAIL: "snail",
  SLIME: "slime",
} as const;

export type EnemyType = (typeof ENEMY_TYPES)[keyof typeof ENEMY_TYPES];
