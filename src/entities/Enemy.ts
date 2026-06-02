import Phaser from "phaser";
import { EventBus } from "../systems/EventBus";
import { nextPatrolDirection, type PatrolDirection } from "./enemyPatrol";

type ArcadeBody = Phaser.Physics.Arcade.Body;

/**
 * Base patrolling enemy. Walks at a fixed speed and flips at walls and platform
 * edges (edge detected by probing the ground layer just ahead of and below the
 * leading foot). The flip decision itself is the pure {@link nextPatrolDirection}.
 *
 * `defeat()` squashes and removes the enemy and emits a `defeat` event.
 */
export abstract class Enemy extends Phaser.Physics.Arcade.Sprite {
  readonly kind: string;
  protected dir: PatrolDirection = -1;
  private readonly speed: number;
  private readonly collisionLayers: Phaser.Tilemaps.TilemapLayer[];
  private defeated = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    textureKey: string,
    kind: string,
    speed: number,
    collisionLayers: Phaser.Tilemaps.TilemapLayer[],
  ) {
    super(scene, x, y, textureKey);
    this.kind = kind;
    this.speed = speed;
    this.collisionLayers = collisionLayers;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    (this.body as ArcadeBody).setCollideWorldBounds(false);
  }

  override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (this.defeated) return;
    const body = this.body as ArcadeBody;
    const grounded = body.blocked.down;
    const probeX = this.x + this.dir * (body.halfWidth + 2);
    const probeY = body.bottom + 2;
    // Edge = no solid tile ahead/below in ANY collision layer (ground/platforms/islands).
    const tileAhead = this.collisionLayers.some(
      (layer) => layer.getTileAtWorldXY(probeX, probeY) !== null,
    );
    // Only treat a missing tile as an edge when grounded (so a falling enemy
    // that hasn't landed yet doesn't jitter its direction mid-air).
    const edgeAhead = grounded && !tileAhead;

    this.dir = nextPatrolDirection(this.dir, {
      blockedLeft: body.blocked.left,
      blockedRight: body.blocked.right,
      edgeAhead,
    });
    body.setVelocityX(this.dir * this.speed);
    this.setFlipX(this.dir > 0);
  }

  /** Defeat the enemy (e.g. stomped): squash, emit `defeat`, then destroy. */
  defeat(bus: EventBus): void {
    if (this.defeated) return;
    this.defeated = true;
    bus.emit("defeat", { kind: this.kind, x: this.x, y: this.y });
    const body = this.body as ArcadeBody;
    body.setVelocity(0, 0);
    body.enable = false;
    this.scene.tweens.add({
      targets: this,
      scaleY: 0.1,
      alpha: 0,
      duration: 160,
      onComplete: () => this.destroy(),
    });
  }

  get isDefeated(): boolean {
    return this.defeated;
  }
}
