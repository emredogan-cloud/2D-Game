import Phaser from "phaser";
import { ensureRectTexture } from "./placeholders";

export const GOAL_TEXTURE_KEY = "goal-placeholder";

/** The level-end goal trigger. Overlap → win. */
export class Goal extends Phaser.Physics.Arcade.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    ensureRectTexture(scene, GOAL_TEXTURE_KEY, 16, 48, 0xffd24a, 0xb8860b);
    super(scene, x, y, GOAL_TEXTURE_KEY);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(true);
  }
}
