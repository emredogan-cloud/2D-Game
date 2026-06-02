import { describe, it, expect } from "vitest";
import { mapPixelSize, parseSpawns } from "../../src/systems/levelParse";
import type { TmjObject } from "../../src/types/tiled";

const objects: TmjObject[] = [
  { type: "player_start", x: 100, y: 200, point: true },
  { type: "star", x: 10, y: 20, point: true },
  { type: "star", x: 30, y: 40, point: true },
  { type: "crate", x: 50, y: 60, properties: [{ name: "breakable", value: true }] },
  { type: "crate", x: 70, y: 80 },
  { type: "enemy", x: 90, y: 100, properties: [{ name: "enemyType", value: "slime" }] },
  { type: "enemy", x: 110, y: 120, properties: [{ name: "enemyType", value: "snail" }] },
  { type: "enemy", x: 130, y: 140 }, // no enemyType → defaults to snail
  { type: "checkpoint", x: 150, y: 160, point: true },
  { type: "goal", x: 170, y: 180, point: true },
  { type: "decoration", x: 0, y: 0 }, // unknown → ignored
];

describe("parseSpawns", () => {
  const s = parseSpawns(objects);

  it("captures the player start", () => {
    expect(s.playerStart).toEqual({ x: 100, y: 200 });
  });

  it("collects all stars", () => {
    expect(s.stars).toEqual([
      { x: 10, y: 20 },
      { x: 30, y: 40 },
    ]);
  });

  it("reads the breakable crate property (defaulting to false)", () => {
    expect(s.crates).toEqual([
      { x: 50, y: 60, breakable: true },
      { x: 70, y: 80, breakable: false },
    ]);
  });

  it("branches enemies on enemyType, defaulting to snail", () => {
    expect(s.enemies).toEqual([
      { x: 90, y: 100, type: "slime" },
      { x: 110, y: 120, type: "snail" },
      { x: 130, y: 140, type: "snail" },
    ]);
  });

  it("collects checkpoints and the goal", () => {
    expect(s.checkpoints).toEqual([{ x: 150, y: 160 }]);
    expect(s.goal).toEqual({ x: 170, y: 180 });
  });

  it("ignores unknown object types", () => {
    const total =
      (s.playerStart ? 1 : 0) +
      s.stars.length +
      s.crates.length +
      s.enemies.length +
      s.checkpoints.length +
      (s.goal ? 1 : 0);
    expect(total).toBe(10); // the 'decoration' object is ignored
  });

  it("returns empty groups for no objects", () => {
    const empty = parseSpawns([]);
    expect(empty.playerStart).toBeNull();
    expect(empty.goal).toBeNull();
    expect(empty.stars).toEqual([]);
  });
});

describe("mapPixelSize", () => {
  it("multiplies tile counts by tile size", () => {
    expect(mapPixelSize({ width: 80, height: 23, tilewidth: 32, tileheight: 32 })).toEqual({
      width: 2560,
      height: 736,
    });
  });
});
