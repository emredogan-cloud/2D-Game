import Phaser from "phaser";
import { GAME } from "../config/constants";
import { Player } from "../entities/Player";
import { InputController } from "../input/InputController";
import { DebugOverlay } from "../debug/DebugOverlay";

const TILEMAP_KEY = "test-movement";
const TILESET_IMAGE_KEY = "movement-tiles";
/** Must match the tileset `name` in test-movement.tmj. */
const TILESET_NAME = "movement-tiles";

/** Test-only introspection surface exposed on `window` in dev builds (Playwright). */
interface TestHook {
  x: () => number;
  y: () => number;
  state: () => string;
  vx: () => number;
  vy: () => number;
  grounded: () => boolean;
}

/**
 * Phase 1 movement prototype scene. Loads the Tiled test level, spawns the hero,
 * wires tile collision + a smoothed dead-zone follow camera, and handles pit death
 * by respawning at the Tiled `spawn` point. No gameplay systems (stars, enemies,
 * score, HUD) — those are Phases 2–4.
 */
export class MovementScene extends Phaser.Scene {
  private player!: Player;
  private controls!: InputController;
  private debug!: DebugOverlay;
  private spawnPoint = new Phaser.Math.Vector2(112, 560);
  private deathY = Number.POSITIVE_INFINITY;

  constructor() {
    super("Movement");
  }

  preload(): void {
    this.load.image(TILESET_IMAGE_KEY, "assets/tilesets/movement-tiles.png");
    this.load.tilemapTiledJSON(TILEMAP_KEY, "assets/tilemaps/test-movement.tmj");
  }

  create(): void {
    const map = this.make.tilemap({ key: TILEMAP_KEY });
    const tileset = map.addTilesetImage(TILESET_NAME, TILESET_IMAGE_KEY);
    if (!tileset) {
      throw new Error(`Tileset '${TILESET_NAME}' could not be added to the tilemap.`);
    }
    const ground = map.createLayer("ground", tileset, 0, 0);
    if (!ground) {
      throw new Error("Tile layer 'ground' not found in the tilemap.");
    }
    ground.setCollisionByExclusion([-1]); // every non-empty tile is solid

    const mapW = map.widthInPixels;
    const mapH = map.heightInPixels;
    this.physics.world.setBounds(0, 0, mapW, mapH);
    // Open the bottom edge so the hero can fall through pits to the death line.
    this.physics.world.setBoundsCollision(true, true, true, false);
    this.cameras.main.setBounds(0, 0, mapW, mapH);
    this.deathY = mapH + GAME.TILE_SIZE * 3;

    const spawn = map.getObjectLayer("objects")?.objects.find((o) => o.name === "spawn");
    if (spawn?.x != null && spawn.y != null) {
      this.spawnPoint = new Phaser.Math.Vector2(spawn.x, spawn.y);
    }

    this.controls = new InputController(this);
    this.player = new Player(this, this.spawnPoint.x, this.spawnPoint.y, this.controls);
    this.physics.add.collider(this.player, ground);

    const cam = this.cameras.main;
    cam.startFollow(this.player, true, GAME.CAMERA_LERP, GAME.CAMERA_LERP);
    cam.setDeadzone(GAME.CAMERA_DEADZONE_W, GAME.CAMERA_DEADZONE_H);
    cam.setFollowOffset(GAME.CAMERA_OFFSET_X, GAME.CAMERA_OFFSET_Y);

    this.debug = new DebugOverlay(this);
    this.addControlsHint();
    this.exposeTestHook();
  }

  override update(): void {
    if (this.controls.debugToggled()) {
      this.debug.toggle();
    }
    // Pit death → respawn (Phase 2 will route this through a GameManager).
    if (this.player.y > this.deathY) {
      this.player.resetTo(this.spawnPoint.x, this.spawnPoint.y);
    }
    this.debug.update(this.player, this.game.loop.actualFps);
  }

  /** A small dev-only controls hint (not the game HUD — that is Phase 4). */
  private addControlsHint(): void {
    this.add
      .text(
        10,
        GAME.GAME_HEIGHT - 26,
        "Arrows / A,D move   ·   Space / W / Up jump   ·   ` debug",
        {
          fontFamily: "monospace",
          fontSize: "14px",
          color: "#7c89a8",
        },
      )
      .setScrollFactor(0)
      .setDepth(1000);
  }

  /** Expose a tiny read-only hook for Playwright (dev builds only). */
  private exposeTestHook(): void {
    if (!import.meta.env.DEV) return;
    const hook: TestHook = {
      x: () => this.player.x,
      y: () => this.player.y,
      state: () => this.player.movementState,
      vx: () => this.player.velocityX,
      vy: () => this.player.velocityY,
      grounded: () => this.player.isGrounded,
    };
    (window as unknown as { __SKY_ISLANDS_TEST__?: TestHook }).__SKY_ISLANDS_TEST__ = hook;
  }
}
