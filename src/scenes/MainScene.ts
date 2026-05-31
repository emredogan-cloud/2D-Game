import Phaser from "phaser";
import { GAME } from "../config/constants";

/**
 * Placeholder gameplay scene for Phase 0. Renders an unmistakable, intentional
 * canvas (coloured background + label + marker) so `npm run dev` and the E2E
 * smoke test confirm the Boot → Preload → Main flow works.
 *
 * Phase 1 will replace this with the movement prototype.
 */
export class MainScene extends Phaser.Scene {
  constructor() {
    super("Main");
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(GAME.BG_COLOR);

    this.add
      .text(width / 2, height / 2 - 48, "Sky Islands", {
        fontFamily: "monospace",
        fontSize: "44px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + 4, "Phase 0 — Scaffold", {
        fontFamily: "monospace",
        fontSize: "22px",
        color: "#8fd3ff",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + 40, "Boot → Preload → Main ✓", {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#7c89a8",
      })
      .setOrigin(0.5);

    // A small coloured marker so the render pipeline is visibly active.
    this.add.rectangle(width / 2, height / 2 + 110, 72, 72, 0x8fd3ff).setStrokeStyle(3, 0xffffff);
  }
}
