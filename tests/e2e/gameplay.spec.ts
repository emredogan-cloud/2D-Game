import { test, expect, type Page } from "@playwright/test";

interface TestHook {
  x: () => number;
  score: () => number;
  lives: () => number;
  runState: () => string;
  grounded: () => boolean;
}
type WindowWithHook = Window & { __SKY_ISLANDS_TEST__?: TestHook };
type NumberField = "x" | "score" | "lives";

async function readNumber(page: Page, field: NumberField): Promise<number> {
  return page.evaluate((f) => {
    const hook = (window as WindowWithHook).__SKY_ISLANDS_TEST__;
    return hook ? hook[f]() : Number.NaN;
  }, field);
}

/** Boot the game, focus it, and wait until the hero is grounded and the run is playing. */
async function boot(page: Page): Promise<void> {
  await page.goto("/");
  await page.locator("#game canvas").click({ position: { x: 8, y: 8 } });
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
}

test("gameplay boots cleanly and collecting a star raises the score", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));

  await boot(page);

  expect(
    await page.evaluate(() => (window as WindowWithHook).__SKY_ISLANDS_TEST__?.runState()),
  ).toBe("playing");
  expect(await readNumber(page, "score")).toBe(0);
  expect(await readNumber(page, "lives")).toBe(3);

  // Walk right into the first star; the score should jump by exactly 100.
  await page.keyboard.down("ArrowRight");
  await page.waitForFunction(
    () => ((window as WindowWithHook).__SKY_ISLANDS_TEST__?.score() ?? 0) > 0,
    undefined,
    { timeout: 8_000 },
  );
  await page.keyboard.up("ArrowRight");

  expect(await readNumber(page, "score")).toBe(100);
  expect(await readNumber(page, "lives")).toBe(3);
  expect(errors, `unexpected console errors: ${errors.join(" | ")}`).toEqual([]);
});

test("walking into a grounded enemy costs exactly one life (side-contact damage)", async ({
  page,
}) => {
  await boot(page);
  expect(await readNumber(page, "lives")).toBe(3);

  // Run right along the ground into the patrolling snail (hero vy≈0 → damage, not stomp).
  await page.keyboard.down("ArrowRight");
  await page.waitForFunction(
    () => ((window as WindowWithHook).__SKY_ISLANDS_TEST__?.lives() ?? 3) < 3,
    undefined,
    { timeout: 10_000 },
  );
  const livesAfterHit = await readNumber(page, "lives");
  await page.keyboard.up("ArrowRight");

  // Exactly one life lost (the invulnerability window prevents a second hit).
  expect(livesAfterHit).toBe(2);
  expect(
    await page.evaluate(() => (window as WindowWithHook).__SKY_ISLANDS_TEST__?.runState()),
  ).toBe("playing");
});
