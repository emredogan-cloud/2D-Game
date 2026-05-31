import Phaser from "phaser";
import { GAME } from "./constants";
import { BootScene } from "../scenes/BootScene";
import { PreloadScene } from "../scenes/PreloadScene";
import { MainScene } from "../scenes/MainScene";

/**
 * Builds the Phaser game configuration from the design constants.
 *
 * - `AUTO` renderer: WebGL with a Canvas fallback (matches the browser-run target).
 * - `FIT` scale + centred: responsive letterboxing for desktop and mobile web.
 * - `pixelArt`: crisp nearest-neighbour scaling for the painterly pixel art.
 * - Arcade physics: AABB gravity world — the only physics this game needs.
 */
export function createGameConfig(): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent: "game",
    backgroundColor: GAME.BG_COLOR,
    pixelArt: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME.GAME_WIDTH,
      height: GAME.GAME_HEIGHT,
    },
    physics: {
      default: "arcade",
      arcade: {
        gravity: { x: 0, y: GAME.GRAVITY_Y },
        debug: false,
      },
    },
    render: {
      antialias: false,
    },
    scene: [BootScene, PreloadScene, MainScene],
  };
}
