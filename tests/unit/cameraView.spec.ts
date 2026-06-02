import { describe, it, expect } from "vitest";
import { deriveCameraView } from "../../src/systems/cameraView";

describe("deriveCameraView", () => {
  it("bounds cover the whole map", () => {
    const v = deriveCameraView(2560, 736, 1280, 720);
    expect(v.bounds).toEqual({ x: 0, y: 0, width: 2560, height: 736 });
  });

  it("dead-zone is a fraction of the viewport", () => {
    const v = deriveCameraView(2560, 736, 1280, 720);
    expect(v.deadzone).toEqual({ width: Math.round(1280 * 0.3), height: Math.round(720 * 0.4) });
  });

  it("honours custom dead-zone fractions", () => {
    const v = deriveCameraView(1000, 600, 800, 600, 0.5, 0.5);
    expect(v.deadzone).toEqual({ width: 400, height: 300 });
  });
});
