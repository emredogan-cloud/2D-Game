import Phaser from "phaser";

/**
 * Loads assets and shows a progress bar. Phase 0 ships no real assets, but the
 * loader and progress wiring are in place so Phase 1+ gets them for free. The
 * scene advances to Main on completion regardless of whether anything loaded.
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super("Preload");
  }

  preload(): void {
    const { width, height } = this.scale;
    const barWidth = Math.min(420, width * 0.6);
    const barX = (width - barWidth) / 2;
    const barY = height / 2;

    const border = this.add
      .rectangle(width / 2, barY, barWidth + 6, 26, 0xffffff, 0.15)
      .setStrokeStyle(2, 0xffffff, 0.4);
    const bar = this.add.rectangle(barX, barY, 1, 20, 0x8fd3ff).setOrigin(0, 0.5);

    this.load.on("progress", (value: number) => {
      bar.width = Math.max(1, barWidth * value);
    });
    this.load.once("complete", () => {
      bar.width = barWidth;
      border.setVisible(false);
    });
  }

  create(): void {
    this.scene.start("Movement");
  }
}
