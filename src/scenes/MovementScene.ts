import Phaser from "phaser";
import { GAME } from "../config/constants";
import { GAMEPLAY } from "../config/gameplay";
import { Player } from "../entities/Player";
import { InputController } from "../input/InputController";
import { DebugOverlay } from "../debug/DebugOverlay";
import { EventBus } from "../systems/EventBus";
import { GameManager } from "../systems/GameManager";
import { isStomp } from "../systems/combat";
import { Star } from "../entities/Star";
import { Crate } from "../entities/Crate";
import { Enemy } from "../entities/Enemy";
import { Snail } from "../entities/Snail";
import { Slime } from "../entities/Slime";
import { Checkpoint } from "../entities/Checkpoint";
import { Goal } from "../entities/Goal";

const TILEMAP_KEY = "test-movement";
const TILESET_IMAGE_KEY = "movement-tiles";
/** Must match the tileset `name` in test-movement.tmj. */
const TILESET_NAME = "movement-tiles";

type ArcadeBody = Phaser.Physics.Arcade.Body;

/** Hand-placed gameplay entities for the test level. */
interface SpawnSpec {
  stars: { x: number; y: number }[];
  crates: { x: number; y: number; breakable: boolean }[];
  snails: { x: number; y: number }[];
  slimes: { x: number; y: number }[];
  checkpoints: { x: number; y: number }[];
  goal: { x: number; y: number };
}

// TODO(phase-3): source this from the Tiled `objects` layer instead of an inline
// spec. Keeping it as typed data now means Phase 3 only swaps the source.
const SPAWN: SpawnSpec = {
  stars: [
    { x: 260, y: 648 },
    { x: 430, y: 648 },
    { x: 600, y: 600 },
    { x: 636, y: 584 },
    { x: 672, y: 600 },
    { x: 1300, y: 648 },
  ],
  crates: [
    { x: 760, y: 656, breakable: false },
    { x: 840, y: 656, breakable: true },
  ],
  snails: [
    { x: 480, y: 600 },
    { x: 1700, y: 600 },
  ],
  slimes: [{ x: 1500, y: 600 }],
  checkpoints: [{ x: 1200, y: 640 }],
  goal: { x: 1850, y: 632 },
};

/** Test-only introspection surface exposed on `window` in dev builds (Playwright). */
interface TestHook {
  x: () => number;
  y: () => number;
  state: () => string;
  vx: () => number;
  vy: () => number;
  grounded: () => boolean;
  score: () => number;
  lives: () => number;
  runState: () => string;
}

/**
 * Gameplay scene (originally the Phase 1 movement prototype). Phase 2 adds the
 * core loop on top of the unchanged Phase 1 controller: stars + score, crates,
 * patrolling enemies with stomp-vs-damage, pit death, lives + checkpoint respawn,
 * and win/lose stubs — all owned by a `GameManager` and routed through a typed
 * `EventBus`. No HUD/audio/parallax (Phases 3–4).
 */
export class MovementScene extends Phaser.Scene {
  private player!: Player;
  private controls!: InputController;
  private debug!: DebugOverlay;
  private bus!: EventBus;
  private gm!: GameManager;
  private statusText?: Phaser.GameObjects.Text;
  private spawnPoint = new Phaser.Math.Vector2(112, 560);
  private deathY = Number.POSITIVE_INFINITY;
  private dead = false;

  constructor() {
    super("Movement");
  }

  preload(): void {
    this.load.image(TILESET_IMAGE_KEY, "assets/tilesets/movement-tiles.png");
    this.load.tilemapTiledJSON(TILEMAP_KEY, "assets/tilemaps/test-movement.tmj");
  }

  create(): void {
    this.dead = false;
    this.statusText = undefined;

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

    // --- gameplay backbone ---
    this.bus = new EventBus();
    this.gm = new GameManager(this.bus, {
      startingLives: GAMEPLAY.STARTING_LIVES,
      spawn: { x: this.spawnPoint.x, y: this.spawnPoint.y },
    });
    this.bus.on("respawn", (p) => {
      this.player.resetTo(p.x, p.y);
      this.dead = false;
    });
    this.bus.on("win", () => this.showStatus("YOU WIN!  (Phase 4 UI: TODO)"));
    this.bus.on("lose", () => this.showStatus("GAME OVER — out of lives  (Phase 4 UI: TODO)"));

    // --- hero + camera (Phase 1, unchanged) ---
    this.controls = new InputController(this);
    this.player = new Player(this, this.spawnPoint.x, this.spawnPoint.y, this.controls);
    this.physics.add.collider(this.player, ground);

    const cam = this.cameras.main;
    cam.startFollow(this.player, true, GAME.CAMERA_LERP, GAME.CAMERA_LERP);
    cam.setDeadzone(GAME.CAMERA_DEADZONE_W, GAME.CAMERA_DEADZONE_H);
    cam.setFollowOffset(GAME.CAMERA_OFFSET_X, GAME.CAMERA_OFFSET_Y);

    this.spawnGameplay(ground);

    this.debug = new DebugOverlay(this);
    this.addControlsHint();
    this.exposeTestHook();
  }

