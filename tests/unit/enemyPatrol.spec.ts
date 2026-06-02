import { describe, it, expect } from "vitest";
import { nextPatrolDirection, type PatrolContext } from "../../src/entities/enemyPatrol";

const clear: PatrolContext = { blockedLeft: false, blockedRight: false, edgeAhead: false };

describe("nextPatrolDirection", () => {
  it("keeps direction on a clear path", () => {
    expect(nextPatrolDirection(-1, clear)).toBe(-1);
    expect(nextPatrolDirection(1, clear)).toBe(1);
  });

  it("flips at a left wall when travelling left", () => {
    expect(nextPatrolDirection(-1, { ...clear, blockedLeft: true })).toBe(1);
  });

  it("flips at a right wall when travelling right", () => {
    expect(nextPatrolDirection(1, { ...clear, blockedRight: true })).toBe(-1);
  });

  it("flips at a platform edge ahead", () => {
    expect(nextPatrolDirection(-1, { ...clear, edgeAhead: true })).toBe(1);
    expect(nextPatrolDirection(1, { ...clear, edgeAhead: true })).toBe(-1);
  });

  it("ignores a wall behind the direction of travel", () => {
    expect(nextPatrolDirection(1, { ...clear, blockedLeft: true })).toBe(1);
    expect(nextPatrolDirection(-1, { ...clear, blockedRight: true })).toBe(-1);
  });
});
