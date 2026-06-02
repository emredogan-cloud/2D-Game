import Phaser from "phaser";
import { GAMEPLAY } from "../config/gameplay";
import { Enemy } from "./Enemy";
import { ensureRectTexture } from "./placeholders";

const SLIME_TEXTURE_KEY = "slime-placeholder";

/** A faster ground-patrolling enemy. */
export class Slime extends Enemy {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    groundLayer: Phaser.Tilemaps.TilemapLayer,
  ) {
    ensureRectTexture(scene, SLIME_TEXTURE_KEY, 24, 20, 0x55a630, 0x2f5e18);
    super(scene, x, y, SLIME_TEXTURE_KEY, "slime", GAMEPLAY.SLIME_SPEED, groundLayer);
    (this.body as Phaser.Physics.Arcade.Body).setSize(22, 18);
  }
}
