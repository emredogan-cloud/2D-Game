import { test, expect, type Page } from "@playwright/test";

/** Shape of the dev-only introspection hook the MovementScene exposes on window. */
interface TestHook {
  x: () => number;
  y: () => number;
  state: () => string;
  vx: () => number;
  vy: () => number;
  grounded: () => boolean;
}

type WindowWithHook = Window & { __SKY_ISLANDS_TEST__?: TestHook };
type NumberField = "x" | "y" | "vx" | "vy";

/** Read one numeric field from the in-page test hook. */
async function readNumber(page: Page, field: NumberField): Promise<number> {
  return page.evaluate((f) => {
    const hook = (window as WindowWithHook).__SKY_ISLANDS_TEST__;
    return hook ? hook[f]() : Number.NaN;
  }, field);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  // Focus the page so keyboard events reach Phaser's window listener.
  await page.locator("#game canvas").click({ position: { x: 8, y: 8 } });
  // Wait for the test hook, then for the hero to settle on the ground.
  await page.waitForFunction(
    () => Boolean((window as WindowWithHook).__SKY_ISLANDS_TEST__),
    undefined,
    {
      timeout: 15_000,
    },
  );
  await page.waitForFunction(
    () => (window as WindowWithHook).__SKY_ISLANDS_TEST__?.grounded() === true,
    undefined,
    { timeout: 15_000 },
  );
});

test("holding right moves the hero rightward", async ({ page }) => {
  const x0 = await readNumber(page, "x");
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(700);
  await page.keyboard.up("ArrowRight");
  const x1 = await readNumber(page, "x");
  expect(x1).toBeGreaterThan(x0 + 20);
});

test("holding jump enters the jump state and rises", async ({ page }) => {
  // Use a held key (not a quick press) so Phaser's JustDown latches on a polled frame.
  await page.keyboard.down("Space");
  const rose = await page.waitForFunction(
    () => {
      const h = (window as WindowWithHook).__SKY_ISLANDS_TEST__;
      if (!h) return false;
      return h.state() === "jump" || h.vy() < -10;
    },
    undefined,
    { timeout: 5_000 },
  );
  await page.keyboard.up("Space");
  expect(Boolean(rose)).toBe(true);
});

test("no double-jump: a mid-air second press does not re-launch", async ({ page }) => {
  // Initial jump.
  await page.keyboard.down("Space");
  await page.waitForTimeout(70);
  await page.keyboard.up("Space");

  // Wait until clearly descending and airborne (well past the coyote window).
  await page.waitForFunction(
    () => {
      const h = (window as WindowWithHook).__SKY_ISLANDS_TEST__;
      if (!h) return false;
      return h.vy() > 20 && !h.grounded();
    },
    undefined,
    { timeout: 5_000 },
  );

  // Second jump attempt in mid-air.
  await page.keyboard.down("Space");
  await page.waitForTimeout(80);
  const vyAfter = await readNumber(page, "vy");
  await page.keyboard.up("Space");

  // Still falling (positive vy); a double-jump would have flipped vy negative.
  expect(vyAfter).toBeGreaterThan(0);
});
