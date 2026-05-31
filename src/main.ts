import Phaser from "phaser";
import { createGameConfig } from "./config/GameConfig";

declare global {
  interface Window {
    /** The live game instance, exposed for HMR teardown and E2E introspection. */
    __SKY_ISLANDS_GAME__?: Phaser.Game;
  }
}

/** Boots the game once. Idempotent so Vite HMR never double-boots the canvas. */
function bootGame(): Phaser.Game {
  if (window.__SKY_ISLANDS_GAME__) {
    return window.__SKY_ISLANDS_GAME__;
  }
  const game = new Phaser.Game(createGameConfig());
  window.__SKY_ISLANDS_GAME__ = game;
  return game;
}

export const game = bootGame();

// On hot update, destroy the running instance so the next module evaluation
// starts from a clean slate instead of stacking duplicate canvases.
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    window.__SKY_ISLANDS_GAME__?.destroy(true);
    window.__SKY_ISLANDS_GAME__ = undefined;
  });
}
