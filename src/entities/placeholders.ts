import Phaser from "phaser";

/**
 * Runtime placeholder-texture generators for Phase 2 entities. Real sprite
 * atlases arrive in Phase 5; these keep the gameplay readable until then. All
 * are idempotent (guarded on the texture key).
 */

/** A filled, outlined rectangle texture. */
export function ensureRectTexture(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  fill: number,
  stroke = 0xffffff,
): void {
  if (scene.textures.exists(key)) return;
  const g = scene.add.graphics();
  g.fillStyle(fill, 1);
  g.fillRect(0, 0, w, h);
  g.lineStyle(2, stroke, 0.6);
  g.strokeRect(1, 1, w - 2, h - 2);
  g.generateTexture(key, w, h);
  g.destroy();
}

/** A filled diamond texture (placeholder "star"). */
export function ensureDiamondTexture(
  scene: Phaser.Scene,
  key: string,
  size: number,
  fill: number,
): void {
  if (scene.textures.exists(key)) return;
  const half = size / 2;
  const g = scene.add.graphics();
  g.fillStyle(fill, 1);
  g.beginPath();
  g.moveTo(half, 0);
  g.lineTo(size, half);
  g.lineTo(half, size);
  g.lineTo(0, half);
  g.closePath();
  g.fillPath();
  g.generateTexture(key, size, size);
  g.destroy();
}
