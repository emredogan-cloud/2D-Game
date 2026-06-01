import Phaser from "phaser";
import { Player } from "../entities/Player";

/**
 * A camera-fixed text overlay showing live movement state for tuning. Hidden by
 * default; toggled with the backtick key. Never part of the shipped game HUD.
 */
export class DebugOverlay {
  private readonly text: Phaser.GameObjects.Text;
  private visible = false;

  constructor(scene: Phaser.Scene) {
    this.text = scene.add
      .text(10, 10, "", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#a6f0c6",
        backgroundColor: "rgba(0, 0, 0, 0.45)",
        padding: { x: 6, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(1000)
      .setVisible(false);
  }

  toggle(): void {
    this.visible = !this.visible;
    this.text.setVisible(this.visible);
  }

  update(player: Player, fps: number): void {
    if (!this.visible) return;
    this.text.setText([
      `state    : ${player.movementState}`,
      `grounded : ${player.isGrounded}`,
      `vel      : ${player.velocityX.toFixed(0)}, ${player.velocityY.toFixed(0)}`,
      `coyote   : ${player.coyoteRemaining.toFixed(0)} ms`,
      `buffer   : ${player.bufferRemaining.toFixed(0)} ms`,
      `fps      : ${fps.toFixed(0)}`,
    ]);
  }
}
