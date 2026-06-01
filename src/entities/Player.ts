import Phaser from "phaser";
import { GAME } from "../config/constants";
import { InputController } from "../input/InputController";
import { nextPlayerState, type PlayerState } from "./PlayerStateMachine";
import { canConsumeJump, updateBuffer, updateCoyote } from "./jumpTimers";

type ArcadeBody = Phaser.Physics.Arcade.Body;

export const HERO_TEXTURE_KEY = "hero-placeholder";

/**
 * Generates a small asymmetric placeholder hero texture so horizontal flip is
 * visible (a "face" marker is biased to the right edge). Idempotent. Replaced by
 * real sprite atlases in Phase 5.
 */
export function ensureHeroTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(HERO_TEXTURE_KEY)) return;
  const w = GAME.HERO_SPRITE_WIDTH;
  const h = GAME.HERO_SPRITE_HEIGHT;
  const g = scene.add.graphics();
  g.fillStyle(0x3fd0c9, 1);
  g.fillRect(0, 0, w, h);
  g.fillStyle(0x12343b, 1);
  g.fillRect(w - 7, 6, 4, 4); // eye marker (right side → flip is visible)
  g.fillRect(w - 9, 13, 6, 2); // mouth marker
  g.lineStyle(2, 0xffffff, 0.7);
  g.strokeRect(1, 1, w - 2, h - 2);
  g.generateTexture(HERO_TEXTURE_KEY, w, h);
  g.destroy();
}

/**
 * The hero. Owns an Arcade body and drives the pure FSM each frame.
 *
 * Horizontal motion uses **manual velocity integration** (accel / passive drag /
 * turn-brake / reduced air authority) for precise "feel"; vertical motion is
 * Arcade-gravity-driven with a single jump (+ variable height) and a terminal-fall
 * cap. Coyote-time and jump-buffer make the jump forgiving.
 */
export class Player extends Phaser.Physics.Arcade.Sprite {
  private playerState: PlayerState = "idle";
  private coyoteMs = 0;
  private bufferMs = 0;
  private facing: 1 | -1 = 1;
  private readonly controls: InputController;

  constructor(scene: Phaser.Scene, x: number, y: number, input: InputController) {
    ensureHeroTexture(scene);
    super(scene, x, y, HERO_TEXTURE_KEY);
    this.controls = input;
    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as ArcadeBody;
    body.setSize(GAME.HERO_BODY_WIDTH, GAME.HERO_BODY_HEIGHT);
    body.setOffset(
      (GAME.HERO_SPRITE_WIDTH - GAME.HERO_BODY_WIDTH) / 2,
      GAME.HERO_SPRITE_HEIGHT - GAME.HERO_BODY_HEIGHT,
    );
    body.setMaxVelocity(GAME.HERO_RUN_SPEED, GAME.HERO_MAX_FALL_SPEED);
    body.setCollideWorldBounds(true);
    this.setOrigin(0.5, 0.5);
  }

  override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    const dt = delta / 1000;
    const body = this.body as ArcadeBody;
    const grounded = body.blocked.down || body.touching.down;
    const input = this.controls.sample();

    // --- coyote-time + jump-buffer timers ---
    this.coyoteMs = updateCoyote(this.coyoteMs, grounded, delta, GAME.HERO_COYOTE_MS);
    this.bufferMs = updateBuffer(this.bufferMs, input.jumpPressed, delta, GAME.HERO_JUMP_BUFFER_MS);

    // --- jump (single-jump: consuming zeroes BOTH timers) ---
    let jumpStarted = false;
    if (canConsumeJump(this.coyoteMs, this.bufferMs)) {
      body.setVelocityY(GAME.HERO_JUMP_VELOCITY);
      this.coyoteMs = 0;
      this.bufferMs = 0;
      jumpStarted = true;
    }
    // variable jump height: releasing while still rising trims the ascent.
    if (input.jumpReleased && body.velocity.y < 0) {
      body.setVelocityY(body.velocity.y * GAME.HERO_JUMP_CUT_MULTIPLIER);
    }

    // --- horizontal movement (manual integration) ---
    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const airFactor = grounded ? 1 : GAME.HERO_AIR_CONTROL;
    let vx = body.velocity.x;
    if (dir !== 0) {
      const turning = vx !== 0 && Math.sign(vx) !== dir;
      const accel = (turning ? GAME.HERO_ACCEL + GAME.HERO_RUN_DECEL : GAME.HERO_ACCEL) * airFactor;
      vx = Phaser.Math.Clamp(vx + dir * accel * dt, -GAME.HERO_RUN_SPEED, GAME.HERO_RUN_SPEED);
      this.facing = dir > 0 ? 1 : -1;
    } else {
      const drop = GAME.HERO_DRAG * airFactor * dt;
      vx = Math.abs(vx) <= drop ? 0 : vx - Math.sign(vx) * drop;
    }
    body.setVelocityX(vx);
    this.setFlipX(this.facing === -1);

    // --- behaviour/animation state machine ---
    this.playerState = nextPlayerState(this.playerState, {
      grounded,
      vy: body.velocity.y,
      hasHorizontalInput: dir !== 0,
      speedX: Math.abs(vx),
      jumpStarted,
      runEpsilon: GAME.HERO_RUN_EPSILON,
    });
  }

  /**
   * Reset the hero to a spawn point with cleared velocity/state.
   * Phase 2 will route respawn through a GameManager (death/lives); this is the seam.
   */
  resetTo(x: number, y: number): void {
    const body = this.body as ArcadeBody;
    this.setPosition(x, y);
    body.setVelocity(0, 0);
    this.coyoteMs = 0;
    this.bufferMs = 0;
    this.playerState = "idle";
  }

  // --- read-only introspection (debug overlay, unit reasoning, E2E hook) ---
  // Named `movementState` (not `state`) to avoid clashing with Phaser's
  // GameObject.state property.
  get movementState(): PlayerState {
    return this.playerState;
  }
  get isGrounded(): boolean {
    const body = this.body as ArcadeBody;
    return body.blocked.down || body.touching.down;
  }
  get velocityX(): number {
    return (this.body as ArcadeBody).velocity.x;
  }
  get velocityY(): number {
    return (this.body as ArcadeBody).velocity.y;
  }
  get coyoteRemaining(): number {
    return this.coyoteMs;
  }
  get bufferRemaining(): number {
    return this.bufferMs;
  }
}
