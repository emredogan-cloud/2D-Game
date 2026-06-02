import Phaser from "phaser";
import { GAME } from "../config/constants";
import { GAMEPLAY } from "../config/gameplay";
import { FIRST_LEVEL, LEVEL_ORDER, nextLevel } from "../config/levels";
import { Player } from "../entities/Player";
import { InputController } from "../input/InputController";
import { DebugOverlay } from "../debug/DebugOverlay";
import { EventBus } from "../systems/EventBus";
import { GameManager } from "../systems/GameManager";
import { isStomp } from "../systems/combat";
import { Crate } from "../entities/Crate";
import { Enemy } from "../entities/Enemy";
import { Star } from "../entities/Star";
import { Checkpoint } from "../entities/Checkpoint";
import { ParallaxBackground } from "../systems/ParallaxBackground";
import { deriveCameraView } from "../systems/cameraView";
import { loadLevel, WORLD_TILESET_IMAGE_KEY } from "../systems/LevelLoader";
import { spawnEntities } from "../systems/ObjectSpawner";

type ArcadeBody = Phaser.Physics.Arcade.Body;

const RUN_STATE_KEY = "runState";

interface SceneData {
  levelKey?: string;
}

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
  level: () => string;
  starCount: () => number;
  enemyCount: () => number;
  completeLevel: () => void;
}

/**
 * The gameplay scene — fully data-driven in Phase 3. It loads a Tiled `.tmj` via
 * `LevelLoader`, spawns every entity from the map's object layer via
 * `ObjectSpawner` (zero hard-coded coordinates), builds a parallax background,
 * derives camera bounds/dead-zone from the map, and advances level→level on
 * reaching the goal (carrying score/lives via the registry).
 */
export class MovementScene extends Phaser.Scene {
  private levelKey: string = FIRST_LEVEL;
  private player!: Player;
  private controls!: InputController;
  private debug!: DebugOverlay;
  private bus!: EventBus;
  private gm!: GameManager;
  private parallax!: ParallaxBackground;
  private statusText?: Phaser.GameObjects.Text;
  private deathY = Number.POSITIVE_INFINITY;
  private dead = false;
  private transitioning = false;
  private loadedStars = 0;
  private loadedEnemies = 0;

  constructor() {
    super("Movement");
  }

  init(data: SceneData): void {
    this.levelKey = data.levelKey ?? FIRST_LEVEL;
    this.dead = false;
    this.transitioning = false;
  }

  preload(): void {
    this.load.image(WORLD_TILESET_IMAGE_KEY, "assets/tilesets/world-tiles.png");
    for (const key of LEVEL_ORDER) {
      this.load.tilemapTiledJSON(key, `assets/levels/${key}.tmj`);
    }
  }

  create(): void {
    this.statusText = undefined;
    this.parallax = new ParallaxBackground(this);

    const level = loadLevel(this, this.levelKey);
    const start = level.spawns.playerStart ?? { x: 100, y: 100 };

    // --- gameplay backbone (score/lives persist across levels via the registry) ---
    const saved = this.registry.get(RUN_STATE_KEY) as { score: number; lives: number } | undefined;
    this.bus = new EventBus();
    this.gm = new GameManager(this.bus, {
      startingLives: GAMEPLAY.STARTING_LIVES,
      spawn: start,
      initial: saved,
    });
    this.bus.on("respawn", (p) => {
      this.player.resetTo(p.x, p.y);
      this.dead = false;
    });
    this.bus.on("win", () => this.handleLevelComplete());
    this.bus.on("lose", () => this.showStatus("GAME OVER — out of lives  (Phase 4 UI: TODO)"));

    // --- input + entities (all from map data) ---
    this.controls = new InputController(this);
    const entities = spawnEntities(this, level.spawns, this.controls, level.collisionLayers);
    this.player = entities.player;
    this.loadedStars = entities.stars.length;
    this.loadedEnemies = entities.enemies.length;

    this.registerColliders(
      level,
      entities.crates,
      entities.enemies,
      entities.stars,
      entities.checkpoints,
    );
    if (entities.goal) {
      this.physics.add.overlap(this.player, entities.goal, () => this.gm.win());
    }

    // --- camera (bounds + dead-zone derived from the map; Phase-1 follow feel kept) ---
    const view = deriveCameraView(
      level.widthPx,
      level.heightPx,
      this.scale.width,
      this.scale.height,
    );
    const cam = this.cameras.main;
    cam.setBounds(view.bounds.x, view.bounds.y, view.bounds.width, view.bounds.height);
    cam.startFollow(this.player, true, GAME.CAMERA_LERP, GAME.CAMERA_LERP);
    cam.setDeadzone(view.deadzone.width, view.deadzone.height);
    cam.setFollowOffset(GAME.CAMERA_OFFSET_X, GAME.CAMERA_OFFSET_Y);
    cam.fadeIn(300, 0, 0, 0);

    this.deathY = level.heightPx + GAME.TILE_SIZE * 3;

    this.debug = new DebugOverlay(this);
    this.addControlsHint();
    this.exposeTestHook();
  }

  override update(): void {
    if (this.controls.debugToggled()) {
      this.debug.toggle();
    }
    const cam = this.cameras.main;
    this.parallax.update(cam.scrollX, cam.scrollY);

    if (!this.dead && this.gm.status === "playing" && this.player.y > this.deathY) {
      this.killHero("pit");
    }
    this.debug.update(this.player, this.game.loop.actualFps);
  }

  private registerColliders(
    level: ReturnType<typeof loadLevel>,
    crates: Crate[],
    enemies: Enemy[],
    stars: Star[],
    checkpoints: Checkpoint[],
  ): void {
    for (const layer of level.collisionLayers) {
      this.physics.add.collider(this.player, layer);
      this.physics.add.collider(enemies, layer);
    }
    if (level.onewayLayer) {
      this.physics.add.collider(this.player, level.onewayLayer);
    }
    this.physics.add.collider(enemies, crates);
    this.physics.add.collider(this.player, crates, undefined, (_p, crateObj) =>
      this.resolveCrate(crateObj as unknown as Crate),
    );
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
  }

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

  /** Reached the goal → persist run state and fade to the next level (or finish). */
  private handleLevelComplete(): void {
    if (this.transitioning) return;
    this.transitioning = true;
    this.registry.set(RUN_STATE_KEY, { score: this.gm.score, lives: this.gm.lives });
    const next = nextLevel(this.levelKey);
    const cam = this.cameras.main;
    cam.fadeOut(400, 0, 0, 0);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      if (next) {
        this.scene.restart({ levelKey: next } satisfies SceneData);
      } else {
        this.registry.remove(RUN_STATE_KEY);
        cam.fadeIn(400, 0, 0, 0);
        this.showStatus("ALL LEVELS COMPLETE!  (Phase 4 UI: TODO)");
      }
    });
  }

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
      level: () => this.levelKey,
      starCount: () => this.loadedStars,
      enemyCount: () => this.loadedEnemies,
      completeLevel: () => this.gm.win(),
    };
    (window as unknown as { __SKY_ISLANDS_TEST__?: TestHook }).__SKY_ISLANDS_TEST__ = hook;
  }
}
