import { test, expect } from "@playwright/test";

test("game boots and renders a non-zero canvas", async ({ page }) => {
  await page.goto("/");

  const canvas = page.locator("#game canvas");
  await expect(canvas).toBeVisible({ timeout: 15_000 });

  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  expect(box?.width ?? 0).toBeGreaterThan(0);
  expect(box?.height ?? 0).toBeGreaterThan(0);
});

test("exposes the Phaser game instance on window", async ({ page }) => {
  await page.goto("/");

  const handle = await page.waitForFunction(
    () => Boolean((window as unknown as { __SKY_ISLANDS_GAME__?: unknown }).__SKY_ISLANDS_GAME__),
    undefined,
    { timeout: 15_000 },
  );

  expect(await handle.jsonValue()).toBe(true);
});
