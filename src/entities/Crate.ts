import Phaser from "phaser";
import { GAME } from "../config/constants";
import { EventBus } from "../systems/EventBus";
import { ensureRectTexture } from "./placeholders";

export const CRATE_TEXTURE_KEY = "crate-placeholder";

/**
 * A solid, stand-on crate platform. The `breakable` variant breaks when the hero
 * stomps its top (resolved in the scene's collider). Body immovable, gravity off.
 *
 * Break FX (particles) are intentionally deferred to Phase 5 — breaking emits a
 * `crateBreak` event only.
 */
export class Crate extends Phaser.Physics.Arcade.Sprite {
  readonly breakable: boolean;

  constructor(scene: Phaser.Scene, x: number, y: number, breakable = false) {
    ensureRectTexture(scene, CRATE_TEXTURE_KEY, GAME.TILE_SIZE, GAME.TILE_SIZE, 0x9b6a3c, 0x5c3a1e);
    super(scene, x, y, CRATE_TEXTURE_KEY);
    this.breakable = breakable;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(true);
    if (breakable) {
      this.setTint(0xc98b4a); // lighter tint marks a breakable crate
    }
  }

  /** Break a breakable crate (emits an event; particle FX is Phase 5). */
  breakApart(bus: EventBus): void {
    bus.emit("crateBreak", { x: this.x, y: this.y });
    this.destroy();
  }
}