  override update(): void {
    if (this.controls.debugToggled()) {
      this.debug.toggle();
    }
    // Pit death (the implemented hazard). TODO(phase-3): author hazard tiles and
    // route them through killHero() too.
    if (!this.dead && this.gm.status === "playing" && this.player.y > this.deathY) {
      this.killHero("pit");
    }
    this.debug.update(this.player, this.game.loop.actualFps);
  }

  /** Spawn stars/crates/enemies/checkpoints/goal and register colliders + overlaps. */
  private spawnGameplay(ground: Phaser.Tilemaps.TilemapLayer): void {
    const stars = SPAWN.stars.map((s) => new Star(this, s.x, s.y));
    const crates = SPAWN.crates.map((c) => new Crate(this, c.x, c.y, c.breakable));
    const enemies: Enemy[] = [
      ...SPAWN.snails.map((s) => new Snail(this, s.x, s.y, ground)),
      ...SPAWN.slimes.map((s) => new Slime(this, s.x, s.y, ground)),
    ];
    const checkpoints = SPAWN.checkpoints.map((c) => new Checkpoint(this, c.x, c.y));
    const goal = new Goal(this, SPAWN.goal.x, SPAWN.goal.y);

    // Solids.
    this.physics.add.collider(enemies, ground);
    this.physics.add.collider(enemies, crates);
    this.physics.add.collider(this.player, crates, undefined, (_p, crateObj) =>
      this.resolveCrate(crateObj as unknown as Crate),
    );

    // Triggers / combat.
    this.physics.add.overlap(this.player, stars, (_p, starObj) => {
      (starObj as unknown as Star).collect(this.bus);
    });
    this.physics.add.overlap(this.player, enemies, (_p, enemyObj) => {
      this.resolveEnemy(enemyObj as unknown as Enemy);
    });
    this.physics.add.overlap(this.player, checkpoints, (_p, cpObj) => {
      const cp = cpObj as unknown as Checkpoint;
      if (cp.activate()) this.gm.setCheckpoint(cp.x, cp.y);
    });
    this.physics.add.overlap(this.player, goal, () => this.gm.win());
  }

  /**
   * Crate collider process callback. A breakable crate stomped from above breaks
   * and bounces the hero (no solid resolution this frame); otherwise the crate is
   * a solid platform.
   */
  private resolveCrate(crate: Crate): boolean {
    if (!crate.breakable) return true;
    const hero = this.player.body as ArcadeBody;
    const crateBody = crate.body as ArcadeBody;
    if (
      isStomp({
        heroVelocityY: hero.velocity.y,
        heroBottom: hero.bottom,
        targetY: crateBody.top,
        epsilon: GAMEPLAY.STOMP_EPSILON,
      })
    ) {
      crate.breakApart(this.bus);
      hero.setVelocityY(GAMEPLAY.STOMP_BOUNCE_VELOCITY);
      return false;
    }
    return true;
  }

  /** Hero↔enemy overlap: stomp-to-defeat (bounce) vs side-contact damage (lose a life). */
  private resolveEnemy(enemy: Enemy): void {
    if (enemy.isDefeated) return;
    const hero = this.player.body as ArcadeBody;
    const enemyBody = enemy.body as ArcadeBody;
    const stomp = isStomp({
      heroVelocityY: hero.velocity.y,
      heroBottom: hero.bottom,
      targetY: enemyBody.center.y,
      epsilon: GAMEPLAY.STOMP_EPSILON,
    });
    if (stomp) {
      enemy.defeat(this.bus);
      hero.setVelocityY(GAMEPLAY.STOMP_BOUNCE_VELOCITY);
      return;
    }
    // Side / under contact → damage (knockback away from the enemy).
    const knockDir = this.player.x <= enemy.x ? -1 : 1;
    const tookDamage = this.player.hurt(
      knockDir * GAMEPLAY.HURT_KNOCKBACK_X,
      GAMEPLAY.HURT_KNOCKBACK_Y,
      GAMEPLAY.HURT_INVULN_MS,
      GAMEPLAY.HURT_LOCKOUT_MS,
    );
    if (tookDamage) {
      this.bus.emit("hurt", { x: this.player.x, y: this.player.y });
    }
  }

  /** Single death funnel (pit/hazard). GameManager decides respawn vs lose. */
  private killHero(cause: string): void {
    if (this.dead) return;
    this.dead = true;
    this.bus.emit("die", { cause });
  }

  private showStatus(message: string): void {
    this.statusText?.destroy();
    this.statusText = this.add
      .text(GAME.GAME_WIDTH / 2, GAME.GAME_HEIGHT / 2, message, {
        fontFamily: "monospace",
        fontSize: "26px",
        color: "#ffffff",
        backgroundColor: "rgba(0, 0, 0, 0.55)",
        padding: { x: 14, y: 10 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2000);
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
      score: () => this.gm.score,
      lives: () => this.gm.lives,
      runState: () => this.gm.status,
    };
    (window as unknown as { __SKY_ISLANDS_TEST__?: TestHook }).__SKY_ISLANDS_TEST__ = hook;
  }
}
