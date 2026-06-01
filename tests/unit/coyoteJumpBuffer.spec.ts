import { describe, it, expect } from "vitest";
import { canConsumeJump, updateBuffer, updateCoyote } from "../../src/entities/jumpTimers";
import { GAME } from "../../src/config/constants";

const C = GAME.HERO_COYOTE_MS; // 90 ms
const B = GAME.HERO_JUMP_BUFFER_MS; // 110 ms

describe("coyote timer", () => {
  it("resets to full while grounded", () => {
    expect(updateCoyote(0, true, 16, C)).toBe(C);
  });

  it("counts down while airborne, floored at 0", () => {
    expect(updateCoyote(C, false, 30, C)).toBe(C - 30);
    expect(updateCoyote(10, false, 30, C)).toBe(0);
  });
});

describe("jump buffer timer", () => {
  it("sets to full on a fresh press", () => {
    expect(updateBuffer(0, true, 16, B)).toBe(B);
  });

  it("counts down without a press, floored at 0", () => {
    expect(updateBuffer(B, false, 40, B)).toBe(B - 40);
    expect(updateBuffer(20, false, 40, B)).toBe(0);
  });
});

describe("canConsumeJump", () => {
  it("normal grounded jump fires when both timers are live", () => {
    const coyote = updateCoyote(0, true, 16, C); // grounded
    const buffer = updateBuffer(0, true, 16, B); // pressed
    expect(canConsumeJump(coyote, buffer)).toBe(true);
  });

  it("coyote jump: pressing shortly after leaving a ledge still fires", () => {
    const coyote = updateCoyote(C, false, 40, C); // 50 ms left in the window
    const buffer = updateBuffer(0, true, 16, B); // pressed mid-air
    expect(coyote).toBeGreaterThan(0);
    expect(canConsumeJump(coyote, buffer)).toBe(true);
  });

  it("jump buffer: a press just before landing fires on touchdown", () => {
    let coyote = 0;
    let buffer = updateBuffer(0, true, 16, B); // press while airborne
    coyote = updateCoyote(coyote, false, 30, C); // still airborne → 0
    buffer = updateBuffer(buffer, false, 30, B); // decays but stays > 0
    expect(canConsumeJump(coyote, buffer)).toBe(false); // cannot jump mid-air

    coyote = updateCoyote(coyote, true, 16, C); // land → coyote full
    expect(canConsumeJump(coyote, buffer)).toBe(true); // buffered press fires
  });

  it("no double-jump: after a consumed jump (both zeroed) an airborne press cannot refire", () => {
    let coyote = 0;
    let buffer = 0; // both consumed by the first jump
    buffer = updateBuffer(buffer, true, 16, B); // second press, airborne
    coyote = updateCoyote(coyote, false, 16, C); // still airborne → stays 0
    expect(canConsumeJump(coyote, buffer)).toBe(false);
  });

  it("expired coyote: pressing after the window closes does not fire", () => {
    const coyote = updateCoyote(10, false, 30, C); // → 0
    const buffer = updateBuffer(0, true, 16, B);
    expect(canConsumeJump(coyote, buffer)).toBe(false);
  });
});
