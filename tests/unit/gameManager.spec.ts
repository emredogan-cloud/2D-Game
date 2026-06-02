import { describe, it, expect } from "vitest";
import { EventBus } from "../../src/systems/EventBus";
import { GameManager } from "../../src/systems/GameManager";

function make(lives = 3) {
  const bus = new EventBus();
  const gm = new GameManager(bus, { startingLives: lives, spawn: { x: 10, y: 20 } });
  return { bus, gm };
}

type Point = { x: number; y: number };

describe("GameManager", () => {
  it("starts playing with full lives, zero score, spawn checkpoint", () => {
    const { gm } = make();
    expect(gm.score).toBe(0);
    expect(gm.lives).toBe(3);
    expect(gm.status).toBe("playing");
    expect(gm.checkpoint).toEqual({ x: 10, y: 20 });
  });

  it("addScore accumulates and emits a score event", () => {
    const { bus, gm } = make();
    let last = 0;
    bus.on("score", (p) => {
      last = p.score;
    });
    gm.addScore(100);
    gm.addScore(100);
    expect(gm.score).toBe(200);
    expect(last).toBe(200);
  });

  it("a collect event raises the score", () => {
    const { bus, gm } = make();
    bus.emit("collect", { value: 100, x: 0, y: 0 });
    expect(gm.score).toBe(100);
  });

  it("die loses a life and emits respawn at the checkpoint", () => {
    const { bus, gm } = make();
    let r: Point | null = null;
    bus.on("respawn", (p) => {
      r = p;
    });
    bus.emit("die", { cause: "pit" });
    expect(gm.lives).toBe(2);
    expect(r).toEqual({ x: 10, y: 20 });
  });

  it("hurt loses a life but does NOT respawn", () => {
    const { bus, gm } = make();
    let respawned = false;
    bus.on("respawn", () => {
      respawned = true;
    });
    bus.emit("hurt", { x: 0, y: 0 });
    expect(gm.lives).toBe(2);
    expect(respawned).toBe(false);
  });

  it("setCheckpoint moves the respawn point", () => {
    const { bus, gm } = make();
    gm.setCheckpoint(500, 300);
    let r: Point | null = null;
    bus.on("respawn", (p) => {
      r = p;
    });
    bus.emit("die", { cause: "pit" });
    expect(r).toEqual({ x: 500, y: 300 });
  });

  it("running out of lives transitions to lost and emits lose", () => {
    const { bus, gm } = make(1);
    let lost = false;
    bus.on("lose", () => {
      lost = true;
    });
    bus.emit("die", { cause: "pit" });
    expect(gm.lives).toBe(0);
    expect(gm.status).toBe("lost");
    expect(lost).toBe(true);
  });

  it("ignores score and life changes once the run is over", () => {
    const { bus, gm } = make(1);
    bus.emit("die", { cause: "pit" }); // → lost
    gm.addScore(100);
    gm.loseLife(true);
    expect(gm.score).toBe(0);
    expect(gm.lives).toBe(0);
    expect(gm.status).toBe("lost");
  });

  it("win sets status to won and emits win", () => {
    const { bus, gm } = make();
    let won = false;
    bus.on("win", () => {
      won = true;
    });
    gm.win();
    expect(gm.status).toBe("won");
    expect(won).toBe(true);
  });

  it("reset restores a fresh run", () => {
    const { bus, gm } = make();
    gm.addScore(100);
    bus.emit("die", { cause: "pit" });
    gm.reset();
    expect(gm.score).toBe(0);
    expect(gm.lives).toBe(3);
    expect(gm.status).toBe("playing");
    expect(gm.checkpoint).toEqual({ x: 10, y: 20 });
  });
});
