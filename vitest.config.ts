import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: ["tests/unit/**/*.spec.ts"],
    // Phaser (WebGL) is intentionally kept out of the jsdom unit environment in
    // Phase 0; unit tests exercise pure logic/data only. Browser-level checks
    // live in the Playwright E2E suite.
  },
});
