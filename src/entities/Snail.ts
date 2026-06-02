import Phaser from "phaser";
import { GAMEPLAY } from "../config/gameplay";
import { Enemy } from "./Enemy";
import { ensureRectTexture } from "./placeholders";

const SNAIL_TEXTURE_KEY = "snail-placeholder";

/** A slow ground-patrolling enemy. */
export class Snail extends Enemy {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    groundLayer: Phaser.Tilemaps.TilemapLayer,
  ) {
    ensureRectTexture(scene, SNAIL_TEXTURE_KEY, 24, 18, 0x8a5a2b, 0x4e2f12);
    super(scene, x, y, SNAIL_TEXTURE_KEY, "snail", GAMEPLAY.SNAIL_SPEED, groundLayer);
    (this.body as Phaser.Physics.Arcade.Body).setSize(22, 16);
  }
}
