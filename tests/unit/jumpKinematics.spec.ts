import { describe, it, expect } from "vitest";
import { GAME } from "../../src/config/constants";
import { apexHeightPx, apexHeightTiles, timeToApexSeconds } from "../../src/utils/kinematics";

describe("jump kinematics", () => {
  it("the configured jump clears ~2 tiles (>= 2, < 3.5)", () => {
    const tiles = apexHeightTiles(GAME.HERO_JUMP_VELOCITY, GAME.GRAVITY_Y, GAME.TILE_SIZE);
    expect(tiles).toBeGreaterThanOrEqual(2);
    expect(tiles).toBeLessThan(3.5);
  });

  it("apex height follows h = v^2 / (2g)", () => {
    const v = -400;
    const g = 1000;
    expect(apexHeightPx(v, g)).toBeCloseTo((v * v) / (2 * g), 5); // 80 px
  });

  it("the configured jump clears a 2-tile (64 px) block with margin", () => {
    const px = apexHeightPx(GAME.HERO_JUMP_VELOCITY, GAME.GRAVITY_Y);
    expect(px).toBeGreaterThan(2 * GAME.TILE_SIZE);
  });

  it("time-to-apex is positive and finite", () => {
    const t = timeToApexSeconds(GAME.HERO_JUMP_VELOCITY, GAME.GRAVITY_Y);
    expect(t).toBeGreaterThan(0);
    expect(Number.isFinite(t)).toBe(true);
  });

  it("guards against non-positive gravity", () => {
    expect(apexHeightPx(-400, 0)).toBe(Number.POSITIVE_INFINITY);
    expect(timeToApexSeconds(-400, 0)).toBe(Number.POSITIVE_INFINITY);
  });
});
