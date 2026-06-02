import Phaser from "phaser";
import { GAMEPLAY } from "../config/gameplay";
import { EventBus } from "../systems/EventBus";
import { ensureDiamondTexture } from "./placeholders";

export const STAR_TEXTURE_KEY = "star-placeholder";
const STAR_SIZE = 20;

/**
 * A collectible star. Overlap with the hero → emit `collect`, spawn a rising,
 * fading "+100" popup, then destroy. Gravity off, body immovable.
 */
export class Star extends Phaser.Physics.Arcade.Sprite {
  private collected = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    ensureDiamondTexture(scene, STAR_TEXTURE_KEY, STAR_SIZE, 0xffcf3f);
    super(scene, x, y, STAR_TEXTURE_KEY);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(true);
  }

  /** Collect once. Safe to call multiple times (idempotent). */
  collect(bus: EventBus): void {
    if (this.collected) return;
    this.collected = true;
    bus.emit("collect", { value: GAMEPLAY.SCORE_PER_STAR, x: this.x, y: this.y });
    this.spawnPopup();
    this.destroy();
  }

  private spawnPopup(): void {
    const popup = this.scene.add
      .text(this.x, this.y, `+${GAMEPLAY.SCORE_PER_STAR}`, {
        fontFamily: "monospace",
        fontSize: "18px",
        color: "#ffe27a",
      })
      .setOrigin(0.5)
      .setDepth(900);
    this.scene.tweens.add({
      targets: popup,
      y: this.y - GAMEPLAY.POPUP_RISE_PX,
      alpha: 0,
      duration: GAMEPLAY.POPUP_MS,
      ease: "Quad.easeOut",
      onComplete: () => popup.destroy(),
    });
  }
}
