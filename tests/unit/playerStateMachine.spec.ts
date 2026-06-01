import { describe, it, expect } from "vitest";
import {
  ALL_PLAYER_STATES,
  nextPlayerState,
  type PlayerStateInputs,
} from "../../src/entities/PlayerStateMachine";

const base: PlayerStateInputs = {
  grounded: true,
  vy: 0,
  hasHorizontalInput: false,
  speedX: 0,
  jumpStarted: false,
  runEpsilon: 8,
};

describe("nextPlayerState", () => {
  it("idle → run on horizontal input", () => {
    expect(nextPlayerState("idle", { ...base, hasHorizontalInput: true })).toBe("run");
  });

  it("run → idle when grounded and effectively still", () => {
    expect(nextPlayerState("run", { ...base, hasHorizontalInput: false, speedX: 2 })).toBe("idle");
  });

  it("grounded → run when moving above the run epsilon", () => {
    expect(nextPlayerState("idle", { ...base, speedX: 100 })).toBe("run");
  });

  it("idle/run → jump when a jump impulse is applied this frame", () => {
    expect(nextPlayerState("idle", { ...base, jumpStarted: true })).toBe("jump");
    expect(nextPlayerState("run", { ...base, jumpStarted: true, hasHorizontalInput: true })).toBe(
      "jump",
    );
  });

  it("jump → fall at apex (vy crossing to >= 0)", () => {
    expect(nextPlayerState("jump", { ...base, grounded: false, vy: -10 })).toBe("jump"); // rising
    expect(nextPlayerState("jump", { ...base, grounded: false, vy: 0 })).toBe("fall"); // apex
    expect(nextPlayerState("jump", { ...base, grounded: false, vy: 50 })).toBe("fall"); // descending
  });

  it("fall → land on ground contact", () => {
    expect(nextPlayerState("fall", { ...base, grounded: true })).toBe("land");
  });

  it("jump → land if it touches ground (very short hop)", () => {
    expect(nextPlayerState("jump", { ...base, grounded: true })).toBe("land");
  });

  it("land → run/idle resolves by horizontal motion", () => {
    expect(nextPlayerState("land", { ...base, hasHorizontalInput: true })).toBe("run");
    expect(nextPlayerState("land", { ...base, speedX: 100 })).toBe("run");
    expect(nextPlayerState("land", base)).toBe("idle");
  });

  it("no double-jump: airborne with jumpStarted=false stays jump/fall", () => {
    expect(
      nextPlayerState("jump", { ...base, grounded: false, vy: -100, jumpStarted: false }),
    ).toBe("jump");
    expect(nextPlayerState("fall", { ...base, grounded: false, vy: 100, jumpStarted: false })).toBe(
      "fall",
    );
  });

  it("is total: every state under the base input yields a valid state", () => {
    for (const s of ALL_PLAYER_STATES) {
      expect(ALL_PLAYER_STATES).toContain(nextPlayerState(s, base));
    }
  });
});
