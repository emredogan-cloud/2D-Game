import { describe, it, expect } from "vitest";
import { GAME } from "../../src/config/constants";

describe("GAME constants", () => {
  it("uses a positive tile size", () => {
    expect(GAME.TILE_SIZE).toBeGreaterThan(0);
  });

  it("scores stars at the observed value of 100", () => {
    expect(GAME.STAR_SCORE_VALUE).toBe(100);
  });

  it("uses a negative (upward) jump velocity", () => {
    expect(GAME.HERO_JUMP_VELOCITY).toBeLessThan(0);
  });

  it("uses positive (downward) gravity", () => {
    expect(GAME.GRAVITY_Y).toBeGreaterThan(0);
  });

  it("defines a sane internal resolution", () => {
    expect(GAME.GAME_WIDTH).toBeGreaterThan(0);
    expect(GAME.GAME_HEIGHT).toBeGreaterThan(0);
  });

  it("keeps air control within a 0..1 multiplier range", () => {
    expect(GAME.HERO_AIR_CONTROL).toBeGreaterThan(0);
    expect(GAME.HERO_AIR_CONTROL).toBeLessThanOrEqual(1);
  });
});
