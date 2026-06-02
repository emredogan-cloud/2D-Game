import { describe, it, expect } from "vitest";
import { isStomp, type StompQuery } from "../../src/systems/combat";

const base: StompQuery = { heroVelocityY: 100, heroBottom: 90, targetY: 100, epsilon: 8 };

describe("isStomp", () => {
  it("is a stomp when descending with feet above the target line", () => {
    expect(isStomp(base)).toBe(true);
  });

  it("is not a stomp when the hero is rising", () => {
    expect(isStomp({ ...base, heroVelocityY: -50 })).toBe(false);
  });

  it("requires strictly downward velocity", () => {
    expect(isStomp({ ...base, heroVelocityY: 0 })).toBe(false);
  });

  it("is a side hit (not a stomp) when feet are well below the target", () => {
    expect(isStomp({ ...base, heroBottom: 120 })).toBe(false);
  });

  it("respects the epsilon tolerance at the boundary", () => {
    expect(isStomp({ ...base, heroBottom: 108 })).toBe(true); // 108 <= 100 + 8
    expect(isStomp({ ...base, heroBottom: 109 })).toBe(false); // 109 > 100 + 8
  });
});
