import { describe, it, expect } from "vitest";
import { FIRST_LEVEL, LEVEL_ORDER, isLevelKey, nextLevel } from "../../src/config/levels";

describe("level progression", () => {
  it("FIRST_LEVEL is the head of the order", () => {
    expect(FIRST_LEVEL).toBe(LEVEL_ORDER[0]);
  });

  it("nextLevel advances through the order", () => {
    expect(nextLevel("level-01")).toBe("level-02");
  });

  it("nextLevel returns null at the last level", () => {
    expect(nextLevel(LEVEL_ORDER[LEVEL_ORDER.length - 1])).toBeNull();
  });

  it("nextLevel returns null for an unknown key", () => {
    expect(nextLevel("nope")).toBeNull();
  });

  it("isLevelKey recognises known/unknown keys", () => {
    expect(isLevelKey("level-01")).toBe(true);
    expect(isLevelKey("level-99")).toBe(false);
  });
});
