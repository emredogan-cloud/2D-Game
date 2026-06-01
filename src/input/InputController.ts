import Phaser from "phaser";

/** Abstract per-frame input intent. Phase 4 touch controls will produce the same shape. */
export interface InputState {
  left: boolean;
  right: boolean;
  /** Jump pressed THIS frame (rising edge). */
  jumpPressed: boolean;
  /** Jump key currently held. */
  jumpHeld: boolean;
  /** Jump released THIS frame (falling edge) — drives variable jump height. */
  jumpReleased: boolean;
}

/**
 * Wraps Phaser keyboard input into an abstract {@link InputState} so the controller
 * never reads raw keys. Left/right = Arrows or A/D; jump = Space, Up, or W; the
 * backtick key toggles the debug overlay.
 */
export class InputController {
  private readonly leftKeys: Phaser.Input.Keyboard.Key[];
  private readonly rightKeys: Phaser.Input.Keyboard.Key[];
  private readonly jumpKeys: Phaser.Input.Keyboard.Key[];
  private readonly debugKey: Phaser.Input.Keyboard.Key;

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard;
    if (!kb) {
      throw new Error("InputController requires the keyboard plugin to be enabled.");
    }
    const Codes = Phaser.Input.Keyboard.KeyCodes;
    this.leftKeys = [kb.addKey(Codes.LEFT), kb.addKey(Codes.A)];
    this.rightKeys = [kb.addKey(Codes.RIGHT), kb.addKey(Codes.D)];
    this.jumpKeys = [kb.addKey(Codes.SPACE), kb.addKey(Codes.UP), kb.addKey(Codes.W)];
    this.debugKey = kb.addKey(Codes.BACKTICK);
  }

  private static anyDown(keys: Phaser.Input.Keyboard.Key[]): boolean {
    return keys.some((k) => k.isDown);
  }

  /** Sample the abstract input for this frame. Call once per frame (consumes edges). */
  sample(): InputState {
    return {
      left: InputController.anyDown(this.leftKeys),
      right: InputController.anyDown(this.rightKeys),
      jumpHeld: InputController.anyDown(this.jumpKeys),
      jumpPressed: this.jumpKeys.some((k) => Phaser.Input.Keyboard.JustDown(k)),
      jumpReleased: this.jumpKeys.some((k) => Phaser.Input.Keyboard.JustUp(k)),
    };
  }

  /** True on the frame the debug-overlay toggle key (backtick) is pressed. */
  debugToggled(): boolean {
    return Phaser.Input.Keyboard.JustDown(this.debugKey);
  }
}
