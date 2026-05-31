import Phaser from "phaser";

/**
 * First scene in the flow. Phase 0 has no global setup to perform, so it simply
 * hands off to the Preload scene. Later phases configure global input/scale
 * defaults here before any assets load.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  create(): void {
    this.scene.start("Preload");
  }
}
