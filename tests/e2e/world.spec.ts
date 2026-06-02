import { test, expect, type Page } from "@playwright/test";

interface TestHook {
  grounded: () => boolean;
  runState: () => string;
  level: () => string;
  starCount: () => number;
  enemyCount: () => number;
  score: () => number;
  lives: () => number;
  completeLevel: () => void;
}
type WindowWithHook = Window & { __SKY_ISLANDS_TEST__?: TestHook };

function readString(page: Page, fn: "level" | "runState"): Promise<string> {
  return page.evaluate((f) => (window as WindowWithHook).__SKY_ISLANDS_TEST__?.[f]() ?? "", fn);
}
function readNumber(
  page: Page,
  fn: "starCount" | "enemyCount" | "score" | "lives",
): Promise<number> {
  return page.evaluate(
    (f) => (window as WindowWithHook).__SKY_ISLANDS_TEST__?.[f]() ?? Number.NaN,
    fn,
  );
}

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

test("level-01 loads all entities from Tiled data with no console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));

  await boot(page);

  expect(await readString(page, "level")).toBe("level-01");
  expect(await readString(page, "runState")).toBe("playing");
  expect(await readNumber(page, "starCount")).toBe(8);
  expect(await readNumber(page, "enemyCount")).toBe(3);
  expect(errors, `unexpected console errors: ${errors.join(" | ")}`).toEqual([]);
});

test("reaching the goal advances to the next level and preserves run state", async ({ page }) => {
  await boot(page);

  // Collect the first star so we can verify score persists across the transition.
  await page.keyboard.down("ArrowRight");
  await page.waitForFunction(
    () => ((window as WindowWithHook).__SKY_ISLANDS_TEST__?.score() ?? 0) > 0,
    undefined,
    { timeout: 8_000 },
  );
  await page.keyboard.up("ArrowRight");
  const scoreBefore = await readNumber(page, "score");
  expect(scoreBefore).toBe(100);

  // Trigger the goal (dev hook) and wait for level-02 to load.
  await page.evaluate(() => (window as WindowWithHook).__SKY_ISLANDS_TEST__?.completeLevel());
  await page.waitForFunction(
    () => (window as WindowWithHook).__SKY_ISLANDS_TEST__?.level() === "level-02",
    undefined,
    { timeout: 10_000 },
  );
  await page.waitForFunction(
    () => (window as WindowWithHook).__SKY_ISLANDS_TEST__?.grounded() === true,
    undefined,
    { timeout: 15_000 },
  );

  // level-02 loaded its own data, and score carried over.
  expect(await readNumber(page, "starCount")).toBe(2);
  expect(await readNumber(page, "enemyCount")).toBe(1);
  expect(await readNumber(page, "score")).toBe(100);
});
