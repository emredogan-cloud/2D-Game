import Phaser from "phaser";
import { LAYERS, TILE_PROPS } from "../config/tiledConventions";
import { parseSpawns, type LevelSpawns } from "./levelParse";
import type { TmjObject } from "../types/tiled";

/** The tileset `name` inside every level `.tmj`, and the preload image key. */
export const WORLD_TILESET_NAME = "world-tiles";
export const WORLD_TILESET_IMAGE_KEY = "world-tiles";

export interface LoadedLevel {
  map: Phaser.Tilemaps.Tilemap;
  layers: Record<string, Phaser.Tilemaps.TilemapLayer>;
  /** Fully-solid layers (ground / platforms / islands) for player+enemy colliders. */
  collisionLayers: Phaser.Tilemaps.TilemapLayer[];
  /** One-way layer (land on top, pass through from below), or null. */
  onewayLayer: Phaser.Tilemaps.TilemapLayer | null;
  spawns: LevelSpawns;
  widthPx: number;
  heightPx: number;
}

function hasProp(tile: Phaser.Tilemaps.Tile, key: string): boolean {
  const props = tile.properties as Record<string, unknown> | undefined;
  return props?.[key] === true;
}

/**
 * Load a Tiled `.tmj` into tile layers + parsed spawns. Builds collision from the
 * `collides` property and configures the one-way layer to collide only on its top
 * face (jump up through, land on top). All entity placement comes from the
 * `objects` layer via the pure {@link parseSpawns}; the loader hard-codes nothing.
 */
export function loadLevel(scene: Phaser.Scene, mapKey: string): LoadedLevel {
  const map = scene.make.tilemap({ key: mapKey });
  const tileset = map.addTilesetImage(WORLD_TILESET_NAME, WORLD_TILESET_IMAGE_KEY);
  if (!tileset) {
    throw new Error(`Tileset '${WORLD_TILESET_NAME}' could not be added for map '${mapKey}'.`);
  }

  const layers: Record<string, Phaser.Tilemaps.TilemapLayer> = {};
  const build = (name: string): Phaser.Tilemaps.TilemapLayer | null => {
    const layer = map.createLayer(name, tileset, 0, 0);
    if (layer) layers[name] = layer;
    return layer;
  };

  const ground = build(LAYERS.GROUND);
  const platforms = build(LAYERS.PLATFORMS);
  const islands = build(LAYERS.ISLANDS);
  const oneway = build(LAYERS.ONEWAY);
  build(LAYERS.DECORATION); // visual only

  const collisionLayers: Phaser.Tilemaps.TilemapLayer[] = [];
  for (const layer of [ground, platforms, islands]) {
    if (!layer) continue;
    layer.setCollisionByProperty({ [TILE_PROPS.COLLIDES]: true });
    collisionLayers.push(layer);
  }

  if (oneway) {
    oneway.setCollisionByProperty({ [TILE_PROPS.ONEWAY]: true });
    // One-way: collide only on the top face so the hero jumps up through and lands on top.
    oneway.forEachTile((tile) => {
      if (hasProp(tile, TILE_PROPS.ONEWAY)) {
        tile.setCollision(false, false, true, false);
      }
    });
  }

  const objectLayer = map.getObjectLayer(LAYERS.OBJECTS);
  const spawns = parseSpawns((objectLayer?.objects ?? []) as unknown as TmjObject[]);

  return {
    map,
    layers,
    collisionLayers,
    onewayLayer: oneway ?? null,
    spawns,
    widthPx: map.widthInPixels,
    heightPx: map.heightInPixels,
  };
}
