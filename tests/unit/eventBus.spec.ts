import { describe, it, expect } from "vitest";
import { EventBus } from "../../src/systems/EventBus";

describe("EventBus", () => {
  it("delivers typed payloads to a listener", () => {
    const bus = new EventBus();
    let got = 0;
    bus.on("collect", (p) => {
      got = p.value;
    });
    bus.emit("collect", { value: 100, x: 1, y: 2 });
    expect(got).toBe(100);
  });

  it("supports multiple listeners for one event", () => {
    const bus = new EventBus();
    let a = 0;
    let b = 0;
    bus.on("score", (p) => {
      a = p.score;
    });
    bus.on("score", (p) => {
      b = p.score;
    });
    bus.emit("score", { score: 50 });
    expect(a).toBe(50);
    expect(b).toBe(50);
  });

  it("off() detaches a handler", () => {
    const bus = new EventBus();
    let n = 0;
    const h = (): void => {
      n += 1;
    };
    bus.on("die", h);
    bus.emit("die", { cause: "pit" });
    bus.off("die", h);
    bus.emit("die", { cause: "pit" });
    expect(n).toBe(1);
  });

  it("on() returns an unsubscribe function", () => {
    const bus = new EventBus();
    let n = 0;
    const unsub = bus.on("win", () => {
      n += 1;
    });
    bus.emit("win", {});
    unsub();
    bus.emit("win", {});
    expect(n).toBe(1);
  });

  it("emit with no listeners is a no-op", () => {
    const bus = new EventBus();
    expect(() => bus.emit("lose", {})).not.toThrow();
  });

  it("clear() removes all handlers", () => {
    const bus = new EventBus();
    let n = 0;
    bus.on("win", () => {
      n += 1;
    });
    bus.clear();
    bus.emit("win", {});
    expect(n).toBe(0);
  });

  it("a handler may unsubscribe during emit without skipping others", () => {
    const bus = new EventBus();
    const order: number[] = [];
    const u1 = bus.on("win", () => {
      order.push(1);
      u1();
    });
    bus.on("win", () => {
      order.push(2);
    });
    bus.emit("win", {});
    bus.emit("win", {});
    expect(order).toEqual([1, 2, 2]);
  });
});
