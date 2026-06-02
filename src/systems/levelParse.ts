import {
  ENEMY_TYPES,
  OBJECT_PROPS,
  OBJECT_TYPES,
  type EnemyType,
} from "../config/tiledConventions";
import type { TmjMap, TmjObject } from "../types/tiled";

export interface Vec {
  x: number;
  y: number;
}
export interface CrateSpawn extends Vec {
  breakable: boolean;
}
export interface EnemySpawn extends Vec {
  type: EnemyType;
}

/** Typed spawns grouped from a Tiled object layer. */
export interface LevelSpawns {
  playerStart: Vec | null;
  stars: Vec[];
  crates: CrateSpawn[];
  enemies: EnemySpawn[];
  checkpoints: Vec[];
  goal: Vec | null;
}

function propValue(obj: TmjObject, name: string): unknown {
  return obj.properties?.find((p) => p.name === name)?.value;
}

/**
 * Group a Tiled object list into typed spawns. PURE — no Phaser — so it is
 * unit-testable headlessly against a fixture. Unknown object types are ignored.
 */
export function parseSpawns(objects: TmjObject[]): LevelSpawns {
  const spawns: LevelSpawns = {
    playerStart: null,
    stars: [],
    crates: [],
    enemies: [],
    checkpoints: [],
    goal: null,
  };

  for (const obj of objects) {
    const at: Vec = { x: obj.x, y: obj.y };
    switch (obj.type) {
      case OBJECT_TYPES.PLAYER_START:
        spawns.playerStart = at;
        break;
      case OBJECT_TYPES.STAR:
        spawns.stars.push(at);
        break;
      case OBJECT_TYPES.CRATE:
        spawns.crates.push({ ...at, breakable: propValue(obj, OBJECT_PROPS.BREAKABLE) === true });
        break;
      case OBJECT_TYPES.ENEMY: {
        const type: EnemyType =
          propValue(obj, OBJECT_PROPS.ENEMY_TYPE) === ENEMY_TYPES.SLIME
            ? ENEMY_TYPES.SLIME
            : ENEMY_TYPES.SNAIL;
        spawns.enemies.push({ ...at, type });
        break;
      }
      case OBJECT_TYPES.CHECKPOINT:
        spawns.checkpoints.push(at);
        break;
      case OBJECT_TYPES.GOAL:
        spawns.goal = at;
        break;
      default:
        break;
    }
  }

  return spawns;
}

/** Map pixel dimensions from a TMJ (or any object carrying the four fields). PURE. */
export function mapPixelSize(map: Pick<TmjMap, "width" | "height" | "tilewidth" | "tileheight">): {
  width: number;
  height: number;
} {
  return { width: map.width * map.tilewidth, height: map.height * map.tileheight };
}
