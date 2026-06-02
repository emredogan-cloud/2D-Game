import Phaser from "phaser";
import { ensureRectTexture } from "./placeholders";

export const CHECKPOINT_TEXTURE_KEY = "checkpoint-placeholder";

/** A checkpoint trigger. Overlap activates it once (sets the respawn point). */
export class Checkpoint extends Phaser.Physics.Arcade.Sprite {
  private activated = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    ensureRectTexture(scene, CHECKPOINT_TEXTURE_KEY, 10, 40, 0x4aa3ff, 0x1f5c99);
    super(scene, x, y, CHECKPOINT_TEXTURE_KEY);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(true);
  }

  /** Activate once; returns true the first time only. */
  activate(): boolean {
    if (this.activated) return false;
    this.activated = true;
    this.setTint(0xfff07a);
    return true;
  }
}
