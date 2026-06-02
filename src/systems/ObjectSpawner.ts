import Phaser from "phaser";
import { ENEMY_TYPES } from "../config/tiledConventions";
import { InputController } from "../input/InputController";
import { Player } from "../entities/Player";
import { Star } from "../entities/Star";
import { Crate } from "../entities/Crate";
import { Enemy } from "../entities/Enemy";
import { Snail } from "../entities/Snail";
import { Slime } from "../entities/Slime";
import { Checkpoint } from "../entities/Checkpoint";
import { Goal } from "../entities/Goal";
import type { LevelSpawns } from "./levelParse";

export interface SpawnedEntities {
  player: Player;
  stars: Star[];
  crates: Crate[];
  enemies: Enemy[];
  checkpoints: Checkpoint[];
  goal: Goal | null;
}

/**
 * Instantiate the existing Phase-1/2 entity classes from parsed level spawns.
 * Pure data → entities; no gameplay logic lives here. Enemies receive the
 * collision layers for their edge-probe patrol.
 */
export function spawnEntities(
  scene: Phaser.Scene,
  spawns: LevelSpawns,
  input: InputController,
  collisionLayers: Phaser.Tilemaps.TilemapLayer[],
): SpawnedEntities {
  const start = spawns.playerStart ?? { x: 100, y: 100 };
  const player = new Player(scene, start.x, start.y, input);

  const stars = spawns.stars.map((s) => new Star(scene, s.x, s.y));
  const crates = spawns.crates.map((c) => new Crate(scene, c.x, c.y, c.breakable));
  const enemies: Enemy[] = spawns.enemies.map((e) =>
    e.type === ENEMY_TYPES.SLIME
      ? new Slime(scene, e.x, e.y, collisionLayers)
      : new Snail(scene, e.x, e.y, collisionLayers),
  );
  const checkpoints = spawns.checkpoints.map((c) => new Checkpoint(scene, c.x, c.y));
  const goal = spawns.goal ? new Goal(scene, spawns.goal.x, spawns.goal.y) : null;

  return { player, stars, crates, enemies, checkpoints, goal };
}
