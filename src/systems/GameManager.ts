import { EventBus } from "./EventBus";

export type RunStatus = "playing" | "won" | "lost";

export interface RunState {
  score: number;
  lives: number;
  checkpoint: { x: number; y: number };
  status: RunStatus;
}

export interface GameManagerOptions {
  startingLives: number;
  spawn: { x: number; y: number };
}

/**
 * Single source of truth for run state (score / lives / checkpoint / status).
 *
 * Pure logic — no Phaser references — so it unit-tests cleanly. It reacts to and
 * emits gameplay events through the typed {@link EventBus}; the scene owns the
 * Phaser objects and listens for `respawn` / `win` / `lose` to update the view.
 *
 * Two life-loss paths funnel through {@link loseLife}:
 *  - `die`  (pit/hazard) → lose a life and **respawn** at the checkpoint.
 *  - `hurt` (enemy side-contact) → lose a life with **no respawn** (knockback
 *    handled by the hero); the run only ends when lives reach 0.
 */
export class GameManager {
  private readonly bus: EventBus;
  private readonly startingLives: number;
  private readonly initialSpawn: { x: number; y: number };
  private state: RunState;

  constructor(bus: EventBus, opts: GameManagerOptions) {
    this.bus = bus;
    this.startingLives = opts.startingLives;
    this.initialSpawn = { x: opts.spawn.x, y: opts.spawn.y };
    this.state = this.freshState();

    this.bus.on("collect", (p) => this.addScore(p.value));
    this.bus.on("hurt", () => this.loseLife(false));
    this.bus.on("die", () => this.loseLife(true));
  }

  private freshState(): RunState {
    return {
      score: 0,
      lives: this.startingLives,
      checkpoint: { ...this.initialSpawn },
      status: "playing",
    };
  }

  addScore(n: number): void {
    if (this.state.status !== "playing") return;
    this.state.score += n;
    this.bus.emit("score", { score: this.state.score });
  }

  setCheckpoint(x: number, y: number): void {
    this.state.checkpoint = { x, y };
    this.bus.emit("checkpoint", { x, y });
  }

  /** Reach the goal. */
  win(): void {
    if (this.state.status !== "playing") return;
    this.state.status = "won";
    this.bus.emit("win", {});
  }

  /**
   * Lose one life. When `respawn` is true and lives remain, emit `respawn` at the
   * current checkpoint; when lives hit 0, transition to `lost` and emit `lose`.
   */
  loseLife(respawn: boolean): void {
    if (this.state.status !== "playing") return;
    this.state.lives -= 1;
    if (this.state.lives <= 0) {
      this.state.lives = 0;
      this.state.status = "lost";
      this.bus.emit("lose", {});
      return;
    }
    if (respawn) {
      this.bus.emit("respawn", { ...this.state.checkpoint });
    }
  }

  /** Reset to a brand-new run (score 0, full lives, initial spawn). */
  reset(): void {
    this.state = this.freshState();
  }

  get score(): number {
    return this.state.score;
  }
  get lives(): number {
    return this.state.lives;
  }
  get status(): RunStatus {
    return this.state.status;
  }
  get checkpoint(): Readonly<{ x: number; y: number }> {
    return this.state.checkpoint;
  }
  get runState(): Readonly<RunState> {
    return this.state;
  }
}
